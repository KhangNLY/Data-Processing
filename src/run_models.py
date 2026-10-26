"""Giai đoạn 2: mô hình hoá. Chạy:  python src/run_models.py   (QUICK=1 để chạy nhanh khi gỡ lỗi)"""
import os
import pickle
import time
import numpy as np
import pandas as pd
from numpy.lib.stride_tricks import sliding_window_view as swv
from sklearn.feature_selection import RFE
from sklearn.linear_model import LassoCV, Ridge
from sklearn.model_selection import TimeSeriesSplit
from sklearn.preprocessing import StandardScaler

import modeling as M
from common import DATA, OUT, VARS, NPK_EC, TRAIN_END, VAL_END, jdump, rmse, mae, smape

QUICK = os.environ.get("QUICK") == "1"
STRIDE = 4 if QUICK else 1
t00 = time.time()
rng = np.random.default_rng(0)

d = pickle.load(open(DATA / "pipelines.pkl", "rb"))
pipes, flags = d["pipes"], d["flags"]
df = pd.read_csv(DATA / "soil_extended.csv", index_col=0, parse_dates=True)
obs_ok = df[VARS].where(~flags.isin([1, 2, 3, 4, 5]))       # quan sát "hợp lệ" (không lỗi/không missing)
R = {}


def sub(mask):
    """Giảm mẫu train khi QUICK."""
    if STRIDE == 1:
        return mask
    m = mask.copy(); idx = np.where(m)[0]; m[:] = False; m[idx[::STRIDE]] = True
    return m


def fit_eval_hgb(W, v, params=None, train_sel=None, test_name="test"):
    mk = W.masks()
    tr = sub(mk["train"]) if train_sel is None else train_sel
    m = M.fit_tree("HGB", W.X(v)[tr], W.y(v)[tr], W.base(v)[tr], params)
    sel = mk[test_name]
    p = np.full(len(W.t_pos), np.nan); p[sel] = M.predict_tree(m, W.X(v)[sel], W.base(v)[sel])
    return m, p


def mean_of(rows, key):
    return float(np.mean([r[key] for r in rows if key in r]))


# ================================================================================================
# (17) Tác động của tiền xử lý lên MÔ HÌNH (cùng 1 mô hình HGB, cùng đích = quan sát hợp lệ)
# ================================================================================================
print("== (17) tác động tiền xử lý"); t0 = time.time()
pre_rows = []
for pname, P in pipes.items():
    S = M.Scaled(P)
    for h in (1, 12):
        W = M.Windows(S, 12, h)
        mk = W.masks()
        for v, c in enumerate(VARS):
            _, p = fit_eval_hgb(W, v)
            met = M.metrics_block(p, W, v, mk["test"], obs_ok)
            pers = np.full(len(p), np.nan); pers[mk["test"]] = W.base(v)[mk["test"]]
            mp = M.metrics_block(pers, W, v, mk["test"], obs_ok)
            pre_rows.append(dict(pipeline=pname, h=h, var=c, **met, persistence_nrmse=mp["nrmse"],
                                 persistence_rmse=mp["rmse"]))
    print(f"  {pname} xong ({time.time() - t0:.0f}s)")
pre = pd.DataFrame(pre_rows)
summ = pre.groupby(["pipeline", "h"])[["nrmse", "persistence_nrmse", "smape"]].mean().round(4)
print(summ)
R["preprocess_effect"] = pre.to_dict(orient="records")
best_pipe = pre[pre.h == 12].groupby("pipeline")["nrmse"].mean().idxmin()
print("pipeline tốt nhất (h=12):", best_pipe)
R["best_pipeline"] = best_pipe
R.setdefault("stage_seconds", {})["17_tac_dong_tien_xu_ly"] = round(time.time() - t0, 1)
P = pipes[best_pipe]
S = M.Scaled(P)
print(f"   ({time.time() - t00:.0f}s tổng)")

