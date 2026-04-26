# auto-media-mvp

海外ニュースを収集し、**リンク集約** と **ランキング・トレンド可視化** を軸に価値化するためのMVPプロジェクト。

## 新コンセプト
このプロジェクトは、従来の「日本語記事化・自動投稿メディア」寄りの方向から、
**海外ニュース観測基盤** へピボットする。

主軸は以下の2つ。

1. **海外ニュースのリンク集約サイト**
   - 言語依存を減らす
   - リスクの高い解釈や論評を減らす
   - 海外向け展開をしやすくする

2. **ランキング・トレンド可視化**
   - 話題量・順位・増減・継続性を見せる
   - **AI・テクノロジー** と **金融・経済（投資・マクロ）** を主軸に観測する
   - 将来的な B2B / dashboard 化にもつなげる

## 目的
- 海外ニュース収集を自動化する
- ニュースを「記事本文」ではなく「観測データ」として整理する
- トピック / 企業 / 地域 / ソースごとの変化を見える化する
- 主ジャンルを **AI・テクノロジー** と **金融・経済（投資・マクロ）** に絞る
- 海外展開しやすい軽量な情報プロダクトへ寄せる

## MVPスコープ
- 収集: AI・テクノロジー、金融・経済（投資・マクロ）に関係する海外ニュース / 公的発表 / market data の収集
- 整理: raw / normalized / entity / topic / region 単位の正規化
- 出力:
  - リンク集約ページ
  - トレンドランキング
  - テーマ別の観測ページ
  - 必要なら補助的な要約
- 運用: 収集・集計・可視化を分離し、記事自動投稿は主役にしない

## ディレクトリ概要
- `config/`: ソースや閾値設定
- `prompts/`: 生成プロンプト
- `data/`: raw / normalized / candidates / processed / published
- `drafts/`: note / wordpress / x 向け下書き
- `state/`: 重複防止・キュー・最終実行状態
- `logs/`: 実行ログ
- `scripts/`: collect / normalize / generate / publish
- `audit/`: 運用監査メモ・障害メモ

## 基本フロー
1. collect: 新規データを取得して raw / normalized に保存
2. classify: トピック / 企業 / 地域 / ソース種別に整理する
3. rank: 言及数・増加率・継続日数などを集計する
4. output: リンク集約ページ / トレンドランキング / 観測ビューを生成する
5. review: 必要に応じて補助要約や配信面を確認する

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
- `X_PUBLISH_INTERFACE.md`: X 実投稿 interface の I/O と責務
- `PUBLISH_ENTRYPOINTS.md`: WordPress / note 用 publish 入口設計
- `PUBLISH_ENV_SPEC.md`: 実 API 連携時の env / secret interface
- `X_AUTH_PLAN.md`: X 実投稿 adapter の認証方針
- `X_OAUTH_LIBRARY_PLAN.md`: OAuth 1.0a helper の導入方針
- `X_ENV_SETUP.md`: X 実投稿 adapter 用の env 設定手順
- `WORDPRESS_API_PLAN.md`: WordPress draft 作成 API 化の設計
- `WORDPRESS_ENV_SETUP.md`: WordPress adapter 用の env 設定手順
- `PUBLISH_PRECHECKLIST.md`: 実送信前の最小チェックリスト
- `scripts/publish/build_publish_queue.js`: enriched data から publish queue と platform 別 draft を作る scaffold
- `scripts/publish/approve_publish_items.js`: publish queue の pending_review を approved にする最小承認フロー
- `scripts/publish/list_publish_ready.js`: approved 済み投稿候補の一覧を出す
- `scripts/publish/lib_publish_queue.js`: publish queue 更新の共通関数
- `scripts/publish/lib_publish_adapters.js`: x / wordpress / note の publish adapter
- `scripts/publish/run_publish_ready.js`: approved item を platform adapter 経由で処理する runner
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
- `fixtures/publish/`: X / WordPress / note publish input fixture（正常系 + 一部失敗系）
- `fixtures/publish/expected/`: publish output の期待形サンプル
- `scripts/publish/check_publish_fixture.js`: fixture input と expected output の簡易照合スクリプト
- `logs/publish_results.jsonl`: publish result の append-only ログ
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

