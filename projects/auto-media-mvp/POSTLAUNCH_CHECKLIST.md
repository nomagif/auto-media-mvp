# POSTLAUNCH_CHECKLIST

Cloudflare Pages 公開後の確認項目。

## 1. Basic access
公開URL:
- <https://auto-media-mvp.pages.dev>

確認:
- Home が開く
- `latest` が開く
- Browse links が 404 しない
- page 間リンクが壊れていない

## 2. UI / tone
確認:
- Home の highlights が metrics-first になっている
- politics / war / policy-sensitive rows が public highlights で前面表示されていない
- browse view でも sensitive rows が de-emphasize / omitted されている
- narrative / summary サイトのように見えない

## 3. Build / deploy loop
確認:
- Cloudflare Pages が `main` push で再deployする
- build command が継続して成功する
- `projects/auto-media-mvp/site` が deploy output になっている

## 4. Guardrails
確認:
- `npm run guard:prose-routes` が block する
- prose / summary / publish 系を public path に戻していない
- README / ROADMAP / deploy docs の方針と実体がズレていない

## 5. Content freshness
確認:
- `npm run rank:generate`
- `npm run site:build`
の後、Cloudflare 上で更新が反映される

## 6. Incident fallback
問題が出たら:
- Cloudflare Deployments の該当 commit を確認
- build error を優先して潰す
- GitHub Pages は補助案とみなし、Cloudflare 側を主導線にする
