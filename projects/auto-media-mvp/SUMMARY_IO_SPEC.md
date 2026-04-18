# SUMMARY_IO_SPEC

OpenClaw / Codex に summary 生成を委譲するための入出力仕様書。

## 1. 目的
Node 側では入力bundle生成と保存を担当し、summary 本文の生成は OpenClaw / Codex 側へ委譲する。

---

## 2. ジョブ責務
### Node 側
- normalized / draft / manifest から入力bundle生成
- request JSON 保存
- response JSON 保存
- state 更新

### OpenClaw / Codex 側
- 入力bundleを読む
- summary / background / why_it_matters を生成
- 指定形式の JSON を返す
- 失敗時はエラー形式で返す

---

## 3. 入力仕様
1件ずつ投げる想定。

### request JSON
```json
{
  "job_type": "summary_generation",
  "version": "v0.1",
  "requested_at": "2026-04-18T21:40:00+09:00",
  "target_model": "GPT",
  "prompt_file": "prompts/summarize.md",
  "item": {
    "id": "techcrunch-2026-04-18-001",
    "source_name": "TechCrunch",
    "source_type": "tech",
    "source_url": "https://example.com/article",
    "title": "Original title",
    "body": "Raw body or excerpt",
    "draft_markdown": "# Draft...",
    "published_at": "2026-04-18T20:40:00+09:00",
    "collected_at": "2026-04-18T21:00:00+09:00"
  }
}
```

### 必須項目
- `job_type`
- `version`
- `requested_at`
- `target_model`
- `item.id`
- `item.title`
- `item.body` または `item.draft_markdown`

---

## 4. 正常時レスポンス仕様
```json
{
  "ok": true,
  "version": "v0.1",
  "item_id": "techcrunch-2026-04-18-001",
  "model": "GPT",
  "generated_at": "2026-04-18T21:41:00+09:00",
  "summary": {
    "summary_ja": "3行要約",
    "background_ja": "背景説明",
    "why_it_matters_ja": "なぜ重要か"
  },
  "meta": {
    "prompt_file": "prompts/summarize.md",
    "raw_response": null,
    "status": "success"
  }
}
```

### 制約
- `summary_ja` は簡潔に
- `background_ja` は補足中心
- `why_it_matters_ja` は読者への意味を短く書く
- 誇張しない
- 投資助言に見える文言を避ける

---

## 5. 異常時レスポンス仕様
```json
{
  "ok": false,
  "version": "v0.1",
  "item_id": "techcrunch-2026-04-18-001",
  "generated_at": "2026-04-18T21:41:00+09:00",
  "error": {
    "code": "GENERATION_FAILED",
    "message": "reason text",
    "retryable": true
  },
  "meta": {
    "prompt_file": "prompts/summarize.md",
    "status": "error"
  }
}
```

### 代表エラーコード
- `INVALID_INPUT`
- `GENERATION_FAILED`
- `TIMEOUT`
- `RATE_LIMITED`
- `MODEL_UNAVAILABLE`

---

## 6. 保存方針
### request 保存先
- `data/processed/requests/<item-id>-summary-request.json`

### response 保存先
- `data/processed/responses/<item-id>-summary-response.json`

### enrich への反映
response の `summary` を `outputs.summary` に格納する。
`meta` は監査用としてそのまま保持する。

---

## 7. 実行方式
### MVP
- 1件ずつ同期実行
- 失敗時はその item だけスキップ
- retry は後段で検討

### 将来
- バッチ化
- 優先度付きキュー
- 非同期ジョブ化

---

## 8. OpenClaw 側に渡す指示の要点
- JSONのみ返す
- 事実ベースで要約する
- 日本語で自然に書く
- 元記事の主張と事実を混同しない
- 煽らない

---

## 9. 率直な運用メモ
最初は summary だけ委譲する。
うまく回ったら titles / social / article へ広げる。
最初から全部投げるとデバッグが重い。
