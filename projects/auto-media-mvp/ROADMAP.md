# ROADMAP

`auto-media-mvp` の新方針と今後の優先順位。

## 1. 現在地
このプロジェクトは、従来の「海外ニュースを日本語記事・投稿素材へ変換する自動メディアMVP」から、
**海外ニュースの観測・集約・ランキング可視化基盤** へ方向転換する。

旧方針の実装資産は残すが、今後の優先順位は入れ替える。

---

## 2. 新しい中心価値
### A. リンク集約
- 海外ニュースをテーマ別・地域別に集約する
- 言語依存の強い記事生成より軽量に展開できる
- 海外向けUIに寄せやすい
- 主ジャンルは **AI・テクノロジー** と **金融・経済（投資・マクロ）** に絞る

### B. ランキング / トレンド可視化
- 話題量
- 増加率
- 継続日数
- 企業 / キーワード / テーマ / 地域の変化

この B を主軸にする。

---

## 3. 既存資産の扱い
### そのまま活かすもの
- collect
- raw / normalized 保存
- queue / state 管理
- review / logging
- 一部 publish 基盤

### 補助機能へ下げるもの
- summary
- article
- xpost
- image prompt
- WordPress / note / X への配信

### いったん主役から外すもの
- 日本語記事本文の量産
- 複数プラットフォームへの全面自動投稿

---

## 4. 新しい優先順位
### 優先1
ニュース観測モデルの定義
- 何を topic として扱うか
- entity / region / source の正規化方針
- trend score の最小式を決める
- AI・テクノロジー / 金融・経済（投資・マクロ）に最適化した taxonomy を優先する

### 優先2
ランキング出力の MVP を作る
- Top topics
- Most mentioned companies
- Region / theme 別ランキング
- 増加率ランキング

### 優先3
リンク集約ページを作る
- source links
- topic clusters
- region/theme landing pages

### 優先4
必要最小限の補助要約
- 要点だけ短く出す
- 長文記事生成は後回し
- ただし現フェーズでは public path に接続しない
- summary / prose 系は内部検証用 override があるときだけ触る

### 優先5
配信面の再整理
- WordPress は主戦場ではなく補助面
- 必要なら digest / recap 用に使う

### 優先6
deploy 前提の静的配信導線
- rankings / browse / entity pages をまとめて build する入口を固定する
- GitHub Pages などの静的 hosting へそのまま乗せる
- project subpath でも壊れない base path 対応を保つ
- 公開面に summary / prose ルートを混ぜない

### 優先7
収益化導線の導入
- public observatory を free layer として維持する
- full dataset / history / premium snapshots を paid layer 候補として整理する
- API / automated premium feeds を後続候補として設計する
- ads / affiliate は補助に留め、初期の主役にしない
- 問い合わせ依存の導線は置かず、完全自動化を優先する

---

## 5. 実装の次ステップ
1. normalized データから trend 集計に必要な軸を洗い出す
2. ranking 用の最小スキーマを作る
3. topic / company / region の集計スクリプトを作る
4. markdown / json どちらでも読めるランキング出力を作る
5. その後に軽い UI / 配信面を考える
6. free / paid の境界を作る（上位のみ公開、履歴や全件は制限）
7. premium dataset / historical exports CTA を置く

---

## 6. 率直な評価
この方向転換はかなり合理的。

理由:
- 記事量産より言語依存が低い
- 海外展開しやすい
- B2B 的な価値にも伸ばしやすい
- “観測データ” は自動化と相性が良い
- 完全放置運用にも向いている

---

## 7. 当面の判断基準
これから追加する機能は、まず以下で判断する。

- これはニュース観測価値を増やすか？
- ランキング / 集約に直結するか？
- 記事本文がなくても成立するか？
- 海外向けにそのまま出しやすいか？
- AI・テクノロジー / 金融・経済（投資・マクロ）のどちらかに明確に寄与するか？
- 解釈や主張を増やさず、数字・件数・変化量中心で出せるか？

YES が多いものを優先する。

## 8. 海外展開でやってはいけないこと
- 自動要約を英語で大量生成しない
- 政治的・戦争ニュースを断定口調で発信しない
- 複数国の価値観を混在させない
- ニュースを語らない。数字だけを出す
- summary / article / xpost / publish を public deploy path に再接続しない
- override なしで prose route を実行できる状態に戻さない
