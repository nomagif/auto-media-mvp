# ARTICLE_IO_SPEC

summary の次段として article draft を生成するための入出力仕様。

## 1. 基本方針
- summary / title / social より重い出力として扱う
- summary を土台にしつつ、背景と読者向けの意味を広げる
- request/response は独立管理する

---

## 2. article_generation 入力
```json
{
  "job_type": "article_generation",
  "version": "v0.1",
  "requested_at": "2026-04-18T23:30:00+09:00",
  "target_model": "GPT",
  "prompt_file": "prompts/article.md",
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

---

## 3. 正常時レスポンス
```json
{
  "ok": true,
  "version": "v0.1",
  "item_id": "hn-2026-04-18-002",
  "model": "GPT",
  "generated_at": "2026-04-18T23:31:00+09:00",
  "article": {
    "title": "記事タイトル",
    "lead": "導入文",
    "sections": [
      { "heading": "何が起きたか", "body": "..." },
      { "heading": "背景", "body": "..." },
      { "heading": "なぜ重要か", "body": "..." }
    ],
    "closing": "まとめ"
  },
  "meta": {
    "prompt_file": "prompts/article.md",
    "raw_response": null,
    "status": "success"
  }
}
```

### article ルール
- 日本語で自然
- 誇張しない
- 投資助言に見える表現を避ける
- 見出し構造を持つ
- まずは短めの draft を想定

---

## 4. 異常時レスポンス
summary / title / xpost と同じ思想で統一する。

---

## 5. 保存方針
```text
data/processed/requests/
  <item-id>-article-request.json

data/processed/responses/
  <item-id>-article-response.json
```

---

## 6. 実装順のおすすめ
1. request builder
2. response normalization
3. worker scaffold
4. apply
5. fixture 1本で検証
