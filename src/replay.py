"""Mô phỏng nạp dữ liệu MỚI mỗi 5 phút thay vì stream từng giây (checklist mục 9).

Đọc soil_extended.csv, phát lại từng bản ghi theo chu kỳ 5 phút "ảo" (tăng tốc bằng --speed), áp dụng
pipeline xử lý ONLINE (nhân quả): kiểm tra luật miền -> thay giá trị lỗi bằng giá trị dự đoán/giữ gần nhất ->
làm mượt EMA -> kiểm tra ngưỡng cảnh báo. Ghi nối tiếp vào outputs/stream_replay.csv.

Ví dụ:  python src/replay.py --start "2026-08-31 22:00" --n 24 --speed 0
"""
import argparse
import json
import time
import numpy as np
import pandas as pd

from common import DATA, OUT, ROOT, VARS, PHYS_RANGE, NPK_EC


def load_thresholds():
    with open(ROOT / "config" / "thresholds.json", encoding="utf-8") as f:
        return json.load(f)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", default="2026-08-31 22:00")
    ap.add_argument("--n", type=int, default=24, help="số bản ghi phát lại")
    ap.add_argument("--speed", type=float, default=0.0, help="giây thực chờ giữa 2 bản ghi (0 = không chờ)")
    a = ap.parse_args()

    df = pd.read_csv(DATA / "soil_extended.csv", index_col=0, parse_dates=True)
    th = load_thresholds()["rules"]
    rows = df.loc[a.start:].iloc[:a.n]
    state = {c: None for c in VARS}
    ema = {c: None for c in VARS}
    prev = {c: None for c in VARS}
    same = {c: 0 for c in VARS}
    out = []
    for ts, r in rows.iterrows():
        rec = {"ts": ts}
        alerts = []
        for c in VARS:
            x = r[c]
            lo, hi = PHYS_RANGE[c]
            bad = pd.isna(x) or x < lo or x > hi
            if not bad and x == 0 and c in NPK_EC and r["moisture"] >= 12:      # 0 của EC/N/P/K chỉ là lỗi khi đất ẩm
                bad = True
            if c == "light" and x == 0 and r["w_rad"] > 300:
                bad = True
            same[c] = same[c] + 1 if (not pd.isna(x) and x == prev[c]) else 0     # kẹt giá trị >= 12 bước giống hệt
            prev[c] = x
            if not bad and same[c] >= 11:
                bad = True
            if bad:
                alerts.append(f"SENSOR_FAULT:{c}={x}")
                x_clean = state[c] if state[c] is not None else np.nan      # giữ giá trị hợp lệ gần nhất
            else:
                x_clean = x
                state[c] = x
            ema[c] = x_clean if ema[c] is None or pd.isna(ema[c]) else 0.3 * x_clean + 0.7 * ema[c]
            rec[c] = x
            rec[c + "_clean"] = ema[c]
        for rule in th:
            v = rec.get(rule["var"] + "_clean")
            if v is not None and not pd.isna(v):
                if rule.get("lt") is not None and v < rule["lt"]:
                    alerts.append(f"{rule['id']}: {rule['message']} ({v:.2f} < {rule['lt']})")
                if rule.get("gt") is not None and v > rule["gt"]:
                    alerts.append(f"{rule['id']}: {rule['message']} ({v:.2f} > {rule['gt']})")
        rec["alerts"] = " | ".join(alerts)
        out.append(rec)
        print(ts, "|", rec["alerts"] or "OK")
        if a.speed:
            time.sleep(a.speed)
    pd.DataFrame(out).to_csv(OUT / "stream_replay.csv", index=False)
    print("-> outputs/stream_replay.csv")


if __name__ == "__main__":
    main()
