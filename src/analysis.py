"""Tiền xử lý + phân tích: kiểm tra lưới thời gian, lỗi 0, missing, outlier, làm mượt, EDA, ACF/PACF.

Mỗi hàm tương ứng một mục trong checklist (xem docs/CHECKLIST_MAPPING.md).
"""
import time
import numpy as np
import pandas as pd
from scipy import signal
from sklearn.cluster import DBSCAN
from sklearn.ensemble import IsolationForest
from sklearn.experimental import enable_iterative_imputer  # noqa: F401
from sklearn.impute import IterativeImputer, KNNImputer
from sklearn.linear_model import BayesianRidge
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import RobustScaler, StandardScaler

from common import (DATA, VARS, NPK_EC, PHYS_RANGE, P1_END, load_raw_json,
                    rmse, mae)

NO_HAMPEL = ["light"]                       # ánh sáng biến động tự nhiên lớn (mây) -> chỉ dùng luật miền
NO_STUCK = ["light", "EC", "N", "P", "K"]   # độ phân giải thô -> giá trị lặp có thể hợp lệ
ZERO_THR = {"EC": 0.08, "N": 8.0, "P": 30.0, "K": 30.0}
FLAG = {0: "ok", 1: "ngoài_khoảng_vật_lý", 2: "zero_lỗi", 3: "spike_Hampel", 4: "kẹt_giá_trị", 5: "missing"}


def load_extended() -> pd.DataFrame:
    df = pd.read_csv(DATA / "soil_extended.csv", index_col=0, parse_dates=True)
    return df


# ----------------------------------------------------------------------------------------------
# (10) lưới thời gian | (11) audit giá trị 0
# ----------------------------------------------------------------------------------------------
def grid_check(df):
    full = pd.date_range(df.index.min(), df.index.max(), freq="5min")
    p1 = df[df.index <= P1_END]
    return dict(rows=len(df), expected=len(full), missing_timestamps=int(len(full.difference(df.index))),
                duplicated=int(df.index.duplicated().sum()),
                first_rows=len(p1), first_days=int(p1.index.normalize().nunique()),
                step_minutes=5, start=str(df.index.min()), end=str(df.index.max()))


def zero_audit(df):
    """Thống kê số điểm = 0 và NaN trong 28 ngày đầu (14/12–10/01) để đối chiếu bảng checklist."""
    real = df.loc[df.index <= P1_END, VARS]
    hr = real.index.hour
    out = {}
    for c in VARS:
        z = real[c] == 0
        out[c] = dict(zeros=int(z.sum()), nans=int(real[c].isna().sum()),
                      zero_pct=float(z.mean() * 100),
                      zeros_day=int((z & (hr >= 8) & (hr < 17)).sum()),
                      zeros_night=int((z & ((hr < 5) | (hr >= 19))).sum()))
    # ánh sáng có chu kỳ ngày/đêm không? (so với bức xạ Open-Meteo) — 28 ngày đầu và phần còn lại
    first = df.index <= P1_END
    r_light = float(df.loc[first, ["light", "w_rad"]].dropna().corr().iloc[0, 1])
    rest = df.loc[~first, ["light", "w_rad"]].dropna()
    out["_light_vs_radiation_corr_first"] = r_light
    out["_light_vs_radiation_corr_rest"] = float(rest.corr().iloc[0, 1])
    # N/P/K/EC = 0 xuất hiện khi nào? -> so với độ ẩm đất (đầu dò đất khô đọc 0: hiện tượng vật lý, không phải lỗi)
    zr = real[(real[["EC", "N", "P", "K"]] == 0).any(axis=1)]
    out["_nutrient_zero_rows"] = int(len(zr))
    out["_nutrient_zero_moisture_median"] = float(zr["moisture"].median())
    out["_nutrient_zero_moisture_max"] = float(zr["moisture"].max())
    out["_nutrient_zero_share_moisture_lt12"] = float((zr["moisture"] < 12).mean())
    out["_temp_hum_dead_rows"] = int(((real["temperature"] < 5) & (real["humidity"] < 5)).sum())
    return out


