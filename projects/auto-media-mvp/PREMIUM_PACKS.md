# PREMIUM_PACKS

完全自動化前提で売る最小商品パッケージ案。

## 基本方針
- Free = 見るための observatory surface
- Paid = 再利用・保存・分析のための data package
- human-in-the-loop を前提にしない
- 問い合わせ / カスタム分析 / 手動納品を主軸にしない

## Pack 1: Weekly CSV Pack
用途:
- spreadsheet で見る
- 軽い社内共有
- 毎週の変化を追う

内容:
- topics ranking CSV
- companies ranking CSV
- categories ranking CSV
- regions ranking CSV
- metadata JSON（生成日時、件数、対象期間）

想定価格:
- $5〜$9 / week

## Pack 2: Weekly JSON Snapshot
用途:
- スクリプトで読む
- 軽い自動連携
- 開発者 / analyst 向け

内容:
- full ranking JSON snapshot
- source type mix
- counts
- generated_at

想定価格:
- $7〜$12 / week

## Pack 3: 30-Day Archive Pack
用途:
- トレンド比較
- 継続性確認
- 過去比較の簡易分析

内容:
- 直近30日の snapshot 一式
- 日次 or 週次の compressed archive
- manifest JSON

想定価格:
- $12〜$24 / month

## Pack 4: Full Ranking Dataset Pack
用途:
- まとめて保存
- analyst / power user 向け
- 再配列 / 再集計 / 自前可視化

内容:
- full ranking dataset
- normalized ranking exports
- entity / topic / category / region 別ファイル

想定価格:
- $19〜$49 / month

## 売り方
初期候補:
- Stripe Payment Links
- Gumroad
- Lemon Squeezy

優先:
1. まずは weekly file download
2. 次に archive pack
3. その後に API / automated premium feeds

## Free / Paid の境界
Free:
- public site
- top rankings
- latest snapshot
- browse pages
- sample links

Paid:
- downloadable CSV / JSON
- full ranking coverage
- historical archive
- packaged snapshots

## 実装優先順
1. Weekly JSON Snapshot
2. Weekly CSV Pack
3. 30-Day Archive Pack
4. Full Ranking Dataset Pack
5. API

関連仕様:
- `WEEKLY_JSON_SNAPSHOT_SPEC.md`
