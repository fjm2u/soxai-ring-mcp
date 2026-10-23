import OAuthProvider, {
  type AuthRequest,
  type OAuthHelpers,
} from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { type Env, hash, random, read, put, rate } from "./store";
import { connectTokens, SafeError, type AccessSession } from "./soxai";
import { measurements } from "./metrics";
import { dailyInput, intradayInput, pageInput, toolError, measurementsOutput } from "./tool-contract";
import { accessSession, tokenExchange } from "./auth";
interface AuthEnv extends Env {
  OAUTH_PROVIDER: OAuthHelpers;
}
const SCOPE = "soxai.read",
  COOKIE = "__Host-soxai-flow";
import { page, escape, home, legal, loginPage } from "./ui";
interface Flow {
  auth: AuthRequest;
  csrf: string;
}
const defaultHandler: ExportedHandler<AuthEnv> = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/healthz") return new Response("ok");
    if (url.pathname === "/") return home(env.PUBLIC_URL);
    if (["/terms", "/privacy"].includes(url.pathname)) return legal(url.pathname);
    if (url.pathname === "/authorize" && request.method === "GET") {
      if (!(await rate(env, request))) return page("<p>Try again later.</p>", 429);
      const auth = await env.OAUTH_PROVIDER.parseAuthRequest(request);
      if (
        auth.resource !== env.PUBLIC_URL + "/mcp" ||
        !auth.scope.includes(SCOPE) ||
        auth.scope.some((s) => s !== SCOPE && s !== "offline_access") ||
        auth.codeChallengeMethod !== "S256"
      )
        return page("<p>Invalid connection request.</p>", 400);
      const client = await env.OAUTH_PROVIDER.lookupClient(auth.clientId);
      if (!client) return page("<p>Unknown client.</p>", 400);
      const flow = random(),
        csrf = random();
      await put(
        env,
        "flow:" + (await hash(flow)),
        { auth, csrf: await hash(csrf) },
        600,
      );
      return loginPage(client.clientName ?? "MCP client", flow, csrf,
        COOKIE + "=" + csrf + "; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=600", auth.redirectUri);
    }
    if (url.pathname === "/connect" && request.method === "POST") {
      if (request.headers.get("Origin") !== env.PUBLIC_URL)
        return page("<p>Invalid request.</p>", 403);
      if (request.headers.get("Content-Type")?.split(";")[0] !== "application/json")
        return page("<p>Invalid request.</p>", 400);
      const form = await request.json() as Record<string, unknown>;
      if (!form || typeof form !== "object" || Object.keys(form).some(k => !["flow", "csrf", "action", "consent", "idToken", "refreshToken"].includes(k)))
        return page("<p>Invalid request.</p>", 400);
      const flow = String(form.flow ?? ""), csrf = String(form.csrf ?? "");
      if (
        !/^[A-Za-z0-9_-]{43}$/.test(flow) ||
        !/^[A-Za-z0-9_-]{43}$/.test(csrf)
      )
        return page("<p>Invalid request.</p>", 400);
      const cookie = request.headers
        .get("Cookie")
        ?.split(";")
        .map((v) => v.trim())
        .find((v) => v.startsWith(COOKIE + "="))
        ?.slice(COOKIE.length + 1);
      if (cookie !== csrf) return page("<p>Invalid request.</p>", 403);
      const key = "flow:" + (await hash(flow)),
        pending = await read<Flow>(env, key);
      if (!pending || pending.csrf !== (await hash(csrf)))
        return page(
          "<p>Connection expired. Start again from your AI service.</p>",
          400,
        );
      if (form.action === "deny") {
        await read<Flow>(env, key, true);
        return Response.json({ cancelled: true });
      }
      if (form.action !== "allow" || form.consent !== true)
        return page("<p>Consent required.</p>", 400);
      if (!(await rate(env, request))) return page("<p>Try again later.</p>", 429);
      const session = await connectTokens(form.idToken, form.refreshToken);
      const owner = await hash(session.uid);
      // Consume only after verification. Concurrent submissions cannot grant twice.
      const state = await read<Flow>(env, key, true);
      if (!state || state.csrf !== pending.csrf)
        return page("<p>Connection expired.</p>", 400);
      const result = await env.OAUTH_PROVIDER.completeAuthorization({
        request: state.auth,
        userId: owner,
        metadata: {},
        scope: [SCOPE],
        props: { version: 2, ...session },
      });
      return Response.json({ redirectTo: result.redirectTo }, {
        headers: {
          "Set-Cookie":
            COOKIE + "=; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
        },
      });
    }
    return page("<p>Not found.</p>", 404);
  },
};
const apiHandler: Required<Pick<ExportedHandler<AuthEnv>, "fetch">> = {
  async fetch(request, env, ctx) {
    const principal = ctx as unknown as {
      props?: unknown;
      auth?: { scope?: string[]; userId?: string };
    };
    const session = await accessSession(principal.props, principal.auth?.userId);
    if (!session || !principal.auth?.scope?.includes(SCOPE))
      return new Response("Unauthorized", { status: 401, headers: {
        "WWW-Authenticate": `Bearer error="invalid_token", resource_metadata="${env.PUBLIC_URL}/.well-known/oauth-protected-resource"`,
      } });
    const server = new McpServer(
      { name: "soxai-ring-mcp", version: "0.1.0" },
      {
        instructions:
          "Unofficial read-only SOXAI integration. Use get_health_data for measurements and metric definitions. Compute aggregates and analysis in the client. Units are API-native; unknown definitions remain null. Missing data is not zero. Do not diagnose or prescribe. Never ask for credentials in chat.",
      },
    );
    const annotations = {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    };
    const run =
      (fn: (s: AccessSession) => Promise<unknown>) =>
      async () => {
        try {
          const value = await fn(session);
          return {
            content: [{ type: "text" as const, text: JSON.stringify(value) }],
            structuredContent: value as Record<string, unknown>,
          };
        } catch (e) {
          const code = e instanceof SafeError ? e.message : "INTERNAL_ERROR";
          const error = toolError(code);
          return {
            isError: true,
            content: [{ type: "text" as const, text: JSON.stringify(error) }],
            structuredContent: error,
          };
        }
      };
    server.registerTool(
      "get_health_data",
      {
        title: "Get SOXAI health data",
        outputSchema: measurementsOutput,
        description:
          "Read daily or intraday measurements for the connected account. Daily: up to 90 days, default last 7 completed days. Intraday: up to 48 hours, default last 24 hours. Omit metrics to receive all observed numeric fields; available_metrics includes documented units, meanings and counts for the full range; coverage describes missing dates and partial days. Compute trends in the client. No separate discovery or connection call needed. Continue by copying next_request unchanged.",
        annotations,
        inputSchema: z.object({
          kind: z.enum(["daily", "intraday"]).default("daily").describe("daily: use days or dates. intraday: use hours or both datetimes. Default: daily."),
          ...dailyInput,
          ...intradayInput,
          ...pageInput,
        }).strict(),
      },
      (args) => run((s) => measurements(s, args.kind, args))(),
    );
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    await server.connect(transport);
    try {
      return await transport.handleRequest(request);
    } finally {
      await server.close();
    }
  },
};
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    let response: Response;
    const url = new URL(request.url);
    // These endpoints use bearer/client credentials, never browser cookies.
    const cors = ["/mcp", "/register", "/token", "/.well-known/oauth-authorization-server", "/.well-known/oauth-protected-resource", "/.well-known/oauth-protected-resource/mcp"].includes(url.pathname);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type, MCP-Protocol-Version, MCP-Session-Id, Last-Event-ID",
      "Access-Control-Expose-Headers": "WWW-Authenticate, MCP-Session-Id, MCP-Protocol-Version",
    };
    try {
      if (
        ![env.PUBLIC_URL, env.LEGACY_URL].includes(url.origin) ||
        url.protocol !== "https:"
      )
        return new Response("Not found", { status: 404 });
      env = { ...env, PUBLIC_URL: url.origin };
      const origin = request.headers.get("Origin");
      if (origin && origin !== env.PUBLIC_URL && !cors)
        return new Response("Invalid origin", { status: 403 });
      if (cors && request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
      if (request.body) {
        const reader = request.body.getReader();
        const chunks: Uint8Array[] = [];
        let length = 0;
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          length += value.length;
          if (length > 32768) {
            await reader.cancel();
            return new Response("Request too large", { status: 413 });
          }
          chunks.push(value);
        }
        const body = new Uint8Array(length);
        let offset = 0;
        for (const c of chunks) {
          body.set(c, offset);
          offset += c.length;
        }
        request = new Request(request, { body });
      }
      if (url.pathname === "/register" && !(await rate(env, request)))
        return new Response("Try again later", { status: 429 });
      const provider = new OAuthProvider<AuthEnv>({
        apiRoute: "/mcp",
        apiHandler,
        defaultHandler,
        authorizeEndpoint: "/authorize",
        tokenEndpoint: "/token",
        clientRegistrationEndpoint: "/register",
        clientIdMetadataDocumentEnabled: true,
        scopesSupported: [SCOPE],
        requiredScopes: [SCOPE],
        accessTokenTTL: 900,
        tokenExchangeCallback: tokenExchange,
        refreshTokenTTL: 30 * 86400,
        clientRegistrationTTL: undefined,
        disallowPublicClientRegistration: false,
        resourceMetadata: {
          resource: env.PUBLIC_URL + "/mcp",
          authorization_servers: [env.PUBLIC_URL],
        },
        onError: ({ code, status, headers }) =>
          new Response(JSON.stringify({ error: code }), {
            status,
            headers: { ...headers, "Content-Type": "application/json" },
          }),
      });
      response = await provider.fetch(request, { ...env } as AuthEnv, ctx);
    } catch (e) {
      response = page(
        "<p>" +
          escape(e instanceof SafeError ? e.message : "Connection failed") +
          ". Start again from your AI service.</p>",
        400,
      );
    }
    const headers = new Headers(response.headers);
    if (cors) for (const [key, value] of Object.entries(corsHeaders)) headers.set(key, value);
    headers.set("Cache-Control", "no-store");
    // no-referrer turns native form POST Origin into null in browsers.
    // Preserve same-origin submissions without sending referrers to other sites.
    headers.set("Referrer-Policy", new URL(request.url).pathname === "/authorize" ? "same-origin" : "no-referrer");
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(response.body, { status: response.status, headers });
  },
} satisfies ExportedHandler<Env>;