# ----------------------------------------------------------------------------------------------
# Luật miền + Hampel + stuck  -> mặt nạ lỗi có phân loại
# ----------------------------------------------------------------------------------------------
def zero_fault_mask(s: pd.Series, thr: float):
    z = s == 0
    nz = s.where(s != 0)
    ctx = nz.rolling(25, center=True, min_periods=3).median()
    ctx = ctx.fillna(nz.rolling(289, center=True, min_periods=5).median())
    return z & (ctx > thr)


def hampel_mask(s: pd.Series, win=9, k=6.0):
    """Hampel (trung vị trượt + MAD cục bộ 24h). Sàn thang đo = 0.4% biên độ P1-P99 để tránh MAD=0
    ở đoạn phẳng/bão hoà (vd RH=100%) làm báo động giả."""
    med = s.rolling(win, center=True, min_periods=3).median()
    dev = (s - med).abs()
    span = float(s.quantile(.99) - s.quantile(.01))
    local = 1.4826 * dev.rolling(289, center=True, min_periods=30).median()
    local = local.clip(lower=max(0.004 * span, 1e-6))
    return dev > k * local


def stuck_mask(s: pd.Series, win=12):
    rmax, rmin = s.rolling(win).max(), s.rolling(win).min()
    m = ((rmax - rmin) == 0).fillna(False).astype(float)
    m = m[::-1].rolling(win, min_periods=1).max()[::-1]      # đánh dấu toàn bộ đoạn kẹt
    return m.astype(bool) & s.notna()


DRY_PROBE = 12.0   # moisture < 12% -> đầu dò EC/NPK trong đất khô đọc ~0 (hiện tượng vật lý, không phải lỗi)


def detect_faults(df: pd.DataFrame, protect=True):
    """Trả về bảng cờ int8 theo biến. Mã: 1 ngoài khoảng vật lý, 2 zero-lỗi, 3 spike Hampel, 4 kẹt, 5 missing.
    protect=True: giữ lại các 'spike' đồng thời ở >=3 biến EC/N/P/K (sự kiện bón phân thật)."""
    X = df[VARS]
    flags = pd.DataFrame(0, index=df.index, columns=VARS, dtype="int8")
    rad = df["w_rad"]
    wet = X["moisture"].fillna(50.0) >= DRY_PROBE
    for c in VARS:
        s = X[c]
        lo, hi = PHYS_RANGE[c]
        m_range = (s < lo) | (s > hi)
        m_zero = ((s == 0) & wet) if c in ZERO_THR else pd.Series(False, index=s.index)
        if c == "light":
            m_zero = (s == 0) & (rad > 300)
        bad = m_range | m_zero
        s2 = s.where(~bad)
        m_h = hampel_mask(s2, k=6.0 if c not in ("humidity",) else 7.0) if c not in NO_HAMPEL \
            else pd.Series(False, index=s.index)
        m_s = stuck_mask(s2) if c not in NO_STUCK else pd.Series(False, index=s.index)
        f = np.zeros(len(s), "int8")
        f[m_h.values] = 3
        f[m_s.values] = 4
        f[m_zero.values & (f == 0)] = 2
        f[m_range.values] = 1
        f[s.isna().values] = 5
        flags[c] = f
    # ---- bảo vệ SỰ KIỆN THẬT: bón phân làm EC,N,P,K cùng tăng -> không coi là spike
    if protect:
        nut = flags[NPK_EC] == 3
        keep = nut.sum(axis=1) >= 3
        for c in NPK_EC:
            flags.loc[keep & (flags[c] == 3), c] = 0
    return flags


# ----------------------------------------------------------------------------------------------
# (13) Missing data: so sánh phương pháp điền trên dữ liệu có đáp án
# ----------------------------------------------------------------------------------------------
def _time_feats(idx):
    h = (idx.hour * 60 + idx.minute) / 1440 * 2 * np.pi
    return np.c_[np.sin(h), np.cos(h)]


