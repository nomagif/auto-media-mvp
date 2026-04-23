# OVERSEAS_SAFETY_RULES

海外展開時の observatory 出力ルール。

## 絶対ルール
- 自動要約を英語で大量生成しない
- 政治的・戦争ニュースを断定口調で発信しない
- 複数国の価値観を混在させない
- **ニュースを語らない。数字だけを出す**

## 出力方針
優先するもの:
- counts
- rankings
- deltas
- streaks
- source links
- category / topic / entity labels

抑えるもの:
- 強い解釈
- 論評
- 感情的表現
- 価値判断
- 地政学的断定

## 政治・戦争トピックの扱い
- signal として扱う
- source link と label を中心に出す
- explanation より metadata を優先する
- 断定調の narrative を避ける

## AI / macro observatory における実務ルール
- commentary より structured output
- prose より tables / cards / lists（またはそれに相当する構造）
- summary より metrics
- opinions より source-backed counts

## 一文ルール
このプロジェクトは、ニュースを語るメディアではなく、
**数字と変化を示す observatory** として振る舞う。
