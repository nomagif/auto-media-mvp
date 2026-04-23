# PRELAUNCH_CHECKLIST

静的 observatory 公開前の最終チェック。

## 1. Build
```bash
cd projects/auto-media-mvp
npm run rank:generate
npm run site:build
```

確認:
- build が成功する
- `site/` が更新される
- public UI に sensitive row が前面表示されていない

## 2. Public-path policy
確認:
- `npm run guard:prose-routes` が block する
- prose / summary / publish 系を公開導線に戻していない
- README / ROADMAP / deploy doc の方針が揃っている

override 確認が必要なときだけ:
```bash
ALLOW_PROSE_ROUTES=1 npm run guard:prose-routes
```

## 3. GitHub Pages config
確認:
- repo: `nomagif/auto-media-mvp`
- default branch: `main`
- Pages source: `GitHub Actions`
- workflow: `.github/workflows/deploy-static-site.yml`
- `SITE_BASE_PATH=/auto-media-mvp`

想定公開URL:
- <https://nomagif.github.io/auto-media-mvp/>

## 4. UI / tone
確認:
- Home / Latest / Browse が metrics-first になっている
- politics / war / policy-sensitive rows が public browse / highlights で de-emphasize されている
- 「ニュースを語らない。数字だけを出す」の方針とズレていない

## 5. Deploy smoke check
`main` push 後に確認:
- GitHub Actions build 成功
- GitHub Pages deploy 成功
- Home が開く
- Browse links が壊れていない
- direct page access で 404 fallback が効く

## 6. Post-launch watch
公開直後に見るポイント:
- source data 更新後も `npm run site:build` が落ちない
- sensitive row が highlights に再混入していない
- prose route を使わずに observatory 運用が回る
