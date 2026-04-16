# 自動収集・要約・配信パイプライン設計

更新日: 2026-04-16
対象: OpenClaw（収集・実行） + Codex/ACP（思考・変換） + 画像生成（図解）

## 1. 目的

海外テックニュース、特定の仮想通貨動向、政府統計、海外SNSトレンドなどを定期巡回し、収集した情報を日本語コンテンツへ変換して、WordPress・note・X へ安全に配信する。

## 2. 設計方針

- OpenClaw を親オーケストレータにする
- Codex は変換専用ワーカーとして使う
- 収集・変換・配信を分離する
- 最初は自動公開ではなく下書き中心で始める
- すべての成果物を構造化データとして保存する
- 出典、ログ、重複管理を必須にする

## 3. 全体アーキテクチャ

```text
[cron / heartbeat / manual trigger]
              |
              v
      OpenClaw Collector
   (RSS/Web/API/SNS巡回)
              |
              v
      Raw/Normalized Storage
              |
              v
   Codex/ACP Transformer Worker
 (要約 / 関連付け / 見出し / 本文生成)
              |
              v
     Generated Artifact Storage
              |
     +--------+--------+---------+
     |                 |         |
     v                 v         v
 WordPress Draft    note Draft   X Post
     |                 |         |
     +--------+--------+---------+
              |
              v
        Publish / Audit Log
```

## 4. コンポーネント定義

### 4.1 OpenClaw Collector
責務:
- 定期巡回
- 新着検出
- 本文取得
- メタデータ正規化
- 重複排除
- 変換ジョブ投入

対象ソース例:
- RSS フィード
- ニュースサイト本文
- 公的統計の更新ページ
- 価格API / 指標API
- SNSトレンドや投稿一覧

### 4.2 Storage
保存レイヤを分ける。

- raw: 取得した元データ
- normalized: 正規化済みデータ
- generated: Codex生成成果物
- publish-log: 投稿履歴
- state: 巡回状態、重複判定用状態

### 4.3 Codex/ACP Transformer
責務:
- 本文理解
- 日本語要約
- 関連ニュース紐付け
- タイトル案生成
- note/WordPress/X 向け整形
- 画像生成用プロンプト生成

重要ルール:
- 投稿はしない
- 常に構造化JSONを返す
- 事実と推測を分離する
- 出典情報を保持する

### 4.4 Publisher Adapters
配信先ごとに分離。

- publish_wordpress
- publish_note
- publish_x
- generate_image

責務:
- 各プラットフォーム形式への変換
- API投稿または下書き作成
- 失敗時の再試行
- 投稿ID・URLの記録

## 5. ディレクトリ構成案

```text
workspace/
  docs/
    automation-architecture.md
  config/
    sources/
      tech-news.json
      crypto.json
      gov-stats.json
      sns-trends.json
    publishing/
      wordpress.json
      note.json
      x.json
    policies/
      moderation.json
      publish-rules.json
  data/
    raw/
      2026-04-16/
    normalized/
      2026-04-16/
    generated/
      2026-04-16/
    publish-log/
    state/
      collectors/
      dedupe/
  prompts/
    transformer/
      tech-news.md
      crypto.md
      gov-stats.md
      sns-trends.md
  scripts/
    collect/
    transform/
    publish/
    shared/
  outputs/
    2026-04-16/
  memory/
    2026-04-16.md
```

## 6. データモデル

### 6.1 SourceItem（正規化済み入力）

```json
{
  "id": "sha256:...",
  "source_type": "rss|web|api|sns|file",
  "topic": "tech-news",
  "title": "Original title",
  "url": "https://example.com/article",
  "canonical_url": "https://example.com/article",
  "published_at": "2026-04-16T10:00:00Z",
  "collected_at": "2026-04-16T10:05:00Z",
  "language": "en",
  "author": "...",
  "summary": "optional raw summary",
  "content_text": "full extracted text",
  "metadata": {
    "site_name": "Example",
    "tags": ["ai", "startup"]
  }
}
```

### 6.2 GeneratedArtifact（Codex出力）

```json
{
  "source": {
    "id": "sha256:...",
    "title": "Original title",
    "url": "https://example.com/article",
    "published_at": "2026-04-16T10:00:00Z"
  },
  "summary_ja_short": "3行程度の要約",
  "summary_ja_long": "詳細な日本語要約",
  "key_points": [
    "要点1",
    "要点2"
  ],
  "related_items": [
    {
      "title": "関連ニュース",
      "url": "https://example.com/related"
    }
  ],
  "titles": [
    "タイトル案1",
    "タイトル案2",
    "タイトル案3"
  ],
  "x_post": "X向け投稿文",
  "note_markdown": "note向けMarkdown本文",
  "wordpress_html": "WordPress向けHTML本文",
  "image_prompt": "図解やサムネイル生成用プロンプト",
  "risk_flags": [
    "financial-content"
  ],
  "citations": [
    {
      "title": "Original title",
      "url": "https://example.com/article"
    }
  ]
}
```

