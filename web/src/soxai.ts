import { now } from "./store";
export class SafeError extends Error {}
export interface AccessSession {
  uid: string;
  token: string;
  expires: number;
}
export interface Session extends AccessSession {
  refresh: string;
}
export async function request(
  path: string,
  options: RequestInit = {},
  maxBytes = 32768,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch("https://web-api.soxai.site" + path, {
      ...options,
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new SafeError("UPSTREAM_UNAVAILABLE");
  }
  if (!response.ok)
    throw new SafeError(
      response.status === 401 || response.status === 400
        ? "AUTHENTICATION_FAILED"
        : response.status === 429
          ? "RATE_LIMITED"
          : "UPSTREAM_ERROR",
    );
  const reader = response.body?.getReader();
  if (!reader) throw new SafeError("UNSUPPORTED_RESPONSE");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maxBytes) {
      await reader.cancel();
      throw new SafeError("RESPONSE_TOO_LARGE");
    }
    chunks.push(value);
  }
  const raw = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    raw.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(raw));
  } catch {
    throw new SafeError("UNSUPPORTED_RESPONSE");
  }
}
function session(value: unknown, refresh = false): Session {
  const d = value as Record<string, unknown>;
  if (!d || typeof d !== "object") throw new SafeError("UNSUPPORTED_RESPONSE");
  const uid = d[refresh ? "user_id" : "localId"],
    token = d[refresh ? "id_token" : "idToken"],
    renewal = d[refresh ? "refresh_token" : "refreshToken"];
  const ttl = Number(d[refresh ? "expires_in" : "expiresIn"]);
  if (
    typeof uid !== "string" ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(uid) ||
    typeof token !== "string" ||
    typeof renewal !== "string" ||
    ![token, renewal].every(
      (v) => v.length > 0 && v.length <= 8192 && !/\s/.test(v),
    ) ||
    !Number.isFinite(ttl) ||
    ttl <= 60 ||
    ttl > 86400
  )
    throw new SafeError("AUTHENTICATION_FAILED");
  return { uid, token, refresh: renewal, expires: now() + ttl };
}
// Password authentication happens only in the user's browser against SOXAI.
// Validate both tokens upstream; never trust a browser-supplied UID or expiry.
export async function connectTokens(token: unknown, refresh: unknown): Promise<Session> {
  if (![token, refresh].every(v => typeof v === "string" && v.length > 0 && v.length <= 8192 && !/\s/.test(v)))
    throw new SafeError("INVALID_LOGIN");
  const me = await request("/app/me", {
    headers: { Authorization: "Bearer " + token },
  }) as { uid?: string };
  const updated = session(await request("/api/refreshToken", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(refresh),
  }), true);
  if (me?.uid !== updated.uid) throw new SafeError("UID_MISMATCH");
  await identity(updated);
  return updated;
}
export async function identity(s: AccessSession) {
  const result = (await request("/app/me", {
    headers: { Authorization: "Bearer " + s.token },
  })) as { uid?: string };
  if (result?.uid !== s.uid) throw new SafeError("UID_MISMATCH");
}
// Called only while processing the client's OAuth token exchange.
export async function refreshSession(uid: string, refresh: string): Promise<Session> {
  const updated = session(await request("/api/refreshToken", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(refresh),
  }), true);
  if (updated.uid !== uid) throw new SafeError("UID_MISMATCH");
  await identity(updated);
  return updated;
}
export async function data(
  s: AccessSession,
  kind: "daily" | "intraday",
  start: string,
  end: string,
): Promise<Record<string, unknown>[]> {
  const q = new URLSearchParams({
    start_day: start,
    end_day: end,
    format: "json",
  });
  const value = await request(
    "/api/v2/" +
      (kind === "daily" ? "DailyInfoData" : "DailyDetailData") +
      "/" +
      encodeURIComponent(s.uid) +
      "?" +
      q,
    { headers: { Authorization: "Bearer " + s.token } },
    4_000_000,
  );
  if (
    !Array.isArray(value) ||
    value.length > 20_000 ||
    value.some((v) => !v || typeof v !== "object" || Array.isArray(v))
  )
    throw new SafeError("UNSUPPORTED_RESPONSE");
  if (value.some((v) => v.uid !== s.uid)) throw new SafeError("UID_MISMATCH");
  return value;
}
