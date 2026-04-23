# AI_OFFICIAL_SOURCE_PLAN

AI official source を observatory に追加するための計画。

## 1. 目的
- AI / Technology 側の primary source を増やす
- product-launch / research / infrastructure の signal を厚くする
- TechCrunch / Hacker News だけではなく、一次情報も observability に入れる

## 2. 候補
### A. OpenAI news / announcements
向いている理由:
- AI observatory として分かりやすい
- product / model / policy 系の signal が拾える
- OpenAI entity がすでに ranking にいるので接続しやすい

### B. Anthropic news / announcements
向いている理由:
- AI product / model / safety / enterprise 系の signal が拾える
- OpenAI とは別の軸が立つ

### C. Google / DeepMind blog
向いている理由:
- research / model / infrastructure / chips との接点が多い
- source breadth が増える

## 3. 最初のおすすめ
最初の 1 本は **OpenAI announcements** がよい。

理由:
- entity として既に ranking に出ている
- AI observatory の主題として伝わりやすい
- classification ルールにも自然に乗る

## 4. 想定 source_type
- `official`

## 5. 期待する分類
- category: `ai`
- topics:
  - `product-launch`
  - `research`
  - `infrastructure`
  - 必要なら `policy-announcement`
- region: `us`
- entities:
  - OpenAI
  - 主要 model / product 名は将来追加

## 6. 実装順
1. OpenAI collector scaffold
2. raw 保存
3. normalized 保存
4. ranking 反映
5. collect cron への組み込み

## 7. 注意
- 最初は blog / news listing のみでよい
- 本文抽出を頑張りすぎない
- official source は general に吸われやすいので、topic ルールも一緒に強化する
