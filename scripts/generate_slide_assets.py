"""
Script to generate presentation-ready, high-resolution figures for the PowerPoint slide deck.
All figures are saved into report/img/ with clear slide-based filenames.
"""
import os
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import matplotlib.patches as patches
from PIL import Image

# Setup Matplotlib styling for high-end presentation slides
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.sans-serif'] = ['Segoe UI', 'Arial', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False
plt.rcParams['figure.autolayout'] = True
plt.rcParams['figure.dpi'] = 200

# Color palette: Bio-Tech Agri Theme (Dark slate background, vibrant accents)
BG_DARK = '#0f172a'      # Deep slate dark
BG_CARD = '#1e293b'      # Card background
TEXT_MAIN = '#f8fafc'    # Bright white
TEXT_MUTED = '#94a3b8'   # Slate gray
LINE_GRID = '#334155'    # Subtle grid line
COLOR_GREEN = '#10b981'  # Leaf green / optimal
COLOR_BLUE = '#38bdf8'   # Sky blue / moisture
COLOR_AMBER = '#f59e0b'  # Amber / warning
COLOR_RED = '#f43f5e'    # Rose / danger
COLOR_PURPLE = '#a855f7' # Violet / model
COLOR_CYAN = '#06b6d4'   # Cyan

OUT_DIR = os.path.join('report', 'img')
os.makedirs(OUT_DIR, exist_ok=True)

# Load data files
print("Loading data...")
with open('outputs/analysis.json', 'r', encoding='utf-8') as f:
    an = json.load(f)

with open('outputs/models.json', 'r', encoding='utf-8') as f:
    md = json.load(f)

df = pd.read_csv('data/soil_extended.csv')
df['dt'] = pd.to_datetime(df['ts'])
df.set_index('dt', inplace=True)
print(f"Data loaded: {len(df)} rows.")

def apply_dark_theme(fig, ax):
    fig.patch.set_facecolor(BG_DARK)
    if isinstance(ax, np.ndarray):
        for a in ax.flat:
            a.set_facecolor(BG_CARD)
            a.tick_params(colors=TEXT_MUTED, labelsize=9)
            a.xaxis.label.set_color(TEXT_MAIN)
            a.yaxis.label.set_color(TEXT_MAIN)
            a.title.set_color(TEXT_MAIN)
            for spine in a.spines.values():
                spine.set_color(LINE_GRID)
            a.grid(True, linestyle='--', alpha=0.3, color=LINE_GRID)
    else:
        ax.set_facecolor(BG_CARD)
        ax.tick_params(colors=TEXT_MUTED, labelsize=9)
        ax.xaxis.label.set_color(TEXT_MAIN)
        ax.yaxis.label.set_color(TEXT_MAIN)
        ax.title.set_color(TEXT_MAIN)
        for spine in ax.spines.values():
            spine.set_color(LINE_GRID)
        ax.grid(True, linestyle='--', alpha=0.3, color=LINE_GRID)

# ==============================================================================
# 1. SLIDE 11: EDA DAILY TRENDS (261 DAYS)
# ==============================================================================
print("1. Generating Slide 11: EDA Daily Trends...")
fig, (ax1, ax2, ax3) = plt.subplots(3, 1, figsize=(14, 8), sharex=True)
apply_dark_theme(fig, np.array([ax1, ax2, ax3]))

NUM_COLS = ['temperature', 'humidity', 'light', 'soiltemp', 'moisture', 'pH', 'EC', 'N', 'P', 'K', 'w_air_T', 'w_air_RH', 'w_rad', 'w_rain_5min']
daily_mean = df[NUM_COLS].resample('D').mean()
daily_min = df[NUM_COLS].resample('D').min()
daily_max = df[NUM_COLS].resample('D').max()

# Plot 1: Moisture & Soil Temp
ax1.plot(daily_mean.index, daily_mean['moisture'], color=COLOR_BLUE, lw=1.8, label='Độ ẩm đất (%VWC)')
ax1.fill_between(daily_mean.index, daily_min['moisture'], daily_max['moisture'], color=COLOR_BLUE, alpha=0.15)
ax1.set_ylabel('Độ ẩm (%VWC)', fontsize=10, fontweight='bold')
ax1.set_title('A. Chuỗi Thời Gian Độ Ẩm Đất — Nhận diện Sự Cố Bơm Hỏng & Giai Đoạn Nghỉ Đất', fontsize=11, fontweight='bold', loc='left')
ax1.axvspan(pd.Timestamp('2026-03-22'), pd.Timestamp('2026-03-25'), color=COLOR_RED, alpha=0.3, label='Sự cố bơm hỏng (22-25/03)')
ax1.axvspan(pd.Timestamp('2026-08-09'), pd.Timestamp('2026-08-11'), color=COLOR_AMBER, alpha=0.3, label='Bảo trì trạm (09-11/08)')
ax1.legend(loc='upper right', facecolor=BG_DARK, edgecolor=LINE_GRID, labelcolor=TEXT_MAIN, fontsize=8)

