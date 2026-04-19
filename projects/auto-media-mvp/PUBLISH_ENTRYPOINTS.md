# PUBLISH_ENTRYPOINTS

WordPress / note 用の publish 入口設計。

実投稿実装の前に、publish orchestration から各プラットフォームへ渡す入口を揃える。

## 1. 狙い
- queue 更新責務を共通化する
- platform ごとの差分を adapter に閉じ込める
- WordPress / note を同じ呼び出しパターンで扱う

## 2. 共通 publish 入口
```ts
type PublishPlatform = 'x' | 'wordpress' | 'note';

async function publishQueueItem(queueItem: PublishQueueEntry): Promise<PublishResult>
```

この関数がやること:
1. queue item を受け取る
2. status が `approved` か確認する
3. platform ごとの入力を組み立てる
4. 対応 adapter を呼ぶ
5. `PublishResult` を返す

この関数がやらないこと:
- queue 一覧走査
- cron 管理
- digest 通知

## 3. WordPress 入口
### 入力
```ts
type WordPressPublishInput = {
  item_id: string;
  platform: 'wordpress';
  title: string;
  content_markdown?: string;
  content_html?: string;
  slug?: string;
  excerpt?: string;
  categories?: string[];
  tags?: string[];
  featured_media_path?: string | null;
  status?: 'draft' | 'publish';
  meta?: {
    draft_file?: string;
    source_url?: string;
  };
};
```

### 出力
```ts
type WordPressPublishOutput = {
  ok: boolean;
  item_id: string;
  platform: 'wordpress';
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
    wp_status?: string;
  };
};
```

### 責務
- WordPress へ記事を作成する
- 必要なら markdown → html 変換を受け入れる
- WordPress 固有レスポンスを最小形へ正規化する

### MVPのおすすめ
最初は `status='draft'` をデフォルトにして、公開ではなく下書き作成から始める。

## 4. note 入口
note は API 制約が読みにくいので、最初から「実投稿」と「下書きエクスポート」を分けて考えるのが安全。

### 入力
```ts
type NotePublishInput = {
  item_id: string;
  platform: 'note';
  title: string;
  body_markdown: string;
  eyecatch_path?: string | null;
  publish_mode?: 'export' | 'draft' | 'publish';
  meta?: {
    draft_file?: string;
    source_url?: string;
  };
};
```

### 出力
```ts
type NotePublishOutput = {
  ok: boolean;
  item_id: string;
  platform: 'note';
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
    mode?: 'export' | 'draft' | 'publish';
    exported_file?: string;
  };
};
```

### 責務
- note 向け最終本文を受け取る
- 実 API が使えない間は export でもよい
- export でも `PublishResult` に写像できるようにする

### MVPのおすすめ
note は最初に `publish` を無理にやらず、
- `export`: note 用 Markdown/HTML を出力
- `draft`: 可能なら下書き作成

の二段構えにする。

現状の scaffold では `export` として `outputs/note/<item_id>.md` を書き出す。

## 5. publish result への写像
WordPress / note / X は最終的にこれへ揃える。

```ts
type PublishResult = {
  item_id: string;
  platform: 'x' | 'wordpress' | 'note';
  status: 'published' | 'error';
  published_at: string | null;
  external_post_id: string | null;
  error: {
    message: string;
    code?: string;
    retryable?: boolean;
  } | null;
};
```

## 6. platform selector 案
```ts
async function publishByPlatform(queueItem: PublishQueueEntry): Promise<PublishResult> {
  switch (queueItem.platform) {
    case 'x':
      return runPublishForX(queueItem);
    case 'wordpress':
      return runPublishForWordPress(queueItem);
    case 'note':
      return runPublishForNote(queueItem);
    default:
      throw new Error(`unsupported platform: ${queueItem.platform}`);
  }
}
```

## 7. 先に決めておくべきこと
- WordPress は `draft` 作成を成功扱いにするか
- note `export` を `published` 扱いにするか、別 status にするか
- `external_post_id` に URL を入れず、ID だけにするか

率直には:
- WordPress draft 作成は MVP では `published` 扱いでもいい
- note export は `published` ではなく、将来 `exported` を増やしたくなる

ただし今の最小 status を増やしたくないなら、note export は queue 外で扱うほうがきれい。

## 8. 現在の scaffold 方針
- `run_publish_ready.js` が orchestration を担当
- `lib_publish_adapters.js` が platform adapter を担当
- workspace 直下の `scripts/publish/publish-x.js` / `publish-wordpress.js` / `publish-note.js` は CLI 入口として薄く保つ

この分離にしておくと、
- project 内では関数として再利用しやすい
- 外側からは JSON file ベースで単体実行しやすい
