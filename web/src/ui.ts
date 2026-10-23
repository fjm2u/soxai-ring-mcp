import { random } from "./store";
import { landingStyles, landingHeader, landingBody, landingFooter, landingScript } from "./landing";
export const escape = (s: string) => s.replace(/[&<>"']/g, c => "&#" + c.charCodeAt(0) + ";");
export function page(body: string, status = 200, headers: Record<string, string> = {}, script = "", landing = false) {
  const nonce = random();
  return new Response(`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${landing ? "SOXAI RINGの記録を、AIとの会話に。 | SOXAI RING MCP" : "SOXAI RING MCP"}</title>${landing ? '<meta name="description" content="SOXAI RINGの睡眠・活動データをMCP対応のAIで振り返る、非公式の読み取り専用MCPサーバー。ブラウザから接続し、気になることをいつもの言葉で。">' : ""}<style nonce="${nonce}">
:root{color-scheme:light;--ink:#183c36;--muted:#526861;--accent:#176b56}*{box-sizing:border-box}body{margin:0;background:#f4f5ef;color:var(--ink);font:16px/1.8 system-ui,sans-serif}header,main,footer{max-width:900px;margin:auto;padding:24px}header{display:flex;justify-content:space-between;align-items:center}a{color:var(--accent);text-underline-offset:4px}header a{text-decoration:none;font-weight:700}small,.muted{color:var(--muted)}main{padding-top:36px;padding-bottom:64px}h1{font-size:clamp(30px,6vw,52px);line-height:1.3;letter-spacing:-.035em;margin:12px 0 24px}h2{font-size:23px;line-height:1.5}p{max-width:680px}section,.card{background:white;border:1px solid #dce5dc;border-radius:20px;padding:28px;margin:24px 0}form{max-width:480px;margin:auto}label{display:block;margin:18px 0;font-weight:600}input:not([type=checkbox]):not([type=hidden]){display:block;width:100%;font:inherit;padding:12px;border:1px solid #a4b7ad;border-radius:9px;margin-top:6px}button,.button{display:inline-block;background:var(--accent);color:white;border:0;border-radius:10px;padding:13px 22px;font:600 16px/1.5 system-ui;cursor:pointer;text-decoration:none}button:disabled{opacity:.55;cursor:wait}.auth-flow{margin:24px 0;background:#eaf0e8;border-radius:12px;padding:16px}.auth-flow>div{display:grid;grid-template-columns:1fr 1.6fr 1fr;align-items:center;text-align:center;gap:8px;margin:8px 0;font-size:14px}.flow-arrow{display:flex;flex-direction:column;line-height:1.3;font-size:24px}.flow-arrow small{font-size:11px}.auth-flow figcaption{font-size:12px;color:var(--muted);line-height:1.6;margin-top:14px}.secondary{background:#e9eee8;color:var(--ink)}.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px}code{display:block;overflow-wrap:anywhere;background:#eef3ed;padding:14px;border-radius:10px;font-size:14px}ol{padding-left:24px}li{padding:5px 0}.consent{font-size:14px;font-weight:400}.error{color:#9f2828;min-height:1.8em}footer{border-top:1px solid #d6dfd5;font-size:13px;display:flex;gap:20px;flex-wrap:wrap}input:focus-visible,button:focus-visible,a:focus-visible{outline:3px solid #bd8727;outline-offset:3px}@media(max-width:520px){header,main,footer{padding-left:20px;padding-right:20px}section,.card{padding:20px}header small{font-size:11px}}
${landing ? landingStyles : ""}</style></head><body${landing ? ' class="landing"' : ""}><header>${landing ? landingHeader : '<a href="/">SOXAI RING MCP</a><small>非公式・個人プロジェクト</small>'}</header><main>${body}</main><footer>${landing ? landingFooter : '<span>SOXAI公式のサービスではありません。</span><a href="/privacy">プライバシー</a><a href="/terms">利用条件・免責</a>'}</footer>${script ? `<script nonce="${nonce}">${script}</script>` : ""}</body></html>`, { status, headers: {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Security-Policy": `default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'; connect-src 'self' https://web-api.soxai.site; form-action 'none'; frame-ancestors 'none'; base-uri 'none'`,
    ...headers,
  }});
}
export function home(publicUrl: string) {
  return page(landingBody(escape(publicUrl + "/mcp")), 200, {}, landingScript, true);
}
export function legal(path: string) {
  return page(path === "/terms" ? `<h1>利用条件・免責</h1><section><h2>個人の趣味プロジェクトです</h2><p>本サービスは個人が趣味で開発・運営する非公式プロジェクトであり、SOXAI社との提携・保証はありません。ご自身が利用する権限を持つアカウントでのみ接続してください。</p><p>正確性、安全性、継続提供、特定の目的への適合性を保証しません。予告なく変更・停止する場合があります。AIによる分析は医療上の診断・治療・助言を目的としません。</p><h2>責任の範囲</h2><p>法令上許される範囲で、データの流出・漏えい・消失、不正アクセス、サービスの停止、出力内容の誤り、その他本サービスの利用により生じた損害について、運営者は責任を負いません。法令により免責が認められない責任は、この免責の対象外です。</p></section>` : `<h1>プライバシー</h1><section><h2>ログインと保存</h2><p>メールアドレスとパスワードは、お使いのブラウザからSOXAIのAPIに直接送信します。当サービスのサーバーに送信・保存しません。ブラウザの永続ストレージにも保存しません。</p><p>SOXAIが発行する認証・更新トークンは当サーバーに送信し、本人確認後、接続先AIサービスが保持する接続トークンに結びつけて暗号化し、KVに保存します。データ取得用と更新用の情報は別々に保護します。アカウント識別子も暗号化した接続情報に含まれます。サーバーは要求時に復号するため、稼働中のサーバー侵害まで防ぐものではありません。</p><h2>健康データとインフラ</h2><p>健康データは要求されたときにSOXAIから取得し、接続を許可したAIサービスに返します。当サービスのデータベースには測定値を保存しません。AIサービスでの会話・データ保存には、その提供元の規約が適用されます。</p><p>サーバーはCloudflare Workers・D1・KVを使用します。認証情報や測定値をアプリケーションログに出力しません。不正利用対策として、IPアドレスから生成した一時的な識別値を使用します。インフラ事業者が通信情報を処理する場合があります。</p><h2>接続期限と解除</h2><p>接続の有効期間は最大30日です。アクセストークンは最大15分で失効し、接続の更新時にSOXAIトークンも更新します。D1には短期間の接続手続き情報を保存し、期限切れ行は認証処理時に削除します。接続先AIサービス側の接続解除で当サービスへのアクセスを停止できますが、保存済みSOXAI接続情報の即時削除を保証するものではありません。</p></section>`);
}
export function loginPage(client: string, flow: string, csrf: string, cookie: string, redirectUri: string) {
  return page(`<form id="connect-form"><small>AIサービスとの接続</small><h1>SOXAIと繋ぐ</h1><p><strong>${escape(client)}</strong>に、ご自身の睡眠・活動などのデータの読み取りを許可します。接続後は ${escape(new URL(redirectUri).origin)} に戻ります。クライアント名は接続元の申告です。自分で接続を開始したサービスか、戻り先も確認してください。</p><figure class="auth-flow" aria-label="認証情報の流れ"><div><span>このブラウザ</span><span class="flow-arrow"><small>メール・パスワード</small>→</span><span>SOXAI</span></div><div><span>このブラウザ</span><span class="flow-arrow"><small>取得したトークン</small>→</span><span>本サービス</span></div><div><span>接続先AIサービス</span><span class="flow-arrow"><small>接続トークンで復号</small>→</span><span>本サービス</span></div><figcaption>パスワードはSOXAIへ直接送信。SOXAIのトークンは接続先AIサービスの接続トークンに結びつけて暗号化し、データ取得・更新の際に復号します。</figcaption></figure><input type="hidden" name="flow" value="${flow}"><input type="hidden" name="csrf" value="${csrf}"><label>メールアドレス<input id="email" type="email" autocomplete="username" maxlength="320" required></label><label>パスワード<input id="password" type="password" autocomplete="current-password" maxlength="4096" required></label><label class="consent"><input id="consent" type="checkbox" required> <a href="/terms" target="_blank" rel="noopener">利用条件・免責</a>と<a href="/privacy" target="_blank" rel="noopener">プライバシー</a>を確認し、同意します。</label><p id="status" class="error" role="status" aria-live="polite"></p><div class="actions"><button type="submit" value="allow" disabled>繋ぐ</button><button type="submit" value="deny" class="secondary" formnovalidate disabled>キャンセル</button></div><noscript>接続にはJavaScriptを有効にしてください。</noscript></form>`, 200, { "Set-Cookie": cookie }, `
const form=document.getElementById("connect-form"),buttons=form.querySelectorAll("button"),status=document.getElementById("status");
let busy=false;for(const b of buttons)b.disabled=false;
form.addEventListener("submit",async event=>{
 event.preventDefault();if(busy)return;busy=true;for(const b of buttons)b.disabled=true;
 status.textContent="";
 const action=event.submitter?.value||"allow";
 try{
  const payload={flow:form.elements.flow.value,csrf:form.elements.csrf.value,action,consent:document.getElementById("consent").checked};
  if(action==="allow"){
   const credentials={email:document.getElementById("email").value.trim(),password:document.getElementById("password").value,returnSecureToken:true};
   let response;
   try{response=await fetch("https://web-api.soxai.site/api/login",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"omit",redirect:"error",signal:AbortSignal.timeout(20000),body:JSON.stringify(credentials)});}
   finally{credentials.password="";document.getElementById("password").value="";}
   if(!response.ok)throw Error("SOXAIにログインできませんでした。入力内容を確認して、再度お試しください。");
   const tokens=await response.json();payload.idToken=tokens.idToken;payload.refreshToken=tokens.refreshToken;
  }
  const response=await fetch("/connect",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",redirect:"error",signal:AbortSignal.timeout(60000),body:JSON.stringify(payload)});
  delete payload.idToken;delete payload.refreshToken;
  if(!response.ok)throw Error("接続できませんでした。再度お試しください。改善しない場合は接続元のAIサービスから接続をやり直してください。");
  const result=await response.json();
  if(action==="deny"){location.assign("/");return;}
  const target=new URL(result.redirectTo),expected=new URL(${JSON.stringify(redirectUri).replace(/</g, "\\u003c")});
  if(target.origin!==expected.origin||target.pathname!==expected.pathname||target.hash||target.username||target.password||[...expected.searchParams].some(([key,value])=>target.searchParams.get(key)!==value))throw Error("接続先を確認できませんでした。");
  location.assign(target.href);
 }catch(error){status.textContent=error instanceof Error&&error.message.startsWith("SOXAI")?error.message:"接続できませんでした。接続元のAIサービスから接続をやり直してください。";busy=false;for(const b of buttons)b.disabled=false;}
});`);
}