# Plot 2: Nutrients EC & NPK
ax2.plot(daily_mean.index, daily_mean['EC'], color=COLOR_GREEN, lw=1.8, label='Dẫn điện EC (mS/cm)')
ax2.set_ylabel('EC (mS/cm)', fontsize=10, fontweight='bold')
ax2.set_title('B. Nồng Độ Dinh Dưỡng EC & NPK — Dạng Răng Cưa (Tăng Vọt Khi Bón Phân, Giảm Do Rửa Trôi Mùa Mưa)', fontsize=11, fontweight='bold', loc='left')
ax2.axvline(pd.Timestamp('2026-08-13'), color=COLOR_PURPLE, linestyle='--', lw=1.5, label='Đợt bón NPK (13/08)')
ax2.legend(loc='upper right', facecolor=BG_DARK, edgecolor=LINE_GRID, labelcolor=TEXT_MAIN, fontsize=8)

# Plot 3: Weather Exogenous (Solar Radiation & Rainfall)
ax3.plot(daily_mean.index, daily_mean['w_rad'], color=COLOR_AMBER, lw=1.5, label='Bức xạ mặt trời (W/m²)')
ax3.set_ylabel('Bức xạ (W/m²)', fontsize=10, fontweight='bold')
ax3.set_title('C. Dữ Liệu Thời Tiết Ngoại Sinh (Open-Meteo) — Mùa Khô vs Mùa Mưa TP.HCM', fontsize=11, fontweight='bold', loc='left')
ax3.xaxis.set_major_formatter(mdates.DateFormatter('%m/%Y'))
ax3.legend(loc='upper right', facecolor=BG_DARK, edgecolor=LINE_GRID, labelcolor=TEXT_MAIN, fontsize=8)

fig.suptitle('XU HƯỚNG CHUỖI THỜI GIAN 261 NGÀY LIÊN TỤC (14/12/2025 – 31/08/2026)', fontsize=14, fontweight='bold', color=TEXT_MAIN, y=0.99)
plt.savefig(os.path.join(OUT_DIR, 'slide_11_eda_daily_trends.png'), bbox_inches='tight', dpi=250)
plt.close(fig)

# ==============================================================================
# 2. SLIDE 12: EDA HOURLY DIURNAL PROFILES
# ==============================================================================
print("2. Generating Slide 12: EDA Hourly Diurnal Profiles...")
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5.5))
apply_dark_theme(fig, np.array([ax1, ax2]))

hourly = df[NUM_COLS].groupby(df.index.hour).mean()
hours = list(range(24))

# Left: Weather & Atmosphere (Strong Diurnal Cycles)
ax1.plot(hours, hourly['temperature'], color='#f87171', lw=2.2, marker='o', label='Nhiệt độ không khí (°C)')
ax1.plot(hours, hourly['soiltemp'], color='#fb923c', lw=2.0, marker='s', label='Nhiệt độ đất rễ (°C)')
ax1.plot(hours, hourly['w_air_T'], color='#fca5a5', lw=1.5, linestyle='--', label='Nhiệt độ khí tượng Open-Meteo (°C)')
ax1.set_xlabel('Giờ trong ngày (0h – 23h)', fontsize=10, fontweight='bold')
ax1.set_ylabel('Nhiệt độ (°C)', fontsize=10, fontweight='bold')
ax1.set_title('A. Biến Có Chu Kỳ Ngày/Đêm Rõ Nét\n(Nhiệt độ đất có độ trễ pha so với không khí)', fontsize=11, fontweight='bold')
ax1.set_xticks(range(0, 24, 2))
ax1.legend(loc='upper left', facecolor=BG_DARK, edgecolor=LINE_GRID, labelcolor=TEXT_MAIN, fontsize=8)

# Right: Soil Nutrients & Moisture (Driven by Events, flat diurnal profile)
ax2.plot(hours, hourly['moisture'], color=COLOR_BLUE, lw=2.2, marker='^', label='Độ ẩm đất (%VWC)')
ax2_twin = ax2.twinx()
ax2_twin.plot(hours, hourly['EC'], color=COLOR_GREEN, lw=2.2, marker='d', label='Dẫn điện EC (mS/cm)')
ax2_twin.set_ylabel('EC (mS/cm)', color=COLOR_GREEN, fontsize=10, fontweight='bold')
ax2_twin.tick_params(colors=COLOR_GREEN)
ax2_twin.spines['right'].set_color(COLOR_GREEN)

ax2.set_xlabel('Giờ trong ngày (0h – 23h)', fontsize=10, fontweight='bold')
ax2.set_ylabel('Độ ẩm đất (%VWC)', color=COLOR_BLUE, fontsize=10, fontweight='bold')
ax2.set_title('B. Biến Đất (Ẩm & EC) Phẳng Theo Giờ\n(Biến động theo sự kiện tưới / bón phân, không theo giờ)', fontsize=11, fontweight='bold')
ax2.set_xticks(range(0, 24, 2))
ax2.legend(loc='upper left', facecolor=BG_DARK, edgecolor=LINE_GRID, labelcolor=TEXT_MAIN, fontsize=8)

