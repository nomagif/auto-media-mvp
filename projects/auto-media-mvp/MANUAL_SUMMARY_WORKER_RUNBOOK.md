# MANUAL_SUMMARY_WORKER_RUNBOOK

summary worker を手動運用で回すための手順書。

## 1. 目的
OpenClaw 実働版 worker を完全自動化する前に、人間が同じ手順で summary queue を処理できるようにする。

---

## 2. 前提
- `generate:enrich` が実行済み
- `summary:enqueue` が実行済み
- `state/summary_queue.json` に pending item がある
- subagent 実行が通る状態になっている

---

## 3. queue の確認
確認対象:
- `state/summary_queue.json`

見るポイント:
- `status = pending` の item
- `request_file`
- `item_id`

MVPでは先頭の pending を1件処理する。

---

## 4. request JSON の確認
対応する `request_file` を開いて以下を見る。
- `item.id`
- `item.title`
- `item.source_url`
- `item.draft_markdown`

これをもとに subagent に渡す task を作る。

---

## 5. subagent 実行
`prompts/summary_worker_task.md` のルールに従って task を作り、request JSON を埋め込んで subagent に渡す。

ポイント:
- JSON only
- markdown fence 禁止
- commentary 禁止
- success / error どちらも JSON

---

## 6. raw response 保存
subagent から返ってきた文字列をそのまま保存する。

推奨保存先:
```text
fixtures/summary-responses/<item-id>.raw.json
```

例:
```text
fixtures/summary-responses/hn-2026-04-18-002.raw.json
```

---

## 7. worker 実行
```bash
cd projects/auto-media-mvp
npm run summary:worker -- --raw-file fixtures/summary-responses/<item-id>.raw.json
```

期待結果:
- response JSON が保存される
- queue item が `success` になる

---

## 8. apply 実行
```bash
cd projects/auto-media-mvp
npm run summary:apply
```

期待結果:
- enriched JSON に summary が反映される
- queue item の `applied_at` が更新される

---

## 9. 成功確認ポイント
- `data/processed/responses/<item-id>-summary-response.json` がある
- `state/summary_queue.json` で `status = success`
- `applied_at` が入る
- 対応する `*-enriched.json` に summary が反映される

---

## 10. 失敗時の切り分け
### subagent が通らない
- gateway / pairing / nodes 状態を確認
- `gateway.bind` を確認

### raw response が parse できない
- JSON only になっているか確認
- code fence や説明文が混ざっていないか確認

### worker が error になる
- `data/processed/responses/` の error JSON を確認
- `meta.raw_response` を確認

### apply で反映されない
- queue item が `success` か確認
- `response_file` があるか確認
- 対応する enriched JSON が存在するか確認

---

## 11. 率直な運用メモ
この runbook は自動化前の最短運用手順。
まずは人手で安定して回せることを確認し、その後で OpenClaw worker turn / cron 化へ進むのが安全。
