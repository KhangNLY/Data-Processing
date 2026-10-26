"""Chạy toàn bộ phần HUẤN LUYỆN mô hình rồi xuất dữ liệu cho web — dành cho bạn chạy trên máy cá nhân.

    python scripts/train_all.py            # đầy đủ  (ước tính ~10–20 phút trên máy nhiều nhân)
    python scripts/train_all.py --quick    # chạy nhanh để kiểm tra pipeline (~3–5 phút, số liệu chỉ để thử)

Các bước (mỗi bước là một tiến trình riêng, log ghi vào outputs/train_all.log):
    1. src/run_models.py     benchmark RF/HGB/XGB/LSTM, cửa sổ, chọn đặc trưng, tối ưu tham số, walk-forward
    2. src/run_forecast.py   dự báo trực tiếp đa tầm 24h + backtest + dải bất định
    3. src/export_web.py     xuất JSON cho web (KHÔNG huấn luyện, vài giây)

Thời gian thực tế của từng bước được in ra cuối cùng và lưu vào outputs/train_timing.json.
Dừng giữa chừng: Ctrl+C. Chạy lại từng bước riêng: --only models | forecast | export
"""
import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path

for _s in (sys.stdout, sys.stderr):          # console Windows mặc định cp1252 -> ép UTF-8 để in tiếng Việt
    try:
        _s.reconfigure(encoding="utf-8")
    except Exception:  # noqa
        pass

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "outputs"
OUT.mkdir(exist_ok=True)

# Ước tính (phút) [min, max] — dựa trên log các lần chạy trước; số thật sẽ in ở cuối.
EST = {"full": {"models": (7, 13), "forecast": (3, 6), "export": (0.1, 0.3)},
       "quick": {"models": (2, 3), "forecast": (1, 2), "export": (0.1, 0.3)}}
STEPS = {"models": "src/run_models.py", "forecast": "src/run_forecast.py", "export": "src/export_web.py"}


def fmt(sec):
    sec = int(sec)
    return f"{sec // 60}p{sec % 60:02d}s"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--quick", action="store_true", help="chạy nhanh (QUICK=1)")
    ap.add_argument("--only", choices=list(STEPS), help="chỉ chạy một bước")
    a = ap.parse_args()
    mode = "quick" if a.quick else "full"
    todo = [a.only] if a.only else list(STEPS)

    if not (ROOT / "data" / "pipelines.pkl").exists():
        sys.exit("Thiếu data/pipelines.pkl — chạy trước:  python src/run_analysis.py")

    lo = sum(EST[mode][s][0] for s in todo)
    hi = sum(EST[mode][s][1] for s in todo)
    t_start = time.time()
    print("=" * 78)
    print(f"Chế độ: {mode.upper()} | các bước: {', '.join(todo)}")
    print(f"Ước tính tổng: {lo:.0f}–{hi:.0f} phút  →  dự kiến xong lúc "
          f"{time.strftime('%H:%M', time.localtime(t_start + lo * 60))}–{time.strftime('%H:%M', time.localtime(t_start + hi * 60))}")
    print(f"(CPU: {os.cpu_count()} luồng; ước tính thô, số thật in ở cuối)")
    print("=" * 78, flush=True)

    env = dict(os.environ, PYTHONUTF8="1", PYTHONUNBUFFERED="1", PYTHONWARNINGS="ignore")
    if a.quick:
        env["QUICK"] = "1"
    else:
        env.pop("QUICK", None)

    timing = {}
    with open(OUT / "train_all.log", "a", encoding="utf-8") as log:
        log.write(f"\n\n##### {time.strftime('%Y-%m-%d %H:%M:%S')} mode={mode} steps={todo}\n")
        for s in todo:
            print(f"\n>>> [{time.strftime('%H:%M:%S')}] BẮT ĐẦU {s}  ({STEPS[s]})  ước tính "
                  f"{EST[mode][s][0]:g}–{EST[mode][s][1]:g} phút", flush=True)
            t0 = time.time()
            p = subprocess.Popen([sys.executable, "-u", "-W", "ignore", str(ROOT / STEPS[s])], cwd=ROOT, env=env,
                                 stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding="utf-8",
                                 errors="replace")
            for line in p.stdout:
                print("   " + line.rstrip(), flush=True)
                log.write(line)
            code = p.wait()
            timing[s] = round(time.time() - t0, 1)
            if code != 0:
                print(f"\n!!! Bước {s} lỗi (exit {code}) sau {fmt(timing[s])}. Xem outputs/train_all.log", flush=True)
                json.dump(dict(mode=mode, timing=timing, failed=s), open(OUT / "train_timing.json", "w"), indent=1)
                sys.exit(code)
            print(f"<<< [{time.strftime('%H:%M:%S')}] XONG {s} sau {fmt(timing[s])}", flush=True)

    total = time.time() - t_start
    timing["tong"] = round(total, 1)
    json.dump(dict(mode=mode, timing=timing, finished=time.strftime("%Y-%m-%d %H:%M:%S")),
              open(OUT / "train_timing.json", "w"), indent=1)
    print("\n" + "=" * 78)
    print("THỜI GIAN THỰC TẾ: " + " | ".join(f"{k}: {fmt(v)}" for k, v in timing.items()))
    print("Xem web:  cd web && python -m http.server 8000   →  http://localhost:8000")
    print("=" * 78)


if __name__ == "__main__":
    main()
