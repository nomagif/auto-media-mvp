# X_AUTH_PLAN

X 実投稿 adapter に入れる認証方針の最小設計。

## 1. 結論
MVP では **OAuth 2.0 user context** を前提にする。

使う env の候補:
- `X_CLIENT_ID`
- `X_CLIENT_SECRET`
- `X_ACCESS_TOKEN`
- `X_REFRESH_TOKEN`

理由:
- X portal が OAuth 2.0 user authentication を前面に出している
- OAuth 1.0a を無理に追うより、現行 portal に合わせた方が自然
- 今後の user context 運用も OAuth 2.0 の方が筋がいい

## 2. 実装方針
### まずやること
- `sendXPost()` 内で HTTP POST を行う
- Authorization は `Bearer <access token>` を使う
- request body は Twitter API v2 の `/2/tweets` に合わせる

### 分離する関数
- `buildXAuthConfig()`
- `createXPostRequest()`
- `buildXBearerHeader()`
- `sendXPost()`
- `normalizeXPostResponse()`

## 3. 今回やらないこと
- refresh token 自動更新の本実装
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
X 側は portal に寄せる方がいい。
OAuth 1.0a に固執するより、OAuth 2.0 user context に設計変更した方が進めやすい。
