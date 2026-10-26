"""Hằng số và tiện ích dùng chung cho toàn pipeline."""
from pathlib import Path
import json
import math
import sys
import numpy as np
import pandas as pd

try:  # console Windows mặc định cp1252 -> ép UTF-8 để in tiếng Việt
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:  # noqa
    pass

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUT = ROOT / "outputs"
WEB_DATA = ROOT / "web" / "data"
for _p in (DATA, OUT, WEB_DATA):
    _p.mkdir(parents=True, exist_ok=True)

RAW_JSON = ROOT / "soil_all.json"

# Thứ tự biến cố định xuyên suốt dự án
VARS = ["temperature", "humidity", "light", "soiltemp", "moisture", "pH", "EC", "N", "P", "K"]
UNITS = {
    "temperature": "°C", "humidity": "%RH", "light": "a.u. (≈klux)", "soiltemp": "°C",
    "moisture": "%VWC", "pH": "pH", "EC": "mS/cm", "N": "mg/kg", "P": "mg/kg", "K": "mg/kg",
}
NPK_EC = ["EC", "N", "P", "K"]
STEP = pd.Timedelta(minutes=5)

# Giai đoạn 1 = 28 ngày đầu lấy từ Firebase (soil_all.json); phần sau nằm trong soil_all_extended.json
P1_END = pd.Timestamp("2026-01-10 23:55")

# Chia tập theo thời gian (không xáo trộn)
TRAIN_END = pd.Timestamp("2026-06-30 23:55")
VAL_END = pd.Timestamp("2026-07-31 23:55")   # (val: tháng 7, test: tháng 8)

# Khoảng giá trị vật lý hợp lệ (luật miền - domain rules) cho kiểm tra lỗi cảm biến
PHYS_RANGE = {
    "temperature": (5.0, 48.0), "humidity": (5.0, 100.0), "light": (0.0, 30.0),
    "soiltemp": (15.0, 40.0), "moisture": (1.0, 70.0), "pH": (3.0, 9.5),
    "EC": (0.0, 4.0), "N": (0.0, 1500.0), "P": (0.0, 2500.0), "K": (0.0, 3000.0),
}


def load_raw_json(path=RAW_JSON) -> pd.DataFrame:
    """Đọc và làm phẳng JSON Firebase {data:{YYYY-MM-DD:{HH:MM:{biến:giá trị}}}} -> DataFrame."""
    with open(path, encoding="utf-8") as f:
        d = json.load(f)["data"]
    rows = []
    for day, slots in d.items():
        for hm, rec in slots.items():
            r = dict(rec)
            r["ts"] = pd.Timestamp(f"{day} {hm}")
            rows.append(r)
    df = pd.DataFrame(rows).set_index("ts").sort_index()
    return df.reindex(columns=VARS)


def to_firebase_json(df: pd.DataFrame, path: Path):
    """Ghi DataFrame trở lại đúng cấu trúc JSON ban đầu (NaN -> bỏ khoá)."""
    out = {}
    for ts, row in df[VARS].iterrows():
        rec = {k: (None if pd.isna(v) else round(float(v), 3)) for k, v in row.items()}
        rec = {k: v for k, v in rec.items() if v is not None}
        out.setdefault(ts.strftime("%Y-%m-%d"), {})[ts.strftime("%H:%M")] = rec
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"data": out}, f, ensure_ascii=False, separators=(",", ":"))


def smape(y, yhat):
    y, yhat = np.asarray(y, float), np.asarray(yhat, float)
    den = (np.abs(y) + np.abs(yhat)) / 2.0
    ok = den > 1e-9
    return float(np.mean(np.abs(y - yhat)[ok] / den[ok]) * 100) if ok.any() else float("nan")


def rmse(y, yhat):
    y, yhat = np.asarray(y, float), np.asarray(yhat, float)
    return float(np.sqrt(np.mean((y - yhat) ** 2)))


def mae(y, yhat):
    y, yhat = np.asarray(y, float), np.asarray(yhat, float)
    return float(np.mean(np.abs(y - yhat)))


def _clean(o):
    if isinstance(o, dict):
        return {str(k): _clean(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [_clean(v) for v in o]
    if isinstance(o, pd.Series):
        return _clean(o.tolist())
    if isinstance(o, np.ndarray):
        return _clean(o.tolist())
    if isinstance(o, (np.floating, float)):
        o = float(o)
        return None if (math.isnan(o) or math.isinf(o)) else o
    if isinstance(o, np.integer):
        return int(o)
    if isinstance(o, (np.bool_,)):
        return bool(o)
    if isinstance(o, pd.Timestamp):
        return o.isoformat()
    return o


def jdump(obj, path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(_clean(obj), f, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
