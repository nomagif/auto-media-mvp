# SOURCE_EXPANSION_PLAN

`auto-media-mvp` を observatory として強くするための追加ソース計画。

## 1. 現状
現在の実データソース:
- TechCrunch
- Hacker News

これは tech 観測の入口としては十分だが、
ランキングとトレンド可視化の価値を上げるにはソースの幅がまだ足りない。

## 2. 次に増やすべきソース
### 優先A: 政府・公的発表
理由:
- policy / macro / defense の観測価値が上がる
- データの信頼性が高い
- 海外向けでも意味が伝わりやすい

候補:
- 米国政府統計・雇用統計
- FRB / ECB / EU Commission
- defense / security 系の公的発表

### 優先B: crypto / market 系
理由:
- 変化率との相性がよい
- トレンド可視化の相性が強い
- 海外向け収益性とも噛み合う

候補:
- CoinGecko
- major crypto news feeds
- ETF / regulation related public feeds

### 優先C: SNS / social pulse
理由:
- rising topic の初速を取りやすい
- consumer / creator / narrative 観測に効く

候補:
- X trending alternatives
- Reddit topic slices
- YouTube / TikTok trend references

## 3. 追加方針
最初から全部はやらない。

順番:
1. public / structured / stable sources
2. market-oriented feeds
3. social pulse

## 4. source_type 拡張
今後は source_type を以下へ広げる。
- `news`
- `forum`
- `official`
- `market-data`
- `social`
- `research`

## 5. 実装優先順位
### Step 1
公的 source を 1 つ追加
- policy / macro の厚みを出す

### Step 2
crypto / market source を 1 つ追加
- rising / ranking に変化を出す

### Step 3
social source の簡易入力を追加
- 初速の観測を補完する

## 6. 率直なおすすめ
次に足す 1 本目は、
**政府・公的発表系の structured source** がいい。

理由:
- 観測価値が高い
- noisy すぎない
- 今の TechCrunch / HN と役割が被りにくい

その次に crypto / market を足すと、
この observatory の性格がかなり立つ。
