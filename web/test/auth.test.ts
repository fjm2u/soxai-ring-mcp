import { describe, it, expect, vi } from "vitest";
import { accessSession, tokenExchange } from "../src/auth";
import { hash, now } from "../src/store";
import * as soxai from "../src/soxai";
import type { TokenExchangeCallbackOptions } from "@cloudflare/workers-oauth-provider";
import type { Env } from "../src/store";

// Node unit tests exercise the real provider errors without starting a Worker.
// The full provider runs under workerd in integration.test.mjs.
vi.mock("cloudflare:workers", () => ({ WorkerEntrypoint: class {} }));

describe("token-bound upstream credentials", () => {
  const initial = () => ({ version: 2, uid: "owner", token: "access-secret", refresh: "refresh-secret", expires: now() + 3600 });
  const options = async (props: unknown, grantType = "authorization_code") => ({
    props, userId: await hash("owner"), grantType,
  }) as TokenExchangeCallbackOptions<Env>;

  it("separates access and refresh payloads and bounds the client token lifetime", async () => {
    const p = initial(), result = await tokenExchange(await options(p));
    expect(result.accessTokenProps).toEqual({ version: 2, uid: p.uid, token: p.token, expires: p.expires });
    expect(result.newProps).toEqual({ version: 2, uid: p.uid, refresh: p.refresh });
    expect(result.accessTokenTTL).toBe(900);
    expect(await accessSession(result.accessTokenProps, await hash("owner"))).toEqual({ uid:p.uid,token:p.token,expires:p.expires });
  });
  it("rejects legacy, expired, malformed and mismatched access props without a storage fallback", async () => {
    for (const p of [{owner:await hash("owner")}, {...initial(),expires:now()-1}, {...initial(),uid:"other"}, {...initial(),token:""}])
      expect(await accessSession(p, await hash("owner"))).toBeNull();
    for (const p of [{owner:await hash("owner")}, {...initial(),uid:"other"}])
      await expect(tokenExchange(await options(p))).rejects.toMatchObject({code:"invalid_grant"});
  });
  it("refreshes SOXAI during OAuth renewal and retains only the latest renewal credential", async () => {
    const p=initial(), updated={uid:p.uid,token:"next-access",refresh:"next-refresh",expires:now()+600};
    const mock=vi.spyOn(soxai,"refreshSession").mockResolvedValue(updated);
    try {
      const result=await tokenExchange(await options({version:2,uid:p.uid,refresh:p.refresh},"refresh_token"));
      expect(mock).toHaveBeenCalledWith(p.uid,p.refresh);
      expect(result.accessTokenProps).toEqual({version:2,uid:p.uid,token:updated.token,expires:updated.expires});
      expect(result.newProps).toEqual({version:2,uid:p.uid,refresh:updated.refresh});
      expect(result.accessTokenTTL).toBeLessThanOrEqual(540);
      expect(result.accessTokenTTL).toBeGreaterThanOrEqual(539);
    } finally {mock.mockRestore();}
  });
  it("distinguishes terminal authentication errors from retryable upstream failures", async () => {
    const mock=vi.spyOn(soxai,"refreshSession");
    try {
      for(const code of ["AUTHENTICATION_FAILED","UID_MISMATCH","RATE_LIMITED","UPSTREAM_UNAVAILABLE"]) {
        mock.mockRejectedValueOnce(new soxai.SafeError(code));
        await expect(tokenExchange(await options(initial(),"refresh_token"))).rejects.toMatchObject({
          code: ["AUTHENTICATION_FAILED","UID_MISMATCH"].includes(code) ? "invalid_grant" : "temporarily_unavailable",
        });
      }
    } finally {mock.mockRestore();}
  });
});
