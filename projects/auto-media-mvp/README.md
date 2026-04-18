# auto-media-mvp

海外テックニュース・仮想通貨・SNSトレンドを収集し、日本語要約・記事下書き・SNS投稿案へ変換するためのMVPプロジェクト。

## 目的
- 情報収集を自動化する
- 日本語で価値ある形に再構成する
- 投稿前の下書き生成までを安定化する

## MVPスコープ
- 収集: TechCrunch RSS / Hacker News / CoinGecko / Product Hunt
- 生成: 日本語要約 / 記事下書き / X投稿案 / 画像生成プロンプト
- 運用: 収集・生成・レビュー通知を分離

## ディレクトリ概要
- `config/`: ソースや閾値設定
- `prompts/`: 生成プロンプト
- `data/`: raw / normalized / candidates / processed / published
- `drafts/`: note / wordpress / x 向け下書き
- `state/`: 重複防止・キュー・最終実行状態
- `logs/`: 実行ログ
- `scripts/`: collect / normalize / generate / publish

## 基本フロー
1. collect: 新規データを取得して raw / normalized に保存
2. generate: 候補抽出し、要約・下書き・X文・画像プロンプトを生成
3. review: pending を人が確認しやすくまとめる

## いま入っている雛形
- `scripts/collect/techcrunch_rss.js`: TechCrunch RSS を取得して raw / normalized 保存
- `scripts/collect/hackernews_topstories.js`: Hacker News Top Stories を取得して raw / normalized 保存
- `scripts/generate/normalize_to_draft.js`: 未処理の normalized JSON 複数ファイルから draft Markdown を生成し、publish queue を更新
- `scripts/generate/enrich_from_sources.js`: manifest + normalized + draft を束ねて enrich し、summary は生成アダプタ経由で出力
- `scripts/generate/lib_summary.js`: summary 生成アダプタ。将来のLLM呼び出し差し替えポイント
- `state/seen_urls.json`: URL重複除外に使用
- `state/last_run.json`: 実行状態の記録に使用
- `state/publish_queue.json`: 承認待ち候補のキューに使用
- `state/generated_manifests.json`: draft 化済み normalized ファイルの記録に使用
- `state/enriched_manifests.json`: enrich 済み manifest の記録に使用
- `SUMMARY_IO_SPEC.md`: OpenClaw / Codex に summary 生成を委譲するための入出力仕様
- `package.json`: 最低限の実行スクリプト

## 実行例
```bash
cd projects/auto-media-mvp
npm run collect:techcrunch
npm run collect:hackernews
npm run generate:drafts
npm run generate:enrich
npm run generate:review-digest
```

または一括実行:
```bash
cd projects/auto-media-mvp
npm run run:mvp
```

## 動作確認ポイント
- `data/raw/tech/` に TechCrunch / Hacker News の取得結果が保存される
- `data/normalized/` に共通スキーマJSONが保存される
- `drafts/markdown/` に下書きMarkdownが生成される
- `data/processed/` に draft manifest と enriched JSON が生成される
- `output/daily/` に review digest が生成される
- `state/seen_urls.json` `state/publish_queue.json` `state/last_run.json` `state/enriched_manifests.json` が更新される

## 失敗しやすいポイント
- ネットワーク到達性がないと collect が失敗する
- 同じURLが既出なら normalized の新規件数は 0 になる
- `generate:drafts` は未処理 normalized がないと新規draftを作らない
- `generate:enrich` は現時点ではプレースホルダ生成だが、summary 生成を分離してあり、本番LLM連携へ段階的に差し替えやすい構造にしてある
- 将来的には API rate limit と retry 方針を入れる

## 運用方針
- まずは投稿自動化しない
- rawデータを必ず残す
- URLとトピックの重複を避ける
- 投資助言に見える表現は避ける
