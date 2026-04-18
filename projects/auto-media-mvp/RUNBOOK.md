# RUNBOOK

最小の動作確認手順。

## 1. 一括実行
```bash
cd projects/auto-media-mvp
npm run run:mvp
```

## 2. 確認する場所
- raw: `data/raw/tech/`
- normalized: `data/normalized/`
- drafts: `drafts/markdown/`
- processed: `data/processed/`
- review digest: `output/daily/`
- state: `state/`

## 3. 期待する状態
- TechCrunch と Hacker News の raw が残る
- 新規URLがあれば normalized が増える
- draft markdown が増える
- publish_queue.json に pending 項目が積まれる
- review digest が1本生成される

## 4. 失敗時の切り分け
### collect で失敗
- ネットワーク疎通を確認
- ソースURLのレスポンス仕様変更を疑う

### generate で失敗
- `data/normalized/` に JSON があるか確認
- JSON破損がないか確認

### review digest で失敗
- `state/publish_queue.json` の形式を確認

## 5. 次の改善候補
- logs/ に実行ログを吐く
- source別に件数サマリを出す
- retry / timeout を調整する
- cron 実行へ移す
