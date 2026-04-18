# WORKER_INTEGRATION_PLAN

`run_summary_worker.js` に summary 応答正規化アダプタを組み込むための実装案。

## 1. 目的
placeholder error を直書きする worker から、raw response を受けて `SUMMARY_IO_SPEC` 準拠へ正規化する worker へ移行する。

---

## 2. 変更方針
### 現在
- `run_summary_worker.js` は `NOT_IMPLEMENTED` error response を自前生成するだけ

### 次段階
- worker は raw response text を受け取る
- `normalizeSummaryResponse(rawText, request)` を通す
- 正規化済み response JSON を保存する
- `response.ok` に応じて queue を更新する

---

## 3. 差し込みポイント
`run_summary_worker.js` に以下を追加する。

### import
- `lib_summary_response.js`

### 処理
1. request JSON を読む
2. raw response text を取得する
3. `normalizeSummaryResponse(rawText, request)` を実行
4. normalized response を保存する
5. queue を success / error に更新する

---

## 4. raw response の入口
MVP では 2段階で進める。

### Phase A
- Node worker に `--raw-file` または `RAW_RESPONSE_FILE` を渡して疑似統合
- 実際の subagent 返答例を raw text として保存し、それを正規化させる

### Phase B
- OpenClaw worker turn が subagent 実行を担当
- subagent の返却テキストを Node worker に渡す、または OpenClaw 側でそのまま正規化相当を行う

---

## 5. 疑似コード
```js
const request = readJson(requestFile)
const rawText = fs.readFileSync(rawResponseFile, 'utf8')
const normalized = normalizeSummaryResponse(rawText, request)

save response JSON

if (normalized.ok) {
  queue.status = 'success'
  queue.last_error = null
} else {
  queue.status = 'error'
  queue.last_error = normalized.error
}
```

---

## 6. 成功条件
- raw text が多少揺れても response JSON が spec 形に揃う
- `apply_summary_response.js` が追加修正なしで読める
- failure でも response JSON が必ず残る

---

## 7. 率直なおすすめ
いきなり subagent 実行まで Node worker に背負わせない。
まずは raw response を入力にした疑似統合で、正規化と queue 更新が正しいかを確認するのが堅い。
