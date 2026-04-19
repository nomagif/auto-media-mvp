# X_ENV_SETUP

X 実投稿 adapter 用の env 設定手順メモ。

## 1. 必要な env
- `X_API_KEY`
- `X_API_SECRET`
- `X_ACCESS_TOKEN`
- `X_ACCESS_TOKEN_SECRET`

## 2. 方針
- 値そのものはリポジトリに保存しない
- chat に貼らない
- 実行環境の shell / secret manager / launch context で注入する

## 3. 最小の投入方法例
### 一時的に shell へ入れる
```bash
export X_API_KEY='...'
export X_API_SECRET='...'
export X_ACCESS_TOKEN='...'
export X_ACCESS_TOKEN_SECRET='...'
```

### 確認
```bash
python3 - <<'PY'
import os
keys = ['X_API_KEY','X_API_SECRET','X_ACCESS_TOKEN','X_ACCESS_TOKEN_SECRET']
print({k: bool(os.environ.get(k)) for k in keys})
PY
```

## 4. 安全確認の順番
1. env が入っているか確認
2. `X_REQUEST_SHAPE_ONLY=1` で request shape を確認
3. `X_DRY_RUN_FORCE=1` の有無を確認
4. それでも問題なければ初回の non-dry-run を検討

## 5. やらないこと
- 値を README や fixture に埋める
- チャットに secret を貼る
- いきなり本番投稿を打つ

## 6. 率直なおすすめ
初回はこの順がいい。
- credentials を入れる
- shape-only で header/request を確認する
- 短い無難なテキストで 1 回だけ投稿する

いきなり長文や画像付きで始めない方が安全。
