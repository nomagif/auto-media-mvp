# IMAGE_PROMPT_RESPONSE_NORMALIZATION

image prompt 応答を `IMAGE_PROMPT_IO_SPEC.md` 準拠へ丸めるためのルール。

## success 判定
- `ok: true`
- `status: success`
- `image.image_prompt` または `image_prompt` が存在

## 揺れ吸収
- `item_id` / `id` / request.item.id
- `image.image_prompt` / `image_prompt`
- `model` / request.target_model / `GPT`
- `prompt_file` / request.prompt_file / `prompts/image_prompt.md`
