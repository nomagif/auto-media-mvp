# WORDPRESS_ENV_SETUP

WordPress draft 作成 adapter 用の env 設定手順メモ。

## 1. 必要な env
- `WP_BASE_URL`
- `WP_USERNAME`
- `WP_APP_PASSWORD`

任意:
- `WP_API_BASE_PATH`
- `WP_DEFAULT_STATUS`
- `WP_DRY_RUN_FORCE`
- `WP_REQUEST_SHAPE_ONLY`

## 2. 方針
- 値はリポジトリに保存しない
- chat に貼らない
- shell / secret manager / 実行コンテキストで注入する

## 3. 最小の投入方法例
```bash
export WP_BASE_URL='https://example.com'
export WP_USERNAME='your-user'
export WP_APP_PASSWORD='xxxx xxxx xxxx xxxx xxxx xxxx'
```

## 4. 確認
```bash
python3 - <<'PY'
import os
keys = ['WP_BASE_URL','WP_USERNAME','WP_APP_PASSWORD']
print({k: bool(os.environ.get(k)) for k in keys})
PY
```

## 5. 安全確認の順番
1. env が入っているか確認
2. `WP_REQUEST_SHAPE_ONLY=1` で request shape を確認
3. `WP_DRY_RUN_FORCE=1` の有無を確認
4. 初回は `status=draft` のまま送る

## 6. 率直なおすすめ
最初は draft 作成だけにする。
public publish まで一気に行かない方が安全。