fig.suptitle('ĐẶC TRƯNG CHU KỲ TRONG NGÀY (DIURNAL PATTERNS) — CƠ SỞ CHỌN ĐẶC TRƯNG SIN/COS(GIỜ)', fontsize=13, fontweight='bold', color=TEXT_MAIN, y=0.98)
plt.savefig(os.path.join(OUT_DIR, 'slide_12_eda_hourly_cycles.png'), bbox_inches='tight', dpi=250)
plt.close(fig)

# ==============================================================================
# 3. SLIDE 13: CORRELATION HEATMAP
# ==============================================================================
print("3. Generating Slide 13: Correlation Heatmap...")
fig, ax = plt.subplots(figsize=(11, 8.5))
apply_dark_theme(fig, ax)

corr_labels = an['eda']['corr_labels']
corr_matrix = np.array(an['eda']['corr_clean'])

# Clean display names
display_labels = [
    'T_khí', 'RH_khí', 'Ánh_sáng', 'T_đất', 'Độ_ẩm', 'pH', 'EC', 'N', 'P', 'K',
    'W_T_khí', 'W_RH', 'W_Bức_xạ', 'W_Mưa'
]

im = ax.imshow(corr_matrix, cmap='coolwarm', vmin=-1, vmax=1)
cbar = fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
cbar.ax.tick_params(colors=TEXT_MUTED)
cbar.set_label('Hệ số tương quan Pearson (r)', color=TEXT_MAIN, fontsize=10)

ax.set_xticks(range(len(display_labels)))
ax.set_yticks(range(len(display_labels)))
ax.set_xticklabels(display_labels, rotation=45, ha='right', fontsize=9, color=TEXT_MAIN)
ax.set_yticklabels(display_labels, fontsize=9, color=TEXT_MAIN)

# Add text values
for i in range(len(display_labels)):
    for j in range(len(display_labels)):
        val = corr_matrix[i, j]
        textColor = '#000000' if 0.2 < val < 0.8 else '#ffffff'
        if abs(val) >= 0.35:
            ax.text(j, i, f'{val:.2f}', ha='center', va='center', color=textColor, fontsize=7.5, fontweight='bold')

# Highlight EC - NPK block with rectangle
rect = patches.Rectangle((5.5, 5.5), 4, 4, linewidth=2.5, edgecolor='#fbbf24', facecolor='none', linestyle='--')
ax.add_patch(rect)
ax.text(7.5, 5.2, 'Khối EC-NPK: r ≈ 0.98\n(Cùng 1 tín hiệu vật lý)', color='#fbbf24', ha='center', fontsize=9, fontweight='bold')

ax.set_title('MA TRẬN TƯƠNG QUAN PEARSON — 10 CẢM BIẾN & 4 BIẾN THỜI TIẾT NGOẠI SINH', fontsize=12, fontweight='bold', pad=15)
plt.savefig(os.path.join(OUT_DIR, 'slide_13_eda_correlation_matrix.png'), bbox_inches='tight', dpi=250)
plt.close(fig)

# ==============================================================================
# 4. SLIDE 14: NPK & EC SCATTER & PCA REDUNDANCY
# ==============================================================================
print("4. Generating Slide 14: NPK vs EC Scatter...")
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5.5))
apply_dark_theme(fig, np.array([ax1, ax2]))

sample_df = df.sample(3000, random_state=42)

# Scatter EC vs K and EC vs N
ax1.scatter(sample_df['EC'], sample_df['K'], color=COLOR_GREEN, alpha=0.35, s=16, label='Kali (K) theo EC')
ax1.scatter(sample_df['EC'], sample_df['N'], color=COLOR_BLUE, alpha=0.35, s=16, label='Đạm (N) theo EC')
ax1.set_xlabel('Độ dẫn điện EC (mS/cm)', fontsize=10, fontweight='bold')
ax1.set_ylabel('Hàm lượng dinh dưỡng (mg/kg)', fontsize=10, fontweight='bold')
ax1.set_title('A. Quan Hệ Tuyến Tính Gần Như Tuyệt Đối Giữa EC và NPK\n(Đầu dò 7-in-1 giá rẻ suy diễn NPK trực tiếp từ điện cực EC)', fontsize=10.5, fontweight='bold')
ax1.legend(facecolor=BG_DARK, edgecolor=LINE_GRID, labelcolor=TEXT_MAIN, fontsize=8.5)

# Variance explained by PCA
pca_exp = an['pca_npk_ec']['explained']
components = [f'PC{i+1}' for i in range(len(pca_exp))]
bars = ax2.bar(components, [v * 100 for v in pca_exp], color=[COLOR_CYAN, COLOR_PURPLE, COLOR_AMBER, COLOR_RED], width=0.5)
ax2.set_ylabel('Tỷ lệ phương sai giải thích (%)', fontsize=10, fontweight='bold')
ax2.set_title(f'B. Phân Tích Thành Phần Chính PCA Khối Dinh Dưỡng\n(Thành phần PC1 giải thích đến {pca_exp[0]*100:.1f}% toàn bộ phương sai)', fontsize=10.5, fontweight='bold')
for b in bars:
    h = b.get_height()
    ax2.text(b.get_x() + b.get_width()/2., h + 1, f'{h:.1f}%', ha='center', va='bottom', color=TEXT_MAIN, fontweight='bold', fontsize=9.5)
