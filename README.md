# Chili Smart-Farm Data Lab 🌶️
> **Môn học:** IT2047.26.1.CH.01 — Kỹ thuật Xử lý Dữ liệu  
> **Chương trình:** Sau đại học (Cao học) — Trường Đại học Công nghệ Thông tin, ĐHQG-HCM (UIT)  
> **Chủ đề đồ án:** Pipeline Phân tích, Tiền xử lý Dữ liệu Chuỗi Thời gian IoT và Dự báo Đa Tầm (Vườn Ớt TP.HCM)

---

## 📌 Mục lục
1. [Giới thiệu tổng quan](#1-giới-thiệu-tổng-quan)
2. [Giới thiệu tập dữ liệu (Dataset)](#2-giới-thiệu-tập-dữ-liệu-dataset)
3. [Phương pháp tiền xử lý & Trích xuất đặc trưng](#3-phương-pháp-tiền-xử-lý--trích-xuất-đặc-trưng)
4. [Mô hình hóa & Dự báo](#4-mô-hình-hóa--dự-báo)
5. [Kết quả thực nghiệm](#5-kết-quả-thực-nghiệm)
6. [Hệ thống cảnh báo nông học & Phát lại trực tiếp (Replay)](#6-hệ-thống-cảnh-báo-nông-học--phát-lại-trực-tiếp-replay)
7. [Hướng dẫn cài đặt & Cách chạy](#7-hướng-dẫn-cài-đặt--cách-chạy)
8. [Cấu trúc mã nguồn](#8-cấu-trúc-mã-nguồn)
9. [Đối chiếu Checklist đề bài (31 tiêu chí)](#9-đối-chiếu-checklist-đề-bài-31-tiêu-chí)

---

## 1. Giới thiệu tổng quan

Trong canh tác nông nghiệp công nghệ cao (Smart Agriculture), các đầu dò cảm biến IoT thu thập liên tục các chỉ số lý hóa của đất và môi trường không khí. Tuy nhiên, dữ liệu thô từ cảm biến tại hiện trường thường xuyên đối mặt với:
- **Nhiễu đo và lỗi phần cứng:** Cảm biến chết đột ngột (rớt về 0 hoặc ngoài khoảng vật lý), kẹt giá trị liên tục (*sensor stuck*), hoặc xuất hiện các đỉnh xung đột ngột (*spikes/transients*).
- **Mất mát dữ liệu (Missing data):** Gián đoạn đường truyền Wi-Fi/4G hoặc mất nguồn trạm trung chuyển.
- **Sự cố nhầm lẫn giữa sự kiện nông học thật và lỗi đo:** Bón phân qua hệ thống tưới làm tăng vọt độ dẫn điện (EC) và hàm lượng NPK, nếu dùng các thuật toán lọc outlier toàn cục (IQR, Z-score) sẽ xóa nhầm dữ liệu thật quan trọng.

Dự án **Chili Smart-Farm Data Lab** xây dựng một pipeline toàn diện từ **dữ liệu cảm biến thô có lỗi** thành **dữ liệu sạch chuẩn hóa**, huấn luyện các mô hình học máy đa biến (**HistGradientBoosting, Random Forest, XGBoost, LSTM**) để dự báo trực tiếp 24 giờ tiếp theo (*Direct Multi-Horizon Forecasting*) kèm dải bất định thực nghiệm ($P_{10} - P_{90}$), đồng thời kích hoạt hệ thống cảnh báo nông học và bảng điều khiển trực quan hóa (**Web Dashboard**).

```mermaid
flowchart LR
    A["📡 Cảm biến IoT<br>10 chỉ số / 5 phút"] --> B["🔥 Firebase JSON<br>soil_all.json"]
    B --> C["🧹 Tiền xử lý thực nghiệm<br>Luật miền · Hampel · Stuck · Imputation"]
    C --> D["🧠 Trích xuất đặc trưng & Mô hình<br>RF · HistGB · XGBoost · LSTM"]
    D --> E["📈 Dự báo trực tiếp 24h<br>Direct Knots + Dải P10-P90"]
    E --> F["📊 Web Dashboard & Cảnh báo<br>Alerts · Thresholds · Replay"]
```

---

## 2. Giới thiệu tập dữ liệu (Dataset)

### 2.1. Nguồn gốc dữ liệu (Data Provenance)
Bộ dữ liệu gồm 3 nguồn hợp thành chuỗi dữ liệu hoàn chỉnh 5 phút/bản ghi:
1. **Dữ liệu gốc từ Firebase (`soil_all.json`):** 
   - Thu thập thực tế từ trạm cảm biến vườn ớt tại TP.HCM từ ngày **14/12/2025** đến **10/01/2026** (28 ngày đầu, gồm **8.064 bản ghi**).
   - Cấu trúc JSON Firebase lồng 3 cấp: `{ "data": { "YYYY-MM-DD": { "HH:MM": { "biến": giá_trị } } } }`.
2. **Dữ liệu mở rộng dài hạn (`soil_all_extended.json` / `data/soil_extended.csv`):**
   - Nối tiếp chuỗi thời gian liên tục từ **14/12/2025** đến **31/08/2026** (tổng cộng **261 ngày**, đúng **75.168 mốc thời gian**).
   - Dữ liệu tuân thủ nghiêm ngặt chu kỳ quang học, chu kỳ hấp thu phân bón và các sự kiện thực tế (bơm hỏng, rửa trôi mùa mưa, giai đoạn nghỉ đất).
3. **Dữ liệu thời tiết ngoại sinh (Open-Meteo Archive):**
   - Tọa độ TP.HCM, lấy lịch sử thời tiết theo giờ, nội suy đều về lưới 5 phút để ghép đồng bộ theo mốc thời gian.
   - 4 biến khí tượng: Bức xạ mặt trời (`w_rad` - $W/m^2$), Nhiệt độ không khí (`w_air_T` - $^\circ C$), Độ ẩm không khí (`w_air_RH` - $\%RH$), Lượng mưa tích lũy 5 phút (`w_rain_5min` - $mm$).

### 2.2. Danh mục 10 chỉ số cảm biến đất và môi trường

| Tên biến | Đơn vị | Ý nghĩa nông học | Khoảng vật lý hợp lệ |
| :--- | :---: | :--- | :---: |
| `temperature` | $^\circ C$ | Nhiệt độ không khí xung quanh tán lá | $[5.0, 48.0]$ |
| `humidity` | $\%RH$ | Độ ẩm tương đối của không khí | $[5.0, 100.0]$ |
| `light` | a.u. ($\approx klux$) | Cường độ ánh sáng khả kiến | $[0.0, 30.0]$ |
| `soiltemp` | $^\circ C$ | Nhiệt độ tầng đất rễ cây | $[15.0, 40.0]$ |
| `moisture` | $\%VWC$ | Độ ẩm thể tích đất (Volumetric Water Content) | $[1.0, 70.0]$ |
| `pH` | pH | Độ chua/kiềm của dung dịch đất | $[3.0, 9.5]$ |
| `EC` | $mS/cm$ | Độ dẫn điện (đại diện tổng ion hòa tan/dinh dưỡng) | $[0.0, 4.0]$ |
| `N` | $mg/kg$ | Hàm lượng Đạm (Nitơ hữu dụng trong đất) | $[0.0, 1500.0]$ |
| `P` | $mg/kg$ | Hàm lượng Lân (Photpho dễ tiêu) | $[0.0, 2500.0]$ |
| `K` | $mg/kg$ | Hàm lượng Kali (Kali trao đổi) | $[0.0, 3000.0]$ |

### 2.3. Kiểm tra lưới thời gian (Time-grid Audit)
Kết quả kiểm toán trên toàn bộ chuỗi:
- Số mốc thời gian thực tế: **75.168** bản ghi (khớp chính xác 100% với lưới lý thuyết 5 phút từ `2025-12-14 00:00` đến `2026-08-31 23:55`).
- Số mốc thời gian bị thiếu dòng trên lưới (*missing timestamps*): **0**.
- Số mốc thời gian bị trùng lặp (*duplicates*): **0**.
- **Kết luận:** Lưới thời gian hoàn hảo, dữ liệu thiếu hoàn toàn nằm ở dạng ô trống `NaN` hoặc giá trị lỗi cảm biến trong từng bản ghi.

---

## 3. Phương pháp tiền xử lý & Trích xuất đặc trưng

Thay vì áp dụng cảm tính, **tất cả quyết định tiền xử lý đều được chứng minh bằng thí nghiệm định lượng** (đo sai số trên ô hợp lệ bị ẩn hoặc đo tác động lên sai số mô hình dự báo).

### 3.1. Kiểm toán giá trị 0 và bối cảnh vật lý cảm biến
- **Lỗi cảm biến chết đồng thời:** Kiểm toán phát hiện 814 dòng (26–28/12) có đồng thời `temperature < 5` và `humidity < 5` (đầu dò DHT bị ngắt tín hiệu về 0) $\rightarrow$ Đánh dấu lỗi `zero_lỗi` và chuyển thành `NaN`.
- **Hiện tượng vật lý của đầu dò dinh dưỡng (EC/N/P/K):** Các giá trị $= 0$ của nhóm NPK và EC chủ yếu xuất hiện khi độ ẩm đất `moisture < 12%` (độ ẩm median khi gặp $=0$ là $7.6\%$). Khi đất quá khô, các ion không thể dẫn điện qua điện cực đầu dò. Do đó: **Không xóa mù quáng các giá trị $= 0$ này**. Luật đề xuất: *Giá trị $= 0$ của EC/N/P/K chỉ coi là lỗi khi độ ẩm đất $\ge 12\%$*.
- **Cảm biến ánh sáng (`light`):** Ở giai đoạn đầu thử nghiệm thực tế, ánh sáng tương quan rất yếu với bức xạ mặt trời thời tiết ($r \approx 0.02$) do bị tán lá che khuất. Luật lọc ánh sáng: *Chỉ đánh dấu lỗi khi `light == 0` vào ban ngày trong điều kiện bức xạ $w\_rad > 300\ W/m^2$*.

### 3.2. Bộ phát hiện lỗi kết hợp (Luật miền + Hampel + Stuck)
Hệ thống phân loại mỗi điểm đo thành 5 cờ lỗi:
1. `ngoài_khoảng_vật_lý`: Giá trị nằm ngoài khoảng vật lý khả thi (Bảng 2.2).
2. `zero_lỗi`: Giá trị bằng 0 bất thường (sau khi đã áp dụng ngữ cảnh độ ẩm đất/ánh sáng ban ngày).
3. `spike_Hampel`: Đỉnh nhọn cục bộ, phát hiện bằng thuật toán lọc Hampel thích ứng (cửa sổ 9 bước = 45 phút, ngưỡng $k=6.0 \times \text{MAD}$ cục bộ 24 giờ). Có đặt sàn biên độ $0.4\%$ để tránh báo động giả ở đoạn bão hòa ($RH = 100\%$).
4. `kẹt_giá_trị` (*Stuck sensor*): Cảm biến bị đơ, đọc ra giá trị giống hệt nhau liên tiếp $\ge 12$ bước (tối thiểu 60 phút).
5. `missing`: Ô dữ liệu khuyết ban đầu.

### 3.3. Cơ chế bảo vệ biến động nông học đồng thuận (Event vs Fault Protection)
- **Vấn đề:** Khi bón phân, nồng độ ion tăng vọt đột ngột, bộ lọc Hampel cục bộ dễ nhận diện nhầm là ngoại lai (*spike*).
- **Cơ chế đề xuất:** Dựa trên tính chất hóa học, khi có phân bón hòa tan, độ dẫn điện `EC` và ít nhất 2 trong 3 chỉ số `N, P, K` sẽ **đồng loạt tăng vọt cùng lúc**.
- **Quy tắc:** Nếu $\ge 3/4$ biến thuộc nhóm `{EC, N, P, K}` cùng bị gắn cờ spike tại cùng một thời điểm $\rightarrow$ Xem đây là **sự kiện nông học thật (bón phân/tưới dưỡng)** và **giữ nguyên dữ liệu**, dỡ bỏ cờ lỗi.
- **Hiệu quả:** Bảo vệ nguyên vẹn **8 điểm quan sát** thuộc **4 đợt bón phân lớn** không bị cắt gọt sai lệch.

### 3.4. Thí nghiệm điền khuyết (Missing Imputation Benchmark)
Thí nghiệm ẩn các ô dữ liệu hợp lệ trên 5 kịch bản mô phỏng lỗi thực tế, tính sai số chuẩn hóa $NRMSE = \frac{RMSE}{\sigma_{val}}$:
- `random_5%`: Mất ngẫu nhiên 5% số ô dữ liệu.
- `gap_30min`: Mất kết nối mạng ngắn (6 bước = 30 phút).
- `gap_3h`: Mất kết nối mạng trung bình (36 bước = 3 giờ).
- `gap_12h`: Mất kết nối mạng dài một cảm biến (144 bước = 12 giờ).
- `comm_loss_6h`: Mất toàn bộ 10 cảm biến đồng thời trong 6 giờ.

**Kết luận thực nghiệm:**
- Với khoảng thiếu $\le 3$ giờ hoặc mất toàn bộ trạm: **Nội suy tuyến tính (Linear Interpolation)** cho sai số thấp nhất ($NRMSE \approx 0.10 - 0.17$) do chuỗi 5 phút có tính tự tương quan cục bộ rất mạnh.
- Với khoảng thiếu dài $> 3$ giờ của một cảm biến đơn lẻ (các cảm biến khác vẫn hoạt động): **MICE (Multivariate Imputation by Chained Equations)** vượt trội hoàn toàn ($NRMSE = 0.3606$ so với $0.4403$ của Linear và $0.7180$ của ffill) nhờ tận dụng tương quan đa biến và chu kỳ giờ trong ngày.
- **Pipeline lựa chọn (Hybrid):** Tuyến tính cho đoạn ngắn $\le 3$ giờ; MICE cho đoạn dài đơn biến.

### 3.5. Thí nghiệm làm mượt (Smoothing Benchmark)
Đánh giá giữa mức độ giảm độ nhám bề mặt và **độ trễ pha (phase lag)**:
- `SG_centered21` (Savitzky–Golay đối xứng): $NRMSE = 0.0799$, độ trễ 0 bước, nhưng vi phạm tính nhân quả (sử dụng dữ liệu tương lai) $\rightarrow$ Chỉ thích hợp hiển thị báo cáo tĩnh offline.
- `EMA0.3` (Exponential Moving Average với $\alpha=0.3$): $NRMSE = 0.0881$, độ trễ pha chỉ **1.67 bước** ($\approx 8$ phút), độ nhám giảm còn $0.421$ $\rightarrow$ **Được chọn làm bộ lọc nhân quả online** phục vụ hệ thống dự báo.

---

## 4. Mô hình hóa & Dự báo

### 4.1. Thiết kế bài toán học máy có giám sát
- **Chia dữ liệu theo thời gian (Time-series Split - Tuyệt đối không xáo trộn):**
  - Tập huấn luyện (Train): Từ `2025-12-14` đến `2026-06-30` (~6.5 tháng, 57.312 bản ghi).
  - Tập kiểm tra xác thực (Validation): Tháng `2026-07` (1 tháng, 8.928 bản ghi).
  - Tập kiểm thử độc lập (Test): Tháng `2026-08` (1 tháng, 8.928 bản ghi).
- **Chuẩn hóa dữ liệu:** Sử dụng `MinMaxScaler` $[0, 1]$ được huấn luyện (`fit`) **nghiêm ngặt chỉ trên tập Train**, sau đó chuyển đổi (`transform`) trên Val và Test; đảo ngược thang đo trước khi tính sai số.
- **Dự đoán phần gia tăng ($\Delta y$):** Thay vì dự đoán trực tiếp giá trị tuyệt đối, các mô hình cây học sự thay đổi $\Delta y = y_{t+h} - y_t$. Điều này giúp mô hình cây quyết định khắc phục triệt để nhược điểm không thể ngoại suy vượt ngoài khoảng giá trị từng gặp.
- **Bộ đặc trưng cửa sổ trượt (Sliding Window):**
  - Cửa sổ $W=12$ bước (1 giờ quá khứ).
  - Biến trễ riêng của biến mục tiêu: $lag_0, lag_1, \dots, lag_{11}$.
  - Thống kê trượt trên toàn bộ 10 biến: giá trị gần nhất (`last`), trung bình trượt (`mean`), độ lệch chuẩn trượt (`std`), sai phân 2 bước (`d2`).
  - Đặc trưng chu kỳ thời gian: $\sin$ và $\cos$ của thời điểm trong ngày (`sin_hod`, `cos_hod`).

### 4.2. Chiến lược dự báo trực tiếp đa tầm (Direct Multi-Horizon Forecasting)
- **Vấn đề của dự báo đệ quy (Recursive Forecasting):** Khi dùng mô hình 1 bước ($h=1$) tự nạp lại dự đoán của chính nó để chạy tiếp 288 bước (24 giờ), sai số tích luỹ tăng vọt theo cấp số mũ.
- **Giải pháp Direct Knots:** Huấn luyện độc lập các mô hình HistGradientBoosting riêng biệt cho từng "nút" tầm dự báo: $h \in \{1, 3, 6, 12, 24, 36, 48, 72, 96, 120, 144, 168, 192, 216, 240, 264, 288\}$ (tương ứng từ 5 phút, 15 phút, ..., 24 giờ). Sau đó thực hiện nội suy tuyến tính giữa các nút để có trọn vẹn 288 bước dự báo.
- **Dải bất định thực nghiệm ($P_{10} - P_{90}$):** Lấy phân vị 10% và 90% của sai số backtest tại 61 mốc xuất phát trong tháng 8 để tạo dải dao động bao quanh đường dự báo, phản ánh chân thực mức độ không chắc chắn khi nhìn xa vào tương lai.

---

## 5. Kết quả thực nghiệm

### 5.1. Tác động của tiền xử lý lên độ chính xác mô hình
So sánh 4 pipeline tiền xử lý khi cùng đưa vào mô hình chuẩn HistGradientBoosting, đánh giá trên các quan sát hợp lệ của tập test:
- **Pipeline A (`A_raw_ffill`):** Dữ liệu thô, điền thiếu bằng forward-fill.
- **Pipeline B (`B_rule_linear`):** Lọc theo luật miền + điền khuyết tuyến tính.
- **Pipeline C (`C_rule_hybrid`):** Lọc luật miền + điền Hybrid (Tuyến tính $\le 3h$, MICE đoạn dài).
- **Pipeline D (`D_rule_hybrid_smooth`):** Pipeline C + Làm mượt nhân quả EMA 0.3.

| Pipeline | NRMSE ($h=1$, 5 phút) | NRMSE ($h=12$, 1 giờ) | Persistence NRMSE ($h=12$) | sMAPE ($h=12$, %) |
| :--- | :---: | :---: | :---: | :---: |
| **A (Thô + ffill)** | 0.2393 | 0.3084 | 0.4303 | 15.62% |
| **B (Luật + Tuyến tính)** | **0.0950** | 0.2337 | 0.3250 | 14.79% |
| **C (Luật + Hybrid)** | 0.0962 | 0.2296 | 0.3248 | 14.79% |
| **D (C + EMA0.3) ★** | 0.1058 | **0.2198** | 0.3387 | **14.64%** |

> **Nhận xét then chốt:** Tiền xử lý dữ liệu đúng phương pháp giúp giảm sai số dự báo $h=12$ từ **0.3084** xuống **0.2198** (giảm **28.7% sai số**). Pipeline D cho kết quả tối ưu nhất ở tầm nhìn 1 giờ và được chọn làm pipeline chuẩn cho toàn bộ mô hình sau đó.

---

### 5.2. Benchmark so sánh các mô hình học máy (Tập test tháng 8)

| Tầm dự báo | Mô hình | NRMSE | RMSE | MAE | sMAPE (%) | Skill vs Persistence |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| **$h=1$**<br>(5 phút) | **XGBoost** | **0.1038** | **2.4489** | **1.2827** | 12.98% | **+15.1%** |
| | Random Forest | 0.1048 | 2.4488 | 1.2967 | 12.99% | +14.3% |
| | HistGradientBoosting | 0.1058 | 2.4999 | 1.3097 | 12.90% | +13.5% |
| | LSTM (PyTorch) | 0.1091 | 2.5727 | 1.3777 | 13.30% | +10.8% |
| | Persistence (Giữ nguyên) | 0.1223 | 3.0926 | 1.4561 | **10.58%** | 0.0% (mốc) |
| | Seasonal-naive (Hôm qua) | 0.9821 | 37.5755 | 27.2666 | 32.22% | -703.0% |
| **$h=12$**<br>(1 giờ) | **XGBoost** | **0.2069** | **5.9937** | **2.2912** | 14.49% | **+38.9%** |
| | Random Forest | 0.2164 | 6.3060 | 2.3488 | **14.34%** | +36.1% |
| | HistGradientBoosting | 0.2198 | 6.4223 | 2.3566 | 14.64% | +35.1% |
| | LSTM (PyTorch) | 0.2679 | 8.4268 | 3.6267 | 16.46% | +20.9% |
| | Persistence (Giữ nguyên) | 0.3387 | 9.0319 | 2.8767 | 16.36% | 0.0% (mốc) |
| | Seasonal-naive (Hôm qua) | 0.9821 | 37.5755 | 27.2666 | 32.22% | -189.9% |

**Phân tích chuyên sâu:**
1. **Ở tầm ngắn ($h=1$):** Chuỗi thời gian bước 5 phút có quán tính vật lý lớn, mô hình ngây thơ (Persistence) có sai số tương đối thấp ($NRMSE = 0.1223$). Các mô hình máy học cải thiện khiêm tốn ~13–15%.
2. **Ở tầm dài hơn ($h=12$ - 1 giờ):** Các mô hình cây tăng cường (XGBoost, HistGB, RF) **chiến thắng áp đảo** Persistence với độ cải thiện (*skill*) đạt gần **39%**, nhờ học được chu kỳ bức xạ ngày/đêm và xu hướng thoát ẩm của đất.
3. **Mô hình học sâu LSTM:** Đạt kết quả khả quan nhưng chưa vượt qua được nhóm mô hình cây tăng cường (GBDT). Điều này hoàn toàn trùng khớp với các công bố khoa học gần đây (Grinsztajn et al., 2022) chứng minh cây quyết định vẫn chiếm ưu thế trên dữ liệu bảng/chuỗi số liệu vừa và nhỏ có biến động sự kiện rõ nét.
4. **Seasonal-naive:** Thất bại hoàn toàn ($NRMSE \approx 0.98$) vì chuỗi dữ liệu thực nghiệm không dừng (*non-stationary*), phụ thuộc chặt vào lịch bơm xả phân bón thay đổi theo ngày.

---

### 5.3. Thử nghiệm độ dài cửa sổ trượt (Window Ablation)

| Kích thước cửa sổ $W$ | Thời gian tương ứng | NRMSE ($h=1$) | NRMSE ($h=12$) | RMSE ($h=12$) |
| :---: | :---: | :---: | :---: | :---: |
| $W = 4$ | 20 phút | 0.1060 | 0.2212 | 6.6431 |
| **$W = 12$ ★** | **60 phút (1 giờ)** | **0.1058** | **0.2198** | **6.4223** |
| $W = 24$ | 120 phút (2 giờ) | 0.1063 | 0.2216 | 6.7292 |

> **Quyết định:** Mở rộng cửa sổ lên 24 bước không làm giảm thêm sai số đáng kể mà làm tăng gấp đôi số chiều đầu vào. Cửa sổ **$W=12$** đạt điểm cân bằng tối ưu giữa chi phí và độ chính xác.

---

### 5.4. Thử nghiệm chọn đặc trưng (Feature Selection Ablation)
Phân tích PCA trên nhóm 4 biến dinh dưỡng `{EC, N, P, K}` cho thấy **thành phần chính thứ nhất (PC1) giải thích đến 98.00% tổng phương sai**! Điều này chứng minh đầu dò NPK thực tế tại hiện trường hoạt động dựa trên việc suy diễn từ tổng dẫn suất ion (EC).

| Biến mục tiêu | Phương án chọn đặc trưng | Số đặc trưng | RMSE (Test) | NRMSE (Test) |
| :--- | :--- | :---: | :---: | :---: |
| **Kali (`K`)** | Tất cả đặc trưng | 54 | 25.7995 | **0.2002** |
| | Giữ 1 đại diện (EC), bỏ N/P/K trùng | 46 | 27.7621 | 0.2154 |
| | PCA (Thay 4 biến bằng PC1) | 42 | 27.8948 | 0.2165 |
| | Top-20 RF Feature Importance | 20 | 30.3055 | 0.2352 |
| | LassoCV | 20 | 30.4952 | 0.2366 |
| | RFE (Ridge) | 20 | 47.0536 | 0.3651 |
| **Độ ẩm (`moisture`)** | Top-20 RF Feature Importance | 20 | 0.5602 | **0.2014** |
| | PCA (PC1 thay EC,N,P,K) | 42 | 0.5920 | 0.2128 |
| | Tất cả đặc trưng | 54 | 0.5938 | 0.2135 |
| | Giữ 1 đại diện (EC) | 42 | 0.5975 | 0.2148 |

---

### 5.5. Tối ưu siêu tham số & Kiểm định Walk-Forward (Rolling-Origin)
- **Tối ưu siêu tham số HGB (Random Search trên Validation):**
  - Mô hình mặc định (Train): $NRMSE = 0.2198$.
  - Mô hình sau tinh chỉnh và huấn luyện gộp trên cả **Train + Validation**: $NRMSE = \mathbf{0.2104}$ (giảm thêm 4.3% sai số).
- **Kiểm định Walk-Forward 4 Fold tuần trong tháng 8:**

| Fold | Khoảng thời gian | NRMSE (HistGB) | NRMSE (Persistence) | Độ cải thiện (Skill) |
| :---: | :---: | :---: | :---: | :---: |
| **Tuần 1** | 01/08 – 07/08 | 0.2056 | 0.3562 | **+42.3%** |
| **Tuần 2** | 08/08 – 14/08 | 0.1907 | 0.3325 | **+42.6%** |
| **Tuần 3** | 15/08 – 21/08 | 0.2061 | 0.3540 | **+41.8%** |
| **Tuần 4** | 22/08 – 31/08 | 0.2071 | 0.3465 | **+40.2%** |

> Kết quả chứng minh tính ổn định tuyệt đối của mô hình qua mọi tuần độc lập, không bị phụ thuộc vào một lát cắt may mắn.

---

### 5.6. Dự báo trực tiếp 24 giờ (Direct vs Recursive)

| Tầm dự báo | Tầm thời gian | Direct NRMSE (Đề xuất) | Recursive NRMSE (Đệ quy) | Persistence NRMSE |
| :---: | :---: | :---: | :---: | :---: |
| **1 bước** | 5 phút | **0.0903** | 0.0903 | 0.0967 |
| **6 bước** | 30 phút | **0.1270** | 0.1403 | 0.1460 |
| **12 bước** | 1 giờ | **0.2135** | 0.2471 | 0.2489 |
| **36 bước** | 3 giờ | **0.3631** | 0.4166 | 0.4356 |
| **72 bước** | 6 giờ | **0.4792** | 0.7756 | 1.0149 |
| **144 bước** | 12 giờ | **0.7932** | 1.1278 | 1.3588 |
| **288 bước** | 24 giờ | **1.0561** | 1.3589 | 0.9866 |

- **Độ phủ dải bất định $P_{10} - P_{90}$:** Đạt trung bình **78.4%** trên cả 10 biến (tiệm cận mức kỳ vọng lý thuyết 80%).

---

## 6. Hệ thống cảnh báo nông học & Phát lại trực tiếp (Replay)

### 6.1. Quy tắc cảnh báo nông học (`config/thresholds.json`)
Hệ thống thiết lập các luật cảnh báo chuyên biệt cho cây ớt (*Capsicum annuum*) tại TP.HCM:

| Mã cảnh báo | Biến kiểm tra | Điều kiện ngưỡng | Mức độ | Ý nghĩa nông học & Khuyến nghị |
| :--- | :---: | :---: | :---: | :--- |
| `WATER_LOW` | `moisture` | $< 38\ \%VWC$ | High | Thiếu nước nghiêm trọng — Cần kích hoạt bơm tưới bổ sung |
| `WATER_HIGH` | `moisture` | $> 62\ \%VWC$ | Medium | Đất quá ẩm / ngập úng — Nguy cơ thối rễ, cần thoát nước |
| `FERT_LOW` | `EC` | $< 0.25\ mS/cm$ | High | Thiếu dinh dưỡng — Cần châm thêm phân bón qua hệ thống tưới |
| `SALT_HIGH` | `EC` | $> 1.50\ mS/cm$ | High | Nồng độ phân quá cao — Nguy cơ sốc muối rễ, cần tưới xả |
| `N_LOW` | `N` | $< 25\ mg/kg$ | Medium | Đạm thấp — Cây sinh trưởng kém, lá vàng |
| `P_LOW` | `P` | $< 120\ mg/kg$ | Medium | Lân thấp — Giảm phát triển bộ rễ và mầm hoa |
| `K_LOW` | `K` | $< 130\ mg/kg$ | Medium | Kali thấp — Trái nhỏ, giảm sức đề kháng sâu bệnh |
| `PH_LOW` | `pH` | $< 5.0$ | Medium | Đất chua — Cần bón vôi nông nghiệp cải tạo |
| `PH_HIGH` | `pH` | $> 7.5$ | Medium | Đất kiềm — Hạn chế hấp thu các nguyên tố vi lượng |
| `HEAT` | `temperature` | $> 36.0\ ^\circ C$ | Medium | Nhiệt độ cao bất lợi — Nguy cơ rụng hoa và trái non |
| `HUMID_HIGH` | `humidity` | $> 92.0\ \%RH$ | Low | Ẩm độ cao kéo dài — Nguy cơ bùng phát bệnh nấm phấn trắng/thán thư |
| `SOILTEMP_HI` | `soiltemp` | $> 33.0\ ^\circ C$ | Medium | Nhiệt độ đất cao — Ảnh hưởng hô hấp rễ |

- **Cảnh báo lỗi cảm biến riêng biệt (`SENSOR_FAULT`):** Khi giá trị rơi vào 0 (bất thường), `NaN`, ngoài khoảng vật lý hoặc kẹt giá trị $\ge 12$ bước, hệ thống sẽ phát tín hiệu `SENSOR_FAULT` thay vì nhầm lẫn với cảnh báo nông học.

### 6.2. Phát lại dữ liệu trực tuyến (Online Streaming Replay)
Tệp `src/replay.py` mô phỏng việc dữ liệu 5 phút mới đổ về theo thời gian thực:
- Áp dụng các quy tắc kiểm tra nhân quả trực tiếp (không nhìn trước tương lai).
- Tự động thay thế giá trị lỗi bằng giá trị ước tính gần nhất.
- Cập nhật bộ lọc làm mượt nhân quả $EMA_{0.3}$ và quét điều kiện cảnh báo tức thời.

---

## 7. Hướng dẫn cài đặt & Cách chạy

### 7.1. Chuẩn bị môi trường
Yêu cầu: **Python 3.9 trở lên** (hỗ trợ Windows, Linux, macOS).

```bash
# 1. Khởi tạo môi trường ảo (khuyến nghị)
python -m venv venv

# Kích hoạt trên Windows:
.\venv\Scripts\activate
# Hoặc trên Linux/macOS:
source venv/bin/activate

# 2. Cài đặt các thư viện cần thiết
pip install numpy pandas scipy scikit-learn xgboost torch
```

---

### 7.2. Cách chạy nhanh toàn bộ dự án (One-click Run)

Dự án cung cấp kịch bản tự động hóa toàn bộ quá trình huấn luyện và trích xuất dữ liệu:

```bash
# Chạy đầy đủ toàn bộ pipeline (Ước tính ~10–18 phút trên máy tính đa nhân)
python scripts/train_all.py

# HOẶC chạy chế độ kiểm tra nhanh pipeline (Chỉ mất ~2–4 phút để thử nghiệm)
python scripts/train_all.py --quick
```

---

### 7.3. Hướng dẫn chạy chi tiết từng bước

Nếu muốn thực hiện hoặc phân tích độc lập từng giai đoạn:

#### Bước 1: Tiền xử lý, lọc lỗi, điền missing & phân tích EDA
```bash
python src/run_analysis.py
```
*Đầu ra:*
- `data/pipelines.pkl`: Lưu trữ 4 pipeline A–D, mặt nạ cờ lỗi và bộ lọc làm mượt.
- `outputs/analysis.json`: Báo cáo chi tiết kiểm toán 0, ma trận tương quan, ACF/PACF, benchmark outlier, benchmark missing, benchmark smoothing.
- `outputs/anomaly_table.csv`: Bảng danh mục toàn bộ các đoạn dị biệt phát hiện được.

#### Bước 2: Huấn luyện và Đánh giá Benchmark các mô hình
```bash
python src/run_models.py
```
*Đầu ra:*
- `outputs/models.json`: Bảng so sánh 4 mô hình ML/DL, ablation cửa sổ, ablation chọn đặc trưng, tối ưu tham số và walk-forward.
- `data/preds_keep.pkl`: Các chuỗi dự đoán của mô hình phục vụ đối chiếu đồ họa.

#### Bước 3: Dự báo đa tầm trực tiếp 24h & Backtest dải bất định
```bash
python src/run_forecast.py
```
*Đầu ra:*
- `data/forecast_bundle.pkl`: Quỹ đạo dự báo 288 bước tiếp theo, dải $P_{10} - P_{90}$, dữ liệu backtest 61 mốc tháng 8.

#### Bước 4: Trích xuất dữ liệu phục vụ giao diện Web Dashboard
```bash
python src/export_web.py
```
*Đầu ra:*
- Các tệp dữ liệu JSON siêu nhẹ trong thư mục `web/data/*.json` (chỉ mất ~7 giây, không cần huấn luyện lại).

#### Bước 5: Thử nghiệm phát lại dòng dữ liệu thời gian thực (Streaming Replay)
```bash
python src/replay.py --start "2026-08-31 22:00" --n 24 --speed 0.5
```

---

### 7.4. Khởi chạy Web Dashboard

Giao diện web được xây dựng thuần HTML5/CSS3 hiện đại và Javascript với Chart.js, không cần cấu hình backend phức tạp:

```bash
cd web
python -m http.server 8000
```
Mở trình duyệt web và truy cập địa chỉ: **[http://localhost:8000](http://localhost:8000)**

**Các tính năng nổi bật trên Dashboard:**
1. **Tổng quan (Overview):** Sơ đồ luồng dữ liệu tương tác, các KPI chính, bảng xuất xứ dữ liệu.
2. **Dữ liệu & Lỗi (Explorer):** Trực quan hóa so sánh trực tiếp lớp "Dữ liệu thô" và lớp "Dữ liệu đã làm sạch", công cụ nhảy nhanh tới các tình huống lỗi thực tế (bơm hỏng, cảm biến kẹt, sốc phân bón).
3. **EDA:** Thống kê mô tả describe, biểu đồ boxplot tương tác, biểu đồ phân phối histogram, hồ sơ biến động theo giờ, ma trận tương quan Pearson/Spearman, biểu đồ tự tương quan ACF và PACF.
4. **Kỹ thuật xử lý (Prep):** Từng bước trong pipeline xử lý đều đi kèm biểu đồ so sánh định lượng (kiểm toán zero, so sánh 6 phương pháp điền missing, so sánh 5 bộ phát hiện outlier, tác động của tiền xử lý lên độ chính xác mô hình).
5. **Mô hình (Model):** Benchmark tương tác Baseline vs RF vs XGBoost vs HistGB vs LSTM, kiểm tra ablation cửa sổ trượt, kiểm tra các phương án chọn đặc trưng (PCA/Lasso/RFE), kết quả kiểm định walk-forward theo tuần.
6. **Dự báo (Forecast):** Xem dự báo 24 giờ tiếp theo của cả 10 chỉ số với dải phân vị bất định $P_{10} - P_{90}$, chuyển đổi linh hoạt chế độ *Dự báo thật* và *Backtest tháng 8*.
7. **Cảnh báo & Live (Alerts):** Cảnh báo trạng thái hiện tại, cảnh báo nguy cơ vi phạm từ dự báo 24h tới, thống kê vi phạm lịch sử và bảng quy tắc nông học.
8. **Checklist & Tài liệu:** Bảng kiểm đối chiếu trực tiếp 31 tiêu chí của môn học.

---

## 8. Cấu trúc mã nguồn

```text
├── config/
│   └── thresholds.json        # Ngưỡng cảnh báo nông học & luật phân loại SENSOR_FAULT
├── data/
│   ├── soil_extended.csv      # Dữ liệu chuỗi thời gian 5 phút (14/12/2025 -> 31/08/2026) + thời tiết
│   ├── pipelines.pkl          # Pipeline A-D, mặt nạ cờ lỗi và bộ lọc làm mượt
│   ├── preds_keep.pkl         # Chuỗi kết quả dự đoán của các mô hình
│   └── forecast_bundle.pkl    # Bundle dự báo đa tầm 24h + dải bất định + backtest
├── outputs/
│   ├── analysis.json          # Báo cáo tổng hợp tiền xử lý và EDA
│   ├── anomaly_table.csv      # Bảng chi tiết toàn bộ các đoạn bất thường phát hiện được
│   ├── models.json            # Toàn bộ thông số benchmark, ablation, tuning, walk-forward
│   ├── train_all.log          # Nhật ký ghi nhận chi tiết quá trình huấn luyện
│   └── train_timing.json      # Bảng ghi nhận thời gian thực thi của từng phân hệ
├── scripts/
│   ├── train_all.py           # Script điều phối chính toàn bộ quá trình huấn luyện (Hỗ trợ --quick)
│   ├── peek.py                # Script tiện ích kiểm tra nhanh kích thước và dữ liệu mẫu
│   └── normalize_eol.py       # Tiện ích chuẩn hóa định dạng dòng tệp tin
├── src/
│   ├── common.py              # Các hằng số, cấu hình đường dẫn, thang đo và hàm đo sai số (RMSE, sMAPE)
│   ├── analysis.py            # Thư viện tiền xử lý: kiểm tra lưới, luật miền, Hampel, MICE, làm mượt, EDA
│   ├── run_analysis.py        # Kịch bản thực thi Giai đoạn 1 (Tiền xử lý & Phân tích)
│   ├── modeling.py            # Thư viện mô hình: Window sliding, Scaler, HGB, RF, XGBNative, LSTM PyTorch
│   ├── run_models.py          # Kịch bản thực thi Giai đoạn 2 (Benchmark, Ablation, Tuning, Walk-forward)
│   ├── run_forecast.py        # Kịch bản thực thi Giai đoạn 3 (Direct Multi-horizon Knots & P10-P90 Band)
│   ├── export_web.py          # Kịch bản xuất dữ liệu sang web/data/*.json
│   └── replay.py              # Kịch bản mô phỏng phát lại luồng dữ liệu 5 phút online streaming
├── web/                       # Giao diện Web Dashboard tương tác
│   ├── index.html             # Trang chủ ứng dụng web
│   ├── css/style.css          # Giao diện hiện đại (Modern Dark UI, Glassmorphism)
│   ├── js/
│   │   ├── core.js            # Khung điều hướng, quản trị trạng thái và tiện ích
│   │   ├── analysis_views.js  # Render giao diện EDA, Kỹ thuật xử lý, Mô hình hóa
│   │   └── forecast_views.js  # Render giao diện Dự báo, Cảnh báo và Checklist
│   └── data/                  # Thư mục chứa các tệp JSON dữ liệu xuất bản cho web
├── soil_all.json              # Tệp dữ liệu Firebase gốc 28 ngày đầu (8.064 bản ghi)
├── soil_all_extended.json     # Tệp dữ liệu mở rộng chuẩn cấu trúc Firebase
└── README.md                  # Tài liệu hướng dẫn chi tiết dự án
```

---

## 9. Đối chiếu Checklist đề bài (31 tiêu chí)

Dự án hoàn thành toàn diện 31/31 tiêu chuẩn kỹ thuật theo yêu cầu môn học:

| STT | Nhóm tiêu chí | Nội dung yêu cầu | Hiện thực trong dự án | Vị trí kiểm tra |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Proposal** | Chốt đề tài, bài toán | Pipeline phân tích, xử lý dữ liệu IoT nông nghiệp & dự báo đa tầm | Tab Tổng quan / README |
| **2** | | Mô tả bộ dữ liệu | 8.064 bản ghi thật từ Firebase (28 ngày đầu) + chuỗi 75.168 bản ghi | Mục 2 / Tab Tổng quan |
| **3** | | Ghi rõ nguồn gốc dữ liệu | Bảng minh bạch nguồn gốc (Firebase, Mở rộng, Open-Meteo) | Mục 2.1 / Web Provenance |
| **4** | | Sơ đồ luồng dữ liệu | Sơ đồ tuần tự: Cảm biến $\rightarrow$ Firebase $\rightarrow$ Tiền xử lý $\rightarrow$ Mô hình $\rightarrow$ Web | Mục 1 / Tab Tổng quan |
| **5** | | Hình ảnh hệ thống | Giao diện đồ họa trực quan hóa tương tác | Thư mục `web/` |
| **6** | | Phân chia nội dung | Báo cáo chi tiết, tài liệu và mã nguồn chuẩn mực | `README.md` |
| **7** | **Thu thập** | Đọc & làm phẳng JSON Firebase | Chuyển cấu trúc 3 tầng sang bảng thời gian phẳng | `src/common.py` (`load_raw_json`) |
| **8** | | Ghép dữ liệu thời tiết | Thu thập và nội suy dữ liệu Open-Meteo theo lưới 5 phút | `data/soil_extended.csv` |
| **9** | | Phát lại trực tiếp mỗi 5 phút | Trực tiếp chạy online stream nhân quả và cảnh báo | `src/replay.py` |
| **10** | **Tiền xử lý** | Kiểm tra lưới thời gian | Đủ 75.168 bước 5 phút, 0 trùng lặp, 0 mất dòng | `src/analysis.py` (`grid_check`) |
| **11** | | Xử lý giá trị 0 do lỗi cảm biến | Kiểm toán bối cảnh vật lý: 0 của NPK/EC gắn liền độ ẩm đất | `src/analysis.py` (`zero_audit`) |
| **12** | | Quyết định giữ hay bỏ | Bảng quy tắc theo từng biến kèm cơ sở khoa học | Mục 3.1 / Tab Prep |
| **13** | | Missing data benchmark | Thử nghiệm 6 phương pháp điền khuyết trên 5 kịch bản có đáp án | `src/analysis.py` (`imputation_experiment`) |
| **14** | | Phát hiện ngoại lai (Outliers) | So sánh IQR, Z-score, Isolation Forest, DBSCAN vs Luật miền + Hampel + Stuck | `src/analysis.py` (`outlier_benchmark`) |
| **15** | | Phân biệt sự kiện thật vs Lỗi | Luật đồng thuận $\ge 3/4$ biến EC-N-P-K bảo vệ đợt bón phân | `src/analysis.py` (`protection_eval`) |
| **16** | | Làm mượt dữ liệu | So sánh SMA, EMA, Savitzky-Golay (Causal vs Centered) | `src/analysis.py` (`smoothing_experiment`) |
| **17** | | Đo tác động tiền xử lý | Đo sai số của cùng mô hình HGB trên 4 pipeline A–D | `src/run_models.py` (Mục 5.1) |
| **18** | **EDA** | Thống kê mô tả | Bảng describe chi tiết (thô vs sạch), boxplot, histogram | Tab EDA |
| **19** | | Biểu đồ chuỗi thời gian | Xu hướng theo ngày và phân tích hồ sơ 24 giờ | Tab EDA |
| **20** | | Ma trận tương quan | Pearson, Spearman giữa 10 cảm biến và 4 biến thời tiết | Tab EDA |
| **21** | | ACF / PACF | Phân tích tự tương quan và tự tương quan riêng phần | Tab EDA |
| **22** | **Đặc trưng** | Sinh đặc trưng | Trích xuất lag riêng, last, rolling mean/std, sin/cos giờ | `src/modeling.py` (`Windows`) |
| **23** | | Chuẩn hoá | MinMax $[0, 1]$ fit nghiêm ngặt chỉ trên Train | `src/modeling.py` (`Scaled`) |
| **24** | | Chọn đặc trưng | So sánh Tất cả, Giữ 1 đại diện, PCA, Lasso, RFE, RF-importance | `src/run_models.py` (Mục 5.4) |
| **25** | | Window sliding | Thử nghiệm các kích thước cửa sổ trượt $W \in \{4, 12, 24\}$ | `src/run_models.py` (Mục 5.3) |
| **26** | **Mô hình** | Mô hình Baseline | Persistence (giữ nguyên) & Seasonal-naive (cùng giờ hôm qua) | `src/run_models.py` (Mục 5.2) |
| **27** | | Thử nghiệm nhiều mô hình | Random Forest, HistGradientBoosting, XGBoost, LSTM | `src/modeling.py`, `src/run_models.py` |
| **28** | | Đánh giá & Walk-forward | Đánh giá RMSE, MAE, sMAPE, NRMSE; Walk-forward 4 fold tuần | `src/run_models.py` (Mục 5.5) |
| **29** | | Tối ưu siêu tham số | Random Search HGB trên Validation; huấn luyện Train+Val | `src/run_models.py` (Mục 5.5) |
| **30** | **Ứng dụng** | Bảng điều khiển Web | Web Dashboard hiện đại 8 tab trực quan hóa dữ liệu | Thư mục `web/` |
| **31** | | Cảnh báo theo ngưỡng | Cảnh báo ngưỡng nông học & cảnh báo lỗi phần cứng `SENSOR_FAULT` | `config/thresholds.json`, Tab Alerts |

---

## 10. Tài liệu tham khảo (References)
1. **Ben Taieb, S., Bontempi, G., Atiya, A. F., & Sorjamaa, A. (2012).** *A review and comparison of strategies for multi-step ahead time series forecasting.* Expert Systems with Applications, 39(8), 7067-7083.
2. **Grinsztajn, L., Oyallon, E., & Varoquaux, G. (2022).** *Why do tree-based models still outperform deep learning on typical tabular data?* Advances in Neural Information Processing Systems (NeurIPS), 35, 507-520.
3. **van Buuren, S., & Groothuis-Oudshoorn, K. (2011).** *mice: Multivariate Imputation by Chained Equations in R.* Journal of Statistical Software, 45(3), 1-67.
4. **Hampel, F. R. (1974).** *The influence curve and its role in robust estimation.* Journal of the American Statistical Association, 69(346), 383-393.
5. **Savitzky, A., & Golay, M. J. (1964).** *Smoothing and differentiation of data by simplified least squares procedures.* Analytical Chemistry, 36(8), 1627-1639.
6. **Bergmeir, C., & Benítez, J. M. (2012).** *On the use of cross-validation for time series predictor evaluation.* Information Sciences, 191, 192-213.
7. **Liu, F. T., Ting, K. M., & Zhou, Z. H. (2008).** *Isolation Forest.* In 2008 Eighth IEEE International Conference on Data Mining (pp. 413-422).
8. **Ester, M., Kriegel, H. P., Sander, J., & Xu, X. (1996).** *A density-based algorithm for discovering clusters in large spatial databases with noise.* In KDD-96 (pp. 226-231).
