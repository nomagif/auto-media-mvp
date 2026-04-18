# XPOST_RESPONSE_NORMALIZATION

X post 応答を `TITLE_XPOST_IO_SPEC.md` 準拠へ丸めるためのルール。

## success 判定
- `ok: true`
- `status: success`
- `social.x_post` または `x_post` が存在

## 揺れ吸収
- `item_id` / `id` / request.item.id
- `social.x_post` / `x_post`
- `model` / request.target_model / `GPT`
- `prompt_file` / request.prompt_file / `prompts/x_post.md`

## failure 条件
- JSON parse 失敗
- object でない
- success とみなせるが x_post が取れない
- success/error のどちらにも解釈できない
