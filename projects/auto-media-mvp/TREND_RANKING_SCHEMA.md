# TREND_RANKING_SCHEMA

海外ニュース観測・集約プロジェクト向けの最小ランキングスキーマ。

## 1. 目的
ニュースを記事本文へ変換する前に、まず「観測データ」として扱うための共通スキーマを定義する。

このスキーマは以下に使う:
- topic ranking
- company ranking
- region / category ranking
- trend increase detection
- link aggregation pages

## 2. 最小単位
### A. normalized news item
既存の raw / normalized データを前提にする。

最低限ほしい属性:
- `item_id`
- `source`
- `source_type`
- `title`
- `url`
- `published_at`
- `region`（推定可）
- `category`（tech / crypto / policy / defense / macro など）
- `entities`（company / person / product / country）
- `topics`（ai, regulation, funding, security, semiconductors など）

### B. ranking row
ランキング出力の 1 行。

```json
{
  "key": "openai",
  "kind": "company",
  "label": "OpenAI",
  "window": "7d",
  "mention_count": 18,
  "source_count": 6,
  "region_mix": ["us", "eu"],
  "category_mix": ["ai", "policy"],
  "delta_vs_prev": 7,
  "delta_ratio": 0.64,
  "streak_days": 4,
  "sample_item_ids": ["...", "...", "..."],
  "sample_urls": ["...", "..."],
  "updated_at": "2026-04-23T09:00:00Z"
}
```

## 3. kind の候補
- `topic`
- `company`
- `region`
- `category`
- `source`
- `keyword`

MVP ではまず以下で十分:
- `topic`
- `company`
- `region`
- `category`

## 4. MVP の必須カラム
- `key`
- `kind`
- `label`
- `window`
- `mention_count`
- `source_count`
- `delta_vs_prev`
- `delta_ratio`
- `streak_days`
- `sample_item_ids`
- `sample_urls`
- `updated_at`

## 5. score の考え方
最初は複雑にしすぎない。

例:
```text
trend_score =
  mention_count * 1.0
  + delta_vs_prev * 1.5
  + min(streak_days, 7) * 0.5
```

または別案:
- 通常ランキング: `mention_count`
- 急上昇ランキング: `delta_ratio`
- 継続注目ランキング: `streak_days`

MVP では 1 つの万能 score に寄せすぎず、
**複数ランキングを並べる** 方が分かりやすい。

## 6. 出力の最小セット
### A. Top topics
- 直近 24h / 7d の topic 別 mention 数

### B. Top companies
- 企業名の mention 数
- sample links 付き

### C. Rising topics
- 前期間比で増えた topic

### D. Region / category slices
- `US x AI`
- `EU x policy`
- `Global x crypto`
のような切り方

## 7. link aggregation との接続
ランキング row から以下へ飛べるようにする:
- sample URLs
- topic page
- region/category page

つまり ranking は単体で終わらず、
**リンク集約ページへのハブ** になるべき。

## 8. 実装順のおすすめ
1. `category` と `region` の最小分類を入れる
2. `topics` を小さな固定語彙で始める
3. `company` は固有名詞抽出を簡易で入れる
4. まず JSON 出力
5. 次に Markdown / HTML のランキング表示

## 9. 率直なおすすめ
最初から高度な NLP をやらない。
まずは:
- 固定語彙 topic
- ルールベース分類
- mention_count / delta / streak
だけで十分に価値が出る。

重要なのは「完璧な理解」ではなく、
**観測の変化が毎日見えること**。
