"""Xuất dữ liệu cho web demo -> web/data/*.json.   Chạy:  python src/export_web.py

KHÔNG huấn luyện gì ở đây: chỉ đọc các file đã tính bởi run_analysis.py / run_models.py / run_forecast.py
(data/*.csv, data/*.pkl, outputs/*.json) rồi cắt/làm tròn thành JSON nhỏ cho trình duyệt.

Sinh ra:
  meta.json          thông tin chung (số bản ghi, tháng, pipeline chọn, cờ `provisional`)
  series_YYYY-MM.json  chuỗi 5 phút theo tháng: raw / clean (pipeline C) / smooth (pipeline D) / flag / thời tiết
  analysis.json      (copy) kết quả phân tích tiền xử lý + EDA
  models.json        (copy, bỏ bảng random-search chi tiết) kết quả mô hình
  smooth_demo.json   ví dụ làm mượt 2 ngày (SMA/EMA/Savitzky–Golay) cho tab Kỹ thuật xử lý
  forecast.json      dự báo 24h tới + dải bất định + backtest + dự đoán vs thực tế
  alerts.json        cảnh báo theo ngưỡng (lịch sử + dự báo) + thống kê lỗi cảm biến
"""
import json
import pickle
import time
from pathlib import Path

import numpy as np
import pandas as pd

import analysis as A
import modeling as M
from common import DATA, OUT, ROOT, WEB_DATA, VARS, PHYS_RANGE, jdump

t00 = time.time()
STEP = pd.Timedelta(minutes=5)
ND = {c: (2 if c in ("N", "P", "K", "temperature", "humidity", "soiltemp", "moisture", "light") else 3) for c in VARS}


def L(x, nd=3):
    """ndarray -> list đã làm tròn, NaN -> None."""
    x = np.asarray(x, dtype=float)
    out = np.round(x, nd).astype(object)
    out[np.isnan(x)] = None
    return out.tolist()


def iso(ts):
    return pd.Timestamp(ts).strftime("%Y-%m-%dT%H:%M")


def runs(mask):
    """Các đoạn True liên tiếp -> [(start_idx, end_idx_exclusive)]."""
    m = np.r_[0, np.asarray(mask, int), 0]
    d = np.flatnonzero(np.diff(m))
    return list(zip(d[0::2], d[1::2]))


def write(name, obj):
    p = WEB_DATA / name
    jdump(obj, p)
    print(f"  {name:<24s} {p.stat().st_size / 1e6:6.2f} MB")


# ------------------------------------------------------------------------------------------ đọc đầu vào
print("== đọc dữ liệu đã tính")
df = pd.read_csv(DATA / "soil_extended.csv", index_col=0, parse_dates=True)
pk_ = pickle.load(open(DATA / "pipelines.pkl", "rb"))
pipes, flags = pk_["pipes"], pk_["flags"]
obs_ok = df[VARS].where(~flags.isin([1, 2, 3, 4, 5]))         # quan sát hợp lệ (ô lỗi/missing = NaN)
models = json.load(open(OUT / "models.json", encoding="utf-8"))
analysis = json.load(open(OUT / "analysis.json", encoding="utf-8"))
thr = json.load(open(ROOT / "config" / "thresholds.json", encoding="utf-8"))
best = models["best_pipeline"]
PC, PD = pipes["C_rule_hybrid"], pipes[best]
assert (df.index == PC.index).all() and (df.index == flags.index).all()

# kết quả mô hình đã là bản chạy đầy đủ hay còn là bản QUICK/cũ? (web hiện cảnh báo nếu còn tạm)
has_times = "stage_seconds" in models and "tong" in models["stage_seconds"]
provisional = (not has_times) or bool(models.get("quick_mode")) or ("direct_horizon" not in models)
print("  models.json: ", "TẠM (chưa train đầy đủ)" if provisional else "đầy đủ")

# ------------------------------------------------------------------------------------------ meta.json
print("== meta.json")
months = [str(p) for p in pd.period_range("2025-12", "2026-08", freq="M")]
meta = dict(
    vars=VARS, rows=int(len(df)), months=months, best_pipeline=best,
    start=iso(df.index[0]), end=iso(df.index[-1]),
    provisional=provisional, stage_seconds=models.get("stage_seconds"), quick_mode=models.get("quick_mode"),
    generated_at=time.strftime("%Y-%m-%d %H:%M"))
write("meta.json", meta)

