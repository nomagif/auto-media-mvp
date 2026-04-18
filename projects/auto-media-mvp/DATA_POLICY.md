# DATA_POLICY

`auto-media-mvp` の生成物・状態ファイルの運用方針。

## 1. 基本方針
コードと設計書は Git に残す。
実行生成物・ランタイム状態は基本的に Git 管理しない。

---

## 2. Git に残すもの
- `config/`
- `prompts/`
- `scripts/`
- `README.md`
- `TASKS.md`
- `SUMMARY_IO_SPEC.md`
- `OPENCLAW_SUMMARY_WORKER_SPEC.md`
- `.gitignore`
- `.gitkeep`

---

## 3. Git に基本残さないもの
### 実行生成物
- `data/raw/`
- `data/normalized/`
- `data/candidates/`
- `data/processed/`
- `drafts/`
- `output/`
- `logs/`

### ランタイム状態
- `state/*.json`

理由:
- 実行のたびに変わる
- 差分がノイズになる
- 実データが混ざる
- request/response が増え続ける

---

## 4. ディレクトリは残す
空ディレクトリ構成は `.gitkeep` で残す。
これにより初回セットアップが楽になる。

---

## 5. サンプルデータ方針
サンプルを残したいときは、実行生成物そのものではなく、明示的に `samples/` を作って置く。

推奨:
```text
samples/
  normalized/
  processed/
  requests/
  responses/
```

実運用データとサンプルデータを混ぜない。

---

## 6. request/response の扱い
MVPでは request/response はデバッグ価値が高いが、通常は Git 管理しない。
必要なら anonymized な例だけを `samples/` に移す。

---

## 7. state の扱い
state はランタイム制御データなので Git に入れない。
ただし、初期状態が必要なら:
- `.gitkeep`
- `*.example.json`
を使う。

---

## 8. 率直なおすすめ
このプロジェクトは「コード」と「運転中の生成物」を分けた方がいい。
repo は設計と実装に集中させ、実行結果は使い捨てか必要時だけ別保管にするのが健全。
