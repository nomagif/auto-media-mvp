# CUSTOM_DOMAIN_SETUP

Cloudflare Pages に custom domain を付ける最短手順。

## 前提
- Pages project が公開済み
- 現在の公開URLは <https://auto-media-mvp.pages.dev>

## 1. Cloudflare Pages project を開く
- project: `auto-media-mvp`
- `Custom domains` または `Domains` を開く

## 2. 追加したい domain を入れる
例:
- `observatory.example.com`
- `news.example.com`
- `ai-macro.example.com`

推奨:
- まずは subdomain で始める
- apex domain (`example.com`) より `www` や `observatory` の方が扱いやすい

## 3. DNS を接続
Cloudflare が同じ zone を管理している場合:
- そのまま自動で DNS 設定されることが多い

外部 DNS の場合:
- Cloudflare Pages が指示する CNAME を設定する

## 4. SSL を待つ
- certificate 発行が完了するまで少し待つ
- `Active` になれば完了

## 5. 公開確認
確認:
- custom domain で Home が開く
- browse links が壊れない
- 旧 `pages.dev` URL でも確認できる

## 運用メモ
- custom domain 導入後も build command / output directory は変えない
- `SITE_BASE_PATH` は custom domain 直下配信なら未設定のままでよい
- 独自ドメイン移行後は README / deploy docs の公開URLを更新する