# ------------------------------------------------------------------------------------------ series theo tháng
print("== series theo tháng")
for m in months:
    idx = df.index[df.index.to_period("M") == m]
    assert (np.diff(idx.values).astype("timedelta64[m]").astype(int) == 5).all(), m
    raw, cl, sm = df.loc[idx, VARS], PC.loc[idx, VARS], PD.loc[idx, VARS]
    fl = flags.loc[idx, VARS].values.astype(np.uint8)
    obj = dict(
        t0=iso(idx[0]), n=int(len(idx)),
        raw={c: L(raw[c].values, ND[c]) for c in VARS},
        clean={c: L(cl[c].values, ND[c]) for c in VARS},
        smooth={c: L(sm[c].values, ND[c]) for c in VARS},
        flag={c: (fl[:, i] + 48).tobytes().decode() for i, c in enumerate(VARS)},
        weather=dict(rain=L(df.loc[idx, "w_rain_5min"].values, 3), rad=L(df.loc[idx, "w_rad"].values, 1),
                     airT=L(df.loc[idx, "w_air_T"].values, 2), airRH=L(df.loc[idx, "w_air_RH"].values, 1)))
    write(f"series_{m}.json", obj)

# ------------------------------------------------------------------------------------------ analysis / models
print("== analysis.json / models.json")
write("analysis.json", analysis)
models_web = {k: v for k, v in models.items() if k != "tuning_trials"}
write("models.json", models_web)

# ------------------------------------------------------------------------------------------ smooth_demo.json
print("== smooth_demo.json")
X = obs_ok.loc["2026-07-01":"2026-07-14", VARS].interpolate(limit_direction="both")
sel = slice("2026-07-08 00:00", "2026-07-09 23:55")
demo = dict(t0=iso(X.loc[sel].index[0]), n=int(len(X.loc[sel])))
meths = ["SMA5", "EMA0.3", "SG_causal11", "SG_centered21"]
sm_all = {mname: A.smooth_all(X, mname) for mname in meths}
for c in VARS:
    d = dict(raw=L(df.loc[sel, c].values, ND[c]), clean=L(X.loc[sel, c].values, ND[c]), truth=L(X.loc[sel, c].values, ND[c]))
    for mname in meths:
        d[mname] = L(sm_all[mname].loc[sel, c].values, ND[c])
    demo[c] = d
write("smooth_demo.json", demo)

# ------------------------------------------------------------------------------------------ forecast.json
print("== forecast.json")
bundle = pickle.load(open(DATA / "forecast_bundle.pkl", "rb"))
pk_path = DATA / "preds_keep.pkl"
if pk_path.exists():
    pk_obj = pickle.load(open(pk_path, "rb"))
    preds_keep, pk_pipe = pk_obj["preds_keep"], pk_obj["best_pipe"]
else:
    preds_keep, pk_pipe = bundle.get("preds_keep", {}), bundle.get("best_pipe")
if pk_pipe != best:
    print(f"  CẢNH BÁO: preds_keep tính trên pipeline {pk_pipe} nhưng best={best}")
S = M.Scaled(PD)
fut_ts = pd.DatetimeIndex(bundle["fut_ts"])
fut, q_lo, q_hi = bundle["fut"], bundle["q_lo"], bundle["q_hi"]            # (288,V)
lo_clip = np.array([PHYS_RANGE[c][0] if c != "light" else 0.0 for c in VARS])
hi_clip = np.array([PHYS_RANGE[c][1] for c in VARS])
f_lo = np.clip(fut + q_lo, lo_clip, hi_clip)
f_hi = np.clip(fut + q_hi, lo_clip, hi_clip)
fut_c = np.clip(fut, lo_clip, hi_clip)
H_HIST = 576                                                                # 2 ngày quá khứ
hist = PD[VARS].iloc[-H_HIST:]
HZ = [1, 6, 12, 36, 72, 144, 288]
last = PD[VARS].values[-1]
nxt = [dict(steps=k, label=("%d phút" % (5 * k)) if k < 12 else ("%g giờ" % (k / 12)),
            mean=L(fut_c[k - 1], 3), lo=L(f_lo[k - 1], 3), hi=L(f_hi[k - 1], 3)) for k in HZ]
orig_ts = [pd.Timestamp(t) for t in bundle["orig_ts"]]
pkd = {}
for (h, v), d in preds_keep.items():
    ts = pd.DatetimeIndex(d["ts"])
    assert (np.diff(ts.values).astype("timedelta64[m]").astype(int) == 5).all()
    row = dict(t0=iso(ts[0]), actual=L(S.inv(d["actual_scaled"], v), ND[VARS[v]]))
    for k_, arr in d.items():
        if k_ not in ("ts", "actual_scaled"):
            row[k_] = L(arr, ND[VARS[v]])
    pkd[f"{h}_{v}"] = row
