# SUMMARY_RESPONSE_NORMALIZATION

subagent / worker から返ってくる summary JSON を `SUMMARY_IO_SPEC.md` 準拠へ丸めるためのルール。

## 基本方針
モデル出力はそのまま信用せず、worker 側で正規化する。

## success 判定
以下を success 候補とみなす:
- `ok: true`
- `status: success`
- `summary.summary_ja` または `summary_ja` が存在

## 揺れ吸収
- `item_id` / `id` / request.item.id
- `summary.summary_ja` / `summary_ja`
- `summary.background_ja` / `background_ja`
- `summary.why_it_matters_ja` / `why_it_matters_ja`
- `model` / request.target_model / `GPT`
- `prompt_file` / request.prompt_file / `prompts/summarize.md`

## failure に落とす条件
- JSON parse 失敗
- object ではない
- success とみなせるが `item_id` または `summary_ja` が取れない
- success/error どちらの形にも解釈できない

## raw_response
subagent の返却文字列全文を `meta.raw_response` に保持する。

## 実装位置
- `scripts/generate/lib_summary_response.js`
