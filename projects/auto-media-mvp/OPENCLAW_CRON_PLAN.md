# OPENCLAW_CRON_PLAN

OpenClaw cron で observatory を定期更新するための最小案。

## 目的
- collect
- rank generate
- site / premium artifact build
- 必要なら commit / push

を一発入口で回す。

## 追加した実行入口
### 1. build まで
```bash
cd projects/auto-media-mvp
npm run run:observatory
```

内容:
- `collect:techcrunch`
- `collect:hackernews`
- `collect:fed`
- `collect:openai`
- `collect:anthropic`
- `collect:bls`
- `collect:coingecko`
- `rank:generate`
- `site:build`

### 2. build + push
```bash
cd projects/auto-media-mvp
npm run run:observatory:push
```

内容:
- `run:observatory`
- `push:observatory`

## push:observatory の動き
- diff がなければ何もしない
- diff があれば observatory 関連パスを add
- commit message: `Refresh observatory outputs`
- `git push origin main`

## 推奨 cron 方針
### 安全寄り
- まずは `run:observatory` を cron 化
- push は人手確認

### 完全自動寄り
- 慣れたら `run:observatory:push` を cron 化
- Cloudflare Pages の自動 deploy とつなぐ

## 例: 1日2回更新イメージ
- 午前
- 夕方

## 注意
- collect の一部は外部到達性に依存する
- source によって新規件数ゼロは正常
- cron を完全自動 push にする場合、commit が頻繁になりすぎないか監視する
