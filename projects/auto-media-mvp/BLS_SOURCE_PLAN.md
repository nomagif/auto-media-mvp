# BLS_SOURCE_PLAN

BLS (U.S. Bureau of Labor Statistics) を observatory に追加するための plan。

## 1. 目的
- Fed 以外の macro public source を増やす
- labor / inflation / employment 系の signal を厚くする
- 金融・経済（投資・マクロ）軸を強化する

## 2. 向いている理由
- public source で扱いやすい
- macro 観測との相性が良い
- recurring collect に向いている
- `market-move` / `macro` / `policy-announcement` に接続しやすい

## 3. 想定 source_type
- `official`

## 4. 期待する分類
- category: `macro`
- topics:
  - `market-move`
  - `policy-announcement`（広義）
  - `research`（補助）
- region: `us`
- entities:
  - BLS
  - CPI / jobs / payrolls / inflation / unemployment などは将来 topic 側で吸収

## 5. 実装候補
### A. BLS news releases
最初の 1 本として有力。

理由:
- release 系がまとまっている
- title ベースでも signal を拾いやすい
- CPI / employment situation など macro 観測に直結する

## 6. 実装順
1. BLS collector scaffold
2. raw 保存
3. normalized 保存
4. ranking 反映
5. collect cron への組み込み

## 7. 率直なおすすめ
Fed の次の macro public source としてかなり素直。
AI official を入れた今、次に BLS を足すと AI / macro の両輪感が強くなる。
