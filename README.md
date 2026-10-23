# soxai-ring-mcp

SOXAI RINGの睡眠・活動データをAIから参照する、非公式の読み取り専用MCPサーバーです。
Streamable HTTPとOAuthに対応したMCPクライアントから接続して使えます。

## 接続する

| 設定 | 値 |
| --- | --- |
| 名前 | SOXAI RING MCP |
| サーバーURL | `https://soxai-mcp.fjm2u.net/mcp` |
| 接続方式 | Streamable HTTP（リモートMCP） |
| 認証 | OAuth |

1. 利用するAIアプリのMCPサーバー／コネクタ追加画面で、上記のURLを登録します。
2. OAuth認証を開始します。自動登録に対応したクライアントでは、Client ID・Secretの手入力は不要です。
3. ブラウザの接続画面で接続先と利用条件を確認し、SOXAIアプリのアカウントでログインします。
4. 元のAIアプリに戻り、SOXAIツールを有効にして「最近1週間の睡眠と活動を振り返って」と依頼します。

メニュー名や利用可否は、アプリのバージョン・プラン・管理者設定によって異なります。ローカルstdio専用クライアントや、リモートMCPのOAuthに対応していないクライアントには、このURLをそのまま登録できません。

### アプリ別の入口（例）

- **ChatGPT**：[Plugins](https://chatgpt.com/plugins)の **＋ → Add custom MCP server** から追加します。
- **Claude**：設定の **コネクタ** からカスタムコネクタを追加します。
- **その他のMCPクライアント**：リモートMCP（Streamable HTTP）とOAuthの対応を確認し、共通の設定値で追加します。個別アプリでの動作を一律に保証するものではありません。

### 再接続とデータの扱い

メールアドレスとパスワードはブラウザからSOXAIへ直接送信します。当サーバーは受け取りません。
SOXAIのトークンは、接続先クライアントが保持する接続トークンに結びつけて暗号化保存します。接続したアカウント自身のデータだけを取得します。
接続が切れた場合は、利用中のアプリのMCP／コネクタ設定から再接続してください。`no_data` は接続失敗ではなく、対象期間に測定データがない状態です。

[サービスの案内](https://soxai-mcp.fjm2u.net/) · [接続・運用ガイド](docs/web-mcp.md)

## できること

| Tool | 機能 |
| --- | --- |
| `get_health_data` | 日次・時刻別データ、指標の単位・説明、欠測情報の取得 |

日次は `days` で最大90日、時刻別は `hours` で最大48時間を指定できます。日付・日時による範囲指定も可能です。欠測は`null`で返します。
平均・推移・相関の分析はAI側で行います。単位は公式APIの定義を添え、未確認のものは`null`にします。詳細は[データ仕様](docs/data-contract.md)を参照してください。

## 開発・運用

Cloudflare WorkersがMCP・OAuthを提供します。KVに接続トークンで保護したSOXAI認証情報、D1に短期間の接続手続き情報を保存します。
サーバー実装は `web/` にあります。MCP OAuthの動的クライアント登録（DCR）とClient ID Metadata Document（CIMD）に対応します。リダイレクト先はHTTPSまたはHTTPのループバック（localhost・127.0.0.1・::1）を利用でき、クライアント別の許可リストは不要です。登録済みURIの検証とPKCE（S256）は必須です。独自URIスキームは認可先として許可しません。各アプリでの接続完了を保証するものではありません。

- [自分で配置する・認証情報の管理](docs/web-mcp.md)
- [開発・コントリビューション](CONTRIBUTING.md)
- [セキュリティとプライバシー](SECURITY.md)

## ライセンス・免責

[MIT](LICENSE)。[SOXAI公式HTTP API](https://web-api.soxai.site/docs)を利用します。SOXAI公式API本体は本リポジトリに含みません。
API利用条件は[公式の申請案内](https://github.com/soxaidev/web-api-docs/blob/main/support.mdx)をご確認ください。

個人が趣味で提供する非公式・無保証のサービスです。法令上許される範囲で、データの漏えい・消失などの損害について責任を負いません。
[利用条件・免責](https://soxai-mcp.fjm2u.net/terms)と[プライバシー](https://soxai-mcp.fjm2u.net/privacy)をご確認ください。
