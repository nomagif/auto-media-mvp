# X_OAUTH_LIBRARY_PLAN

X 実投稿 adapter に組み込む OAuth 1.0a ライブラリ方針。

## 1. 結論
MVP では **OAuth 1.0a 専用の小さいライブラリ**を使う前提で進める。

理由:
- 自前署名実装は事故りやすい
- X 投稿で必要なのは PKCE ではなく user context の署名
- adapter の責務を薄く保ちやすい

## 2. 候補に求める条件
- OAuth 1.0a の署名生成に集中している
- Node.js で軽く使える
- 任意の method / url / body に対して Authorization header を作れる
- 依存が重すぎない
- メンテ状況が極端に悪くない

## 3. 組み込み位置
`lib_publish_adapters.js` の次の位置に入れる。

- `buildXAuthConfig()`
- `buildXOAuth1Header()` ← ここでライブラリ呼び出し
- `createXPostRequest()`
- `sendXPost()`

つまり adapter の外には漏らさない。

## 4. 実装イメージ
### いま
- `buildXOAuth1Header()` は stub
- `sendXPost()` は `NOT_IMPLEMENTED`

### 次
- OAuth helper 初期化
- `buildXOAuth1Header()` で本物の header を返す
- `sendXPost()` で `fetch` or `https` による POST を行う
- レスポンスを `XPublishOutput` へ正規化する

## 5. 安全策
- `dry_run` が false でも、env がない場合は `MISSING_ENV`
- `X_DRY_RUN_FORCE=1` なら実投稿を止める
- 最初は media upload を未対応にする
- 最初は 1 post のみ

## 6. 率直なおすすめ
本当に最初の実装はここまでで十分。
- text 投稿のみ
- reply 任意
- media なし
- 成功時は id を返す
- 失敗時は HTTP status ベースで正規化

やりすぎると詰まるので、まずは text post 1本通すのがいい。