# ================================================================================================
# (26,27,28) Benchmark: baseline vs RF/HGB/XGB/LSTM
# ================================================================================================
print("== (26-28) benchmark mô hình"); t0 = time.time()
bench = []
preds_keep = {}
for h in (1, 12):
    W = M.Windows(S, 12, h)
    mk = W.masks()
    te = mk["test"]
    store = {}
    for v, c in enumerate(VARS):
        X, y, base = W.X(v), W.y(v), W.base(v)
        tr = sub(mk["train"])
        preds = {"Persistence": np.where(te, base, np.nan), "Seasonal-naive (hôm qua)": np.where(te, M.seasonal_naive_pred(W, v), np.nan)}
        for name in ("RF", "HGB", "XGB"):
            tt = time.time()
            m = M.fit_tree(name, X[tr], y[tr], base[tr])
            preds[name] = np.where(te, np.nan, np.nan)
            preds[name][te] = M.predict_tree(m, X[te], base[te])
            R.setdefault("fit_seconds", {})[f"{name}_h{h}_{c}"] = round(time.time() - tt, 2)
        store[v] = preds
    # LSTM đa đầu ra
    tt = time.time()
    lp, net = M.lstm_fit_predict(W, sub(mk["train"]), mk["val"], te, epochs=6 if QUICK else 14, verbose=False)
    print(f"  LSTM h={h}: {time.time() - tt:.0f}s")
    for v, c in enumerate(VARS):
        store[v]["LSTM"] = lp[:, v]
        for name, p in store[v].items():
            met = M.metrics_block(p, W, v, te, obs_ok)
            bench.append(dict(h=h, var=c, model=name, **met))
        if h in (1, 12):
            keep_sel = te & (np.asarray(W.tgt_ts >= "2026-08-29"))
            preds_keep[(h, v)] = dict(ts=W.tgt_ts[keep_sel], actual_scaled=W.y(v)[keep_sel],
                                      **{n: W.S.inv(p[keep_sel], v) for n, p in store[v].items()})
    print(f"  h={h} xong ({time.time() - t0:.0f}s)")
bm = pd.DataFrame(bench)
print(bm.groupby(["h", "model"])[["nrmse", "rmse", "mae", "smape"]].mean().round(4))
R["benchmark"] = bm.to_dict(orient="records")
R["stage_seconds"]["26_28_benchmark"] = round(time.time() - t0, 1)

# ================================================================================================
# (25) Window sliding 4 / 12 / 24
# ================================================================================================
print("== (25) cửa sổ trượt"); t0 = time.time()
win_rows = []
for Wsz in (4, 12, 24):
    for h in (1, 12):
        W = M.Windows(S, Wsz, h); mk = W.masks()
        for v, c in enumerate(VARS):
            _, p = fit_eval_hgb(W, v)
            win_rows.append(dict(window=Wsz, h=h, var=c, **M.metrics_block(p, W, v, mk["test"], obs_ok)))
    print(f"  W={Wsz} ({time.time() - t0:.0f}s)")
wt = pd.DataFrame(win_rows)
print(wt.groupby(["window", "h"])[["nrmse", "rmse"]].mean().round(4))
R["window_ablation"] = wt.to_dict(orient="records")
R["stage_seconds"]["25_cua_so_truot"] = round(time.time() - t0, 1)

