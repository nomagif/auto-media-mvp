#!/usr/bin/env python3
"""生年月日を引数に受け取り、その日の運勢を約100文字で生成する。"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import random

OPENINGS = [
    "今日は流れを味方につけやすい日。",
    "小さな選択が運気を動かす日。",
    "気負わず進むほど運が整う日。",
    "直感と段取りの両方が冴える日。",
    "落ち着いた判断が実りを呼ぶ日。",
]

ADVICE = [
    "朝のうちに優先順位を一つ決めると迷いが減ります。",
    "気になる連絡は先に返すと午後が軽くなります。",
    "無理に広げず、ひとつを丁寧に仕上げるのが吉。",
    "少しだけ予定に余白を作ると良い知らせを受け取りやすいです。",
    "人の助言を一つ試すと、思わぬ近道が見つかります。",
]

LUCK = [
    "ラッキーカラーは青。",
    "ラッキーアイテムは小さなメモ帳。",
    "ラッキープレイスは窓際。",
    "ラッキーフードは温かいスープ。",
    "ラッキーアクションは机の整理。",
]

CAUTIONS = [
    "急ぎの返事ほど言葉をやわらかく。",
    "勢いの買い物はひと呼吸置くと安心です。",
    "詰め込みすぎると集中が散るので注意。",
    "考えすぎる前に小さく着手すると好転します。",
    "夜更かしは明日の運気を削るので控えめに。",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="生年月日をもとに、その日の運勢を約100文字で生成します。"
    )
    parser.add_argument("birthdate", help="生年月日 (YYYY-MM-DD)")
    parser.add_argument(
        "--date",
        default=dt.date.today().isoformat(),
        help="占う日付 (YYYY-MM-DD)。省略時は今日。",
    )
    return parser.parse_args()



def to_date(value: str) -> dt.date:
    try:
        return dt.date.fromisoformat(value)
    except ValueError as exc:
        raise SystemExit(f"日付形式が不正です: {value} (YYYY-MM-DD)") from exc



def build_rng(birthdate: dt.date, target_date: dt.date) -> random.Random:
    seed_text = f"{birthdate.isoformat()}:{target_date.isoformat()}"
    seed = int(hashlib.sha256(seed_text.encode("utf-8")).hexdigest(), 16)
    return random.Random(seed)



def generate_fortune(birthdate: dt.date, target_date: dt.date) -> str:
    rng = build_rng(birthdate, target_date)
    parts = [
        rng.choice(OPENINGS),
        rng.choice(ADVICE),
        rng.choice(LUCK),
        rng.choice(CAUTIONS),
    ]
    return " ".join(parts)



def main() -> None:
    args = parse_args()
    birthdate = to_date(args.birthdate)
    target_date = to_date(args.date)
    fortune = generate_fortune(birthdate, target_date)
    print(fortune)


if __name__ == "__main__":
    main()