_obs_export = {c: L(bundle["tru"][:, :, i], ND[c]) for i, c in enumerate(VARS)}
fc_obj = dict(
    vars=VARS, best_pipeline=best, provisional=provisional,
    last_ts=iso(PD.index[-1]), last=L(last, 3),
    history=dict(t0=iso(hist.index[0]), n=len(hist), series={c: L(hist[c].values, ND[c]) for c in VARS}),
    future=dict(t0=iso(fut_ts[0]), n=int(len(fut_ts)), mean={c: L(fut_c[:, i], ND[c]) for i, c in enumerate(VARS)},
                lo={c: L(f_lo[:, i], ND[c]) for i, c in enumerate(VARS)},
                hi={c: L(f_hi[:, i], ND[c]) for i, c in enumerate(VARS)}),
    next=nxt,
    backtest=dict(origins=[iso(t) for t in orig_ts], steps=int(bundle["fc"].shape[1]),
                  fc={c: L(bundle["fc"][:, :, i], ND[c]) for i, c in enumerate(VARS)},
                  actual={c: L(bundle["act"][:, :, i], ND[c]) for i, c in enumerate(VARS)},
                  obs=_obs_export, truth=_obs_export,
                  q_lo={c: L(q_lo[:, i], ND[c]) for i, c in enumerate(VARS)},
                  q_hi={c: L(q_hi[:, i], ND[c]) for i, c in enumerate(VARS)}),
    knots=bundle.get("knots"), band_coverage=models.get("band_coverage"), direct_horizon=models.get("direct_horizon"),
    pk=pkd)
write("forecast.json", fc_obj)

# ------------------------------------------------------------------------------------------ alerts.json
print("== alerts.json")
rules = thr["rules"]
days = [d.strftime("%Y-%m-%d") for d in pd.date_range(PD.index[0].normalize(), PD.index[-1].normalize())]
day_of = PD.index.strftime("%Y-%m-%d").values


def viol(x, r):
    x = np.asarray(x, float)
    m = np.zeros(len(x), bool)
    ok = ~np.isnan(x)
    if r.get("lt") is not None:
        m |= ok & (x < r["lt"])
    if r.get("gt") is not None:
        m |= ok & (x > r["gt"])
    return m


daily, episodes, totals = {}, [], {}
for r in rules:
    x = PD[r["var"]].values
    m = viol(x, r)
    s = pd.Series(m.astype(int) * 5 / 60.0, index=day_of).groupby(level=0).sum()          # giờ vi phạm / ngày
    daily[r["id"]] = L(s.reindex(days).fillna(0).values, 2)
    eps = []
    for a, b in runs(m):
        if b - a >= 6:                                                                       # >= 30 phút
            seg = x[a:b]
            peak = float(np.nanmin(seg)) if r.get("lt") is not None else float(np.nanmax(seg))
            eps.append(dict(rule=r["id"], var=r["var"], severity=r["severity"], message=r["message"],
                            start=iso(PD.index[a]), end=iso(PD.index[b - 1] + STEP), hours=round((b - a) * 5 / 60, 2),
                            peak=round(peak, 3)))
    totals[r["id"]] = dict(episodes=len(eps), hours=round(float(m.sum() * 5 / 60), 1))
    episodes += eps[-80:]                                                                    # giữ 80 đợt gần nhất/luật
episodes.sort(key=lambda e: e["start"], reverse=True)

fault_daily = {}
fcodes = {1: "Ngoài khoảng vật lý", 2: "Giá trị 0 lỗi", 3: "Spike (Hampel)", 4: "Kẹt giá trị", 5: "Missing"}
fv = flags.values
for k, nm in fcodes.items():
    s = pd.Series((fv == k).sum(1), index=day_of).groupby(level=0).sum()
    fault_daily[str(k)] = dict(name=nm, daily=L(s.reindex(days).fillna(0).values, 0), total=int((fv == k).sum()))

fa = []                                                                                      # cảnh báo từ dự báo 24h tới
for r in rules:
    i = VARS.index(r["var"])
    mm, mlo, mhi = viol(fut_c[:, i], r), viol(f_lo[:, i], r), viol(f_hi[:, i], r)
    risk = (mlo | mhi) & ~mm
    for kind, mask in (("du_bao", mm), ("nguy_co", risk)):
        for a, b in runs(mask):
            if b - a >= 6:
                lt_rule = r.get("lt") is not None
                if kind == "du_bao":
                    seg, basis = fut_c[a:b, i], "mean"
                else:                                                                        # nguy cơ: cận dải chạm ngưỡng
                    seg, basis = (f_lo[a:b, i] if lt_rule else f_hi[a:b, i]), "band"
                fa.append(dict(rule=r["id"], var=r["var"], severity=r["severity"], message=r["message"], kind=kind,
                               start=iso(fut_ts[a]), end=iso(fut_ts[b - 1] + STEP), hours=round((b - a) * 5 / 60, 2),
                               peak=round(float(np.nanmin(seg) if lt_rule else np.nanmax(seg)), 3), peak_basis=basis))
fa.sort(key=lambda e: e["start"])
now_v = [dict(rule=r["id"], var=r["var"], severity=r["severity"], message=r["message"],
              value=round(float(PD[r["var"]].values[-1]), 3)) for r in rules if viol(PD[r["var"]].values[-1:], r)[0]]
write("alerts.json", dict(rules=rules, note=thr.get("note"), sensor_fault=thr.get("sensor_fault"), days=days,
                          daily_hours=daily, totals=totals, episodes=episodes, faults=fault_daily,
                          forecast_alerts=fa, now=now_v, last_ts=iso(PD.index[-1])))

print(f"[xong] {time.time() - t00:.0f}s -> web/data/  (provisional={provisional})")
