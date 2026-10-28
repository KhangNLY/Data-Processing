"""
Script to regenerate slide_19_model_benchmark.png and slide_15_eda_monthly_events.png:
1. slide_19_model_benchmark.png:
   - Proper 16:9 ratio (figsize=(16, 9))
   - Add exact value labels on the Seasonal-naive bar clipped at 0.45: '0.9821 (bị cắt ở 0.45) →'
   - Add clear data labels on all bars in ax1 and ax2 for crisp presentation.
2. slide_15_eda_monthly_events.png:
   - Proper 16:9 ratio (figsize=(16, 9))
   - Add explicit annotation/legend explaining why 12/2025 and 01/2026 have distinct/darker color:
     * 12/2025 & 01/2026: Giai đoạn đầu trạm triển khai thực địa & hiệu chuẩn cảm biến (12/2025 bắt đầu từ 14/12 nên có 5.184 mốc).
"""
import os
import json
import numpy as np
import matplotlib.pyplot as plt

plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.sans-serif'] = ['Segoe UI', 'Arial', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False
plt.rcParams['figure.autolayout'] = False

# Theme Colors
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

def apply_dark_theme(fig, ax):
    fig.patch.set_facecolor(BG_DARK)
    if isinstance(ax, np.ndarray):
        for a in ax.flat:
            a.set_facecolor(BG_CARD)
            a.tick_params(colors=TEXT_MUTED, labelsize=10)
            a.xaxis.label.set_color(TEXT_MAIN)
            a.yaxis.label.set_color(TEXT_MAIN)
            a.title.set_color(TEXT_MAIN)
            for spine in a.spines.values():
                spine.set_color(LINE_GRID)
            a.grid(True, linestyle='--', alpha=0.35, color=LINE_GRID)
    else:
        ax.set_facecolor(BG_CARD)
        ax.tick_params(colors=TEXT_MUTED, labelsize=10)
        ax.xaxis.label.set_color(TEXT_MAIN)
        ax.yaxis.label.set_color(TEXT_MAIN)
        ax.title.set_color(TEXT_MAIN)
        for spine in ax.spines.values():
            spine.set_color(LINE_GRID)
        ax.grid(True, linestyle='--', alpha=0.35, color=LINE_GRID)

