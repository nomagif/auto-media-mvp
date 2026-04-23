# OPENAI_COLLECTOR_PLAN

OpenAI announcements / news を observatory に追加するための collector plan。

## 目的
OpenAI の一次情報を observatory に加え、AI / Technology 側の柱を強くする。

## 最小 collector 要件
### 入力
- OpenAI の公開 announcements / news feed / blog listing

### 出力
- `data/raw/official/...`
- `data/normalized/...-openai-normalized.json`

## normalized shape の例
```json
{
  "id": "openai-2026-04-23-001",
  "source_type": "official",
  "source_name": "OpenAI",
  "source_url": "https://openai.com/...",
  "title": "New model or product announcement",
  "body": "Short extracted summary or snippet",
  "published_at": "...",
  "collected_at": "...",
  "language": "en",
  "tags": ["ai", "official", "openai"]
}
```

## classification expectation
- category: `ai`
- region: `us`
- source_type: `official`
- topics: `product-launch`, `research`, `infrastructure`
- entities: `OpenAI`

## 実装順
1. listing fetch
2. raw 保存
3. normalized 保存
4. ranking 反映
5. collect cron 組み込み

## 注意
- 最初は一覧ページベースでよい
- deep scrape は後回し
- 重要なのは recurring collect と ranking integration
