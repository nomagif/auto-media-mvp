# TITLE_XPOST_IO_SPEC

summary の次段として title candidates と X post を生成するための入出力仕様。

## 1. 基本方針
- summary を土台にして生成する
- title と X post は別出力として扱う
- request/response は summary とは分ける
- queue / worker ロジックは将来共通化可能だが、MVPでは job 種別を分ける

---

## 2. title_generation 入力
```json
{
  "job_type": "title_generation",
  "version": "v0.1",
  "requested_at": "2026-04-18T23:00:00+09:00",
  "target_model": "GPT",
  "prompt_file": "prompts/title_candidates.md",
  "item": {
    "id": "hn-2026-04-18-002",
    "source_name": "HackerNews",
    "source_type": "tech",
    "source_url": "https://example.com",
    "title_original": "Michael Rabin Has Died",
    "summary_ja": "...",
    "background_ja": "...",
    "why_it_matters_ja": "..."
  }
}
```

## 3. title_generation 正常時レスポンス
```json
{
  "ok": true,
  "version": "v0.1",
  "item_id": "hn-2026-04-18-002",
  "model": "GPT",
  "generated_at": "2026-04-18T23:01:00+09:00",
  "titles": {
    "candidates": [
      "候補1",
      "候補2",
      "候補3"
    ]
  },
  "meta": {
    "prompt_file": "prompts/title_candidates.md",
    "raw_response": null,
    "status": "success"
  }
}
```

### title ルール
- 3案
- 日本語で自然
- 誇張しない
- 32〜45文字程度を目安
- 煽り禁止

---

## 4. x_post_generation 入力
```json
{
  "job_type": "x_post_generation",
  "version": "v0.1",
  "requested_at": "2026-04-18T23:00:00+09:00",
  "target_model": "GPT",
  "prompt_file": "prompts/x_post.md",
  "item": {
    "id": "hn-2026-04-18-002",
    "source_name": "HackerNews",
    "source_type": "tech",
    "source_url": "https://example.com",
    "summary_ja": "...",
    "background_ja": "...",
    "why_it_matters_ja": "..."
  }
}
```

## 5. x_post_generation 正常時レスポンス
```json
{
  "ok": true,
  "version": "v0.1",
  "item_id": "hn-2026-04-18-002",
  "model": "GPT",
  "generated_at": "2026-04-18T23:01:00+09:00",
  "social": {
    "x_post": "280文字以内の投稿文"
  },
  "meta": {
    "prompt_file": "prompts/x_post.md",
    "raw_response": null,
    "status": "success"
  }
}
```

### X post ルール
- 280文字以内
- 日本語で自然
- 誇張しない
- ハッシュタグ 0〜2
- 1投稿で完結

---

## 6. 異常時レスポンス
summary と同じ思想で統一する。

```json
{
  "ok": false,
  "version": "v0.1",
  "item_id": "hn-2026-04-18-002",
  "generated_at": "2026-04-18T23:01:00+09:00",
  "error": {
    "code": "GENERATION_FAILED",
    "message": "reason text",
    "retryable": true
  },
  "meta": {
    "prompt_file": "prompts/title_candidates.md",
    "status": "error"
  }
}
```

---

## 7. 保存方針
- title request/response
- x post request/response
は summary と同様に request/response ディレクトリ構造へ保存可能

将来案:
```text
data/processed/requests/
  <item-id>-title-request.json
  <item-id>-xpost-request.json

data/processed/responses/
  <item-id>-title-response.json
  <item-id>-xpost-response.json
```

---

## 8. 実装順のおすすめ
1. title_generation
2. x_post_generation
3. article_generation

summary が土台なので、まずは軽い出力から広げる。
