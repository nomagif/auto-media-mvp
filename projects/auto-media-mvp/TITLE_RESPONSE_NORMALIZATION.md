# TITLE_RESPONSE_NORMALIZATION

title candidates 応答を `TITLE_XPOST_IO_SPEC.md` 準拠へ丸めるためのルール。

## success 判定
以下を success 候補とみなす:
- `ok: true`
- `status: success`
- `titles.candidates` または `candidates` が配列で存在

## 揺れ吸収
- `item_id` / `id` / request.item.id
- `titles.candidates` / `candidates`
- `model` / request.target_model / `GPT`
- `prompt_file` / request.prompt_file / `prompts/title_candidates.md`

## failure に落とす条件
- JSON parse 失敗
- object ではない
- success とみなせるが candidates が取れない
- success/error どちらの形にも解釈できない

## 実装位置
- `scripts/generate/lib_title_response.js`
