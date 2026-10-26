"""Mô hình dự báo chuỗi thời gian đa biến (window sliding -> supervised) cho dữ liệu cảm biến ớt.

Thiết kế (khớp checklist mục 22-29):
  * Chuẩn hoá MinMax [0,1] fit CHỈ trên tập train, đảo ngược trước khi tính sai số (mục 23).
  * Đặc trưng cửa sổ W ∈ {4,12,24}: lag của chính biến mục tiêu, last/mean/std/chênh-lệch-2-bước của MỌI biến,
    sin/cos giờ trong ngày tại thời điểm dự báo (mục 22, 25).
  * Mục tiêu: dự đoán SAI KHÁC so với giá trị hiện tại (delta) cho mô hình cây -> mô hình học phần "thay đổi",
    tránh việc cây không ngoại suy được.
  * Chia dữ liệu theo thời gian: train ≤ 30/06, validation = tháng 7, test = tháng 8/2026 (mục 28).
  * Baseline: giữ nguyên giá trị (persistence) và giá trị cùng giờ hôm qua (seasonal-naive) (mục 26).
  * Mô hình: Random Forest, Gradient Boosting (sklearn HistGB), XGBoost, LSTM (PyTorch) (mục 27).
  * Dự báo nhiều bước: đệ quy với mô hình 1 bước + dải bất định thực nghiệm từ backtest (khu vực "dự đoán" của web).
"""
import os
import time
import numpy as np
import pandas as pd
from numpy.lib.stride_tricks import sliding_window_view as swv
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.preprocessing import MinMaxScaler

from common import VARS, TRAIN_END, VAL_END, rmse, mae, smape

HGB_DEFAULT = dict(max_iter=250, learning_rate=0.07, max_leaf_nodes=31, min_samples_leaf=40,
                   l2_regularization=0.1, random_state=0)
RF_DEFAULT = dict(n_estimators=60, max_depth=14, min_samples_leaf=8, max_features=0.5,
                  max_samples=0.5, n_jobs=-1, random_state=0)
XGB_DEFAULT = dict(n_estimators=300, max_depth=6, learning_rate=0.06, subsample=0.8, colsample_bytree=0.8,
                   n_jobs=min(8, os.cpu_count() or 4), random_state=0)


class XGBNative:
    """XGBoost qua API gốc (xgb.train + DMatrix thường) thay cho sklearn-wrapper XGBRegressor.

    Lý do: XGBRegressor.fit() luôn dựng QuantileDMatrix; với xgboost 3.4.1 trên Python 3.14/Windows bước này
    báo lỗi `proxy_dmatrix.h: Something went wrong during iteration` khi dữ liệu đủ lớn (chạy QUICK thì không
    lỗi). DMatrix thường (float32, liền mạch) không đi qua đường code đó. Giao diện fit/predict giữ nguyên.
    """

    def __init__(self, n_estimators=300, max_depth=6, learning_rate=0.06, subsample=0.8, colsample_bytree=0.8,
                 n_jobs=8, random_state=0, **_ignored):
        self.n_estimators, self.nthread = int(n_estimators), int(n_jobs)
        self.params = dict(objective="reg:squarederror", tree_method="hist", max_depth=int(max_depth),
                           eta=float(learning_rate), subsample=float(subsample),
                           colsample_bytree=float(colsample_bytree), nthread=self.nthread,
                           seed=int(random_state), verbosity=0)
        self.booster = None

    def fit(self, X, y):
        import xgboost as xgb
        d = xgb.DMatrix(np.ascontiguousarray(X, dtype=np.float32), label=np.asarray(y, dtype=np.float32),
                        nthread=self.nthread)
        self.booster = xgb.train(self.params, d, num_boost_round=self.n_estimators)
        return self

    def predict(self, X):
        import xgboost as xgb
        return self.booster.predict(xgb.DMatrix(np.ascontiguousarray(X, dtype=np.float32), nthread=self.nthread))


class Scaled:
    """Chuẩn hoá MinMax theo từng biến (fit trên train)."""

    def __init__(self, series: pd.DataFrame, train_end=TRAIN_END):
        self.idx = series.index
        sc = MinMaxScaler().fit(series.loc[:train_end, VARS].values)
        self.scale, self.min = sc.scale_, sc.min_
        self.A = series[VARS].values * self.scale + self.min

    def inv(self, a, v):
        return (np.asarray(a) - self.min[v]) / self.scale[v]


