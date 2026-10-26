"""Giai đoạn 3: dự báo ĐA TẦM (direct multi-horizon) cho 24 giờ tiếp theo + backtest tháng 8 + so sánh đệ quy.

Vì sao direct thay vì đệ quy?  Mô hình 1 bước chạy đệ quy 288 lần tích luỹ sai số (xem kết quả
`recursive_horizon`). Ở đây huấn luyện RIÊNG một mô hình HGB cho mỗi "nút" tầm dự báo (5', 15', 30', 1h … 24h)
rồi nội suy tuyến tính giữa các nút -> sai số không cộng dồn. Dải bất định = phân vị 10%-90% của sai số
backtest (61 mốc gốc, mỗi 12h trong tháng 8) tại từng nút.

Chạy:  python src/run_forecast.py      (QUICK=1 để chạy nhanh)
"""
import json
import os
import pickle
import time
import numpy as np
import pandas as pd
from scipy.ndimage import uniform_filter1d

import modeling as M
from common import DATA, OUT, VARS, VAL_END, jdump


def rmse_nan(a, b):
    """RMSE bỏ qua ô NaN (đích là quan sát hợp lệ nên có ô trống)."""
    m = ~np.isnan(a) & ~np.isnan(b)
    return float(np.sqrt(np.mean((a[m] - b[m]) ** 2))) if m.any() else float("nan")


QUICK = os.environ.get("QUICK") == "1"
t00 = time.time()
d = pickle.load(open(DATA / "pipelines.pkl", "rb"))
pipes = d["pipes"]
with open(OUT / "models.json", encoding="utf-8") as _f:
    mj = json.load(_f)
best_pipe = mj["best_pipeline"]
df_all = pd.read_csv(DATA / "soil_extended.csv", index_col=0, parse_dates=True)
obs_ok = df_all[VARS].where(~d["flags"].isin([1, 2, 3, 4, 5]))     # quan sát hợp lệ (ô lỗi/missing = NaN)
P = pipes[best_pipe]
S = M.Scaled(P)
idx = S.idx
V = len(VARS)
STEPS = 288
KNOTS = [1, 3, 6, 12, 24, 36, 48, 72, 96, 120, 144, 168, 192, 216, 240, 264, 288]
if QUICK:
    KNOTS = [1, 6, 12, 48, 144, 288]
FAST = dict(max_iter=120 if not QUICK else 60, learning_rate=0.1, max_leaf_nodes=31, min_samples_leaf=40,
            l2_regularization=0.1, random_state=0)
STRIDE = 3 if not QUICK else 8

orig_ts = list(pd.date_range("2026-08-01 00:00", "2026-08-30 12:00", freq="12h"))
orig_pos = np.array([idx.get_loc(t) - 1 for t in orig_ts])          # điểm cuối quan sát = 5' trước mốc
n_or = len(orig_pos)
last_pos = np.array([len(idx) - 1])

act = np.transpose(np.stack([[P[VARS[v]].values[p + 1:p + 1 + STEPS] for v in range(V)] for p in orig_pos], 0), (0, 2, 1))
tru = np.transpose(np.stack([[obs_ok[VARS[v]].values[p + 1:p + 1 + STEPS] for v in range(V)]
                             for p in orig_pos], 0), (0, 2, 1))             # quan sát hợp lệ (n, 288, V)
last_obs = P[VARS].values[orig_pos]                                  # (n, V)
persist = np.repeat(last_obs[:, None, :], STEPS, 1)
yest = np.stack([P[VARS].values[p + 1 - 288:p + 1 - 288 + STEPS] for p in orig_pos], 0)
sd_test = np.array([obs_ok[c].loc["2026-08-01":].std() for c in VARS])

# --------------------------------------------------------------------------- direct knots
print("== huấn luyện mô hình trực tiếp theo từng nút tầm dự báo", KNOTS); t0 = time.time()
bt = np.zeros((n_or, len(KNOTS), V))      # backtest (huấn luyện đến hết tháng 7)
live = np.zeros((len(KNOTS), V))          # dự báo thật (huấn luyện toàn bộ dữ liệu)
for ki, h in enumerate(KNOTS):
    Wh = M.Windows(S, 12, h)
    mk = Wh.masks()
    tr_bt = np.asarray(Wh.tgt_ts <= VAL_END)
    tr_bt = np.where(tr_bt)[0][::STRIDE]
    tr_all = np.arange(len(Wh.t_pos))[::STRIDE]
    win_o, com_o = M.origin_features(S, orig_pos, 12, h)
    win_l, com_l = M.origin_features(S, last_pos, 12, h)
    for v in range(V):
        X, y, base = Wh.X(v), Wh.y(v), Wh.base(v)
        m1 = M.fit_tree("HGB", X[tr_bt], y[tr_bt], base[tr_bt], FAST)
        Xo = np.c_[win_o[:, v, ::-1], com_o]
        bt[:, ki, v] = S.inv(win_o[:, v, -1] + m1.predict(Xo), v)
        m2 = M.fit_tree("HGB", X[tr_all], y[tr_all], base[tr_all], FAST)
        Xl = np.c_[win_l[:, v, ::-1], com_l]
        live[ki, v] = S.inv(win_l[0, v, -1] + m2.predict(Xl)[0], v)
    print(f"  h={h:3d} xong ({time.time() - t0:.0f}s)")