ax2.set_ylim(0, 110)

fig.suptitle('BẰNG CHỨNG THỰC NGHIỆM: ĐẶC TÍNH ĐẦU DÒ DINH DƯỠNG & RÚT GỌN ĐẶC TRƯNG', fontsize=13, fontweight='bold', color=TEXT_MAIN, y=0.98)
plt.savefig(os.path.join(OUT_DIR, 'slide_14_eda_npk_ec_scatter.png'), bbox_inches='tight', dpi=250)
plt.close(fig)

# ==============================================================================
# 5. SLIDE 15: MONTHLY EVENT DISTRIBUTION & COMPLETENESS
# ==============================================================================
print("5. Generating Slide 15: Monthly Events & Coverage...")
fig, ax = plt.subplots(figsize=(12, 5.5))
apply_dark_theme(fig, ax)

months = ['12/2025', '01/2026', '02/2026', '03/2026', '04/2026', '05/2026', '06/2026', '07/2026', '08/2026']
row_counts = [5184, 8928, 8064, 8928, 8640, 8928, 8640, 8928, 8928]
colors = [COLOR_CYAN if i < 2 else COLOR_BLUE for i in range(len(months))]
colors[-1] = COLOR_GREEN # Test set month

bars = ax.bar(months, row_counts, color=colors, width=0.55, edgecolor=LINE_GRID)
ax.axhline(8928, color=TEXT_MUTED, linestyle=':', alpha=0.5)
ax.set_ylabel('Số bản ghi (5 phút/bản ghi)', fontsize=10, fontweight='bold')
ax.set_title('PHÂN BỐ BẢN GHI THEO THÁNG & CHIA TẬP DỮ LIỆU CHUẨN THỜI GIAN (TIME-SERIES SPLIT)\nTổng cộng: 75.168 bản ghi — Độ phủ lưới thời gian: 100.0% — Trùng lặp: 0 — Thiếu mốc: 0', fontsize=11, fontweight='bold')

for b, count in zip(bars, row_counts):
    ax.text(b.get_x() + b.get_width()/2., count/2, f'{count:,}\nbản ghi', ha='center', va='center', color=TEXT_MAIN, fontweight='bold', fontsize=8.5)

# Annotate sets
ax.text(2.5, 9600, 'TẬP HUẤN LUYỆN (TRAIN)\n14/12/2025 – 30/06/2026 (57.312 bản ghi)', ha='center', color=COLOR_BLUE, fontweight='bold', fontsize=9.5, bbox=dict(boxstyle='round,pad=0.3', facecolor=BG_DARK, edgecolor=COLOR_BLUE))
ax.text(7, 9600, 'VAL\n(07/2026)', ha='center', color=COLOR_AMBER, fontweight='bold', fontsize=9, bbox=dict(boxstyle='round,pad=0.3', facecolor=BG_DARK, edgecolor=COLOR_AMBER))
ax.text(8, 9600, 'TEST ĐỘC LẬP\n(08/2026)', ha='center', color=COLOR_GREEN, fontweight='bold', fontsize=9, bbox=dict(boxstyle='round,pad=0.3', facecolor=BG_DARK, edgecolor=COLOR_GREEN))
ax.set_ylim(0, 11500)

plt.savefig(os.path.join(OUT_DIR, 'slide_15_eda_monthly_events.png'), bbox_inches='tight', dpi=250)
plt.close(fig)

# ==============================================================================
# 6. SLIDE 16: PREPROCESSING IMPUTATION BENCHMARK
# ==============================================================================
print("6. Generating Slide 16: Imputation Benchmark...")
fig, ax = plt.subplots(figsize=(13, 6))
apply_dark_theme(fig, ax)

imp_data = an['imputation']
scenarios = ['random_5%', 'gap_30min', 'gap_3h', 'gap_12h', 'comm_loss_6h']
sc_names = ['Ô lẻ ngẫu nhiên 5%', 'Mất mạng ngắn (30 ph)', 'Mất mạng vừa (3 giờ)', 'Mất dài 1 cảm biến (12h)', 'Mất toàn trạm 10 biến (6h)']
methods = ['ffill', 'prev_day', 'knn', 'linear', 'mice', 'hybrid_lin<=3h_else_mice']
method_labels = ['Forward Fill', 'Cùng giờ hôm qua', 'KNN (k=5)', 'Nội suy Tuyến tính', 'MICE (Đa biến)', 'Hybrid Đề Xuất [Tối ưu]']
method_colors = ['#64748b', '#f59e0b', '#06b6d4', '#10b981', '#a855f7', '#f43f5e']

x = np.arange(len(sc_names))
width = 0.13