## 静的公開の最短導線
公開を前提にするなら、まず observatory 面を静的配信する。

現在の本番公開URL:
- <https://auto-media-mvp.pages.dev>

```bash
cd projects/auto-media-mvp
npm run site:build
npm run site:serve
```

- `site:build` は ranking markdown / entity pages / static HTML / premium weekly artifacts をまとめて生成する
- premium 配布の自動化は `PREMIUM_DELIVERY_AUTOMATION.md` を参照（Gumroad verify + Cloudflare R2 + signed links）
- Cloudflare Pages で R2 binding が失敗する場合の切り替え先は `PREMIUM_WORKER_MIGRATION.md` を参照
- Cloudflare 側の設定手順は `CLOUDFLARE_PAGES_PREMIUM_SETUP.md` を参照
- `site:serve` は `site/` をローカル確認する
- Cloudflare Pages を主導線として運用する
- Cloudflare Pages 設定は `Framework preset: None` / `Build command: cd projects/auto-media-mvp && npm ci && npm run site:build` / `Build output directory: projects/auto-media-mvp/site`
- GitHub Pages workflow は `.github/workflows/deploy-static-site.yml` に残すが、現時点では補助扱い
- GitHub Pages の想定公開URLは <https://nomagif.github.io/auto-media-mvp/>
- 詳細は `DEPLOY_STATIC_SITE.md`, `POSTLAUNCH_CHECKLIST.md`, `CUSTOM_DOMAIN_SETUP.md`, `PREMIUM_PACKS.md`, `OPENCLAW_CRON_PLAN.md`

## 封じている将来ルート
現フェーズでは、以下は **公開導線から外した上で npm script レベルでもブロック** している。

- summary
- article
- xpost
- image prompt
- publish
- review digest

誤実行した場合は guard が落とす。
内部検証として一時的に通す場合のみ:

```bash
ALLOW_PROSE_ROUTES=1 npm run summary:worker
```

内部自動化の一発入口:

```bash
npm run generate:prose:auto
npm run generate:prose:auto:cron
# 例: まずは1件だけ
node scripts/generate/run_prose_pipeline.js --limit 1
```

fallback retry の回帰確認は guard を通さずにこれで実行できる。

```bash
npm run test:worker:fallback
npm run test:worker:fallback:summary
npm run test:worker:fallback:all
```

## 実行例
公開面として想定する基本操作はこれ。

```bash
cd projects/auto-media-mvp
npm run rank:generate
npm run site:build
npm run site:serve
```

補足:
- `site:build` の中で `premium:build` も走るため、weekly JSON / weekly CSV artifacts も同時に更新される
- premium artifact を Cloudflare R2 へ upload する入口は `npm run premium:publish`
- `push:observatory` は `PREMIUM_PUBLISH_ENABLED=auto` 相当で動き、R2 env が揃っていれば premium upload まで自動で実行する
- OpenClaw cron 用の一発入口は `npm run run:observatory`
- build 後に自動 commit / push まで行う入口は `npm run run:observatory:push`
- 昨日の流入数 / premiumクリック数の集計は `npm run analytics:yesterday`（R2上の analytics event を読む）
- 低頻度の cluster LLM lane は `npm run cluster:briefs`。既定では top 3 topic clusters を 24 時間に 1 回だけ要約し、fingerprint が同じなら再生成を skip、失敗時は template fallback に落として継続運転する
- 構文確認用の template-only 実行は `npm run cluster:briefs:template`

補助資産の collect は引き続き利用可能。

