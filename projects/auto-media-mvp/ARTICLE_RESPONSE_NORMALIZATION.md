# ARTICLE_RESPONSE_NORMALIZATION

article 応答を `ARTICLE_IO_SPEC.md` 準拠へ丸めるためのルール。

## success 判定
- `ok: true`
- `status: success`
- `article.title`, `article.lead`, `article.sections` が存在

## 揺れ吸収
- `item_id` / `id` / request.item.id
- `article.title` / `title`
- `article.lead` / `lead`
- `article.sections` / `sections`
- `article.closing` / `closing`

## failure 条件
- JSON parse 失敗
- object でない
- success とみなせるが必須項目不足
- success/error のどちらにも解釈できない