# ================================================================================================
# (24) Chọn đặc trưng: all / 1 đại diện / PCA / Lasso / RFE / RF-importance
# ================================================================================================
print("== (24) chọn đặc trưng"); t0 = time.time()
fs_rows = []
W = M.Windows(S, 12, 12); mk = W.masks()
nut_idx = [VARS.index(c) for c in NPK_EC]
A = S.A
sc_n = StandardScaler().fit(A[:, nut_idx][:int((S.idx <= TRAIN_END).sum())])
Zn = sc_n.transform(A[:, nut_idx])
# PC1 qua SVD trên train
u, s_, vt = np.linalg.svd(Zn[S.idx <= TRAIN_END], full_matrices=False)
pc = Zn @ vt[0]
pcw = swv(pc, W.W)[W.W - W.W: ][: len(A) - W.W + 1]
pcw = pcw[np.arange(W.W - 1, len(A))[np.arange(W.W - 1, len(A)) + W.h < len(A)] - (W.W - 1)]
pc_feats = np.c_[pcw[:, -1], pcw.mean(1), pcw.std(1), pcw[:, -1] - pcw[:, -3]]
for target in ("K", "moisture"):
    v = VARS.index(target)
    names = W.names(v); X = W.X(v); y = W.y(v) - W.base(v)
    tr = mk["train"] & (np.arange(len(y)) % 3 == 0) if not QUICK else sub(mk["train"])
    trf = sub(mk["train"])
    variants = {}
    variants["Tất cả đặc trưng"] = list(range(X.shape[1]))
    keepEC = [i for i, n in enumerate(names) if not any(n.endswith(f"_{c}") for c in ("N", "P", "K") if c != target)
              or n.startswith("lag")]
    variants["Giữ 1 đại diện (EC), bỏ N/P/K trùng"] = keepEC
    ss = StandardScaler().fit(X[tr]); Xs = ss.transform(X[tr])
    lasso = LassoCV(cv=TimeSeriesSplit(3), alphas=15, max_iter=2000, n_jobs=-1).fit(Xs, y[tr])
    variants["Lasso"] = [i for i, cf in enumerate(lasso.coef_) if abs(cf) > 1e-8] or [0]
    rfe = RFE(Ridge(1.0), n_features_to_select=20, step=6).fit(Xs, y[tr])
    variants["RFE (Ridge, 20 đặc trưng)"] = list(np.where(rfe.support_)[0])
    rf = M.make_tree("RF", dict(n_estimators=40)).fit(X[tr], y[tr])
    variants["RF-importance top-20"] = list(np.argsort(rf.feature_importances_)[::-1][:20])
    for vn, cols in variants.items():
        m = M.make_tree("HGB").fit(X[trf][:, cols], y[trf])
        for part in ("val", "test"):
            sel = mk[part]
            p = np.full(len(y), np.nan); p[sel] = W.base(v)[sel] + m.predict(X[sel][:, cols])
            met = M.metrics_block(p, W, v, sel, obs_ok)
            fs_rows.append(dict(target=target, variant=vn, n_features=len(cols), part=part, **met))
    # PCA: thay 4 biến dinh dưỡng bằng PC1 (giữ lag riêng của biến mục tiêu)
    keep_c = [i for i, n in enumerate(names) if n.startswith("lag") or n.endswith("hod") or
              not any(n.endswith(f"_{c}") for c in NPK_EC)]
    Xp = np.c_[X[:, keep_c], pc_feats]
    m = M.make_tree("HGB").fit(Xp[trf], y[trf])
    for part in ("val", "test"):
        sel = mk[part]
        p = np.full(len(y), np.nan); p[sel] = W.base(v)[sel] + m.predict(Xp[sel])
        met = M.metrics_block(p, W, v, sel, obs_ok)
        fs_rows.append(dict(target=target, variant="PCA (PC1 thay EC,N,P,K)", n_features=Xp.shape[1], part=part, **met))
    R.setdefault("feature_importance", {})[target] = {
        "names": [names[i] for i in np.argsort(rf.feature_importances_)[::-1][:15]],
        "values": [float(rf.feature_importances_[i]) for i in np.argsort(rf.feature_importances_)[::-1][:15]]}
    R.setdefault("lasso_selected", {})[target] = [names[i] for i in variants["Lasso"]][:30]
fs = pd.DataFrame(fs_rows)
print(fs[fs.part == "test"][["target", "variant", "n_features", "rmse", "nrmse"]].round(4).to_string())
R["feature_selection"] = fs.to_dict(orient="records")
R["stage_seconds"]["24_chon_dac_trung"] = round(time.time() - t0, 1)
print(f"  ({time.time() - t0:.0f}s)")

# ================================================================================================
# (29) Tối ưu siêu tham số HGB trên validation
# ================================================================================================
print("== (29) tối ưu tham số"); t0 = time.time()
space = dict(max_iter=[150, 250, 400], learning_rate=[0.03, 0.05, 0.08, 0.12], max_leaf_nodes=[15, 31, 63],
             min_samples_leaf=[20, 50, 100], l2_regularization=[0.0, 0.1, 1.0, 5.0], max_depth=[None, 6, 10])
