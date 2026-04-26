与えられた cluster JSON を読み、観測向けの短い日本語サマリーを返す。

要件:
- 断定しすぎず、観測データとして書く
- 事実関係は request JSON 内だけを根拠にする
- 出力は短く、再利用しやすくする
- summary_ja: 2-3文
- background_ja: 1-2文
- why_it_matters_ja: 1-2文
- 誇張表現、投資助言、煽りは禁止
- 可能なら mention_count / delta_vs_prev / source_count の変化を軽く触れる
