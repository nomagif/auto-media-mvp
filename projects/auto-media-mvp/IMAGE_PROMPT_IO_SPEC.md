# IMAGE_PROMPT_IO_SPEC

summary の次段として image prompt を生成するための入出力仕様。

## 1. 基本方針
- summary と article の内容をもとに、画像生成モデルへ渡せる prompt を作る
- 出力は画像そのものではなく prompt text
- request/response は独立管理する

---

## 2. image_prompt_generation 入力
```json
{
  "job_type": "image_prompt_generation",
  "version": "v0.1",
  "requested_at": "2026-04-19T01:00:00+09:00",
  "target_model": "GPT",
  "prompt_file": "prompts/image_prompt.md",
  "item": {
    "id": "hn-2026-04-18-002",
    "source_name": "HackerNews",
    "source_type": "tech",
    "source_url": "https://example.com",
    "summary_ja": "...",
    "background_ja": "...",
    "why_it_matters_ja": "...",
    "article_title": "..."
  }
}
```

---

## 3. 正常時レスポンス
```json
{
  "ok": true,
  "version": "v0.1",
  "item_id": "hn-2026-04-18-002",
  "model": "GPT",
  "generated_at": "2026-04-19T01:01:00+09:00",
  "image": {
    "image_prompt": "tech editorial illustration, ..."
  },
  "meta": {
    "prompt_file": "prompts/image_prompt.md",
    "raw_response": null,
    "status": "success"
  }
}
```

### image prompt ルール
- テック系
- 誇張しすぎない
- 視認性重視
- テキスト少なめ
- 記事内容を象徴的に表現

---

## 4. 異常時レスポンス
summary / title / xpost / article と同じ思想で統一する。

---

## 5. 保存方針
```text
data/processed/requests/
  <item-id>-image-prompt-request.json

data/processed/responses/
  <item-id>-image-prompt-response.json
```
