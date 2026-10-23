# コントリビューション

不具合報告には再現手順と期待する動作を添えてください。認証情報や実際の健康データを含めず、合成データを使用します。

## 開発環境

Node.js 24、npm、Gitを使用します。

```sh
cd web
npm ci
npm run check
npm test
```

テストはモックと合成データで動作し、CloudflareやSOXAIへのログインは不要です。
OAuth、接続トークンによる暗号化、アカウント分離、更新・再接続、欠測・日付・ページ分割を検証します。
CIも同じコマンドを実行します。

## 構成

- `web/src/` — MCP・OAuth・SOXAI API連携・Web画面
- `web/test/` — データ処理と認証のテスト
- `web/skills/` — 分析用Skill（セットアップ用Skillなし）
- `web/schema.sql` — D1のスキーマ
- `web/package_plugin.py` — ChatGPTから取得したPlugin ZIPにSkillを同梱する補助ツール（Python 3.11以上、標準ライブラリのみ）

依存を変更したら `web/package-lock.json` も更新してください。
Plugin ZIPの作成にはPythonを使用します。サーバーはCloudflare Workersで動作します。
配置手順は[運用ガイド](docs/web-mcp.md)を参照してください。
