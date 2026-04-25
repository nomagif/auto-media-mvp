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

### 3. prose 自動化（内部用）
```bash
cd projects/auto-media-mvp
npm run generate:prose:auto:cron
```

内容:
- `run_prose_pipeline.js --limit 3`
- summary/title/xpost/article/image prompt を OpenClaw worker で内部処理
- 既存 response をむやみに apply せず、その回で処理した item のみ apply

意図:
- いきなり大量処理しない
- cron 1回あたりの負荷とコストを抑える
- stuck item が出ても blast radius を小さくする

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
- prose は別 job として `generate:prose:auto:cron` を小さめ頻度で追加
- push は人手確認

### 完全自動寄り
- 慣れたら `run:observatory:push` を cron 化
- prose も段階的に `generate:prose:auto:cron` を定期実行
- Cloudflare Pages の自動 deploy とつなぐ

## cron 追加例
まずは 1日2回くらいから始めるのが無難。

```bash
openclaw cron add \
  --name "auto-media-mvp prose automation" \
  --description "Run internal OpenClaw prose worker pipeline with a small batch" \
  --agent main \
  --session isolated \
  --cron "15 10,22 * * *" \
  --tz "Asia/Tokyo" \
  --expect-final \
  --light-context \
  --timeout-seconds 1800 \
  --message "cd /Users/noma/.openclaw/workspace/projects/auto-media-mvp && npm run generate:prose:auto:cron"
```

※ 実際に cron を作る前に、まず手動で `npm run generate:prose:auto:cron` が安定することを確認する。

## 例: 1日2回更新イメージ
- 午前
- 夕方

## 注意
- collect の一部は外部到達性に依存する
- source によって新規件数ゼロは正常
- cron を完全自動 push にする場合、commit が頻繁になりすぎないか監視する
