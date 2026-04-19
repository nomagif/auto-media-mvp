# X_PUBLISH_INTERFACE

X の実投稿インターフェース設計。

実装はまだ行わず、I/O と責務を固定するための文書。

## 1. 目的
- publish 実行側と X API 実装側を分離する
- queue 更新責務を publish orchestration 側へ寄せる
- X adapter は「投稿して結果を返す」に集中させる

## 2. 責務の分離
### X adapter の責務
- 入力を受け取る
- X に投稿する
- 成功時は `external_post_id` と最小メタデータを返す
- 失敗時は正規化した `error` を返す
- API/SDK 差し替え点になる

### X adapter の責務ではないもの
- queue から対象を選ぶ
- `approved` 判定
- `published_at` の永続化
- 再試行ポリシーの最終判断
- review digest 更新

これらは publish orchestration 側で扱う。

## 3. 入力 I/O
```ts
type XPublishInput = {
  item_id: string;
  platform: 'x';
  text: string;
  reply_to_post_id?: string | null;
  media?: Array<{
    file_path: string;
    alt_text?: string;
  }>;
  idempotency_key?: string;
  dry_run?: boolean;
  meta?: {
    draft_file?: string;
    source_url?: string;
    title?: string;
  };
};
```

### 入力ルール
- `text` は最終投稿文。adapter 内で大きく加工しない
- `media` は任意。MVP は 0 or 1 枚想定で十分
- `idempotency_key` は二重投稿防止の補助
- `dry_run=true` のときは外部投稿せず、検証結果だけ返してよい
- scaffold 段階でも `text` 空文字 / 280字超過 / `media` 型不正は error を返す

## 4. 出力 I/O
```ts
type XPublishOutput = {
  ok: boolean;
  item_id: string;
  platform: 'x';
  status: 'published' | 'error';
  published_at: string | null;
  external_post_id: string | null;
  error: {
    message: string;
    code?: string;
    retryable?: boolean;
  } | null;
  meta?: {
    url?: string;
    media_count?: number;
    dry_run?: boolean;
    raw_status?: number;
  };
};
```

## 5. publish orchestration との境界
publish orchestration は次を行う。

1. `state/publish_queue.json` から `approved` を選ぶ
2. draft/enriched から `XPublishInput` を組み立てる
3. adapter を呼ぶ
4. `XPublishOutput` を `PublishResult` に写像する
5. queue entry の `status / published_at / external_post_id / error / updated_at` を更新する

## 6. 最小関数シグネチャ案
```ts
async function publishToX(input: XPublishInput): Promise<XPublishOutput>
```

orchestrator 側:

```ts
async function runPublishForX(queueItem: PublishQueueEntry): Promise<PublishResult>
```

## 7. MVPで返せれば十分なもの
成功時:
- `status=published`
- `published_at`
- `external_post_id`

失敗時:
- `status=error`
- `error.message`
- `error.code`（あれば）
- `error.retryable`（分かる範囲で）

## 8. 率直なおすすめ
X adapter は thin に保つのがいい。
文章整形・承認・queue 更新まで混ぜると、後で WordPress / note に横展開しづらくなる。

## 9. 現在の scaffold 反映
認証方針の詳細は `X_AUTH_PLAN.md` を参照。

現状は次の役割分担になっている。

- `lib_publish_adapters.js` の `publishToX(input)` が関数の本体
- `run_publish_ready.js` が queue item から `XPublishInput` を組み立てて呼ぶ
- workspace 直下の `scripts/publish/publish-x.js` は `XPublishInput JSON -> XPublishOutput JSON` の CLI 入口
- non-dry-run 時は `buildXAuthConfig()` / `createXPostRequest()` / `sendXPost()` が差し替え点

この構造なら、後で本物の X API 呼び出しに差し替えても orchestration 側をほぼ触らずに済む。
