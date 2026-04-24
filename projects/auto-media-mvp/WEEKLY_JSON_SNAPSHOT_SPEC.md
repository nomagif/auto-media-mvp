# WEEKLY_JSON_SNAPSHOT_SPEC

`Pack 2: Weekly JSON Snapshot` の最小出力仕様。

## 目的
- public observatory とは別に、再利用しやすい premium data package を定義する
- analyst / developer がそのまま読む用途を優先する
- 完全自動化しやすい単一 JSON artifact を第一歩にする

## 出力ファイル
例:
- `premium/weekly/2026-04-24-weekly-snapshot.json`
- `premium/weekly/latest.json`

## トップレベル構造
```json
{
  "product": "weekly-json-snapshot",
  "version": "v1",
  "generated_at": "2026-04-24T06:43:21.827Z",
  "window": {
    "kind": "weekly",
    "label": "2026-W17",
    "from": "2026-04-18T00:00:00.000Z",
    "to": "2026-04-24T23:59:59.999Z"
  },
  "source_types": ["tech", "official", "market-data"],
  "counts": {
    "items": 170,
    "topics": 20,
    "companies": 17,
    "regions": 3,
    "categories": 8
  },
  "rankings": {
    "topics": [],
    "companies": [],
    "regions": [],
    "categories": []
  },
  "notes": {
    "sensitive_rows_included": true,
    "public_ui_deemphasis_applied": false,
    "intended_use": ["analysis", "internal dashboards", "automation"]
  }
}
```

## フィールド定義
### `product`
固定値:
- `weekly-json-snapshot`

### `version`
固定値:
- `v1`

### `generated_at`
- ISO-8601 timestamp
- snapshot 生成日時

### `window`
週次パッケージの対象期間。

- `kind`: `weekly`
- `label`: 任意の週ラベル
- `from`: ISO-8601
- `to`: ISO-8601

### `source_types`
- ranking 生成に含まれた source type 一覧

### `counts`
- items
- topics
- companies
- regions
- categories

### `rankings`
キー:
- `topics`
- `companies`
- `regions`
- `categories`

各配列には `data/rankings/latest.json` の row をそのまま近い形で入れる。

## Ranking row schema
```json
{
  "key": "topic:general",
  "kind": "topic",
  "label": "general",
  "window": "all",
  "mention_count": 67,
  "source_count": 5,
  "region_mix": ["us", "global"],
  "category_mix": ["ai", "general"],
  "delta_vs_prev": 26,
  "delta_ratio": 0.634,
  "streak_days": 17,
  "sample_item_ids": ["..."],
  "sample_urls": ["..."],
  "updated_at": "2026-04-24T06:43:21.827Z"
}
```

## Public / Premium の違い
### Public UI
- sensitive rows を de-emphasize / omit する場合がある
- 表示は top ranking / sample 중심

### Weekly JSON Snapshot
- sensitive rows も含めて machine-readable に保持してよい
- public UI の表示抑制ロジックは適用しない
- ranking row を full coverage で保持する

## v1 の制約
- 単一 JSON artifact
- 履歴 bundle は含めない
- raw / normalized item 本文までは含めない
- source item body は含めず、ranking layer に絞る

## 次の実装候補
1. `scripts/premium/build_weekly_json_snapshot.js`
2. `premium/weekly/latest.json` の生成
3. archive pack 用 manifest 生成
