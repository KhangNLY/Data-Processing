import sys, pickle, json, pathlib
import pandas as pd
R = pathlib.Path(__file__).resolve().parents[1]
for f in ["soil_extended"]:
    df = pd.read_csv(R / "data" / f"{f}.csv", nrows=3)
    print(f, list(df.columns)); print(df.head(2).to_string())
d = pickle.load(open(R / "data" / "pipelines.pkl", "rb"))
print("pipelines keys", d.keys(), list(d["pipes"].keys()))
for k, v in d.items():
    if k != "pipes":
        print(k, type(v), (v.shape if hasattr(v, "shape") else ""))
a = json.load(open(R / "outputs" / "analysis.json", encoding="utf8"))
print("analysis keys", list(a.keys()))
for k in ["grid", "fault_counts"]:
    print(k, json.dumps(a.get(k))[:400])
for p in (R / "web").rglob("*"):
    if p.is_file(): print(p.relative_to(R), p.stat().st_size)
