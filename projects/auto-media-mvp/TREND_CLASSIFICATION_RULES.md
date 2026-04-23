# TREND_CLASSIFICATION_RULES

ランキング集計へ入る前の、最小分類ルール。

## 1. 方針
最初は高度な NLP を使わず、ルールベースで十分な粒度を作る。

優先するのは:
- 安定して毎日回ること
- ざっくりでも比較可能であること
- topic / region / category / company の軸が取れること
- **AI・テクノロジー** と **金融・経済（投資・マクロ）** の観測に強いこと

## 2. category の最小セット
MVP では以下で始める。

主軸カテゴリ:
- `ai`
- `macro`
- `policy`
- `crypto`
- `security`
- `semiconductors`
- `startups`

補助カテゴリ:
- `general`
- `defense`
- `social`

### 例
- OpenAI / Anthropic / Gemini / LLM / inference / copilots → `ai`
- Bitcoin / Ethereum / ETF / token / stablecoin → `crypto`
- regulation / law / government / antitrust / supervision → `policy`
- CPI / GDP / jobs / inflation / central bank / rates / FOMC → `macro`
- chips / TSMC / Nvidia / semiconductor supply chain → `semiconductors`

## 3. region の最小セット
- `us`
- `eu`
- `uk`
- `china`
- `japan`
- `asia`
- `global`
- `unknown`

### 判定の基本
以下の情報源で推定する:
1. source domain
2. title
3. normalized text
4. entity / country mention

複数候補がある場合:
- 特定国が明確ならそれを採用
- 複数国混在で広域なら `global`
- 不明なら `unknown`

## 4. topic の最小語彙
MVP では固定語彙で始める。

- `funding`
- `acquisition`
- `product-launch`
- `regulation`
- `earnings`
- `market-move`
- `security-incident`
- `policy-announcement`
- `research`
- `partnership`
- `layoffs`
- `m&a`
- `infrastructure`
- `consumer-apps`
- `chips`

## 5. company / entity の扱い
最初は軽くやる。

### 優先する entity 種別
- company
- country
- product
- person（後回し気味）

### 取り方
- 既知 company 辞書
- title 内の頻出固有名詞
- source-specific known names

最初から完璧抽出を狙わない。
特に MVP では company ranking が取れれば十分。

## 6. source_type の最小分類
- `news`
- `social`
- `official`
- `forum`
- `research`
- `market-data`

### 例
- TechCrunch → `news`
- Hacker News → `forum`
- 政府統計・政府発表 → `official`
- SNS 投稿 → `social`

## 7. スコアに使う最低データ
分類後、1 item あたり最低これが取れればよい。

```json
{
  "item_id": "...",
  "source": "techcrunch",
  "source_type": "news",
  "title": "...",
  "url": "...",
  "published_at": "...",
  "category": "ai",
  "region": "us",
  "topics": ["partnership", "consumer-apps"],
  "entities": ["OpenAI", "Tinder", "World"]
}
```

## 8. 実装順のおすすめ
1. category
2. region
3. source_type
4. topics
5. entities

この順がよい理由:
- category / region はランキングで即使える
- topics はその次に効く
- entities は手間が大きいので後から精度改善しやすい

## 9. やらないこと
当面はやらない:
- 完全な固有表現抽出
- 多言語全文意味解析
- 高度な sentiment
- 1 回で完璧な taxonomy 設計

## 10. 率直なおすすめ
最初は雑でもよい。
重要なのは、
- 毎日同じルールで処理されること
- 昨日比 / 先週比が出せること
- ランキングが継続的に更新されること
- AI・テクノロジー / 金融・経済（投資・マクロ）の主軸が崩れないこと

「完璧な分類」より「継続して動く分類」を優先する。
