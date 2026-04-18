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
- `state/summary_queue.json`: summary request の処理状態管理に使用
- `SUMMARY_IO_SPEC.md`: OpenClaw / Codex に summary 生成を委譲するための入出力仕様
- `OPENCLAW_SUMMARY_WORKER_SPEC.md`: OpenClaw worker turn 側の処理仕様
- `DATA_POLICY.md`: 実行生成物・state・サンプルデータの運用方針
- `OPENCLAW_SUMMARY_SUBAGENT_PROMPT.md`: OpenClaw worker が subagent に渡す task テンプレ
- `prompts/summary_worker_task.md`: subagent 実行時の厳格な JSON-only 指示
- `SUMMARY_RESPONSE_NORMALIZATION.md`: summary 応答を spec 形式へ正規化するルール
- `scripts/generate/lib_summary_response.js`: summary 応答の parse / normalize helper
- `WORKER_INTEGRATION_PLAN.md`: worker に正規化アダプタを組み込む実装計画
- `PHASE_A_WORKER_FIXTURE_PLAN.md`: raw response fixture を使った疑似統合計画
- `MANUAL_SUMMARY_WORKER_RUNBOOK.md`: summary worker の手動運用手順
- `ROADMAP.md`: 現状整理と今後の優先順位
- `PUBLISH_PLAN.md`: WordPress / note / X への配信設計
- `PUBLISH_IO_SPEC.md`: publish queue と投稿結果の最小スキーマ
- `scripts/publish/build_publish_queue.js`: enriched data から publish queue と platform 別 draft を作る scaffold
- `scripts/publish/approve_publish_items.js`: publish queue の pending_review を approved にする最小承認フロー
- `scripts/publish/list_publish_ready.js`: approved 済み投稿候補の一覧を出す
- `TITLE_XPOST_IO_SPEC.md`: title candidates / X post 生成の入出力仕様
- `prompts/title_candidates.md`: title candidates 生成用プロンプト
- `scripts/generate/lib_title.js`: title request/response helper
- `scripts/generate/lib_title_response.js`: title 応答の parse / normalize helper
- `scripts/generate/build_title_requests.js`: enriched summary から title request を作る scaffold
- `scripts/generate/run_title_worker.js`: title worker の最小版
- `scripts/generate/apply_title_response.js`: title response を enriched に反映
- `scripts/generate/lib_xpost.js`: X post request/response helper
- `scripts/generate/lib_xpost_response.js`: X post 応答の parse / normalize helper
- `scripts/generate/build_xpost_requests.js`: enriched summary から X post request を作る scaffold
- `scripts/generate/run_xpost_worker.js`: X post worker の最小版
- `scripts/generate/apply_xpost_response.js`: X post response を enriched に反映
- `TITLE_RESPONSE_NORMALIZATION.md`: title 応答正規化ルール
- `XPOST_RESPONSE_NORMALIZATION.md`: X post 応答正規化ルール
- `fixtures/summary-responses/`: worker 正規化テスト用 fixture
- `fixtures/title-responses/`: title worker 用 fixture
- `ARTICLE_IO_SPEC.md`: article generation の入出力仕様
- `scripts/generate/lib_article.js`: article request/response helper
- `scripts/generate/build_article_requests.js`: enriched summary から article request を作る scaffold
- `scripts/generate/lib_article_response.js`: article 応答の parse / normalize helper
- `scripts/generate/run_article_worker.js`: article worker の最小版
- `scripts/generate/apply_article_response.js`: article response を enriched に反映
- `ARTICLE_RESPONSE_NORMALIZATION.md`: article 応答正規化ルール
- `fixtures/xpost-responses/`: X post worker 用 fixture
- `IMAGE_PROMPT_IO_SPEC.md`: image prompt generation の入出力仕様
- `scripts/generate/lib_image_prompt.js`: image prompt request/response helper
- `scripts/generate/build_image_prompt_requests.js`: enriched data から image prompt request を作る scaffold
- `scripts/generate/lib_image_prompt_response.js`: image prompt 応答の parse / normalize helper
- `scripts/generate/run_image_prompt_worker.js`: image prompt worker の最小版
- `scripts/generate/apply_image_prompt_response.js`: image prompt response を enriched に反映
- `IMAGE_PROMPT_RESPONSE_NORMALIZATION.md`: image prompt 応答正規化ルール
- `fixtures/article-responses/`: article worker 用 fixture
- `fixtures/image-prompt-responses/`: image prompt worker 用 fixture
- `package.json`: 最低限の実行スクリプト

## 実行例
```bash
cd projects/auto-media-mvp
npm run collect:techcrunch
npm run collect:hackernews
npm run generate:drafts
npm run generate:enrich
npm run summary:enqueue
npm run summary:worker
npm run summary:apply
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
- `data/processed/requests/` と `data/processed/responses/` に summary request/response JSON が保存される
- `output/daily/` に review digest が生成される
- `state/seen_urls.json` `state/publish_queue.json` `state/last_run.json` `state/enriched_manifests.json` `state/summary_queue.json` が更新される

## 失敗しやすいポイント
- ネットワーク到達性がないと collect が失敗する
- 同じURLが既出なら normalized の新規件数は 0 になる
- `generate:drafts` は未処理 normalized がないと新規draftを作らない
- `summary:worker` は Phase A として `--raw-file` で raw response fixture を読める。次に OpenClaw isolated 実行へ差し替える前提
- `summary:apply` は success response を enriched JSON に反映する
- `generate:enrich` は現時点ではプレースホルダ生成だが、summary request/response を保存するので、本番LLM連携時の監査や再処理に繋げやすい
- 将来的には API rate limit と retry 方針を入れる

## 運用方針
- まずは投稿自動化しない
- rawデータを必ず残す
- URLとトピックの重複を避ける
- 投資助言に見える表現は避ける