class Windows:
    """Tạo đặc trưng cửa sổ trượt dùng chung cho mọi biến mục tiêu (chỉ khác phần lag riêng)."""

    def __init__(self, S: Scaled, W: int, h: int):
        A = S.A
        N = len(A)
        win = swv(A, W, axis=0)                                  # (N-W+1, V, W) thời gian mới nhất ở cuối
        t_pos = np.arange(W - 1, N)
        keep = t_pos + h < N
        self.win, self.t_pos = win[keep], t_pos[keep]
        self.W, self.h, self.S = W, h, S
        w = self.win
        mins = (S.idx.hour.values * 60 + S.idx.minute.values)[self.t_pos + h] / 1440 * 2 * np.pi
        d2 = w[:, :, -1] - w[:, :, -3]
        self.common = np.c_[w[:, :, -1], w.mean(2), w.std(2), d2, np.sin(mins), np.cos(mins)]
        self.tgt_ts = S.idx[self.t_pos + h]
        self.names_common = ([f"last_{c}" for c in VARS] + [f"mean{W}_{c}" for c in VARS] +
                             [f"std{W}_{c}" for c in VARS] + [f"d2_{c}" for c in VARS] + ["sin_hod", "cos_hod"])

    def X(self, v):
        return np.c_[self.win[:, v, ::-1], self.common]

    def names(self, v):
        return [f"lag{k}_{VARS[v]}" for k in range(self.W)] + self.names_common

    def y(self, v):
        return self.S.A[self.t_pos + self.h, v]

    def base(self, v):
        return self.win[:, v, -1]

    def masks(self):
        t = self.tgt_ts
        return dict(train=np.asarray(t <= TRAIN_END), val=np.asarray((t > TRAIN_END) & (t <= VAL_END)),
                    test=np.asarray(t > VAL_END))


def make_tree(name, params=None):
    if name == "RF":
        return RandomForestRegressor(**{**RF_DEFAULT, **(params or {})})
    if name == "HGB":
        return HistGradientBoostingRegressor(**{**HGB_DEFAULT, **(params or {})})
    if name == "XGB":
        return XGBNative(**{**XGB_DEFAULT, **(params or {})})
    raise ValueError(name)


def fit_tree(name, X, y, base, params=None):
    m = make_tree(name, params)
    m.fit(X, y - base)
    return m


def predict_tree(m, X, base):
    return base + m.predict(X)


# ------------------------------------------------------------------------------------------
# Đánh giá: so với các QUAN SÁT HỢP LỆ (ô không bị gắn cờ lỗi/missing) — cùng một đích cho mọi pipeline
# ------------------------------------------------------------------------------------------
def metrics_block(pred_scaled, W: Windows, v, sel, obs_ok: pd.DataFrame):
    c = VARS[v]
    p = W.S.inv(pred_scaled[sel], v)
    ts = W.tgt_ts[sel]
    out = {}
    ob = obs_ok[c].reindex(ts).values
    m = ~np.isnan(ob) & ~np.isnan(p)
    if m.any():
        out.update(rmse=rmse(ob[m], p[m]), mae=mae(ob[m], p[m]), smape=smape(ob[m], p[m]),
                   nrmse=rmse(ob[m], p[m]) / (np.nanstd(ob[m]) + 1e-9))
    return out


def seasonal_naive_pred(W: Windows, v):
    """Giá trị cùng giờ hôm qua tại thời điểm đích (nếu h<=288)."""
    A, tp, h = W.S.A, W.t_pos, W.h
    pos = tp + h - 288
    out = np.where(pos >= 0, A[np.clip(pos, 0, None), v], W.base(v))
    return out