def impute_methods(X: pd.DataFrame, which=("ffill", "linear", "prev_day", "knn", "mice")):
    out = {}
    tf = _time_feats(X.index)
    if "ffill" in which:
        out["ffill"] = X.ffill().bfill()
    if "linear" in which:
        out["linear"] = X.interpolate(limit_direction="both")
    if "prev_day" in which:
        pd_ = X.copy()
        prev = X.shift(288)
        out["prev_day"] = pd_.fillna(prev).interpolate(limit_direction="both")
    if "knn" in which or "mice" in which:
        sc = StandardScaler()
        Z = sc.fit_transform(X.values)
        Zt = np.c_[Z, tf]
    if "knn" in which:
        k = KNNImputer(n_neighbors=5, weights="distance")
        out["knn"] = pd.DataFrame(sc.inverse_transform(k.fit_transform(Zt)[:, :len(VARS)]),
                                  index=X.index, columns=X.columns)
    if "mice" in which:
        m = IterativeImputer(estimator=BayesianRidge(), max_iter=8, initial_strategy="median",
                             random_state=0, skip_complete=True)
        out["mice"] = pd.DataFrame(sc.inverse_transform(m.fit_transform(Zt)[:, :len(VARS)]),
                                   index=X.index, columns=X.columns)
    return out


def _gap_len(mask: np.ndarray):
    """Độ dài đoạn thiếu liên tiếp tại mỗi ô True (theo cột)."""
    out = np.zeros(mask.shape, int)
    for j in range(mask.shape[1]):
        m = mask[:, j]
        grp = np.cumsum(~m)
        lens = pd.Series(m).groupby(grp).transform("sum").values
        out[:, j] = np.where(m, lens, 0)
    return out


def imputation_experiment(obs: pd.DataFrame, seed=1):
    """obs: quan sát hợp lệ (ô bị gắn cờ lỗi = NaN) -> ẩn thêm ô ngẫu nhiên/đoạn rồi so với giá trị gốc.
    Chỉ chấm điểm trên các ô bị ẩn mà giá trị gốc hợp lệ (không dùng ô đã bị gắn cờ lỗi làm đáp án)."""
    rng = np.random.default_rng(seed)
    X0 = obs.loc["2026-06-01":"2026-06-21", VARS].copy()
    valid = X0.notna().values
    n = len(X0)

    def make_mask(kind):
        M = np.zeros(X0.shape, bool)
        if kind == "random_5%":
            M = rng.random(X0.shape) < 0.05
        elif kind == "comm_loss_6h":              # mất kết nối: CẢ 10 biến cùng thiếu trong 6 giờ
            for s in rng.integers(30, n - 100, 5):
                M[s:s + 72, :] = True
        else:
            L = {"gap_30min": 6, "gap_3h": 36, "gap_12h": 144}[kind]
            for j in range(X0.shape[1]):
                for s in rng.integers(30, n - L - 30, max(int(0.06 * n / L), 2)):
                    M[s:s + L, j] = True
        return M

    rows, detail = [], {}
    for kind in ["random_5%", "gap_30min", "gap_3h", "gap_12h", "comm_loss_6h"]:
        M = make_mask(kind)
        Xm = X0.mask(M)
        res = impute_methods(Xm)
        gl = _gap_len(M)
        res["hybrid_lin<=3h_else_mice"] = res["linear"].where(gl <= 36, res["mice"])
        for meth, Xi in res.items():
            nr = {}
            for j, c in enumerate(VARS):
                m = M[:, j] & valid[:, j]
                nr[c] = (rmse(X0[c].values[m], Xi[c].values[m]) / (X0[c].std() + 1e-9)) if m.any() else float("nan")
            rows.append(dict(scenario=kind, method=meth, nrmse=float(np.nanmean(list(nr.values()))),
                             **{f"nrmse_{c}": v for c, v in nr.items()}))
    tab = pd.DataFrame(rows)
    best = {k: tab[tab.scenario == k].sort_values("nrmse").iloc[0]["method"] for k in tab.scenario.unique()}
    return tab, best


