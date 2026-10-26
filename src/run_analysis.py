"""Giai đoạn 1: phân tích & xử lý dữ liệu. Chạy:  python src/run_analysis.py

Đầu vào duy nhất: data/soil_extended.csv (dữ liệu 5 phút 14/12/2025 -> 31/08/2026 + thời tiết Open-Meteo).
"""
import pickle
import time
import numpy as np
import pandas as pd

import analysis as A
from common import DATA, OUT, VARS, jdump

t00 = time.time()
df = A.load_extended()
R = {}

print("== (10) lưới thời gian"); R["grid"] = A.grid_check(df); print(R["grid"])
print("== (11) audit giá trị 0 / NaN trong 28 ngày đầu"); R["zero_audit"] = A.zero_audit(df)
for c in VARS:
    print(c, R["zero_audit"][c])
print("light~radiation corr 28 ngày đầu / phần còn lại:", R["zero_audit"]["_light_vs_radiation_corr_first"],
      R["zero_audit"]["_light_vs_radiation_corr_rest"])

print("== phát hiện lỗi (luật miền + Hampel + stuck)")
flags = A.detect_faults(df)
p1 = df.index <= A.P1_END
cnt = {}
for part, m in [("p1", p1), ("all", np.ones(len(df), bool))]:
    f = flags[m]
    cnt[part] = {A.FLAG[k]: {c: int((f[c] == k).sum()) for c in VARS} for k in range(1, 6)}
R["fault_counts"] = cnt
print(pd.DataFrame(cnt["p1"]).T)

print("== (14,15) so sánh bộ phát hiện outlier")
bench, dbinfo, cells = A.outlier_benchmark(df, flags)
print(bench.round(3).to_string())
R["outlier_benchmark"] = bench.to_dict(orient="records"); R["dbscan"] = dbinfo
flags_raw = A.detect_faults(df, protect=False)
conf = A.protection_eval(flags_raw, flags)
print("bảo vệ biến động đồng thuận EC-N-P-K vs lỗi cảm biến:", conf)
R["event_vs_fault"] = conf

# ---- bảng điểm bất thường (đoạn liên tiếp cùng biến, cùng loại) ------------------------------------
rows = []
for c in VARS:
    f = flags[c].values
    bad = np.isin(f, [1, 2, 3, 4])
    if not bad.any():
        continue
    start = np.where(bad & ~np.r_[False, bad[:-1]])[0]
    for s in start:
        e = s
        while e + 1 < len(f) and bad[e + 1] and f[e + 1] == f[s]:
            e += 1
        raw_v = df[c].values[s:e + 1]
        rows.append(dict(start=str(df.index[s]), end=str(df.index[e]), var=c, type=A.FLAG[int(f[s])],
                         steps=int(e - s + 1), raw_min=float(np.nanmin(raw_v)) if np.isfinite(raw_v).any() else None,
                         raw_max=float(np.nanmax(raw_v)) if np.isfinite(raw_v).any() else None))
tab = pd.DataFrame(rows).sort_values("start")
R["anomaly_table_n"] = int(len(tab))
tab.to_csv(OUT / "anomaly_table.csv", index=False)
R["anomaly_table"] = tab.head(1500).to_dict(orient="records")

# quan sát hợp lệ: ô bị gắn cờ lỗi/missing = NaN (đáp án cho thí nghiệm điền missing)
obs_ok = df[VARS].where(~flags.isin([1, 2, 3, 4, 5]))

print("== (13) thí nghiệm điền missing"); t0 = time.time()
imp_tab, imp_best = A.imputation_experiment(obs_ok)
print(imp_tab[["scenario", "method", "nrmse"]].round(3).to_string(), imp_best, f"{time.time() - t0:.0f}s")
R["imputation"] = imp_tab.to_dict(orient="records"); R["imputation_best"] = imp_best

print("== (16) thí nghiệm làm mượt")
sm_tab = A.smoothing_experiment(obs_ok)
print(sm_tab[["method", "nrmse", "lag_steps", "roughness"]].round(3).to_string())
R["smoothing"] = sm_tab.to_dict(orient="records")
smoother = A.choose_smoother(sm_tab)
print("bộ làm mượt nhân quả được chọn (trễ <= 2 bước, trơn nhất):", smoother)
R["smoother_chosen"] = smoother
long_cands = imp_tab[(imp_tab.scenario == "gap_12h") & imp_tab.method.isin(["linear", "mice", "prev_day"])]
long_method = long_cands.sort_values("nrmse").iloc[0]["method"]
print("phương pháp điền cho đoạn >3h:", long_method)
R["long_gap_method"] = long_method

print("== xây pipeline xử lý A-D"); t0 = time.time()
pipes = A.build_pipelines(df, flags, smoother, long_method)
print(f"  {time.time() - t0:.0f}s")

print("== (18-21) EDA + ACF/PACF")
R["eda"] = A.eda(pipes["C_rule_hybrid"], df)
R["pca_npk_ec"] = A.feature_selection_inputs(pipes["C_rule_hybrid"])
print("  PCA phương sai giải thích EC,N,P,K:", np.round(R["pca_npk_ec"]["explained"], 4))

with open(DATA / "pipelines.pkl", "wb") as f:
    pickle.dump(dict(pipes=pipes, flags=flags, smoother=smoother), f)
jdump(R, OUT / "analysis.json")
print(f"[xong] {time.time() - t00:.0f}s -> outputs/analysis.json, data/pipelines.pkl")