# ------------------------------------------------------------------------------------------
# LSTM (PyTorch) đa đầu ra: một mạng dự báo delta của cả 10 biến
# ------------------------------------------------------------------------------------------
def lstm_fit_predict(W: Windows, sel_train, sel_val, sel_eval, epochs=14, hidden=64, seed=0, verbose=False):
    import torch
    import torch.nn as nn
    torch.manual_seed(seed); np.random.seed(seed)
    torch.set_num_threads(4)
    V = len(VARS)
    seq = np.transpose(W.win, (0, 2, 1)).astype(np.float32)                 # (N, W, V)
    last = W.win[:, :, -1]
    Y = np.stack([W.S.A[W.t_pos + W.h, v] for v in range(V)], 1)
    D = (Y - last).astype(np.float32)
    dsd = D[sel_train].std(0) + 1e-6
    Dn = D / dsd
    tf = W.common[:, -2:].astype(np.float32)

    class Net(nn.Module):
        def __init__(s):
            super().__init__()
            s.l = nn.LSTM(V, hidden, batch_first=True)
            s.head = nn.Sequential(nn.Linear(hidden + 2, 96), nn.ReLU(), nn.Linear(96, V))

        def forward(s, x, t):
            o, _ = s.l(x)
            return s.head(torch.cat([o[:, -1], t], 1))

    net = Net()
    opt = torch.optim.Adam(net.parameters(), lr=2e-3)
    lossf = nn.MSELoss()
    Xt, Tt, Yt = (torch.tensor(seq[sel_train]), torch.tensor(tf[sel_train]), torch.tensor(Dn[sel_train].astype(np.float32)))
    Xv, Tv, Yv = (torch.tensor(seq[sel_val]), torch.tensor(tf[sel_val]), torch.tensor(Dn[sel_val].astype(np.float32)))
    best, best_state = 1e9, None
    n = len(Xt)
    for ep in range(epochs):
        net.train()
        perm = torch.randperm(n)
        for i in range(0, n, 512):
            b = perm[i:i + 512]
            opt.zero_grad()
            loss = lossf(net(Xt[b], Tt[b]), Yt[b])
            loss.backward()
            nn.utils.clip_grad_norm_(net.parameters(), 1.0)
            opt.step()
        net.eval()
        with torch.no_grad():
            vl = float(lossf(net(Xv, Tv), Yv))
        if vl < best:
            best, best_state = vl, {k: x.clone() for k, x in net.state_dict().items()}
        if verbose:
            print(f"  [LSTM] epoch {ep + 1}/{epochs} val_loss={vl:.4f}")
    net.load_state_dict(best_state)
    net.eval()
    with torch.no_grad():
        pr = net(torch.tensor(seq[sel_eval]), torch.tensor(tf[sel_eval])).numpy() * dsd
    full = np.full((len(W.t_pos), V), np.nan)
    full[sel_eval] = last[sel_eval] + pr
    return full, net


# ------------------------------------------------------------------------------------------
# Dự báo đệ quy nhiều bước từ nhiều thời điểm gốc (vector hoá theo gốc)
# ------------------------------------------------------------------------------------------
def recursive_forecast(models, S: Scaled, origins_pos, W: int, steps: int):
    """models[v] = mô hình cây 1 bước cho biến v. origins_pos: vị trí (chỉ số hàng) của điểm cuối quan sát.
    Trả về mảng (n_origin, steps, V) ở thang MinMax."""
    V = len(VARS)
    A = S.A
    n_or = len(origins_pos)
    hist = np.stack([A[p - W + 1:p + 1] for p in origins_pos], 0).astype(float)    # (n, W, V)
    idx = S.idx
    last_ts = idx[origins_pos]
    out = np.zeros((n_or, steps, V))
    for k in range(steps):
        win = np.transpose(hist, (0, 2, 1))                                        # (n, V, W)
        ts = last_ts + pd.Timedelta(minutes=5 * (k + 1))
        mins = (ts.hour.values * 60 + ts.minute.values) / 1440 * 2 * np.pi
        d2 = win[:, :, -1] - win[:, :, -3]
        common = np.c_[win[:, :, -1], win.mean(2), win.std(2), d2, np.sin(mins), np.cos(mins)]
        nxt = np.zeros((n_or, V))
        for v in range(V):
            X = np.c_[win[:, v, ::-1], common]
            nxt[:, v] = win[:, v, -1] + models[v].predict(X)
        out[:, k] = nxt
        hist = np.concatenate([hist[:, 1:], nxt[:, None, :]], 1)
    return out


def origin_features(S: Scaled, pos, W: int, h: int):
    """Đặc trưng tại các gốc `pos` cho dự báo trực tiếp h bước (giờ-trong-ngày tính tại thời điểm đích).
    Trả về (win (n,V,W), common (n,4V+2)) – cùng bố cục với Windows."""
    pos = np.asarray(pos)
    win = np.transpose(np.stack([S.A[p - W + 1:p + 1] for p in pos], 0), (0, 2, 1)).astype(float)
    ts = S.idx[pos] + pd.Timedelta(minutes=5 * h)
    mins = (ts.hour.values * 60 + ts.minute.values) / 1440 * 2 * np.pi
    d2 = win[:, :, -1] - win[:, :, -3]
    common = np.c_[win[:, :, -1], win.mean(2), win.std(2), d2, np.sin(mins), np.cos(mins)]
    return win, common


