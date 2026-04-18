# OPENCLAW_SUMMARY_WORKER_SPEC

OpenClaw 側で summary worker を実装するための処理仕様書。

## 1. 結論
本物の summary worker は Node スクリプトではなく OpenClaw turn として実装する。
Node 側は queue とファイル保存を担い、OpenClaw 側は request を読んで response JSON を返す実行責務を持つ。

---

## 2. worker の責務
OpenClaw worker turn の責務:
- `state/summary_queue.json` を読む
- `status = pending` を1件選ぶ
- 対応 request JSON を読む
- subagent へ summary 生成を依頼する
- response JSON を保存する
- queue を success / error に更新する
- 必要に応じて `last_run.json` を更新する

---

## 3. 1件選定ルール
- 先頭から順に `status = pending` を探す
- 最初の1件だけ処理する
- `processing` のものは触らない
- `success` / `error` はスキップする

MVP では 1 turn = 1 item に固定する。

---

## 4. request の読み方
queue item の `request_file` から request JSON を読む。
必須:
- `item.id`
- `item.title`
- `item.body` または `item.draft_markdown`

request 形式は `SUMMARY_IO_SPEC.md` に従う。

---

## 5. subagent 実行手順
OpenClaw worker は `sessions_spawn` を使って isolated subagent を起動する。

### 推奨設定
- `runtime: subagent`
- `mode: run`
- `cleanup: delete`
- `timeoutSeconds: 120`
- `runTimeoutSeconds: 120`

### subagent への指示
- request JSON を読む
- JSONのみ返す
- markdown fence 禁止
- commentary 禁止
- success / error どちらも JSON で返す
- 日本語で自然に要約する
- 誇張しない
- 投資助言に見える表現を避ける

---

## 6. response 保存手順
### success の場合
- `data/processed/responses/<item-id>-summary-response.json` に保存
- queue item を `success` に更新
- `response_file` を埋める
- `last_error` を `null` にする

### error の場合
- 同じ response 保存先へ error JSON を保存
- queue item を `error` に更新
- `response_file` を埋める
- `last_error` に response の error を保存

### parse失敗時
subagent の返答が JSON parse できない場合は、worker が `INVALID_RESPONSE_JSON` の error response JSON を自前生成して保存する。

---

## 7. queue 更新ルール
### 処理開始前
- `pending -> processing`
- `attempts += 1`
- `updated_at = now`

### 成功時
- `processing -> success`
- `updated_at = now`
- `response_file` 更新
- `last_error = null`

### 失敗時
- `processing -> error`
- `updated_at = now`
- `response_file` 更新
- `last_error` 記録

---

## 8. retry 方針
MVP では自動 retry しない。
手動で queue item を `pending` に戻す運用を基本にする。

推奨条件:
- `attempts < 3`
- `last_error.retryable = true`

---

## 9. cron 化の注意
cron 化するときも 1回で1件だけ処理する。
理由:
- エラー切り分けが簡単
- レート制御しやすい
- main session を汚さない

推奨 cron の役割:
- summary queue worker を定期実行
- 長時間のバッチ処理は避ける

---

## 10. OpenClaw worker turn の擬似手順
1. `state/summary_queue.json` を読む
2. pending item を1件選ぶ
3. queue を processing に更新
4. request JSON を読む
5. subagent に request を渡す
6. response を JSON parse
7. response file を保存
8. queue を success / error に更新
9. `last_run.json` を更新

---

## 11. 率直な運用メモ
worker は Node で無理に完結させない方がいい。
OpenClaw の強みは orchestration にあるので、subagent 呼び出しは OpenClaw turn 側に寄せる方が設計が綺麗になる。
