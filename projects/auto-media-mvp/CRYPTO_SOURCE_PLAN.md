# CRYPTO_SOURCE_PLAN

observatory の次の source として追加する crypto / market 系 source の計画。

## 1. 目的
- `crypto` category を厚くする
- market-oriented な変化を ranking に反映する
- 海外向け observatory としての性格を強める

## 2. 候補
### A. CoinGecko
向いている理由:
- 取得しやすい
- market data と相性がよい
- crypto の変化を可視化しやすい

### B. crypto news feed
向いている理由:
- narrative / regulation / ETF なども拾える
- market data だけでは見えない文脈が増える

### C. ETF / regulatory public feeds
向いている理由:
- policy と crypto をつなげやすい
- observatory の差別化に効く

## 3. 最初のおすすめ
最初の 1 本は **CoinGecko 系** がよい。

理由:
- collector を作りやすい
- market-move / ranking と噛み合う
- 価格・時価総額・変化率など、観測向きの数値を持ちやすい

## 4. 期待する役割
- `crypto` category を増やす
- topic として `market-move` を強化する
- company / asset に近い ranking 軸を増やす

## 5. 実装の次ステップ
1. CoinGecko collector の scaffold を作る
2. normalized shape を既存 ranking flow に合わせる
3. 必要なら asset 名を entity として拾う
4. その後に crypto news feed を補助追加する

## 6. 率直なおすすめ
official source の次に crypto / market を足すと、
この observatory は
- tech
- official
- market
の 3 面でバランスが出る。