def impute_final(Xclean: pd.DataFrame, long_method="linear", max_linear_gap=36):
    """Điền cuối: nội suy tuyến tính cho đoạn <= 3 giờ; với đoạn dài hơn dùng phương pháp thắng trong
    thí nghiềm gap_12h (long_method ∈ linear | mice | prev_day)."""
    lin = Xclean.interpolate(limit_direction="both", limit_area=None)
    if long_method == "linear":
        return lin
    gl = _gap_len(Xclean.isna().values)
    # đoạn dài mà HẦU HẾT biến cùng thiếu (mất kết nối) -> MICE không có thông tin, dùng nội suy
    row_frac = Xclean.isna().mean(axis=1).values[:, None]
    use_alt = (gl > max_linear_gap) & (row_frac < 0.7)
    if use_alt.any():
        alt = impute_methods(Xclean, which=(long_method,))[long_method]
        alt = alt.clip(lower=Xclean.min(), upper=Xclean.max(), axis=1)
        return lin.where(~use_alt, alt)
    return lin


# ----------------------------------------------------------------------------------------------
# (14,15) Outlier detection: so sánh các bộ phát hiện
# ----------------------------------------------------------------------------------------------
def outlier_benchmark(raw: pd.DataFrame, flags: pd.DataFrame):
    """So sánh IQR, Z-score, IQR-phần-dư, Isolation Forest, DBSCAN với bộ luật miền + Hampel + Stuck.

    Không có nhãn lỗi nên KHÔNG tính precision/recall. Thay vào đó (theo hàng, có biến bất kỳ bị gắn cờ):
      flagged_pct : tỉ lệ hàng bị phương pháp gắn cờ
      overlap     : % hàng phương pháp gắn cờ mà bộ luật cũng gắn cờ (thấp => nhiều cảnh báo không có căn cứ vật lý)
      coverage    : % hàng bộ luật gắn cờ mà phương pháp cũng bắt được
      cover_<loại>: như coverage nhưng riêng từng loại lỗi của luật (ngoài khoảng vật lý / zero / spike / kẹt)
    """
    X = raw[VARS]
    ref_cells = flags.isin([1, 2, 3, 4])
    ref_row = ref_cells.any(axis=1).values

    # IQR / Z-score toàn cục trên dữ liệu thô (cách "ngây thơ")
    q1, q3 = X.quantile(.25), X.quantile(.75)
    iqr = q3 - q1
    cell_iqr = (X < q1 - 1.5 * iqr) | (X > q3 + 1.5 * iqr)
    z = (X - X.mean()) / X.std()
    cell_z = z.abs() > 3
    # IQR trên phần dư (loại xu hướng bằng trung vị trượt) = Hampel/robust
    res = X - X.rolling(25, center=True, min_periods=5).median()
    rq1, rq3 = res.quantile(.25), res.quantile(.75)
    span = X.quantile(.99) - X.quantile(.01)
    cell_riqr = (res < rq1 - 3 * np.maximum(rq3 - rq1, 0.004 * span)) | \
                (res > rq3 + 3 * np.maximum(rq3 - rq1, 0.004 * span))

    # Isolation Forest đa biến trên đặc trưng THAY ĐỔI CỤC BỘ (sai phân + phần dư so với trung vị trượt)
    F = pd.concat([X.ffill().bfill().diff().fillna(0).add_suffix("_d"), res.fillna(0).add_suffix("_r")], axis=1)
    Fs = RobustScaler().fit_transform(F)
    t0 = time.time()
    iso = IsolationForest(n_estimators=200, contamination=0.04, random_state=0, n_jobs=-1).fit(Fs)
    row_if = iso.predict(Fs) == -1
    # DBSCAN trên phần dư chuẩn hoá
    R = RobustScaler().fit_transform(res.fillna(0).clip(-1e3, 1e3).values)
    R = np.clip(R, -30, 30)
    sub = R[np.random.default_rng(0).choice(len(R), min(8000, len(R)), replace=False)]
    kd = NearestNeighbors(n_neighbors=20).fit(sub).kneighbors(sub)[0][:, -1]
    eps = float(np.quantile(kd, 0.93))
    db = DBSCAN(eps=eps, min_samples=20, n_jobs=-1).fit(R)
    row_db = db.labels_ == -1

    def score(row_pred, name):
        both = int((row_pred & ref_row).sum())
        d = dict(method=name, flagged_pct=float(row_pred.mean() * 100), flagged_rows=int(row_pred.sum()),
                 overlap=both / max(int(row_pred.sum()), 1), coverage=both / max(int(ref_row.sum()), 1))
        for code, nm in [(1, "range"), (2, "zero"), (3, "spike"), (4, "stuck")]:
            m = (flags == code).any(axis=1).values
            d[f"cover_{nm}"] = float(row_pred[m].mean()) if m.any() else float("nan")
        return d

    out = [score(cell_iqr.any(axis=1).values, "IQR (toàn cục)"),
           score(cell_z.any(axis=1).values, "Z-score (|z|>3)"),
           score(cell_riqr.any(axis=1).values, "IQR trên phần dư"),
           score(row_if, "Isolation Forest"),
           score(row_db, "DBSCAN"),
           score(ref_row, "Luật miền + Hampel + Stuck (đề xuất)")]
    print(f"[outlier] IF+DBSCAN {time.time() - t0:.0f}s, eps={eps:.2f}")
    return pd.DataFrame(out), dict(eps=eps, dbscan_noise_pct=float(row_db.mean() * 100)), \
        dict(iqr=cell_iqr, z=cell_z, riqr=cell_riqr)


