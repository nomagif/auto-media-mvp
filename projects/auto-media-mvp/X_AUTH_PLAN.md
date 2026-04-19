# X_AUTH_PLAN

X 実投稿 adapter に入れる認証方針の最小設計。

## 1. 結論
MVP では **OAuth 1.0a user context** を前提にする。

使う env:
- `X_API_KEY`
- `X_API_SECRET`
- `X_ACCESS_TOKEN`
- `X_ACCESS_TOKEN_SECRET`

理由:
- すでに env spec と adapter contract がこの4点を前提にしている
- user context での投稿はこの形がいちばん素直
- OAuth 2 user context / PKCE を今ここで混ぜると実装が重くなる

## 2. 実装方針
### まずやること
- `sendXPost()` 内で HTTP POST を行う
- 認証ヘッダ生成は専用 helper に閉じ込める
- request body は Twitter API v2 の `/2/tweets` に合わせる

### 分離する関数
- `buildXAuthConfig()`
- `createXPostRequest()`
- `buildXOAuth1Header()`
- `sendXPost()`
- `normalizeXPostResponse()`

## 3. 今回やらないこと
- OAuth 2.0 PKCE フロー
- refresh token 管理
- media upload の本実装
- reply thread の高度な制御
- rate limit retry の本格実装

## 4. request 形
想定 POST 先:
- `https://api.twitter.com/2/tweets`

想定 body:
```json
{
  "text": "..."
}
```

reply がある場合:
```json
{
  "text": "...",
  "reply": {
    "in_reply_to_tweet_id": "..."
  }
}
```

## 5. 成功レスポンスの最小正規化
API 応答から最低限ほしいもの:
- post id
- created time 相当（なければ local now でも可）

`XPublishOutput` へは最低限こう寄せる。

```json
{
  "ok": true,
  "platform": "x",
  "status": "published",
  "external_post_id": "...",
  "published_at": "..."
}
```

## 6. 失敗レスポンスの最小正規化
最低限ほしいもの:
- HTTP status
- message
- retryable かどうか

例:
```json
{
  "ok": false,
  "status": "error",
  "error": {
    "message": "unauthorized",
    "code": "HTTP_401",
    "retryable": false
  }
}
```

## 7. 率直なおすすめ
ここでは external library を増やしすぎない方がいい。
ただし OAuth 1.0a 署名は自前実装より、
- 小さい実績あるライブラリを使う

の方が安全。

もし依存追加が許されるなら、次は
- OAuth 1.0a helper 導入
- `sendXPost()` の実 HTTP 化

の順がいい。
