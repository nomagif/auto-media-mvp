import datetime


def get_zodiac(month, day):
    """生年月日から星座を判定する"""
    try:
        datetime.date(2000, month, day)
    except ValueError as exc:
        raise ValueError("存在しない日付です") from exc

    zodiacs = [
        ((1, 1), (1, 19), "山羊座"),
        ((1, 20), (2, 18), "水瓶座"),
        ((2, 19), (3, 20), "魚座"),
        ((3, 21), (4, 19), "牡羊座"),
        ((4, 20), (5, 20), "牡牛座"),
        ((5, 21), (6, 21), "双子座"),
        ((6, 22), (7, 22), "蟹座"),
        ((7, 23), (8, 22), "獅子座"),
        ((8, 23), (9, 22), "乙女座"),
        ((9, 23), (10, 23), "天秤座"),
        ((10, 24), (11, 22), "蠍座"),
        ((11, 23), (12, 21), "射手座"),
        ((12, 22), (12, 31), "山羊座"),
    ]

    for (start_month, start_day), (end_month, end_day), name in zodiacs:
        if (start_month, start_day) <= (month, day) <= (end_month, end_day):
            return name

    return "山羊座"

def generate_fortune(zodiac):
    """
    運勢のテンプレートを作成
    ※本来はここにOpenClaw経由でCodex(LLM)を呼び出す処理を入れます
    """
    today = datetime.date.today()
    fortunes = [
        "今日は新しいことに挑戦すると吉。ラッキーカラーは青。",
        "周囲への感謝を忘れないことで運気が安定します。ラッキーアイテムは鍵。",
        "直感を信じて動いてみて。午後に良いニュースが届くかも。"
    ]
    # 簡易的にリストから選択（実際はAIが生成）
    import random
    return f"【{today}の{zodiac}の運勢】\n{random.choice(fortunes)}"

if __name__ == "__main__":
    # テスト用入力
    month = 4
    day = 1
    zodiac = get_zodiac(month, day)
    print(generate_fortune(zodiac))
