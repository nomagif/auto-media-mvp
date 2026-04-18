# TechCrunch 正規化メモ

最初の縦一列用メモ。

## 目的
- TechCrunch RSS を取得する
- raw XML を `data/raw/tech/` に保存する
- 共通スキーマに寄せた JSON を `data/normalized/` に保存する

## 実行例
```bash
node projects/auto-media-mvp/scripts/collect/techcrunch_rss.js
```

## いまの仕様
- フィード先頭20件を対象
- description から HTML を除去して `body` に入れる
- author は `dc:creator` を利用
- tags はまだ未抽出

## いま対応済み
- seen_urls.json を見た URL 重複除外
- last_run.json の更新

## 次にやること
- category タグ抽出
- logs/ への実行ログ保存
- 失敗時リトライ方針
