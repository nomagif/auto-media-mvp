# ROADMAP

`auto-media-mvp` の現状整理と今後の優先順位。

## 1. 現在地
このプロジェクトは、海外テックニュース等を収集し、日本語向けに再構成する自動メディアパイプラインの MVP。

現時点で、主要な生成レイヤーは scaffold + fixture flow まで一周している。

---

## 2. 現在あるレイヤー
### 収集
- TechCrunch RSS
- Hacker News Top Stories

### 下流データ
- raw 保存
- normalized 保存
- draft Markdown 生成
- review digest 生成

### 生成レイヤー
- summary
- title candidates
- X post
- article
- image prompt

---

## 3. 実装状態の区分
### A. 実データで通ったもの
- collect
- normalized
- draft
- summary subagent 実行（少なくとも複数件で確認）

### B. fixture flow で通ったもの
- summary worker/apply
- title worker/apply
- xpost worker/apply
- article worker/apply
- image prompt worker/apply

### C. まだ本実装でないもの
- title subagent 実働
- xpost subagent 実働
- article subagent 実働
- image prompt subagent 実働
- publish 連携

---

## 4. fixture / manual / real の区別
### real
- collect
- queue 生成
- 一部 summary subagent 実行

### manual
- summary worker の手動運用
- raw response 保存
- apply 実行

### fixture
- title / xpost / article / image prompt の raw response 検証

---

## 5. 未実装ポイント
- OpenClaw worker の完全自動化
- title/xpost/article/image の実 subagent 実行
- publish queue の本格運用
- WordPress / note / X への実投稿連携
- retry / timeout / priority 制御
- samples ディレクトリの整理

---

## 6. 次の優先順位
### 優先1
OpenClaw 実働 worker を summary 以外にも広げる

### 優先2
manual runbook を title/xpost/article/image にも横展開する

### 優先3
publish 系の IO spec と queue 設計

### 優先4
cron 化と定期運用設計

---

## 7. 実運用までの道筋
1. summary の実働 worker を安定化
2. title/xpost/article/image でも subagent 実行を通す
3. publish 用データ構造を確定
4. 承認付き投稿フローを作る
5. 最後に一部を自動化する

---

## 8. 率直な評価
現状でも「設計と試作の土台」としてはかなり強い。
次に価値が高いのは、fixture を減らして real execution を増やすこと。
