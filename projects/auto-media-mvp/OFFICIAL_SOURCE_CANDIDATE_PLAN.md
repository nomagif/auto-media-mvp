# OFFICIAL_SOURCE_CANDIDATE_PLAN

最初に追加する公的 source 候補の整理。

## 結論
1本目は **米国の公的発表・政策系 source** を優先する。

理由:
- 現在の TechCrunch / HN と被りにくい
- policy / macro 観測が厚くなる
- 海外向けでも意味が分かりやすい
- structured な source を選びやすい

## 候補
### A. Federal Reserve / FOMC / speeches 系
向いている理由:
- macro / rates / inflation / labor に繋がる
- 定期観測に向く
- 変化点がトレンドに反映しやすい

### B. U.S. Bureau of Labor Statistics (BLS)
向いている理由:
- 雇用統計など、明確な macro signal が取れる
- policy / market と結びつきやすい

### C. White House / major federal announcements
向いている理由:
- policy 観測に直結
- 地政学・規制・産業政策のフックになる

## 1本目としてのおすすめ
最初は **Federal Reserve / FOMC 系** が一番扱いやすい。

理由:
- 変化点が比較的明快
- title / published_at / url が取りやすい
- macro / policy の両方に繋げられる

## collector に欲しい最小属性
- `id`
- `source_type`
- `source_name`
- `source_url`
- `title`
- `body`（要約的でも可）
- `published_at`
- `collected_at`
- `language`
- `tags`
- `metrics`

## normalized 後の期待 category/topic
- category: `macro` or `policy`
- topics:
  - `policy-announcement`
  - `market-move`
  - `regulation`
  - `macro`

## 実装の次ステップ
1. Fed/FOMC 系で取得しやすい feed or page を1つ決める
2. collector scaffold を追加
3. normalized 出力を既存 ranking flow に乗せる

## 率直なおすすめ
最初の公的 source は、
**“ニュース性がありつつ、構造も取りやすいもの”** を選ぶべき。
その意味で Fed 系はかなり相性がいい。
