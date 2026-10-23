// Landing page content is separate from the OAuth form and its browser code.
export const landingStyles = `
body.landing{--ink:#193e35;--muted:#58695f;--accent:#225b44;background:#f5f5ef;line-height:1.75}
.landing header,.landing main,.landing footer{max-width:1160px;padding-left:32px;padding-right:32px}
.landing header{padding-top:28px;padding-bottom:28px;gap:24px}
.landing .brand{display:inline-flex;align-items:center;gap:12px;font-size:14px;letter-spacing:.02em;color:var(--ink)}
.landing .brand-copy{display:flex;flex-direction:column;gap:3px}
.landing .brand-name{font-weight:650;white-space:nowrap}
.landing .brand-status{font-size:11px;font-weight:600;letter-spacing:.02em;color:#225b44}
.landing .unofficial-note{font-size:12px;color:var(--muted);line-height:1.8}
.landing nav{display:flex;align-items:center;gap:28px;font-size:13px}
.landing nav a{font-weight:500}.landing nav .nav-start{border-bottom:1px solid #a5b6a6;padding:4px 0}
.landing main{padding-top:48px;padding-bottom:72px}
.landing h1{font-size:clamp(36px,4.5vw,62px);font-weight:650;line-height:1.35;letter-spacing:-.045em;margin:22px 0 26px}
.landing h1 span{display:block}.landing h2{font-size:clamp(25px,3vw,34px);line-height:1.5;font-weight:600;letter-spacing:-.025em;margin:10px 0 18px}
.landing p{margin:0 0 18px}.landing section{background:none;border:0;padding:0;border-radius:0;margin:0}
.landing .eyebrow{font-size:10px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:#59715f}
.landing .hero{display:grid;grid-template-columns:1.05fr 1fr;gap:64px;align-items:center;padding-bottom:72px}
.landing .hero-copy{padding:14px 0}.landing .intro{color:var(--muted);font-size:16px;line-height:1.9;max-width:400px}
.landing .primary{display:inline-flex;align-items:center;justify-content:center;gap:30px;padding:15px 23px;background:var(--ink);border-radius:7px;font-size:14px;transition:background .15s}
.landing .primary:hover{background:#30634c}.landing .primary .arrow{font-size:21px;line-height:1}
.landing .hero-actions{margin-top:30px}.landing .hero-note{font-size:11px;color:var(--muted);margin-top:12px}
.landing .preview{margin:0;position:relative;background:#e5eadd;border:1px solid #d9dfd0;border-radius:20px;padding:29px 28px 24px}
.landing .preview-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:28px;font-size:10px;letter-spacing:.12em;color:#566451}
.landing .preview-top .pill{letter-spacing:.02em;font-size:10px;border:1px solid #c4cfbb;border-radius:20px;padding:3px 8px}
.landing .question{background:#fafbf6;border-radius:14px 14px 3px 14px;padding:15px 18px;font-size:15px;line-height:1.7;margin:0 0 26px 30px;box-shadow:0 2px 5px #223b2a06}
.landing .reply{padding:0 3px}.landing .reply-label{display:flex;align-items:center;gap:8px;font-size:10px;letter-spacing:.07em;margin-bottom:12px}
.landing .spark{font-size:20px}.landing .reply p{font-size:13px;line-height:1.85;margin-bottom:22px}
.landing .sample-chart{border-top:1px solid #cbd4c1;padding-top:16px;display:grid;grid-template-columns:repeat(7,1fr);gap:13px;align-items:end}
.landing .sample-chart .day{display:flex;flex-direction:column;align-items:center;gap:10px;font-size:9px;color:#60705d}
.landing .bar{width:100%;max-width:29px;height:var(--bar);background:#a1b391;border-radius:4px 4px 1px 1px}
.landing .day:nth-child(1){--bar:45px}.landing .day:nth-child(2){--bar:59px}.landing .day:nth-child(3){--bar:49px}.landing .day:nth-child(4){--bar:75px}.landing .day:nth-child(5){--bar:60px}.landing .day:nth-child(6){--bar:83px}.landing .day:nth-child(7){--bar:65px}
.landing .day:nth-child(4) .bar,.landing .day:nth-child(6) .bar{background:#4d6a4e}
.landing .preview figcaption{font-size:10px;color:#63705f;margin-top:18px;text-align:center}
.landing .prompt-list{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid #d9dfd3;border-bottom:1px solid #d9dfd3;padding:27px 0;margin-bottom:76px;gap:28px}
.landing .prompt-list div+div{border-left:1px solid #d9dfd3;padding-left:28px}
.landing .prompt-list small{display:block;font-size:10px;letter-spacing:.09em;color:var(--muted);margin-bottom:7px}
.landing .prompt-list p{font-size:14px;line-height:1.8;margin:0}
.landing #connect{scroll-margin-top:24px;display:grid;grid-template-columns:.85fr 1.15fr;gap:64px;background:#fff;border:1px solid #e0e5da;border-radius:16px;padding:38px;margin-bottom:68px}
.landing .connect-intro p{font-size:13px;color:var(--muted);margin:0;max-width:300px}
.landing .connect-controls{min-width:0}.landing .connect-controls>p{font-size:13px;line-height:1.85;margin:0 0 15px}
.landing .endpoint{background:#f5f6f0;border:1px solid #dce2d6;border-radius:7px;display:flex;align-items:center;padding:6px;gap:6px}
.landing .endpoint input{background:transparent;border:0;border-radius:3px;padding:7px 8px;margin:0;min-width:0;font:11px/1.6 ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--ink);flex:1;width:100%}
.landing .copy{background:white;color:var(--ink);border:1px solid #d4ddcb;white-space:nowrap;border-radius:5px;padding:8px 10px;font-size:11px;font-weight:500}
.landing .copy:hover{background:#eaf0e3}.landing .copy-status{font-size:11px;min-height:20px;margin-top:4px;color:var(--muted)}
.landing .open-chat{font-size:13px;font-weight:600;display:inline-flex;gap:12px;align-items:center;margin-top:6px}
.landing .availability{font-size:10px;color:var(--muted);line-height:1.7;margin:12px 0 0}
.landing #privacy{scroll-margin-top:24px;display:grid;grid-template-columns:.85fr 1.15fr;gap:64px;margin:0 38px}
.landing #privacy h2{font-size:27px}.landing .privacy-list{list-style:none;margin:0;padding:0}
.landing .privacy-list li{padding:0 0 18px;display:grid;grid-template-columns:20px 1fr;gap:12px}
.landing .check{font-size:13px;color:#58734d;margin-top:3px}.landing .privacy-list strong{display:block;font-size:13px;font-weight:600;margin-bottom:3px}
.landing .privacy-list p{font-size:12px;color:var(--muted);line-height:1.8;margin:0}
.landing .privacy-link{font-size:12px;margin-left:32px}
.landing footer{border-top:1px solid #d9dfd3;padding-top:26px;padding-bottom:28px;display:grid;grid-template-columns:1fr auto;column-gap:40px;row-gap:16px;font-size:11px}
.landing footer .disclaimer{font-size:10px;line-height:1.9;color:var(--muted);max-width:720px;margin:0;grid-column:1/-1}
.landing .footer-links{display:flex;gap:22px}.landing footer .footer-brand{font-weight:600;letter-spacing:.03em}
.landing button:focus-visible,.landing a:focus-visible,.landing input:focus-visible{outline:3px solid #ac7936;outline-offset:4px}
@media(max-width:900px){.landing .hero{gap:32px}.landing #connect,.landing #privacy{gap:32px}.landing .preview{padding:24px 20px}.landing .question{margin-left:14px;font-size:14px}.landing .endpoint{flex-wrap:wrap}.landing .endpoint input{flex-basis:100%}.landing .copy{width:100%}.landing .intro br{display:none}}
@media(max-width:680px){.landing header,.landing main,.landing footer{padding-left:24px;padding-right:24px}.landing header{padding-top:24px;padding-bottom:20px}.landing .brand{font-size:12px;gap:10px}.landing .brand-mark{width:21px;height:21px;border-width:4px}.landing nav{gap:15px;font-size:11px}.landing nav .privacy-nav{display:none}.landing main{padding-top:26px;padding-bottom:44px}.landing .hero{grid-template-columns:1fr;gap:32px;padding-bottom:38px}.landing .hero-copy{padding:0}.landing h1{font-size:clamp(33px,8.8vw,49px);margin:18px 0 20px;line-height:1.4}.landing .intro{font-size:14px;max-width:360px}.landing .hero-actions{margin-top:23px}.landing .hero-note{font-size:10px}.landing .preview{padding:24px}.landing .preview-top{margin-bottom:24px}.landing .question{margin-left:26px}.landing .prompt-list{grid-template-columns:1fr;gap:18px;padding:24px 0;margin-bottom:38px}.landing .prompt-list div+div{border-left:0;padding-left:0}.landing .prompt-list>div{display:grid;grid-template-columns:60px 1fr;gap:12px}.landing .prompt-list small{margin:4px 0 0}.landing .prompt-list p{font-size:13px}.landing #connect{grid-template-columns:1fr;padding:24px;gap:22px;margin-bottom:38px;border-radius:12px}.landing h2{font-size:26px;margin-bottom:12px}.landing .endpoint input{font-size:10px}.landing #privacy{grid-template-columns:1fr;gap:10px;margin:0}.landing #privacy h2{font-size:25px}.landing #privacy h2 br{display:none}.landing .privacy-list li{padding-bottom:18px}.landing footer{grid-template-columns:1fr;gap:13px}.landing footer .disclaimer{grid-column:1}.landing .footer-links{gap:20px}.landing .availability{font-size:10px}}
@media(prefers-reduced-motion:reduce){.landing *{transition:none!important}}
`;

