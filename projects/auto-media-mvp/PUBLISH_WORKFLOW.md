# PUBLISH_WORKFLOW

## WordPress / X / note の承認フロー

### 基本方針
- WordPress は最初から公開せず、必ず draft で作成する
- 人間が WordPress draft を確認してから公開する
- X / note は WordPress 下書き確認後に進める

## ステータスの意味
- `pending_review`: 生成済みだが未確認
- `approved`: 投稿実行してよい
- `published`: プラットフォームへの投入完了
- `error`: 投稿失敗。再確認が必要

## 推奨フロー
1. 素材収集
2. 日本語要約・記事生成
3. queue 追加 (`pending_review`)
4. 人間が以下を確認
   - タイトル
   - 要約の正確さ
   - 出典URL
   - カテゴリ / タグ
   - 誤字や不自然な表現
5. 問題なければ `approved`
6. WordPress に draft 投稿
7. 管理画面で最終確認
8. 公開
9. 必要なら X / note を `approved` にして配信

## 初期運用ルール
- 1記事ごとに WordPress draft を確認する
- 自動公開はしない
- 訃報・規制・金融系は特に人間確認を必須にする
- source_url を必ず保持する
- カテゴリは 1つを基本、タグは 2〜4個を目安にする

## 当面の運用
- WordPress: draft only
- X: WordPress確認後
- note: WordPress確認後