# --------------------------------------------------------------------------- nội suy knots -> 288 bước
xk = np.array([0] + KNOTS); xs = np.arange(1, STEPS + 1)
def interp_all(knot_vals, start):          # knot_vals (K,V), start (V,)
    out = np.zeros((STEPS, V))
    for v in range(V):
        out[:, v] = np.interp(xs, xk, np.r_[start[v], knot_vals[:, v]])
    return out
fc = np.stack([interp_all(bt[i], last_obs[i]) for i in range(n_or)], 0)                 # (n, 288, V)
fut = interp_all(live, P[VARS].values[-1])
fut_ts = pd.date_range(idx[-1] + pd.Timedelta(minutes=5), periods=STEPS, freq="5min")

# --------------------------------------------------------------------------- dải bất định theo nút
kidx = np.array(KNOTS) - 1
err_k = tru[:, kidx, :] - bt                                                            # (n, K, V)
lo_k = np.nanquantile(err_k, 0.10, axis=0); hi_k = np.nanquantile(err_k, 0.90, axis=0)  # (K, V)
q_lo = uniform_filter1d(interp_all(lo_k, np.zeros(V)), 25, axis=0)
q_hi = uniform_filter1d(interp_all(hi_k, np.zeros(V)), 25, axis=0)

# --------------------------------------------------------------------------- đánh giá + so sánh đệ quy
print("== đệ quy 1 bước (để so sánh)"); t1 = time.time()
W1 = M.Windows(S, 12, 1); mk1 = W1.masks()
tr1 = np.where(mk1["train"] | mk1["val"])[0][::STRIDE]
models_rec = {v: M.fit_tree("HGB", W1.X(v)[tr1], W1.y(v)[tr1], W1.base(v)[tr1], FAST) for v in range(V)}
rec = M.recursive_forecast(models_rec, S, orig_pos, 12, STEPS)
rec = np.stack([S.inv(rec[:, :, v], v) for v in range(V)], 2)
print(f"  ({time.time() - t1:.0f}s)")

hz = {"5 phút": 1, "30 phút": 6, "1 giờ": 12, "3 giờ": 36, "6 giờ": 72, "12 giờ": 144, "24 giờ": 288}
rows = []
for v, c in enumerate(VARS):
    for nm, k in hz.items():
        e = lambda arr: rmse_nan(tru[:, k - 1, v], arr[:, k - 1, v]) / sd_test[v]
        rows.append(dict(var=c, horizon=nm, steps=k, direct_nrmse=e(fc), recursive_nrmse=e(rec),
                         persistence_nrmse=e(persist), yesterday_nrmse=e(yest),
                         direct_rmse=rmse_nan(tru[:, k - 1, v], fc[:, k - 1, v]),
                         persistence_rmse=rmse_nan(tru[:, k - 1, v], persist[:, k - 1, v])))
hdf = pd.DataFrame(rows)
print(hdf.groupby("horizon")[["direct_nrmse", "recursive_nrmse", "persistence_nrmse", "yesterday_nrmse"]].mean()
      .reindex(list(hz.keys())).round(3))
mj = dict(mj)
mj["direct_horizon"] = rows
mj.pop("recursive_horizon", None)
# phủ dải 10-90%: tỉ lệ thực tế nằm trong dải
cover = {}
for v, c in enumerate(VARS):
    lo = fc[:, :, v] + q_lo[None, :, v]; hi = fc[:, :, v] + q_hi[None, :, v]
    ok = ~np.isnan(tru[:, :, v])
    inside = (tru[:, :, v] >= lo) & (tru[:, :, v] <= hi)
    cover[c] = float(np.mean(inside[ok]))
mj["band_coverage"] = cover
print("  độ phủ dải 10–90% (kỳ vọng ~80%):", {k: round(v, 2) for k, v in cover.items()})
mj["knots"] = KNOTS
mj.setdefault("stage_seconds", {})["forecast"] = round(time.time() - t00, 1)
jdump(mj, OUT / "models.json")

with open(DATA / "forecast_bundle.pkl", "wb") as f:
    pickle.dump(dict(orig_ts=orig_ts, fc=fc, act=act, tru=tru, q_lo=q_lo, q_hi=q_hi, fut=fut, fut_ts=fut_ts,
                     best_pipe=best_pipe, last_obs=P[VARS].values[-1], knots=KNOTS, live_knots=live), f)
print("  dự báo tương lai:", fut_ts[0], "->", fut_ts[-1], "| +1h:", dict(zip(VARS, np.round(fut[11], 2))))
print(f"[xong] {time.time() - t00:.0f}s -> data/forecast_bundle.pkl, outputs/models.json")
