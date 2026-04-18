# PHASE_A_WORKER_FIXTURE_PLAN

worker 正規化統合の Phase A 用メモ。

## 1. 目的
本物の OpenClaw worker 実働化の前に、subagent から返ってきた raw response text を fixture として使い、`run_summary_worker.js` の正規化・保存・queue 更新を疑似統合で確認する。

---

## 2. fixture 置き場
推奨:
```text
fixtures/
  summary-responses/
```

例:
- `fixtures/summary-responses/hn-2026-04-18-001.raw.json`

ここには subagent が返した生の JSON 文字列を保存する。

---

## 3. worker への注入方法
MVPではシンプルにする。

### 方式A
- `run_summary_worker.js --raw-file <path>`

### 方式B
- `RAW_RESPONSE_FILE=<path> node run_summary_worker.js`

おすすめは **方式A**。
Node スクリプトとしてわかりやすい。

---

## 4. 実行フロー
1. summary_queue.json に pending item を用意
2. request JSON が存在することを確認
3. fixture raw response file を指定して worker 実行
4. worker が raw text を読む
5. `normalizeSummaryResponse(rawText, request)` を実行
6. response JSON 保存
7. queue を success / error 更新
8. 続けて `summary:apply` を実行し enriched に反映

---

## 5. 成功条件
- `data/processed/responses/<item-id>-summary-response.json` が作られる
- queue item が `success` になる
- `last_error` が null になる
- `summary:apply` で enriched JSON に反映される

---

## 6. fixture の価値
- subagent 実行なしで worker の中心ロジックを検証できる
- JSON 形の揺れに対する normalize のテストになる
- 失敗ケース fixture も後で追加しやすい

---

## 7. 次の実装対象
- `fixtures/summary-responses/` を追加
- 1件分の raw response fixture を保存
- `run_summary_worker.js` に `--raw-file` 対応を入れる
