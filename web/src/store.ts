export interface Env {
  DB: D1Database;
  OAUTH_KV: KVNamespace;
  ENCRYPTION_KEY: string;
  LEGACY_URL?: string;
  PUBLIC_URL: string;
}
const enc = new TextEncoder();
export const now = () => Math.floor(Date.now() / 1000);
export const random = () =>
  btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
export async function hash(value: string) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(value))),
    (x) => x.toString(16).padStart(2, "0"),
  ).join("");
}
async function key(env: Env) {
  const bytes = Uint8Array.from(atob(env.ENCRYPTION_KEY), (c) =>
    c.charCodeAt(0),
  );
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}
export async function seal(env: Env, id: string, value: unknown) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const bytes = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: enc.encode(id) },
      await key(env),
      enc.encode(JSON.stringify(value)),
    ),
  );
  return (
    btoa(String.fromCharCode(...iv)) + "." + btoa(String.fromCharCode(...bytes))
  );
}
export async function unseal<T>(
  env: Env,
  id: string,
  data: string,
): Promise<T> {
  const [iv, cipher] = data
    .split(".")
    .map((v) => Uint8Array.from(atob(v), (c) => c.charCodeAt(0)));
  return JSON.parse(
    new TextDecoder().decode(
      await crypto.subtle.decrypt(
        { name: "AES-GCM", iv, additionalData: enc.encode(id) },
        await key(env),
        cipher,
      ),
    ),
  );
}
export async function put(env: Env, id: string, value: unknown, ttl: number) {
  const data = await seal(env, id, value);
  await env.DB.prepare(
    "INSERT INTO state(id,data,expires) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,expires=excluded.expires,lease=NULL,lease_until=0",
  )
    .bind(id, data, now() + ttl)
    .run();
}
export async function read<T>(
  env: Env,
  id: string,
  consume = false,
): Promise<T | null> {
  const query = consume
    ? "DELETE FROM state WHERE id=? AND expires>? RETURNING data"
    : "SELECT data FROM state WHERE id=? AND expires>?";
  const row = await env.DB.prepare(query)
    .bind(id, now())
    .first<{ data: string }>();
  return row ? unseal<T>(env, id, row.data) : null;
}
export async function rate(env: Env, request: Request) {
  const window = Math.floor(now() / 60);
  const bucket = await hash(env.ENCRYPTION_KEY + ":" + (request.headers.get("CF-Connecting-IP") ?? "local"));
  const row = await env.DB.prepare(
    "INSERT INTO request_limits(bucket,window,count) VALUES(?,?,1) ON CONFLICT(bucket,window) DO UPDATE SET count=count+1 RETURNING count",
  )
    .bind(bucket, window)
    .first<{ count: number }>();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM request_limits WHERE window<?").bind(window - 2),
    env.DB.prepare("DELETE FROM state WHERE expires<?").bind(now()),
  ]);
  return row !== null && row.count <= 20;
}
