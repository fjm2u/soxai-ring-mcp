import { OAuthError, type TokenExchangeCallbackOptions, type TokenExchangeCallbackResult } from "@cloudflare/workers-oauth-provider";
import { z } from "zod";
import { type Env, hash, now } from "./store";
import { type AccessSession, type Session, refreshSession, SafeError } from "./soxai";

const uid = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
const token = z.string().min(1).max(8192).regex(/^\S+$/);
const access = z.object({ version: z.literal(2), uid, token, expires: z.number().int().positive() });
const grant = z.object({ version: z.literal(2), uid, refresh: token });

// The OAuth provider has already decrypted these props using the presented token.
// No SOXAI session is loaded from D1 or decrypted with a server-wide secret.
export async function accessSession(props: unknown, owner?: string): Promise<AccessSession | null> {
  const parsed = access.safeParse(props);
  if (!parsed.success || parsed.data.expires <= now() || await hash(parsed.data.uid) !== owner)
    return null;
  const { uid, token, expires } = parsed.data;
  return { uid, token, expires };
}

export async function tokenExchange(options: TokenExchangeCallbackOptions<Env>): Promise<TokenExchangeCallbackResult> {
  const parsed = grant.safeParse(options.props);
  if (!parsed.success || await hash(parsed.data.uid) !== options.userId)
    throw new OAuthError("invalid_grant", { description: "Reconnect SOXAI RING." });
  const { uid, refresh } = parsed.data;
  let session: Session;
  try {
    if (options.grantType === "authorization_code") {
      const initial = access.safeParse(options.props);
      if (!initial.success) throw new SafeError("AUTHENTICATION_FAILED");
      session = initial.data.expires > now() + 120
        ? { ...initial.data, refresh }
        : await refreshSession(uid, refresh);
    } else if (options.grantType === "refresh_token") {
      session = await refreshSession(uid, refresh);
    } else throw new SafeError("AUTHENTICATION_FAILED");
  } catch (e) {
    if (e instanceof SafeError && ["AUTHENTICATION_FAILED", "UID_MISMATCH"].includes(e.message))
      throw new OAuthError("invalid_grant", { description: "Reconnect SOXAI RING." });
    // A transient SOXAI outage must not erase the user's authorization.
    throw new OAuthError("temporarily_unavailable", {
      statusCode: 503, description: "SOXAI is temporarily unavailable. Try again later.",
      headers: { "Retry-After": "60" },
    });
  }
  const lifetime = session.expires - now() - 60;
  if (lifetime < 60) throw new OAuthError("temporarily_unavailable", {
    statusCode: 503, description: "SOXAI returned a short-lived token. Try again later.",
    headers: { "Retry-After": "60" },
  });
  return {
    // Separate encrypted payloads and keys: an access token cannot unwrap the
    // upstream refresh token, even if the OAuth database is copied.
    accessTokenProps: { version: 2, uid, token: session.token, expires: session.expires },
    newProps: { version: 2, uid, refresh: session.refresh },
    accessTokenTTL: Math.min(900, lifetime),
  };
}