def protection_eval(flags_raw, flags_prot):
    """(15) Phân biệt biến động thật (bón phân) với LỖI cảm biến: luật 'đồng thuận đa cảm biến'.
    - flags_raw : Hampel KHÔNG bảo vệ  | flags_prot : có bảo vệ (>=3/4 biến EC,N,P,K cùng bị gắn cờ => sự kiện)."""
    s_raw = (flags_raw[NPK_EC] == 3)
    fr = s_raw.any(axis=1)
    fp = (flags_prot[NPK_EC] == 3).any(axis=1)
    co = s_raw.sum(axis=1) >= 3
    starts = co & ~co.shift(fill_value=False)
    return dict(rows_flagged_without_protection=int(fr.sum()),
                rows_flagged_with_protection=int(fp.sum()),
                rows_protected=int(co.sum()),
                episodes_protected=int(starts.sum()),
                protected_share=float(co.sum() / max(int(fr.sum()), 1)))


# ----------------------------------------------------------------------------------------------
# (16) Làm mượt
# ----------------------------------------------------------------------------------------------
def causal_savgol(x: np.ndarray, window=11, poly=2):
    c = signal.savgol_coeffs(window, poly, pos=window - 1)
    y = np.convolve(x, c[::-1], mode="full")[:len(x)]
    y[:window - 1] = x[:window - 1]
    return y


def smooth_all(X: pd.DataFrame, method: str):
    out = X.copy()
    for c in X.columns:
        s = X[c]
        if method == "SMA5":
            out[c] = s.rolling(5, min_periods=1).mean()
        elif method == "SMA12":
            out[c] = s.rolling(12, min_periods=1).mean()
        elif method == "EMA0.3":
            out[c] = s.ewm(alpha=0.3, adjust=False).mean()
        elif method == "EMA0.1":
            out[c] = s.ewm(alpha=0.1, adjust=False).mean()
        elif method == "SG_causal11":
            out[c] = causal_savgol(s.values, 11, 2)
        elif method == "SG_centered11":
            out[c] = signal.savgol_filter(s.values, 11, 2)
        elif method == "SG_centered21":
            out[c] = signal.savgol_filter(s.values, 21, 2)
    return out


SMOOTHERS = ["SMA5", "SMA12", "EMA0.3", "EMA0.1", "SG_causal11", "SG_centered11", "SG_centered21"]


CAUSAL_SMOOTHERS = ["SMA5", "SMA12", "EMA0.3", "EMA0.1", "SG_causal11"]


