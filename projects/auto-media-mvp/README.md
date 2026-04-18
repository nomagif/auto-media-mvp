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

## 運用方針
- まずは投稿自動化しない
- rawデータを必ず残す
- URLとトピックの重複を避ける
- 投資助言に見える表現は避ける