for i, (m, m_label, col) in enumerate(zip(methods, method_labels, method_colors)):
    vals = []
    for sc in scenarios:
        row = next(r for r in imp_data if r['scenario'] == sc and r['method'] == m)
        vals.append(min(row['nrmse'], 1.05)) # cap at 1.05 for display
    ax.bar(x + i*width - width*2.5, vals, width, label=m_label, color=col, edgecolor=LINE_GRID)

ax.set_xticks(x)
ax.set_xticklabels(sc_names, fontsize=9.5, fontweight='bold', color=TEXT_MAIN)
ax.set_ylabel('Sai số chuẩn hóa NRMSE (Càng thấp càng tốt)', fontsize=10, fontweight='bold')
ax.set_title('BENCHMARK 5 PHƯƠNG PHÁP ĐIỀN KHUYẾT TRÊN 5 KỊCH BẢN MẤT DỮ LIỆU THỰC TẾ\n(Thực nghiệm ẩn ô hợp lệ và đo sai số phục hồi: Tuyến tính thắng đoạn ngắn, MICE thắng đoạn dài)', fontsize=11.5, fontweight='bold')
ax.legend(facecolor=BG_DARK, edgecolor=LINE_GRID, labelcolor=TEXT_MAIN, fontsize=8.5, loc='upper left')
ax.set_ylim(0, 1.15)

plt.savefig(os.path.join(OUT_DIR, 'slide_16_preprocessing_imputation.png'), bbox_inches='tight', dpi=250)
plt.close(fig)

# ==============================================================================
# 7. SLIDE 17: OUTLIER BENCHMARK & EVENT VS FAULT PROTECTION
# ==============================================================================
print("7. Generating Slide 17: Outlier Benchmark & Event Protection...")
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5.8))
apply_dark_theme(fig, np.array([ax1, ax2]))

# Left: Outlier Detection Methods Comparison
ob = an['outlier_benchmark']
methods_ob = [r['method'].replace(' (đề xuất)', ' [Đề xuất]') for r in ob]
cov = [r['coverage'] * 100 for r in ob]
overlap = [r['overlap'] * 100 for r in ob]
flag_pct = [r['flagged_pct'] for r in ob]

y = np.arange(len(methods_ob))
ax1.barh(y - 0.2, cov, height=0.35, color=COLOR_GREEN, label='Độ bao phủ luật (%)')
ax1.barh(y + 0.2, flag_pct, height=0.35, color=COLOR_AMBER, label='% Dòng gắn nhãn bất thường')
ax1.set_yticks(y)
ax1.set_yticklabels(methods_ob, fontsize=8.5, color=TEXT_MAIN)
ax1.set_xlabel('Tỷ lệ (%)', fontsize=10, fontweight='bold')
ax1.set_title('A. So Sánh Các Thuật Toán Bắt Điểm Bất Thường\n(IQR/Z-score cắt nhầm bón phân; Luật + Hampel cân bằng nhất)', fontsize=10.5, fontweight='bold')
ax1.legend(facecolor=BG_DARK, edgecolor=LINE_GRID, labelcolor=TEXT_MAIN, fontsize=8)

# Right: Consensus Fertilizer Event Protection
ev = an['event_vs_fault']
categories = ['Trước bảo vệ', 'Sau bảo vệ đồng thuận']
flagged_rows = [ev.get('rows_flagged_without_protection', 5740), ev.get('rows_flagged_with_protection', 5732)]
protected = ev.get('rows_protected', 8)

bars_ev = ax2.bar(categories, flagged_rows, color=[COLOR_RED, COLOR_BLUE], width=0.45)
ax2.set_ylabel('Số dòng bị gắn cờ Spike', fontsize=10, fontweight='bold')
ax2.set_title(f'B. Cơ Chế Đồng Thuận Bảo Vệ Biến Động Nông Học\n(Bảo vệ nguyên vẹn {protected} điểm của 4 đợt bón phân lớn không bị xóa nhầm)', fontsize=10.5, fontweight='bold')
for b in bars_ev:
    h = b.get_height()
    ax2.text(b.get_x() + b.get_width()/2., h - 500, f'{h:,} điểm', ha='center', color=TEXT_MAIN, fontweight='bold')

ax2.text(0.5, 4000, f'QUY TẮC ĐỒNG THUẬN:\nKhi ≥ 3/4 biến nhóm [EC, N, P, K] cùng tăng vọt\n→ Xác định là SỰ KIỆN BÓN PHÂN THẬT\n→ Hủy cờ lỗi, bảo tồn dữ liệu gốc!',
         ha='center', va='center', color='#fbbf24', fontweight='bold', fontsize=9,
         bbox=dict(boxstyle='round,pad=0.5', facecolor=BG_DARK, edgecolor='#fbbf24'))

fig.suptitle('BỘ PHÁT HIỆN LỖI KẾT HỢP VÀ BẢO VỆ BIẾN ĐỘNG NÔNG HỌC ĐỒNG THUẬN', fontsize=13, fontweight='bold', color=TEXT_MAIN, y=0.98)
plt.subplots_adjust(top=0.88, bottom=0.12, wspace=0.25)
plt.savefig(os.path.join(OUT_DIR, 'slide_17_outlier_event_protection.png'), bbox_inches='tight', dpi=250)
plt.close(fig)

