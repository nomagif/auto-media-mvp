# DEPLOY_STATIC_SITE

静的サイトとして公開するための最小導線。

## 目的
- `output/rankings` から生成した観測ページを `site/` に出力する
- narrative / summary ではなく、**metrics-first な observatory UI** をそのまま配信する
- deploy を前提に、ローカル確認・GitHub Pages 公開・将来の独自ドメイン移行をしやすくする

## ビルド入口
```bash
cd projects/auto-media-mvp
npm run site:build
```

実行内容:
1. `npm run rank:render`
2. `npm run rank:pages`
3. `npm run site:render`

ローカル確認:
```bash
npm run site:serve
# http://localhost:4173
```

## Base path
静的サイトのリンクは `SITE_BASE_PATH` に対応。

例:
- 独自ドメイン直下: `SITE_BASE_PATH` なし
- GitHub Pages の project site: `SITE_BASE_PATH=/auto-media-mvp`

例:
```bash
SITE_BASE_PATH=/auto-media-mvp npm run site:render
```

## Cloudflare Pages
現時点の第一推奨。GitHub Pages が UI / 権限都合で詰まる場合でも、そのまま静的配信しやすい。

現在の公開URL:
- <https://auto-media-mvp.pages.dev>

### Cloudflare Pages 設定値
- Framework preset: `None`
- Production branch: `main`
- Build command:
  ```bash
  cd projects/auto-media-mvp && npm ci && npm run site:build
  ```
- Build output directory:
  ```bash
  projects/auto-media-mvp/site
  ```
- Environment variable:
  - `SITE_BASE_PATH` は未設定でよい（または空文字）

### 公開手順
1. Cloudflare Dashboard → Pages → Create application
2. Connect to Git
3. GitHub の `nomagif/auto-media-mvp` を選ぶ
4. 上記 build settings を入力
5. Deploy

## GitHub Pages
workflow: `.github/workflows/deploy-static-site.yml`

想定公開URL:
- <https://nomagif.github.io/auto-media-mvp/>

注記:
- 実装は残しているが、現時点の主導線は Cloudflare Pages
- GitHub UI / Actions 認識の詰まりがあったため、公開運用は Cloudflare を優先

挙動:
- `main` push で deploy
- `workflow_dispatch` でも手動実行可能
- Node で `npm ci` → `npm run site:build`
- 生成された `projects/auto-media-mvp/site` を Pages artifact として公開

### 推奨設定
- GitHub repo の Pages source は `GitHub Actions`
- この repo (`nomagif/auto-media-mvp`) は project site 想定なので `SITE_BASE_PATH=/auto-media-mvp`
- 公開URLは <https://nomagif.github.io/auto-media-mvp/>
- 独自ドメインへ寄せる場合は `SITE_BASE_PATH` を空にする

## 今の立ち位置
この導線は **publish 面** ではなく **observatory 面** の公開を優先する。

つまり次の順:
1. collect / ranking を回す
2. static site を build する
3. Pages へ deploy する
4. 必要なら後で digest / WordPress を補助面として追加する

## 非目標
- summary / prose 生成を公開導線に含めない
- politics / war を narrative 化するルートを作らない
- トップページをニュース記事風にしない
