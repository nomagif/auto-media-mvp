# SITE_PREVIEW

静的化した observatory site をローカルで確認するためのメモ。

## 1. build
```bash
cd projects/auto-media-mvp
npm run site:render
```

## 2. serve
```bash
cd projects/auto-media-mvp
npm run site:serve
```

既定ポート:
- `4173`

## 3. open
ブラウザで以下を開く:
- `http://127.0.0.1:4173/`
- `http://127.0.0.1:4173/latest.html`

## 4. 主な確認ポイント
- index が開くか
- latest が開くか
- topic / company / category ページに遷移できるか
- AI / macro focus が目立つか

## 5. 注意
- いまは最小 static site
- デザインはまだ簡素
- classification の粗さは UI ではなく ranking 側の課題