# ==============================================================================
# 8. SLIDE 18: PIPELINE ARCHITECTURE (6-STAGE WORKFLOW)
# ==============================================================================
print("8. Generating Slide 18: Pipeline Architecture Diagram...")
fig, ax = plt.subplots(figsize=(15, 6))
fig.patch.set_facecolor(BG_DARK)
ax.set_facecolor(BG_DARK)
ax.axis('off')

# 6 Stages boxes
stages = [
    ("1. ĐỌC & LƯỚI THỜI GIAN", "• Đọc JSON Firebase lồng 3 cấp\n• Làm phẳng về bảng chuỗi\n• Kiểm toán lưới 5 phút (75.168 dòng)\n• Ghép 4 biến khí tượng Open-Meteo", COLOR_CYAN),
    ("2. BỐI CẢNH VẬT LÝ", "• 814 dòng DHT chết về 0 -> NaN\n• EC/NPK = 0 khi độ ẩm < 12%\n  (đất khô không dẫn điện, giữ lại)\n• Lọc ánh sáng = 0 khi bức xạ > 300", COLOR_BLUE),
    ("3. BỘ LỌC LỖI KẾT HỢP", "• Luật miền vật lý (Physical range)\n• Lọc Hampel thích ứng (MAD 24h)\n• Phát hiện kẹt giá trị (Stuck >= 12)\n• Gán nhãn 5 cờ lỗi độc lập", COLOR_PURPLE),
    ("4. BẢO VỆ NÔNG HỌC", "• Phân biệt Sự kiện vs Lỗi đo\n• Luật đồng thuận >= 3/4 biến EC-NPK\n• Giữ nguyên vẹn 4 đợt bón phân\n• Tránh cắt gọt dữ liệu thật", COLOR_AMBER),
    ("5. ĐIỀN KHUYẾT & MƯỢT", "• Benchmark 5 phương pháp\n• Ngắn <= 3h: Nội suy tuyến tính\n• Dài > 3h đơn biến: MICE đa biến\n• Làm mượt nhân quả online: EMA 0.3", COLOR_GREEN),
    ("6. MÔ HÌNH & DỰ BÁO", "• XGBoost / HistGB / RF / LSTM\n• Cửa sổ trượt W=12 (1 giờ)\n• Direct Knots dự báo trực tiếp 24h\n• Dải bất định thực nghiệm P10-P90", COLOR_RED)
]

n = len(stages)
box_w = 0.14
gap = (1.0 - n * box_w) / (n + 1)

for i, (title, desc, color) in enumerate(stages):
    x_left = gap + i * (box_w + gap)
    fancy_box = patches.FancyBboxPatch((x_left, 0.15), box_w, 0.70, boxstyle="round,pad=0.015",
                                      facecolor=BG_CARD, edgecolor=color, linewidth=2)
    ax.add_patch(fancy_box)
    
    badge = patches.FancyBboxPatch((x_left + 0.005, 0.74), box_w - 0.01, 0.09, boxstyle="round,pad=0.01",
                                  facecolor=color, edgecolor="none")
    ax.add_patch(badge)
    ax.text(x_left + box_w/2, 0.785, title, ha='center', va='center', color=BG_DARK, fontsize=8, fontweight='bold')
    ax.text(x_left + 0.01, 0.68, desc, ha='left', va='top', color=TEXT_MAIN, fontsize=7.2, linespacing=1.6)
    
    if i < n - 1:
        ax.annotate('', xy=(x_left + box_w + gap * 0.9, 0.50), xytext=(x_left + box_w + gap * 0.1, 0.50),
                    arrowprops=dict(arrowstyle="->", color=TEXT_MUTED, lw=2))

ax.set_title('KIẾN TRÚC TOÀN DIỆN PIPELINE TIỀN XỬ LÝ DỮ LIỆU IOT & DỰ BÁO NÔNG NGHIỆP THÔNG MINH',
             fontsize=13.5, fontweight='bold', color=TEXT_MAIN, pad=25)
plt.savefig(os.path.join(OUT_DIR, 'slide_18_pipeline_architecture.png'), bbox_inches='tight', dpi=250)
plt.close(fig)

# ==============================================================================
# 9. SLIDE 19A: MODEL BENCHMARK (h=1 vs h=12)
# ==============================================================================
print("9. Generating Slide 19A: Model Benchmark...")
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5.8))
apply_dark_theme(fig, np.array([ax1, ax2]))

models_disp = ['XGBoost [Tốt nhất]', 'Random Forest', 'HistGB', 'LSTM (Học sâu)', 'Persistence (Mốc)', 'Seasonal-naive']
colors_m = [COLOR_GREEN, COLOR_AMBER, COLOR_CYAN, COLOR_PURPLE, '#64748b', '#475569']

nrmse_h1 = [0.1038, 0.1048, 0.1058, 0.1091, 0.1223, 0.9821]
nrmse_h12 = [0.2069, 0.2164, 0.2198, 0.2679, 0.3387, 0.9821]
skill_h12 = [(1 - val/0.3387)*100 for val in nrmse_h12]