export const landingHeader = `<a class="brand" href="/" aria-label="SOXAI RING MCP ホーム"><span class="brand-copy"><span class="brand-name">SOXAI RING MCP</span><span class="brand-status">非公式のMCP連携</span></span></a><nav aria-label="メインナビゲーション"><a class="privacy-nav" href="#privacy">データの扱い</a><a class="nav-start" href="#connect">AIに接続する <span aria-hidden="true">↗</span></a></nav>`;

export const landingBody = (escapedEndpoint: string) => `
<section class="hero" aria-labelledby="hero-title">
  <div class="hero-copy">
    <div class="eyebrow">非公式プロジェクト / SOXAI RING MCP</div>
    <h1 id="hero-title"><span>からだの記録を、</span><span>AIとの会話に。</span></h1>
    <p class="intro">SOXAI RINGで測った睡眠や活動を、お使いのAIへ。<br>気になることを、いつもの言葉で聞いてみよう。</p>
    <p class="unofficial-note">個人が開発・運営する非公式の連携ツールです。<br>SOXAI社の公式サービスではなく、同社との提携はありません。</p>
    <div class="hero-actions"><a class="button primary" href="#connect">AIに接続する <span class="arrow" aria-hidden="true">↗</span></a></div>
    <p class="hero-note">ブラウザで接続。お使いのSOXAIアカウントで。</p>
  </div>
  <figure class="preview" aria-label="会話の利用イメージ。実際の測定値ではありません。">
    <div class="preview-top"><span>YOUR WEEK, IN CONVERSATION</span><span class="pill">SOXAI RING</span></div>
    <blockquote class="question">最近1週間の睡眠と活動を<br>振り返って。</blockquote>
    <div class="reply"><div class="reply-label"><span class="spark" aria-hidden="true">✳</span> AI</div><p>睡眠と活動の記録を並べて、<br>1週間の傾向を見てみましょう。</p></div>
    <div class="sample-chart" aria-hidden="true"><div class="day"><span class="bar"></span>MON</div><div class="day"><span class="bar"></span>TUE</div><div class="day"><span class="bar"></span>WED</div><div class="day"><span class="bar"></span>THU</div><div class="day"><span class="bar"></span>FRI</div><div class="day"><span class="bar"></span>SAT</div><div class="day"><span class="bar"></span>SUN</div></div>
    <figcaption>利用イメージです。実際の測定データではありません。</figcaption>
  </figure>
</section>
<div class="prompt-list" aria-label="AIへの質問例">
  <div><small>睡眠</small><p>最近、睡眠のリズムは<br>どう変わった？</p></div>
  <div><small>活動</small><p>よく歩いた日と睡眠には、<br>どんな関係がある？</p></div>
  <div><small>振り返り</small><p>先週と比べて、<br>変わったところを教えて。</p></div>
</div>
<section id="connect" aria-labelledby="connect-title">
  <div class="connect-intro"><div class="eyebrow">GET CONNECTED</div><h2 id="connect-title">お使いのAIと繋ぐ。</h2><p>リモートMCPとOAuthに対応した<br>AIアプリから利用できます。</p></div>
  <div class="connect-controls"><p>お使いのAIアプリのMCPサーバー／コネクタ設定に下のURLを追加し、認証に <strong>OAuth</strong> を選んでください。接続画面でSOXAIアカウントを認証します。</p>
    <div class="endpoint"><input id="mcp-url" type="text" aria-label="MCPサーバーURL" value="${escapedEndpoint}" readonly spellcheck="false"><button id="copy-url" class="copy" type="button">URLをコピー</button></div>
    <div id="copy-status" class="copy-status" role="status" aria-live="polite"></div>
    <p class="availability">例：ChatGPTは「Add custom MCP server」、Claudeは設定の「コネクタ」から追加できます。</p>
    <p class="availability">対応状況や追加メニューは、アプリ・利用プラン・管理者設定によって異なります。</p>
  </div>
</section>
<section id="privacy" aria-labelledby="privacy-title">
  <div><div class="eyebrow">YOUR DATA, YOUR ACCOUNT</div><h2 id="privacy-title">自分の記録を、<br>自分のために。</h2></div>
  <div><ul class="privacy-list">
    <li><span class="check" aria-hidden="true">✓</span><div><strong>取得するのは、ご自身のデータだけ。</strong><p>接続したアカウントに限定した、読み取り専用の連携です。</p></div></li>
    <li><span class="check" aria-hidden="true">✓</span><div><strong>パスワードは、SOXAIへ直接。</strong><p>ブラウザからSOXAIへ送信し、本サービスのサーバーには送信・保存しません。</p></div></li>
    <li><span class="check" aria-hidden="true">✓</span><div><strong>トークンは、接続に結びつけて暗号化。</strong><p>接続先AIアプリの接続トークンで保護し、データの取得・更新時に復号します。測定値は本サービスのデータベースに保存しません。</p></div></li>
  </ul><a class="privacy-link" href="/privacy">認証情報とデータの扱いを詳しく見る <span aria-hidden="true">↗</span></a></div>
</section>`;

export const landingFooter = `<span class="footer-brand">SOXAI RING MCP <span class="muted">／ 非公式プロジェクト</span></span><div class="footer-links"><a href="/privacy">プライバシー</a><a href="/terms">利用条件・免責</a></div><p class="disclaimer">個人の趣味で提供する非公式・無保証のサービスです。SOXAI社との提携はありません。法令上許される範囲で、データの漏えい・消失等の損害について責任を負いません。AIの回答は医療上の診断・治療を目的としません。</p>`;

export const landingScript = `
const copyButton=document.getElementById("copy-url"),urlField=document.getElementById("mcp-url"),copyStatus=document.getElementById("copy-status");
copyButton.addEventListener("click",async()=>{
 try{await navigator.clipboard.writeText(urlField.value);copyStatus.textContent="URLをコピーしました。";}
 catch{urlField.focus();urlField.select();copyStatus.textContent="URLを選択しました。端末のコピー操作を使ってください。";}
});`;