ncfg = 3 if QUICK else 9
cands = [{k: (v_[int(rng.integers(len(v_)))]) for k, v_ in space.items()} for _ in range(ncfg)]
W = M.Windows(S, 12, 12); mk = W.masks()
best_params, tune_rows = {}, []
for v, c in enumerate(VARS):
    X, y, base = W.X(v), W.y(v), W.base(v)
    tr = sub(mk["train"]); va = mk["val"]
    best, bp = 1e9, None
    for cand in cands:
        m = M.fit_tree("HGB", X[tr], y[tr], base[tr], cand)
        e = rmse(y[va], base[va] + m.predict(X[va]))
        tune_rows.append(dict(var=c, val_rmse_scaled=e, **{k: str(vv) for k, vv in cand.items()}))
        if e < best:
            best, bp = e, cand
    m0 = M.fit_tree("HGB", X[tr], y[tr], base[tr])
    e0 = rmse(y[va], base[va] + m0.predict(X[va]))
    best_params[c] = dict(params={k: (None if vv is None else vv) for k, vv in bp.items()}, val_rmse_tuned=best,
                          val_rmse_default=e0)
    print(f"  {c}: default {e0:.4f} -> tuned {best:.4f}  {bp}")
R["tuning"] = best_params
R["tuning_trials"] = tune_rows

# tuned: (a) train-only, (b) train+val -> test
tun_rows = []
for v, c in enumerate(VARS):
    bp = best_params[c]["params"]
    X, y, base = W.X(v), W.y(v), W.base(v)
    te = mk["test"]
    for nm, trm in [("HGB mặc định (train)", sub(mk["train"])), ("HGB tuned (train)", sub(mk["train"])),
                    ("HGB tuned (train+val)", sub(mk["train"] | mk["val"]))]:
        m = M.fit_tree("HGB", X[trm], y[trm], base[trm], None if "mặc định" in nm else bp)
        p = np.full(len(y), np.nan); p[te] = base[te] + m.predict(X[te])
        tun_rows.append(dict(var=c, model=nm, **M.metrics_block(p, W, v, te, obs_ok)))
tn = pd.DataFrame(tun_rows)
print(tn.groupby("model")[["nrmse", "rmse", "smape"]].mean().round(4))
R["tuned_test"] = tn.to_dict(orient="records")
R["stage_seconds"]["29_toi_uu_tham_so"] = round(time.time() - t0, 1)
print(f"  ({time.time() - t0:.0f}s)")

# ================================================================================================
# (28) Walk-forward (rolling-origin, expanding window) trên tháng 8
# ================================================================================================
print("== (28) walk-forward"); t0 = time.time()
cuts = ["2026-08-01", "2026-08-08", "2026-08-15", "2026-08-22", "2026-09-01"]
wf = []
for k in range(4):
    a, b = pd.Timestamp(cuts[k]), pd.Timestamp(cuts[k + 1])
    for v, c in enumerate(VARS):
        X, y, base = W.X(v), W.y(v), W.base(v)
        trm = sub(np.asarray(W.tgt_ts < a)); tem = np.asarray((W.tgt_ts >= a) & (W.tgt_ts < b))
        m = M.fit_tree("HGB", X[trm], y[trm], base[trm], best_params[c]["params"])
        p = np.full(len(y), np.nan); p[tem] = base[tem] + m.predict(X[tem])
        met = M.metrics_block(p, W, v, tem, obs_ok)
        pp = np.full(len(y), np.nan); pp[tem] = base[tem]
        mp = M.metrics_block(pp, W, v, tem, obs_ok)
        wf.append(dict(fold=k + 1, start=cuts[k], var=c, **met, persistence_nrmse=mp["nrmse"]))
wfd = pd.DataFrame(wf)
print(wfd.groupby("fold")[["nrmse", "persistence_nrmse"]].mean().round(4))
R["walk_forward"] = wfd.to_dict(orient="records")
R["stage_seconds"]["28_walk_forward"] = round(time.time() - t0, 1)
R["stage_seconds"]["tong"] = round(time.time() - t00, 1)
R["quick_mode"] = QUICK
print(f"  ({time.time() - t0:.0f}s)")

with open(DATA / "preds_keep.pkl", "wb") as f:
    pickle.dump(dict(preds_keep=preds_keep, best_pipe=best_pipe), f)
jdump(R, OUT / "models.json")
print(f"[xong] tổng {time.time() - t00:.0f}s -> outputs/models.json, data/preds_keep.pkl (dự báo tương lai: python src/run_forecast.py)")