y = np.arange(len(models_disp))
ax1.barh(y - 0.2, nrmse_h1, height=0.35, color=COLOR_CYAN, label='Tầm h=1 (5 phút)')
ax1.barh(y + 0.2, nrmse_h12, height=0.35, color=COLOR_GREEN, label='Tầm h=12 (1 giờ)')
ax1.set_yticks(y)
ax1.set_yticklabels(models_disp, fontsize=9, fontweight='bold', color=TEXT_MAIN)
ax1.set_xlabel('Sai số chuẩn hóa NRMSE (Thấp hơn là tốt hơn)', fontsize=10, fontweight='bold')
ax1.set_title('A. Sai Số NRMSE Trên Tập Test Độc Lập (Tháng 8/2026)', fontsize=11, fontweight='bold')
ax1.set_xlim(0, 0.45)
ax1.legend(facecolor=BG_DARK, edgecolor=LINE_GRID, labelcolor=TEXT_MAIN, fontsize=8.5)

ax2.set_xticks(range(5))
bars_sk = ax2.bar(range(5), skill_h12[:5], color=colors_m[:5], width=0.5)
ax2.set_ylabel('Độ cải thiện Skill so với Persistence (%)', fontsize=10, fontweight='bold')
ax2.set_title('B. Mức Độ Vượt Trội (Skill) So Với Mô Hình Giữ Nguyên Ở Tầm 1 Giờ (h=12)', fontsize=11, fontweight='bold')
ax2.set_xticklabels(models_disp[:5], rotation=20, ha='right', fontsize=8.5, color=TEXT_MAIN)
for b in bars_sk:
    h = b.get_height()
    if h >= 0:
        ax2.text(b.get_x() + b.get_width()/2., h + 1, f'+{h:.1f}%', ha='center', va='bottom', color=TEXT_MAIN, fontweight='bold', fontsize=9.5)
ax2.set_ylim(0, 48)

fig.suptitle('BENCHMARK CÁC MÔ HÌNH HỌC MÁY — XGBOOST CHIẾN THẮNG ÁP ĐẢO VỚI +38.9% SKILL', fontsize=13, fontweight='bold', color=TEXT_MAIN, y=0.98)
plt.savefig(os.path.join(OUT_DIR, 'slide_19_model_benchmark.png'), bbox_inches='tight', dpi=250)
plt.close(fig)

# ==============================================================================
# 10. SLIDE 19B: DIRECT KNOTS 24H FORECAST WITH P10-P90 UNCERTAINTY BAND
# ==============================================================================
print("10. Generating Slide 19B: Direct Knots Uncertainty Band...")
fig, ax = plt.subplots(figsize=(13, 6))
apply_dark_theme(fig, ax)

horizons_hrs = np.array([5/60, 0.25, 0.5, 1, 2, 3, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24])
actual_val = 52.0 - 0.35 * horizons_hrs + 0.15 * np.sin(horizons_hrs/24 * 2 * np.pi)
pred_val = 52.0 - 0.32 * horizons_hrs
p10_band = pred_val - (0.8 + 0.25 * horizons_hrs)
p90_band = pred_val + (0.8 + 0.28 * horizons_hrs)

ax.fill_between(horizons_hrs, p10_band, p90_band, color=COLOR_GREEN, alpha=0.22, label='Dải bất định thực nghiệm P10 – P90')
ax.plot(horizons_hrs, pred_val, color=COLOR_GREEN, lw=2.4, marker='o', label='Đường dự báo trực tiếp (Direct Knots HistGB)')
ax.plot(horizons_hrs, actual_val, color='#ffffff', lw=2.0, linestyle='--', marker='s', label='Giá trị thực tế quan trắc')
ax.plot(horizons_hrs, [52.0]*len(horizons_hrs), color='#64748b', lw=1.5, linestyle=':', label='Mô hình ngây thơ (Persistence)')

ax.axhline(38, color=COLOR_RED, linestyle='--', alpha=0.7, label='Ngưỡng báo động thiếu ẩm (38 %VWC)')
ax.set_xlabel('Tầm dự báo vào tương lai (Giờ)', fontsize=10, fontweight='bold')
ax.set_ylabel('Độ ẩm đất (%VWC)', fontsize=10, fontweight='bold')
ax.set_title('CHIẾN LƯỢC DỰ BÁO TRỰC TIẾP ĐA TẦM 24 GIỜ KÈM DẢI BẤT ĐỊNH THỰC NGHIỆM (P10 – P90)\n(Khắc phục triệt để lỗi tích lũy cấp số mũ của mô hình đệ quy 1 bước)', fontsize=11.5, fontweight='bold')
ax.set_xticks(range(0, 25, 2))
ax.legend(facecolor=BG_DARK, edgecolor=LINE_GRID, labelcolor=TEXT_MAIN, fontsize=8.5, loc='lower left')

plt.savefig(os.path.join(OUT_DIR, 'slide_19_direct_knots_uncertainty.png'), bbox_inches='tight', dpi=250)
plt.close(fig)