# ==============================================================================
# 1. SLIDE 19A: MODEL BENCHMARK (ADD SEASONAL-NAIVE LABEL & 16:9)
# ==============================================================================
def gen_slide_19_benchmark():
    print("Generating Slide 19: Model Benchmark (16:9 with Seasonal-naive labels)...")
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 9))
    apply_dark_theme(fig, np.array([ax1, ax2]))

    models_disp = [
        'XGBoost [Tốt nhất]',
        'Random Forest',
        'HistGB',
        'LSTM (Học sâu)',
        'Persistence (Mốc)',
        'Seasonal-naive'
    ]
    colors_m = [COLOR_GREEN, COLOR_AMBER, COLOR_CYAN, COLOR_PURPLE, '#64748b', '#475569']

    nrmse_h1 = [0.1038, 0.1048, 0.1058, 0.1091, 0.1223, 0.9821]
    nrmse_h12 = [0.2069, 0.2164, 0.2198, 0.2679, 0.3387, 0.9821]
    skill_h12 = [(1 - val/0.3387)*100 for val in nrmse_h12]

    y = np.arange(len(models_disp))
    bars_h1 = ax1.barh(y - 0.2, nrmse_h1, height=0.36, color=COLOR_CYAN, label='Tầm h=1 (5 phút)', edgecolor=LINE_GRID)
    bars_h12 = ax1.barh(y + 0.2, nrmse_h12, height=0.36, color=COLOR_GREEN, label='Tầm h=12 (1 giờ)', edgecolor=LINE_GRID)
    ax1.set_yticks(y)
    ax1.set_yticklabels(models_disp, fontsize=10.5, fontweight='bold', color=TEXT_MAIN)
    ax1.set_xlabel('Sai số chuẩn hóa NRMSE (Thấp hơn là tốt hơn)', fontsize=11, fontweight='bold')
    ax1.set_title('A. Sai Số NRMSE Trên Tập Test Độc Lập (Tháng 8/2026)\n(So sánh 5 mô hình máy học với mốc cơ sở)', fontsize=12, fontweight='bold', pad=12)
    ax1.set_xlim(0, 0.45) # Clamped at 0.45 to show top models clearly
    ax1.legend(facecolor=BG_DARK, edgecolor=LINE_GRID, labelcolor=TEXT_MAIN, fontsize=10, loc='lower right')

    # Data labels on bars in ax1
    for idx in range(len(models_disp)):
        val_h1 = nrmse_h1[idx]
        val_h12 = nrmse_h12[idx]
        
        if idx == 5:
            # Seasonal-naive is clipped at 0.45 -> Add explicit label requested by user!
            ax1.text(0.445, idx - 0.2, f' {val_h1:.4f} [bị cắt ở 0.45] ->',
                     va='center', ha='right', color='#ffffff', fontweight='bold', fontsize=9.2,
                     bbox=dict(boxstyle='round,pad=0.2', facecolor='#dc2626', edgecolor='none'))
            ax1.text(0.445, idx + 0.2, f' {val_h12:.4f} [bị cắt ở 0.45] ->',
                     va='center', ha='right', color='#ffffff', fontweight='bold', fontsize=9.2,
                     bbox=dict(boxstyle='round,pad=0.2', facecolor='#dc2626', edgecolor='none'))
        else:
            ax1.text(val_h1 + 0.008, idx - 0.2, f'{val_h1:.4f}', va='center', color=COLOR_CYAN, fontweight='bold', fontsize=9.5)
            ax1.text(val_h12 + 0.008, idx + 0.2, f'{val_h12:.4f}', va='center', color=COLOR_GREEN, fontweight='bold', fontsize=9.5)

    # Right: Skill improvement over Persistence at h=12
    ax2.set_xticks(range(5))
    bars_sk = ax2.bar(range(5), skill_h12[:5], color=colors_m[:5], width=0.48, edgecolor=LINE_GRID, linewidth=1.5)
    ax2.set_ylabel('Độ cải thiện Skill so với Persistence (%)', fontsize=11, fontweight='bold')
    ax2.set_title('B. Mức Độ Vượt Trội (Skill) So Với Persistence Ở Tầm 1 Giờ (h=12)\n(Skill = 1 - NRMSE_model / NRMSE_persistence)', fontsize=12, fontweight='bold', pad=12)
    ax2.set_xticklabels(models_disp[:5], rotation=18, ha='right', fontsize=10, color=TEXT_MAIN)
    for b in bars_sk:
        h = b.get_height()
        if h >= 0:
            ax2.text(b.get_x() + b.get_width()/2., h + 1.2, f'+{h:.1f}%', ha='center', va='bottom', color=TEXT_MAIN, fontweight='bold', fontsize=11)
    ax2.set_ylim(0, 48)

    # Add insight box
    summary_text = (
        "KẾT LUẬN BENCHMARK MÔ HÌNH HỌC MÁY:\n"
        "------------------------------------\n"
        "• XGBoost chiến thắng áp đảo: NRMSE = 0.2069 (+38.9% Skill so với Persistence).\n"
        "• Random Forest & HistGB bám sát (+36.1% và +35.1% Skill).\n"
        "• LSTM (PyTorch): Cải thiện +20.9% Skill nhưng nhạy cảm hơn với nhiễu nông nghiệp.\n"
        "• Seasonal-naive: Sai số cao nhất (NRMSE = 0.9821) do không nắm bắt được động học đất."
    )
    ax2.text(0.48, 0.48, summary_text, transform=ax2.transAxes,
             ha='center', va='center', color='#fbbf24', fontweight='bold', fontsize=9.5, linespacing=1.5,
             bbox=dict(boxstyle='round,pad=0.6', facecolor=BG_DARK, edgecolor='#fbbf24', linewidth=1.5))

    fig.suptitle('BENCHMARK CÁC MÔ HÌNH HỌC MÁY — XGBOOST CHIẾN THẮNG ÁP ĐẢO VỚI +38.9% SKILL', fontsize=15, fontweight='bold', color=TEXT_MAIN, y=0.98)
    plt.tight_layout(rect=[0.02, 0.03, 0.98, 0.94])
    out_path = os.path.join(OUT_DIR, 'slide_19_model_benchmark.png')
    plt.savefig(out_path, dpi=250)
    plt.close(fig)
    print(f"Saved: {out_path}")

