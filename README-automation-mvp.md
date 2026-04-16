# Automation MVP

このMVPは、海外テックニュースを対象にした収集・変換・配信パイプラインの雛形です。

## 今あるもの
- `config/sources/tech-news.json` ソース定義
- `prompts/transformer/tech-news.md` 変換プロンプト
- `scripts/collect/collect-tech-news.js` 収集stub
- `scripts/transform/run-transformer.js` 変換stub
- `scripts/publish/publish-wordpress.js` WordPress下書きstub
- `scripts/publish/publish-x.js` X投稿stub
- `data/normalized/2026-04-16/sample-tech-item.json` サンプル入力

## 動作確認
### 1. ソース設定を表示
```bash
node scripts/collect/collect-tech-news.js
```

### 2. 変換stubを実行
```bash
node scripts/transform/run-transformer.js data/normalized/2026-04-16/sample-tech-item.json
```

### 3. WordPress下書きpayloadを確認
```bash
node scripts/transform/run-transformer.js data/normalized/2026-04-16/sample-tech-item.json > /tmp/artifact.json
node scripts/publish/publish-wordpress.js /tmp/artifact.json
```

### 4. X投稿payloadを確認
```bash
node scripts/publish/publish-x.js /tmp/artifact.json
```

## 次の実装候補
- RSS取得の実装
- 本文抽出の実装
- Codex/ACP 呼び出しの実装
- JSON schema validation の追加
- WordPress / X API 接続
- cronジョブ化