def smoothing_experiment(clean: pd.DataFrame):
    """clean: chuỗi đã làm sạch (điền missing). Không có tín hiệu gốc nên mỗi bộ lọc được đo bằng:
      nrmse     : biến dạng = RMSE(lọc, chuỗi sạch) / σ (thấp = giữ đúng hình dạng)
      lag_steps : độ trễ pha (bước 5 phút) theo tương quan chéo cực đại
      roughness : σ(Δx) của chuỗi đã lọc / σ(Δx) của chuỗi sạch (1.0 = không đổi, thấp = trơn hơn)"""
    X = clean.loc["2026-07-01":"2026-07-14", VARS].interpolate(limit_direction="both")
    ok = [c for c in VARS if X[c].diff().std() > 0]
    rows = [dict(method="Không làm mượt", nrmse=0.0, lag_steps=0.0, roughness=1.0,
                 **{f"nrmse_{c}": 0.0 for c in VARS})]
    for m in SMOOTHERS:
        S = smooth_all(X, m)
        nr = {c: rmse(X[c], S[c]) / X[c].std() for c in VARS}
        # độ trễ pha: lệch tương quan chéo cực đại trên temperature/humidity/soiltemp
        lags = []
        for c in ["temperature", "humidity", "soiltemp"]:
            a = (S[c] - S[c].mean()).values; b = (X[c] - X[c].mean()).values
            xc = [np.corrcoef(a[k:], b[:len(b) - k])[0, 1] for k in range(0, 15)]
            lags.append(int(np.argmax(xc)))
        rough = float(np.mean([S[c].diff().std() / X[c].diff().std() for c in ok]))
        rows.append(dict(method=m, nrmse=float(np.mean(list(nr.values()))), lag_steps=float(np.mean(lags)),
                         roughness=rough, **{f"nrmse_{c}": v for c, v in nr.items()}))
    return pd.DataFrame(rows)


def choose_smoother(tab: pd.DataFrame, max_lag=2.0):
    """Bộ lọc NHÂN QUẢ cho mô hình dự báo: trong các bộ có độ trễ <= max_lag bước, chọn bộ trơn nhất
    (roughness thấp nhất). Nếu không bộ nào đạt, chọn bộ ít trễ nhất."""
    c = tab[tab.method.isin(CAUSAL_SMOOTHERS)]
    ok = c[c.lag_steps <= max_lag]
    if len(ok):
        return ok.sort_values("roughness").iloc[0]["method"]
    return c.sort_values("lag_steps").iloc[0]["method"]


# ----------------------------------------------------------------------------------------------
# Quy trình xử lý 4 cấp (dùng cho thử nghiệm tác động lên mô hình - mục 17)
# ----------------------------------------------------------------------------------------------
def build_pipelines(df: pd.DataFrame, flags: pd.DataFrame, smoother="EMA0.3", long_method="linear"):
    raw = df[VARS]
    P0 = raw.ffill().bfill()                                          # A: thô + ffill
    bad = flags.isin([1, 2, 3, 4])
    rule_nan = raw.mask(bad)
    P1 = rule_nan.interpolate(limit_direction="both")                  # B: bỏ lỗi + nội suy tuyến tính
    P2 = impute_final(rule_nan, long_method)                           # C: bỏ lỗi + nội suy / MICE cho đoạn dài
    P3 = smooth_all(P2, smoother)                                      # D: C + làm mượt nhân quả
    return {"A_raw_ffill": P0, "B_rule_linear": P1, "C_rule_hybrid": P2, "D_rule_hybrid_smooth": P3}


# ----------------------------------------------------------------------------------------------
# (18-21) EDA
# ----------------------------------------------------------------------------------------------
def acf_fft(x, nlags):
    x = np.asarray(x, float); x = x - x.mean(); n = len(x)
    f = np.fft.rfft(x, 2 * n)
    ac = np.fft.irfft(f * np.conj(f))[:nlags + 1]
    return ac / ac[0]


def pacf_dl(r, nlags):
    pac = np.zeros(nlags + 1); pac[0] = 1
    phi = np.zeros((nlags + 1, nlags + 1)); phi[1, 1] = pac[1] = r[1]
    for k in range(2, nlags + 1):
        num = r[k] - sum(phi[k - 1, j] * r[k - j] for j in range(1, k))
        den = 1 - sum(phi[k - 1, j] * r[j] for j in range(1, k))
        phi[k, k] = pac[k] = num / den
        for j in range(1, k):
            phi[k, j] = phi[k - 1, j] - phi[k, k] * phi[k - 1, k - j]
    return pac


