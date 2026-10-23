import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes, webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
const origin = "https://soxai.example";
const callbacks = ["https://chatgpt.com/connector_platform_oauth_redirect", "https://claude.ai/api/mcp/auth_callback", "https://new-client.example/oauth/callback?tenant=demo", "http://127.0.0.1:49152/callback", "http://localhost:53218/callback", "http://[::1]:53219/callback"];
const hash = (s) => createHash("sha256").update(s).digest("hex");
const verifier = "v".repeat(64),
  challenge = createHash("sha256").update(verifier).digest("base64url");
for (const callback of callbacks) {
test(`OAuth, owner isolation, MCP data, renewal and revocation: ${callback}`, async () => {
  let poisonRows = false, poisonRefresh = false, refreshOutage = false;
  const accessOwners = new Map(), refreshOwners = new Map(), refreshCalls = [];
  for (const uid of ["synthetic-owner", "other-owner"]) {
    accessOwners.set("token-"+uid,uid); refreshOwners.set("refresh-"+uid,uid);
  }
  const encryptionKey = randomBytes(32);
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      workers: [
        {
          name: "test",
          modules: true,
          scriptPath: "dist/index.js",
          compatibilityDate: "2026-10-22",
          compatibilityFlags: ["nodejs_compat", "global_fetch_strictly_public"],
          kvNamespaces: ["OAUTH_KV"],
          d1Databases: ["DB"],
          bindings: {
            PUBLIC_URL: origin,
            ENCRYPTION_KEY: encryptionKey.toString("base64"),
          },
          outboundService: async (request) => {
            const u = new URL(request.url);
            if (u.origin === "https://client.example") return Response.json({
              client_id: u.pathname === "/bad.json" ? "https://wrong.example/client.json" : u.href,
              client_name: "Metadata client", redirect_uris: [callback],
              token_endpoint_auth_method: "none", grant_types: ["authorization_code", "refresh_token"], response_types: ["code"]
            });
            assert.equal(u.origin, "https://web-api.soxai.site");
            assert.notEqual(u.pathname, "/api/login", "Worker must never authenticate passwords");
            const uid = accessOwners.get(request.headers.get("Authorization")?.slice(7));
            if (u.pathname === "/app/me") return Response.json({ uid });
            if (u.pathname === "/api/refreshToken") {
              const presented = await request.json(), user = refreshOwners.get(presented);
              refreshCalls.push(presented);
              if (refreshOutage) return Response.json({}, {status:503});
              if (!user) return Response.json({}, {status:401});
              const token="rotated-access-"+refreshCalls.length, refresh="rotated-refresh-"+refreshCalls.length;
              accessOwners.set(token,user);refreshOwners.set(refresh,user);
              return Response.json({ user_id: poisonRefresh ? "attacker" : user, id_token: token, refresh_token: refresh, expires_in: "3600" });
            }
            if (u.pathname.startsWith("/api/v2/"))
              return Response.json([
                {
                  uid: poisonRows ? "attacker" : uid,
                  _time: "2026-10-01T00:00:00Z",
                  activity_steps: uid === "other-owner" ? 999 : 0,
                  health_hrv: 20,
                  email: "private@example.invalid",
                },
                {
                  uid: poisonRows ? "attacker" : uid,
                  _time: "2026-10-02T00:00:00Z",
                  activity_steps: 10,
                  health_hrv: null,
                },
              ]);
            throw Error("Unexpected outbound request");
          },
        },
      ],
    }),
  );
  try {
    const db = await mf.getD1Database("DB");
    for (const sql of (await readFile("schema.sql", "utf8"))
      .split(";")
      .filter((s) => s.trim()))
      await db.prepare(sql).run();
    const call = (path, init) =>
      mf.dispatchFetch(origin + path, { ...init, redirect: "manual" });
    assert.equal((await call("/mcp")).status, 401);
    const browserOrigin = {Origin: "https://browser-client.example"};
    const preflight = await call("/mcp", {method:"OPTIONS", headers:browserOrigin});
    assert.equal(preflight.status,204);
    assert.equal(preflight.headers.get("Access-Control-Allow-Origin"),"*");
    const browserUnauth = await call("/mcp", {headers:browserOrigin});
    assert.equal(browserUnauth.status,401);
    assert.equal(browserUnauth.headers.get("Access-Control-Allow-Credentials"),null);
    assert.equal((await call("/connect", {method:"POST",headers:browserOrigin})).status,403);
    assert.equal(
      (await call("/connect", { method: "POST", body: "x".repeat(32769) }))
        .status,
      413,
    );
    assert.equal(
      (await call("/healthz", { headers: { Origin: "https://evil.invalid" } }))
        .status,
      403,
    );
    const metadata = await (
      await call("/.well-known/oauth-authorization-server")
    ).json();
    assert.equal(metadata.issuer, origin);
    assert.equal(metadata.client_id_metadata_document_supported, true);
    assert.ok(metadata.code_challenge_methods_supported.includes("S256"));
    for (const rejected of ["http://remote.example/callback", "https://client.example/callback#fragment", "https://user:password@client.example/callback", "javascript:alert(1)"]) {
      const denied = await call("/register", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({client_name:"Rejected client",redirect_uris:[rejected],token_endpoint_auth_method:"none"})});
      assert.equal(denied.status,400);
      assert.equal((await denied.json()).error,"invalid_client_metadata");
    }
    const registered = await call("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_name: "Synthetic client",
        redirect_uris: [callback],
        token_endpoint_auth_method: "client_secret_post",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        scope: "soxai.read",
      }),
    });
    assert.equal(registered.status, 201, await registered.clone().text());
    const client = await registered.json();
    const publicClient = await call("/register", {
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({client_name:"Public PKCE client",redirect_uris:[callback],token_endpoint_auth_method:"none",grant_types:["authorization_code","refresh_token"],response_types:["code"],scope:"soxai.read"}),
    });
    assert.equal(publicClient.status,201,await publicClient.clone().text());
    const authPath =
      "/authorize?" +
      new URLSearchParams({
        client_id: client.client_id,
        redirect_uri: callback,
        response_type: "code",
        scope: "soxai.read",
        state: "synthetic-state",
        code_challenge: challenge,
        code_challenge_method: "S256",
        resource: origin + "/mcp",
      });
    const changedCallback = new URL(origin + authPath);
    changedCallback.searchParams.set("redirect_uri", "https://unregistered.example/callback");
    assert.equal((await call(changedCallback.pathname + changedCallback.search)).status, 400);
    const missingPkce = new URL(origin + authPath);
    missingPkce.searchParams.delete("code_challenge");
    assert.equal((await call(missingPkce.pathname + missingPkce.search)).status, 400);
    const cimdAuth = new URL(origin + authPath);
    cimdAuth.searchParams.set("client_id", "https://client.example/client.json");
    assert.equal((await call(cimdAuth.pathname + cimdAuth.search)).status, 200);
    cimdAuth.searchParams.set("client_id", "https://client.example/bad.json");
    assert.equal((await call(cimdAuth.pathname + cimdAuth.search)).status, 400);
    const form = await call(authPath);
    assert.equal(form.status, 200, await form.clone().text());
    assert.equal(form.headers.get("Referrer-Policy"), "same-origin");
    assert.ok(form.headers.get("Content-Security-Policy").includes("connect-src 'self' https://web-api.soxai.site"));
    assert.ok(form.headers.get("Content-Security-Policy").includes("form-action 'none'"));
    const html = await form.text(),
      csrf = html.match(/name="csrf" value="([^"]+)"/)[1],
      flow = html.match(/name="flow" value="([^"]+)"/)[1];
    const script = html.match(/<script nonce="([^"]+)">([\s\S]*?)<\/script>/);
    assert.ok(form.headers.get("Content-Security-Policy").includes("'nonce-" + script[1] + "'"));
    // Execute the actual inline browser code, including double-submit protection.
    let submit;
    const buttons = [{disabled:true},{disabled:true}], calls = [], navigated = [];
    const elements = { email:{value:"owner@example.invalid"}, password:{value:"synthetic-password"}, consent:{checked:true}, status:{textContent:""} };
    const fakeForm = {elements:{flow:{value:flow},csrf:{value:csrf}},querySelectorAll:()=>buttons,addEventListener:(_,fn)=>{submit=fn;}};
    runInNewContext(script[2], {document:{getElementById:id=>id==="connect-form"?fakeForm:elements[id]}, URL, AbortSignal, Error,
      location:{assign:url=>navigated.push(url)},fetch:async(url,init)=>{
        calls.push({url,body:JSON.parse(init.body)});
        return Response.json(url.startsWith("https://web-api")?{idToken:"token-synthetic-owner",refreshToken:"refresh-synthetic-owner"}:{redirectTo:callback+(callback.includes("?")?"&":"?")+"code=fake"});
      }});
    const event={preventDefault(){},submitter:{value:"allow"}};
    const submission=submit(event);await submit(event);assert.ok(buttons.every(b=>b.disabled));await submission;
    assert.equal(calls.length,2);
    assert.equal(calls[0].url,"https://web-api.soxai.site/api/login");
    assert.equal(calls[0].body.password,"synthetic-password");
    assert.equal(calls[1].url,"/connect");
    assert.ok(!JSON.stringify(calls[1]).includes("synthetic-password"));
    assert.ok(!JSON.stringify(calls[1]).includes("owner@example.invalid"));
    assert.equal(elements.password.value,"");assert.equal(navigated.length,1);
    assert.ok(!html.includes('name="password"'));assert.ok(!html.includes('name="email"'));
    const body = JSON.stringify({flow,csrf,idToken:"token-synthetic-owner",refreshToken:"refresh-synthetic-owner",action:"allow",consent:true});
    const headers = {
      Origin: origin,
      Cookie: form.headers.get("Set-Cookie").split(";")[0],
      "Content-Type": "application/json",
    };
    assert.equal(
      (
        await call("/connect", {
          method: "POST",
          headers: { ...headers, Cookie: "bad" },
          body,
        })
      ).status,
      403,
    );
    for (const invalidOrigin of ["null", "https://evil.invalid"]) {
      assert.equal((await call("/connect", {
        method: "POST", headers: { ...headers, Origin: invalidOrigin }, body,
      })).status, 403);
    }
    const linked = await call("/connect", { method: "POST", headers, body });
    assert.equal(linked.status, 200, await linked.clone().text());
    assert.equal(
      (await call("/connect", { method: "POST", headers, body })).status,
      400,
    );
    const redirect = new URL((await linked.json()).redirectTo);
    assert.equal(redirect.searchParams.get("state"), "synthetic-state");
    assert.equal(redirect.searchParams.get("iss"), origin);
    const tokenBody = {
      grant_type: "authorization_code",
      client_id: client.client_id,
      client_secret: client.client_secret,
      code: redirect.searchParams.get("code"),
      code_verifier: verifier,
      redirect_uri: callback,
      resource: origin + "/mcp",
    };
    const exchange = (fields) =>
      call("/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(fields).toString(),
      });
    assert.equal(
      (await exchange({ ...tokenBody, code_verifier: "bad" })).status,
      400,
    );
    const exchanged = await exchange(tokenBody);
    assert.equal(exchanged.status, 200, await exchanged.clone().text());
    const tokens = await exchanged.json();
    const rpc = (token, method, params = {}) =>
      call("/mcp", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/json, text/event-stream",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      });
    const listed = await rpc(tokens.access_token, "tools/list");
    assert.equal(listed.status, 200, await listed.clone().text());
    const toolList = (await listed.json()).result.tools;
    assert.deepEqual(toolList.map(t => t.name).sort(), ["get_health_data"]);
    for (const tool of toolList) {
      assert.ok(tool.title);
      assert.ok(tool.outputSchema);
      for (const property of Object.values(tool.inputSchema.properties)) assert.ok(property.description, JSON.stringify({tool:tool.name,property}));
    }
    assert.ok(toolList.find(t => t.name === "get_health_data").inputSchema.properties.hours);
    const badRange = (await (await rpc(tokens.access_token, "tools/call", {name:"get_health_data",arguments:{kind:"intraday",start_datetime:"2026-10-01T00:00:00Z"}})).json()).result;
    assert.equal(badRange.isError, true);
    assert.equal(badRange.structuredContent.error.code, "INVALID_RANGE");
    assert.ok(!badRange.content[0].text.includes("Reconnect"));
    const firstPage = (await (await rpc(tokens.access_token, "tools/call", {name:"get_health_data",arguments:{kind:"intraday",start_datetime:"2026-10-01T00:00:00Z",end_datetime:"2026-10-03T00:00:00Z",limit:1}})).json()).result;
    assert.equal(firstPage.structuredContent.status, "ok");
    const nextPage = (await (await rpc(tokens.access_token, "tools/call", {name:"get_health_data",arguments:firstPage.structuredContent.next_request})).json()).result;
    assert.equal(nextPage.structuredContent.records[0].timestamp,"2026-10-02T00:00:00.000Z");
    assert.equal(nextPage.structuredContent.next_request,null);
    const wrongKind = (await (await rpc(tokens.access_token, "tools/call", {name:"get_health_data",arguments:{hours:48}})).json()).result;
    assert.equal(wrongKind.isError,true);
    assert.equal(firstPage.structuredContent.next_request.kind,"intraday");
    assert.ok(firstPage.structuredContent.available_metrics.some(m => m.numeric_observations === 2));
    const unknownArg = (await (await rpc(tokens.access_token,"tools/call",{name:"get_health_data",arguments:{uid:"other"}})).json()).result;
    assert.equal(unknownArg.isError,true);
    const daily = await rpc(tokens.access_token, "tools/call", {
      name: "get_health_data",
      arguments: {
        start_date: "2026-10-01",
        end_date: "2026-10-02",
        metrics: ["health_hrv", "activity_steps"],
      },
    });
    const result = (await daily.json()).result;
    assert.equal(result.isError, undefined, JSON.stringify(result));
    assert.equal(result.structuredContent.records[0].activity_steps, 0);
    assert.equal(result.structuredContent.records[1].health_hrv, null);
    assert.ok(!JSON.stringify(result).includes("private@example.invalid"));
    // A second account gets its own token-bound grant, without replacing the first.
    const form2 = await call(authPath), html2 = await form2.text();
    const headers2 = {...headers,Cookie:form2.headers.get("Set-Cookie").split(";")[0]};
    const payload2={flow:html2.match(/name="flow" value="([^"]+)"/)[1],csrf:html2.match(/name="csrf" value="([^"]+)"/)[1],idToken:"token-other-owner",refreshToken:"refresh-other-owner",action:"allow",consent:true};
    // No claimed UID, passwords, or mismatched token pairs may enter stored sessions.
    for (const extra of [{uid:"synthetic-owner"},{password:"synthetic-password"},{email:"private@example.invalid"},{consent:false},{refreshToken:"refresh-synthetic-owner"}]) {
      assert.equal((await call("/connect",{method:"POST",headers:headers2,body:JSON.stringify({...payload2,...extra})})).status,400);
    }
    const linked2=await call("/connect",{method:"POST",headers:headers2,body:JSON.stringify(payload2)});
    assert.equal(linked2.status,200,await linked2.clone().text());
    const code2=new URL((await linked2.json()).redirectTo).searchParams.get("code");
    const tokens2=await (await exchange({...tokenBody,code:code2})).json();
    const dailyParams={name:"get_health_data",arguments:{start_date:"2026-10-01",end_date:"2026-10-02",metrics:["activity_steps"]}};
    for(const [token,expected] of [[tokens.access_token,0],[tokens2.access_token,999]]){
      const got=await (await rpc(token,"tools/call",dailyParams)).json();
      assert.equal(got.result.structuredContent.records[0].activity_steps,expected);
    }
    poisonRows=true;
    const mismatch=await (await rpc(tokens.access_token,"tools/call",dailyParams)).json();
    assert.equal(mismatch.result.isError,true);assert.match(mismatch.result.content[0].text,/UID_MISMATCH/);
    poisonRows=false;
    // No master-key-encrypted SOXAI session remains in D1.
    assert.equal((await db.prepare("SELECT id FROM state WHERE id LIKE 'session:%'").all()).results.length,0);
    const kv=await mf.getKVNamespace("OAUTH_KV");
    const accessKey=t=>`token:${t.split(":")[0]}:${t.split(":")[1]}:${hash(t)}`;
    const grantKey=t=>`grant:${t.split(":")[0]}:${t.split(":")[1]}`;
    const readAccess=async t=>JSON.parse(await kv.get(accessKey(t)));
    const readGrant=async t=>JSON.parse(await kv.get(grantKey(t)));
    // Independently unwrap the provider's actual persisted envelopes using its
    // documented HMAC-SHA256 / AES-KW format, not an application-side master key.
    const open=async(token,wrapped,cipher)=>{
      const hmac=await webcrypto.subtle.importKey("raw",new Uint8Array([34,126,38,134,141,241,225,109,128,112,234,23,151,91,71,166,130,24,250,135,40,174,222,133,181,29,74,217,150,202,202,67]),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
      const material=await webcrypto.subtle.sign("HMAC",hmac,Buffer.from(token));
      const kek=await webcrypto.subtle.importKey("raw",material,"AES-KW",false,["unwrapKey"]);
      const key=await webcrypto.subtle.unwrapKey("raw",Buffer.from(wrapped,"base64"),kek,"AES-KW","AES-GCM",false,["decrypt"]);
      return JSON.parse(Buffer.from(await webcrypto.subtle.decrypt({name:"AES-GCM",iv:new Uint8Array(12)},key,Buffer.from(cipher,"base64"))).toString());
    };
    const a=await readAccess(tokens.access_token),g=await readGrant(tokens.refresh_token);
    const ap=await open(tokens.access_token,a.wrappedEncryptionKey,a.grant.encryptedProps);
    const gp=await open(tokens.refresh_token,g.refreshTokenWrappedKey,g.encryptedProps);
    assert.deepEqual(Object.keys(ap).sort(),["expires","token","uid","version"]);
    assert.deepEqual(Object.keys(gp).sort(),["refresh","uid","version"]);
    assert.equal(ap.uid,"synthetic-owner");assert.equal(gp.uid,ap.uid);
    assert.equal(accessOwners.get(ap.token),ap.uid);assert.equal(refreshOwners.get(gp.refresh),gp.uid);
    await assert.rejects(open(tokens.access_token,g.refreshTokenWrappedKey,g.encryptedProps));
    await assert.rejects(open(tokens2.access_token,a.wrappedEncryptionKey,a.grant.encryptedProps));
    await assert.rejects(open(hash(tokens.access_token),a.wrappedEncryptionKey,a.grant.encryptedProps));
    const snapshot=[];
    for(const key of (await kv.list()).keys)snapshot.push(await kv.get(key.name));
    const persisted=JSON.stringify(snapshot)+JSON.stringify((await db.prepare("SELECT data FROM state").all()).results);
    for(const secret of [tokens.access_token,tokens.refresh_token,ap.token,gp.refresh,"synthetic-password"])
      assert.ok(!persisted.includes(secret));
    // Expire only the OAuth access token, then let the normal renewal endpoint
    // refresh SOXAI and issue fresh token-bound envelopes.
    a.expiresAt=1;await kv.put(accessKey(tokens.access_token),JSON.stringify(a));
    assert.equal((await rpc(tokens.access_token,"tools/list")).status,401);
    const renew=token=>exchange({grant_type:"refresh_token",client_id:client.client_id,client_secret:client.client_secret,refresh_token:token,resource:origin+"/mcp"});
    refreshOutage=true;
    assert.equal((await renew(tokens.refresh_token)).status,503);
    assert.ok(await kv.get(grantKey(tokens.refresh_token)),"transient errors must preserve the grant");
    refreshOutage=false;
    const refreshed=await renew(tokens.refresh_token);assert.equal(refreshed.status,200,await refreshed.clone().text());
    const fresh=await refreshed.json();
    assert.equal(refreshCalls.at(-1),gp.refresh);
    assert.notEqual(tokens.access_token,fresh.access_token);assert.notEqual(tokens.refresh_token,fresh.refresh_token);
    const fg=await readGrant(fresh.refresh_token),fp=await open(fresh.refresh_token,fg.refreshTokenWrappedKey,fg.encryptedProps);
    assert.notEqual(fp.refresh,gp.refresh);
    assert.equal((await (await rpc(fresh.access_token,"tools/call",dailyParams)).json()).result.structuredContent.records[0].activity_steps,0);
    // A second renewal must use the newly returned SOXAI refresh token.
    const twice=await renew(fresh.refresh_token);assert.equal(twice.status,200);const latest=await twice.json();
    assert.equal(refreshCalls.at(-1),fp.refresh);
    assert.equal((await renew(tokens.refresh_token)).status,400);
    // A refresh that changes SOXAI identity is terminal and revokes that grant.
    poisonRefresh=true;assert.equal((await renew(tokens2.refresh_token)).status,400);poisonRefresh=false;
    assert.equal((await rpc(tokens2.access_token,"tools/list")).status,401);
    assert.equal((await rpc(latest.access_token,"tools/list")).status,200);
    // Rate limits apply to each source, not all users of the service together.
    for(let i=0;i<21;i++)await call(authPath,{headers:{"CF-Connecting-IP":"192.0.2.1"}});
    assert.equal((await call(authPath,{headers:{"CF-Connecting-IP":"192.0.2.1"}})).status,429);
    assert.equal((await call(authPath,{headers:{"CF-Connecting-IP":"192.0.2.2"}})).status,200);
    const revoke = await call(new URL(metadata.revocation_endpoint).pathname, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: client.client_id,
        client_secret: client.client_secret,
        token: latest.refresh_token,
      }).toString(),
    });
    assert.equal(revoke.status, 200, await revoke.clone().text());
    assert.equal((await rpc(latest.access_token, "tools/list")).status, 401);
    assert.equal((await exchange(tokenBody)).status, 400);
    // Reconnecting creates a new grant; the revoked grant stays unusable.
    const again=await call(authPath,{headers:{"CF-Connecting-IP":"192.0.2.3"}}),againHtml=await again.text();
    const reconnected=await call("/connect",{method:"POST",headers:{...headers,"CF-Connecting-IP":"192.0.2.3",Cookie:again.headers.get("Set-Cookie").split(";")[0]},body:JSON.stringify({flow:againHtml.match(/name="flow" value="([^"]+)"/)[1],csrf:againHtml.match(/name="csrf" value="([^"]+)"/)[1],idToken:"token-synthetic-owner",refreshToken:"refresh-synthetic-owner",action:"allow",consent:true})});
    assert.equal(reconnected.status,200);
    const reconnectCode=new URL((await reconnected.json()).redirectTo).searchParams.get("code");
    const reissued=await exchange({...tokenBody,code:reconnectCode});assert.equal(reissued.status,200);const connected=await reissued.json();
    assert.notEqual(connected.access_token.split(":")[1],latest.access_token.split(":")[1]);
    assert.equal((await (await rpc(connected.access_token,"tools/call",dailyParams)).json()).result.structuredContent.status,"ok");
    assert.equal((await rpc(latest.access_token,"tools/list")).status,401);
    assert.equal((await db.prepare("SELECT id FROM state WHERE id LIKE 'session:%'").all()).results.length,0);
  } finally {
    await mf.dispose();
  }
});

}