### 6.3 PublishRecord

```json
{
  "artifact_id": "...",
  "platform": "wordpress|note|x",
  "mode": "draft|published|failed",
  "published_at": "2026-04-16T11:00:00Z",
  "remote_id": "...",
  "remote_url": "...",
  "attempt": 1,
  "error": null
}
```

## 7. ジョブフロー

### 7.1 収集ジョブ
1. cron で起動
2. ソース定義を読む
3. 各ソースを巡回
4. 新着のみ取得
5. raw / normalized 保存
6. dedupe state 更新
7. 変換ジョブをキューへ投入

### 7.2 変換ジョブ
1. normalized item を入力
2. トピック別プロンプト選択
3. Codex/ACP に投入
4. JSONスキーマ検証
5. generated 保存
6. 配信ルールに基づいて publish queue 作成

### 7.3 配信ジョブ
1. generated artifact を読む
2. publish rules 判定
3. 画像生成が必要なら先に生成
4. WordPress/note/X の各アダプタへ渡す
5. 成否を publish-log に保存
6. エラー時は再試行、必要なら通知

## 8. 配信ポリシー（初期推奨）

初期は次の方針を推奨。

- X: 自動投稿ではなく要承認、または短報のみ自動
- WordPress: 下書き作成のみ
- note: まず本文生成のみ、投稿は後で実装

段階的に:
- Phase 1: 収集 + 要約 + 下書き生成
- Phase 2: X短報の半自動化
- Phase 3: 画像付き投稿
- Phase 4: 承認付き本番公開

## 9. 安全装置

### 9.1 重複防止
- canonical URL比較
- URL hash
- タイトル類似度
- 本文類似度

### 9.2 出典保持
- すべての生成物に source URL を残す
- 投稿ログに元記事情報を残す

### 9.3 リスク制御
- 仮想通貨は投資助言を避ける
- 事実 / 反応 / 推測を明確に分離
- 出所不明SNSは自動公開しない
- センシティブ話題は review_required フラグ

### 9.4 レート制限対策
- 連続投稿を避ける
- キューを直列実行にする
- API失敗時はバックオフ

## 10. OpenClaw 側の責務

OpenClaw で担当するもの:
- cron 登録
- 収集
- ローカル保存
- Codexセッション起動
- 出力検証
- 公開/下書きAPI実行
- ログ管理
- 通知

Codex/ACP で担当するもの:
- テキスト理解
- 要約
- 関連付け
- タイトル生成
- 本文生成
- 画像プロンプト生成

## 11. Codex 入出力契約

### 入力
- source item JSON
- topic
- style guide
- platform rules
- safety rules

### 出力
- JSONのみ
- 必須フィールド欠落不可
- citation必須
- financial-content などの risk_flags を返す

## 12. 監視と運用

監視対象:
- 巡回失敗
- 変換失敗
- 投稿失敗
- 重複異常
- レート制限

運用指標:
- 1日あたり取得件数
- 下書き化件数
- 公開件数
- 失敗率
- 1件あたり処理時間

## 13. 実装フェーズ

### Phase 1: 最小構成
- テックニュース1〜2ソース
- RSS/Web収集
- JSON正規化
- Codexで要約
- WordPress下書きHTML生成
- X文面生成
- ログ保存

### Phase 2: 強化
- 関連ニュース探索
- 画像生成
- 下書き承認フロー
- リトライ処理

### Phase 3: ソース拡張
- 仮想通貨
- 政府統計
- SNSトレンド
- ソース別プロンプト最適化

### Phase 4: 本番運用
- 承認付き自動公開
- 通知
- KPI可視化
- 運用ルール定着

## 14. 最初の実装対象（推奨）

まずは以下の MVP を作る。

- tech-news ソースを2つ登録
- 1時間ごとに巡回
- 新着記事本文を抽出
- Codexで日本語要約とタイトル案を生成
- WordPress下書きHTMLを生成して保存
- X投稿文を生成して保存
- 画像プロンプトを生成
- 投稿はまだ自動実行しない

これで「収集 → 変換 → 成果物保存」までの品質を検証する。

## 15. 次ファイル候補

この設計書の次に作ると良いもの:

1. `config/sources/tech-news.json`
2. `config/policies/publish-rules.json`
3. `prompts/transformer/tech-news.md`
4. `scripts/collect/collect-tech-news.*`
5. `scripts/transform/run-transformer.*`
6. `scripts/publish/publish-wordpress.*`
7. `scripts/publish/publish-x.*`

## 16. 補足

note は投稿手段の確認が必要なので、最初は本文生成までに留めるのが安全。
WordPress と X は API 前提でアダプタ実装しやすい。最初の本命は WordPress 下書き + X 文面生成。