# ==============================================================================
# 2. SLIDE 15: MONTHLY EVENTS & EXPLANATION FOR 12/2025 & 01/2026 COLOR
# ==============================================================================
def gen_slide_15_monthly():
    print("Generating Slide 15: Monthly Events (16:9 with Color Explanation)...")
    fig, ax = plt.subplots(figsize=(16, 9))
    apply_dark_theme(fig, ax)

    months = ['12/2025', '01/2026', '02/2026', '03/2026', '04/2026', '05/2026', '06/2026', '07/2026', '08/2026']
    row_counts = [5184, 8928, 8064, 8928, 8640, 8928, 8640, 8928, 8928]
    
    # Colors: Cyan for first 2 months (initial deployment phase), Blue for regular train, Amber for Val, Green for Test
    colors = [COLOR_CYAN, COLOR_CYAN] + [COLOR_BLUE]*5 + [COLOR_AMBER, COLOR_GREEN]

    bars = ax.bar(months, row_counts, color=colors, width=0.55, edgecolor=LINE_GRID, linewidth=1.5)
    ax.axhline(8928, color=TEXT_MUTED, linestyle=':', alpha=0.5, lw=1.2)
    ax.set_ylabel('Số bản ghi quan sát (bước 5 phút/lần)', fontsize=11, fontweight='bold')
    ax.set_title('PHÂN BỐ BẢN GHI THEO THÁNG & CHIẾN LƯỢC CHIA TẬP CHUẨN THỜI GIAN (TIME-SERIES SPLIT)\nTổng cộng: 75.168 bản ghi — Độ phủ lưới thời gian: 100.0% — Trùng lặp: 0 — Thiếu mốc: 0', fontsize=13, fontweight='bold', pad=15)

    for b, count in zip(bars, row_counts):
        h = b.get_height()
        ax.text(b.get_x() + b.get_width()/2., h/2, f'{count:,}\nbản ghi', ha='center', va='center', color=TEXT_MAIN, fontweight='bold', fontsize=10)

    # Top Set Badges
    ax.text(2.5, 9800, 'TẬP HUẤN LUYỆN (TRAIN)\n14/12/2025 – 30/06/2026 (57.312 bản ghi — 76.2%)',
            ha='center', color=COLOR_BLUE, fontweight='bold', fontsize=10.5,
            bbox=dict(boxstyle='round,pad=0.4', facecolor=BG_DARK, edgecolor=COLOR_BLUE, linewidth=1.5))

    ax.text(7, 9800, 'VAL\n(07/2026)\n8.928 dòng',
            ha='center', color=COLOR_AMBER, fontweight='bold', fontsize=9.5,
            bbox=dict(boxstyle='round,pad=0.4', facecolor=BG_DARK, edgecolor=COLOR_AMBER, linewidth=1.5))

    ax.text(8, 9800, 'TEST ĐỘC LẬP\n(08/2026)\n8.928 dòng',
            ha='center', color=COLOR_GREEN, fontweight='bold', fontsize=9.5,
            bbox=dict(boxstyle='round,pad=0.4', facecolor=BG_DARK, edgecolor=COLOR_GREEN, linewidth=1.5))

    # EXPLANATION NOTE ON WHY 12/2025 & 01/2026 HAVE DIFFERENT / DARKER COLOR:
    explanation_box = (
        "GIẢI THÍCH MÀU SẮC PHÂN BỐ CÁC THÁNG:\n"
        "--------------------------------------------------------------------------------------------------------\n"
        "• Tháng 12/2025 & 01/2026 (Màu Xanh Cyan khác biệt): Giai đoạn đầu trạm IoT triển khai thực địa & hiệu chuẩn cảm biến.\n"
        "  - Tháng 12/2025: Trạm bắt đầu vận hành chính thức từ ngày 14/12 (18 ngày x 288 bước = đúng 5.184 mốc thời gian).\n"
        "  - Tháng 01/2026: Giai đoạn hoàn thiện kết nối Firebase và căn chỉnh vị trí quang trở.\n"
        "• Tháng 02/2026 – 06/2026 (Màu Xanh dương): Giai đoạn trạm vận hành hoàn toàn ổn định liên tục thuộc tập Train.\n"
        "• Tháng 07/2026 (Màu Vàng cam): Tập Validation phục vụ tinh chỉnh siêu tham số và ngưỡng bất định P10-P90.\n"
        "• Tháng 08/2026 (Màu Xanh lá): Tập Test độc lập vào mùa mưa thực tế (bảo đảm nguyên tắc nhân quả thời gian)."
    )
    ax.text(0.5, 0.28, explanation_box, transform=ax.transAxes,
            ha='center', va='center', color='#38bdf8', fontweight='bold', fontsize=10, linespacing=1.6,
            bbox=dict(boxstyle='round,pad=0.6', facecolor=BG_DARK, edgecolor='#38bdf8', linewidth=1.8))

    ax.set_ylim(0, 11600)
    fig.suptitle('KIỂM TOÁN LƯỚI THỜI GIAN VÀ PHÂN BỐ CÁC TẬP DỮ LIỆU ĐỒ ÁN', fontsize=15, fontweight='bold', color=TEXT_MAIN, y=0.98)
    plt.tight_layout(rect=[0.02, 0.03, 0.98, 0.94])
    out_path = os.path.join(OUT_DIR, 'slide_15_eda_monthly_events.png')
    plt.savefig(out_path, dpi=250)
    plt.close(fig)
    print(f"Saved: {out_path}")

if __name__ == '__main__':
    gen_slide_19_benchmark()
    gen_slide_15_monthly()
    print("ALL REQUESTED ASSETS REGENERATED SUCCESSFULLY!")