def eda(clean: pd.DataFrame, df_raw: pd.DataFrame):
    out = {}
    X = clean[VARS]
    desc = X.describe().T
    out["describe_clean"] = {c: {k: float(desc.loc[c, k]) for k in desc.columns} for c in VARS}
    dr = df_raw[VARS].describe().T
    out["describe_raw"] = {c: {k: float(dr.loc[c, k]) for k in dr.columns} for c in VARS}
    # boxplot stats + histogram
    box, hist = {}, {}
    for c in VARS:
        s = X[c]
        q1, med, q3 = s.quantile([.25, .5, .75])
        iqr = q3 - q1
        box[c] = dict(min=float(s.min()), q1=float(q1), median=float(med), q3=float(q3), max=float(s.max()),
                      lo_whisker=float(s[s >= q1 - 1.5 * iqr].min()), hi_whisker=float(s[s <= q3 + 1.5 * iqr].max()),
                      n_outliers=int(((s < q1 - 1.5 * iqr) | (s > q3 + 1.5 * iqr)).sum()))
        h, e = np.histogram(s, bins=40)
        hist[c] = dict(counts=h, edges=e)
    out["box"], out["hist"] = box, hist
    # daily min/mean/max
    d = X.resample("D")
    out["daily"] = dict(dates=[t.strftime("%Y-%m-%d") for t in d.mean().index],
                        mean={c: d.mean()[c].round(3) for c in VARS},
                        min={c: d.min()[c].round(3) for c in VARS},
                        max={c: d.max()[c].round(3) for c in VARS})
    hp = X.groupby(X.index.hour)
    out["hourly"] = dict(mean={c: hp.mean()[c].round(3) for c in VARS}, std={c: hp.std()[c].round(3) for c in VARS})
    # tương quan (làm sạch) + thời tiết
    cols = VARS + ["w_air_T", "w_air_RH", "w_rad", "w_rain_5min"]
    Z = pd.concat([X, df_raw[["w_air_T", "w_air_RH", "w_rad", "w_rain_5min"]]], axis=1)
    out["corr_labels"] = cols
    out["corr_clean"] = Z[cols].corr().round(3).values
    out["corr_clean_spearman"] = Z[cols].corr(method="spearman").round(3).values
    first = df_raw[df_raw.index <= P1_END][VARS].replace(0, np.nan)
    out["corr_first_nonzero"] = first.corr().round(3).values
    out["corr_labels_first"] = VARS
    # ACF / PACF
    acfs, pacfs, dpacfs, sig = {}, {}, {}, {}
    for c in VARS:
        x = X[c].values
        r = acf_fft(x, 288)
        acfs[c] = r[:289].round(4)
        pacfs[c] = pacf_dl(r, 48).round(4)
        rd = acf_fft(np.diff(x), 48)
        dpacfs[c] = pacf_dl(rd, 48).round(4)
        band = 1.96 / np.sqrt(len(x))
        sig[c] = dict(band=float(band),
                      pacf_signif_lags=[int(k) for k in range(1, 49) if abs(dpacfs[c][k]) > band][:12],
                      acf_at_12=float(r[12]), acf_at_144=float(r[144]), acf_at_288=float(r[288]))
    out["acf"], out["pacf"], out["pacf_diff"], out["acf_sig"] = acfs, pacfs, dpacfs, sig
    # ADF-like gợi ý: tự tương quan lag-1 của sai phân
    out["monthly"] = {c: X[c].resample("MS").mean().round(3).tolist() for c in VARS}
    out["monthly_labels"] = [t.strftime("%Y-%m") for t in X[VARS[0]].resample("MS").mean().index]
    return out


def feature_selection_inputs(clean: pd.DataFrame):
    """PCA trên nhóm EC,N,P,K (mục 24)."""
    from sklearn.decomposition import PCA
    Z = StandardScaler().fit_transform(clean[NPK_EC])
    p = PCA().fit(Z)
    return dict(explained=p.explained_variance_ratio_.tolist(), components=p.components_.tolist())
