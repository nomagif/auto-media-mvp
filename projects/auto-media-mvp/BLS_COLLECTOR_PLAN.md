# BLS_COLLECTOR_PLAN

BLS news releases を observatory に追加するための collector plan。

## 目的
labor / inflation / employment 系の official macro signal を継続取得する。

## 最小 collector 要件
### 入力
- BLS public news releases / RSS / listing page

### 出力
- `data/raw/official/...`
- `data/normalized/...-bls-normalized.json`

## normalized shape の例
```json
{
  "id": "bls-2026-04-23-001",
  "source_type": "official",
  "source_name": "BLS",
  "source_url": "https://www.bls.gov/...",
  "title": "Consumer Price Index release",
  "body": "Short extracted summary or release title",
  "published_at": "...",
  "collected_at": "...",
  "language": "en",
  "tags": ["macro", "official", "bls"]
}
```

## classification expectation
- category: `macro`
- region: `us`
- source_type: `official`
- topics: `market-move`, `policy-announcement`
- entities: BLS

## 実装順
1. release listing fetch
2. raw 保存
3. normalized 保存
4. ranking 反映
5. collect cron へ組み込み

## 注意
- 最初は title / listing ベースで十分
- CPI, payrolls, unemployment のような macro keywords を topic classification で拾う
- Fed と役割が重なりすぎないよう labor / inflation 系を意識する