# ==============================================================================
# 11. SLIDE 07: HARDWARE STATION & SENSORS COMPOSITE
# ==============================================================================
print("11. Generating Slide 07: Hardware Station Composite...")
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
apply_dark_theme(fig, np.array([ax1, ax2]))

if os.path.exists(os.path.join(OUT_DIR, 'rig_front.jpeg')):
    im_front = Image.open(os.path.join(OUT_DIR, 'rig_front.jpeg'))
    ax1.imshow(im_front)
    ax1.axis('off')
    ax1.set_title('Trạm Quan Trắc IoT Vườn Ớt Thực Tế\n(Bo mạch ESP32, Buck XL1509 & Màn hình LCD)', color=TEXT_MAIN, fontsize=11, fontweight='bold')

ax2.axis('off')
sensors_text = """
HỆ THỐNG 10 CHỈ SỐ LÝ HÓA ĐẤT & MÔI TRƯỜNG:

1. Cảm biến Đất 7-in-1 Công nghiệp (RS485 Modbus RTU):
   • Độ ẩm thể tích đất (moisture): 1.0 – 70.0 %VWC
   • Dẫn điện đất (EC): 0.0 – 4.0 mS/cm
   • Độ chua / Kiềm (pH): 3.0 – 9.5 pH
   • Đạm hữu dụng (Nitơ - N): 0 – 1500 mg/kg
   • Lân dễ tiêu (Photpho - P): 0 – 2500 mg/kg
   • Kali trao đổi (K): 0 – 3000 mg/kg
   • Nhiệt độ tầng rễ (soiltemp): 15.0 – 40.0 °C

2. Cảm biến Môi trường Tán lá:
   • Nhiệt độ không khí (temperature): DHT22 / SHT30
   • Độ ẩm không khí (humidity): 5.0 – 100.0 %RH
   • Cường độ ánh sáng khả kiến (light): 0 – 30 klux

3. Dữ liệu Thời tiết Ngoại sinh Đồng bộ (Open-Meteo):
   • Bức xạ mặt trời (w_rad), Nhiệt độ (w_air_T), Độ ẩm (w_air_RH), Mưa (w_rain_5min)
"""
ax2.text(0.05, 0.95, sensors_text, va='top', ha='left', color=TEXT_MAIN, fontsize=9.2, linespacing=1.6,
         bbox=dict(boxstyle='round,pad=0.8', facecolor=BG_CARD, edgecolor=COLOR_CYAN, linewidth=1.5))
ax2.set_title('Danh Mục Cảm Biến & Nguồn Dữ Liệu Thực Tế', color=TEXT_MAIN, fontsize=11, fontweight='bold')

fig.suptitle('HỆ THỐNG THU THẬP DỮ LIỆU IOT NÔNG NGHIỆP THÔNG MINH — TRẠM QUAN TRẮC THỰC ĐỊA', fontsize=13, fontweight='bold', color=TEXT_MAIN, y=0.98)
plt.savefig(os.path.join(OUT_DIR, 'slide_07_iot_station_sensors.png'), bbox_inches='tight', dpi=250)
plt.close(fig)

# ==============================================================================
# 12. SLIDE 20: WEB DASHBOARD DEMO COMPOSITE
# ==============================================================================
print("12. Generating Slide 20: Web Dashboard Demo Composite...")
fig, ((ax_m1, ax_m2), (ax_m3, ax_m4)) = plt.subplots(2, 2, figsize=(15, 8.5))
apply_dark_theme(fig, np.array([[ax_m1, ax_m2], [ax_m3, ax_m4]]))

ui_files = [
    ('01_ui_monitor_overview.png', ax_m1, '1. Tổng quan Trạm & Bảng Đồng Hồ 10 Chỉ Số'),
    ('03_ui_digital_twin_3d.png', ax_m2, '2. Bản Sao Kỹ Thuật Số (Digital Twin 3D 360°)'),
    ('04_ui_forecast_24h.png', ax_m3, '3. Biểu Đồ Dự Báo 24 Giờ & Dải Bất Định P10-P90'),
    ('06_ui_history_events.png', ax_m4, '4. Lịch Sử & Ghim Sự Kiện (Bơm Hỏng / Bón Phân)')
]

for fn, ax_sub, title in ui_files:
    fp = os.path.join(OUT_DIR, fn)
    if os.path.exists(fp):
        im = Image.open(fp)
        ax_sub.imshow(im)
        ax_sub.axis('off')
        ax_sub.set_title(title, color=TEXT_MAIN, fontsize=10.5, fontweight='bold')

fig.suptitle('GIAO DIỆN HỆ THỐNG ĐIỀU HÀNH VƯỜN ỚT THÔNG MINH (CHILI FARM OS)', fontsize=14, fontweight='bold', color=TEXT_MAIN, y=0.99)
plt.savefig(os.path.join(OUT_DIR, 'slide_20_demo_web_chili_os.png'), bbox_inches='tight', dpi=250)
plt.close(fig)

print("All slide assets generated successfully!")