```bash
cd projects/auto-media-mvp
npm run collect:techcrunch
npm run collect:hackernews
npm run collect:fed
npm run collect:openai
npm run collect:anthropic
npm run collect:bls
npm run collect:coingecko
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
- `summary:worker` などの prose worker は、デフォルトで `node scripts/generate/openclaw_subagent_executor.js` を呼んで OpenClaw local agent 実行を使う
- executor は各試行ごとに一時 OpenClaw config を作り、`requested_model` を allowed / primary に差し込んで実行する
- 必要なら `WORKER_EXECUTOR_CMD` / `WORKER_<TASK>_EXECUTOR_CMD` で executor を差し替えられる
- `OPENCLAW_WORKER_TIMEOUT_SECONDS` で 1 実行ごとの OpenClaw timeout を調整できる
- `summary:apply` は success response を enriched JSON に反映する
- `generate:enrich` は現時点ではプレースホルダ生成だが、summary request/response を保存するので、本番LLM連携時の監査や再処理に繋げやすい
- 将来的には API rate limit と retry 方針を入れる

## 運用方針
- rawデータを必ず残す
- URLとトピックの重複を避ける
- 強い解釈よりも観測データを優先する
- 記事自動投稿より先に、集約とランキングの品質を上げる
- AI・テクノロジー / 金融・経済（投資・マクロ）に集中し、周辺ジャンルは後回しにする
- 投資助言に見える表現は避ける
- 自動要約を英語で大量生成しない
- 政治的・戦争ニュースを断定口調で発信しない
- 複数国の価値観を混在させない
- **ニュースを語らない。数字だけを出す**

## 公開方針
- まずは **静的 observatory site** を公開面の主役にする
- deploy 導線は summary / article / prose を前提にしない
- Cloudflare Pages や GitHub Pages のような軽量 hosting で出せる形を優先する
- 将来 WordPress や digest を足しても、公開の一次面は metrics-first を保つ
- summary / article / xpost / image prompt / publish 系の npm scripts は、現フェーズでは **guard で明示ブロック** する
- どうしても内部検証で使う場合だけ `ALLOW_PROSE_ROUTES=1` を明示して override する

## 収益化方針
優先順位は以下。

1. **データ販売**
2. **広告**
3. **アフィリエイト**
4. **API**

考え方:
- public site は信頼形成とサンプル提示のための observatory 面
- 収益の本体は full dataset / historical exports / premium packaged snapshots
- premium artifact は public repo ではなく Cloudflare R2 などの外部 storage で配布する
- 完全自動化を維持するため、問い合わせ依存の導線は置かない
- 広告は初期の補助であり、主役にしない
- アフィリエイトは observatory のトーンを壊さない範囲に限定する

当面の free / paid 分離イメージ:
- Free: public rankings / browse / latest snapshot / 一部履歴 / 少量サンプルリンク
- Paid: 全件データ / CSV / JSON export / historical exports / premium dataset snapshots
- Later: API / automated premium feeds

推奨の境界:
- Free は「見るための surface」
- Paid は「使うための data」

当面の paid 商品たたき台:
- Weekly CSV pack
- Weekly JSON snapshot
- 30-day archive pack
- Full ranking dataset pack

## 方針転換メモ
- 旧方針の「日本語記事化・WordPress/note/X 自動投稿」は補助機能へ後退
- 既存の publish / summary / article 系資産は捨てずに温存する
- 当面の主戦場は **ニュース観測・集約・ランキング可視化**
- WordPress 連携は、必要なら観測結果の補助配信として使う

## Heartbeat / incident ops notes
今回の heartbeat 障害調査と再発防止メモは以下を参照。

- `logs/2026-04-22-2200-plus-human-log.md`
  - 2026-04-22 22:00 JST 以降の人間向け整形ログ
- `audit/2026-04-22-2200-plus-audit-log.md`
  - 成功 / 失敗 / 内部エラーを分けた監査ログ
- `audit/heartbeat-failure-prevention.md`
  - すぐ効く再発防止策
- `audit/heartbeat-ops-summary.md`
  - オペレーター向け短縮版まとめ
- `audit/heartbeat-cron-alternative.md`
  - heartbeat の代わりに cron を使うべき場面の整理

### 運用ルール（追加）
- heartbeat には長い workflow を入れない
- 正確な時刻実行や取りこぼしたくない処理は cron を使う
- 履歴が欠けて見えたら、まず session JSONL を正として確認する
