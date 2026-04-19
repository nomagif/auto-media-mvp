# PUBLISH_PRECHECKLIST

実送信前の最小チェックリスト。

## 共通
- [ ] queue / draft / fixture の整合が取れている
- [ ] 実行対象 platform を間違えていない
- [ ] dry-run / shape-only の結果を先に見た
- [ ] secret を chat / repo に貼っていない
- [ ] append-only log の挙動を把握している

## X
- [ ] `X_API_KEY` `X_API_SECRET` `X_ACCESS_TOKEN` `X_ACCESS_TOKEN_SECRET` が入っている
- [ ] `X_REQUEST_SHAPE_ONLY=1` で request shape を確認した
- [ ] `X_DRY_RUN_FORCE` が不要なら無効
- [ ] 初回は短い text post のみ

## WordPress
- [ ] `WP_BASE_URL` `WP_USERNAME` `WP_APP_PASSWORD` が入っている
- [ ] `WP_REQUEST_SHAPE_ONLY=1` で request shape を確認した
- [ ] 初回は `draft` 作成のみ
- [ ] HTML / excerpt が想定どおり

## note
- [ ] まだ export 運用でよいか確認した
- [ ] 実投稿は credential / 運用方針が固まってからにする

## 最後の確認
- [ ] 今回は本当に non-dry-run でよい
- [ ] 初回は 1 件だけにする
