# HƯỚNG DẪN CHỈNH SỬA TOÀN BỘ SLIDE THEO FILE GỐC "KỸ THUẬT XỬ LÝ DỮ LIỆU.PPT"
> **Đồ án:** Pipeline Phân tích, Tiền xử lý Dữ liệu Chuỗi Thời gian IoT và Dự báo Đa Tầm (Vườn Ớt Thông Minh)  
> **Môn học:** IT2047.26.1.CH.01 — Kỹ thuật Xử lý Dữ liệu (Cao học UIT — ĐHQG-HCM)  
> **Bộ slide gốc tham chiếu:** `Kỹ thuật Xử lý dữ liệu.ppt` (Bố cục linh hoạt theo nội dung, không gò bó số lượng slide)  
> **Đặc tả hệ thống:** Trạm quan trắc IoT thực địa, Pipeline Tiền xử lý Dữ liệu & AI Dự báo Đa Tầm  
> **Thành viên:** Nguyễn Đình Quốc Bảo (26848009), Nguyễn Lâm Y Khang (250201065), Trần Minh Khôi (250201067), Trương Hoàng Duy (26848055)  
> **Giảng viên hướng dẫn:** ThS. Võ Phương Bình  

---

## 🏛️ QUY CHUẨN ĐỒNG BỘ THƯƠNG HIỆU UIT (ÁP DỤNG TRÊN TẤT CẢ CÁC SLIDE)

Mỗi slide trong bộ trình chiếu đều phải tuân thủ chuẩn nhận diện thương hiệu của Trường:
1. **Header (Góc trên bên trái của TẤT CẢ slide):**
   * **Logo UIT:** Chèn tệp `report/img/logo_uit.png` (chiều cao $\approx 0.55 - 0.65$ inch).
   * **Chữ cạnh Logo:**
     * Dòng 1: `ĐẠI HỌC QUỐC GIA TP. HỒ CHÍ MINH` (Font Segoe UI, size 8.5pt, màu xám xám/slate `#64748b`).
     * Dòng 2: `TRƯỜNG ĐẠI HỌC CÔNG NGHỆ THÔNG TIN` (Font Segoe UI, size 11.5pt, in đậm, màu xanh UIT `#1b4f9a`).
2. **Footer (Góc dưới bên trái của TẤT CẢ slide):**
   * Dòng chữ: `Trường Đại học Công nghệ Thông tin · ĐHQG-TPHCM` (Font Segoe UI, size 8.5pt, màu xám nhạt `#94a3b8`).
3. **File PowerPoint mẫu hoàn chỉnh:** Đã được tự động tạo sẵn tại `report/ChiliFarm_UIT_Presentation.pptx`.

---

## 🎬 KHO MEDIA ĐỘNG & VIDEO CÓ SẴN (ĐỂ CHÈN VÀO POWERPOINT)

Trong thư mục `report/img/` đã chuẩn bị sẵn các tư liệu động để bài thuyết trình trở nên sống động, thu hút Hội đồng:
1. **Video thực tế trạm hoạt động (Full HD MP4):**
   * Tệp: `report/img/station_operation_demo.mp4` (8 giây, 720p HD, dung lượng nhẹ 1.1 MB).
   * Vị trí khuyến nghị: **Slide 07** hoặc **Slide 20** (Chèn qua `Insert -> Video -> This Device...`, đặt `Start: Automatically`).
2. **Ảnh động GIF lặp vô tận (Auto-looping Animated GIF):**
   * Tệp: `report/img/station_live_demo.gif` (5 giây, 12 fps, tự động chạy liên tục không cần click).
   * Vị trí khuyến nghị: **Slide 04** (Bối cảnh phần cứng) hoặc **Slide 07** (Trạm quan trắc thực tế).
3. **Ảnh tĩnh độ phân giải cao (12 biểu đồ 16:9):**
   * `slide_07_iot_station_sensors.png` đến `slide_20_demo_web_chili_os.png`.

---

## ⚡ NGUYÊN TẮC TỪ NGỮ NGẮN GỌN & HIỆU ỨNG TRÌNH CHIẾU (TRANSITIONS & ANIMATIONS)

### 1. Quy tắc từ ngữ ngắn gọn trên Slide (Rule of Keywords)
* **Tuyệt đối không đưa cả đoạn văn lên slide:** Giảng viên sẽ đọc slide thay vì nghe bạn thuyết trình.
* **Cấu trúc 1 dòng:** `[Từ khóa in đậm] : [Thông số / Hành động kỹ thuật]`.
* **Giới hạn vàng:** Tối đa 3 – 4 dòng/slide, mỗi dòng từ 6 – 10 từ.
* **In đậm số liệu "ăn điểm":** **75.168 mốc (100%)**, **NRMSE = 0.1038**, **+38.9% Skill**, **Giảm 28.7% sai số**.

### 2. Thiết lập Hiệu ứng Chuyển cảnh (Slide Transitions)
* **Slide Tiêu đề & Chuyển chương (Slide 01, 02, 03, 05, 16, 20):**
  * Dùng hiệu ứng: **Push (Đẩy từ dưới lên)** hoặc **Cover**, thời lượng `0.6s` $\rightarrow$ Tạo nhịp ngắt dứt khoát giữa các phần lớn.
* **Slide Nội dung & Biểu đồ phân tích (Slide 04, 06-15, 17, 19, 21):**
  * Dùng hiệu ứng: **Fade (Mờ dần êm ái)**, thời lượng `0.5s` $\rightarrow$ Giúp mắt người xem chuyển tiếp nhẹ nhàng, không gây mỏi mắt.
* **Slide Tiến trình Pipeline & So sánh (Slide 14, 18):**
  * Dùng hiệu ứng: **Morph (Biến hình)** (PowerPoint 2019/Office 365) $\rightarrow$ Các khối hộp và mũi tên di chuyển biến đổi mượt mà.

### 3. Thiết lập Hiệu ứng Xuất hiện Phần tử (Element Animations)
* **Bảng biểu đồ (Charts):** Hiệu ứng **Wipe (From Left)** thời lượng `0.75s` $\rightarrow$ Mô phỏng dòng chảy chuỗi thời gian từ quá khứ đến tương lai.
* **Thẻ Callout / Con số lớn (Slide 06: 75.168):** Hiệu ứng **Zoom in** hoặc **Grow & Turn** $\rightarrow$ Tạo ấn tượng về quy mô dữ liệu.
* **Dòng chữ Bullet points:** Hiệu ứng **Fade in** (Start: `On Click` hoặc `After Previous +0.2s`) $\rightarrow$ Diễn giả nói đến đâu bấm hiện đến đó, khán giả tập trung 100%.

---

## 📌 BẢNG TRA CỨU NHANH 23 SLIDE & TỆP ẢNH TƯƠNG ỨNG

| Slide | Nội dung trong Template PPT | Tệp ảnh tương ứng trong `report/img/` | Tình trạng cần sửa |
| :---: | :--- | :--- | :--- |
| **01** | Bìa đề tài & Thông tin nhóm | *Logo / Template gốc* | Giữ nguyên thông tin nhóm & giảng viên |
| **02** | Mục lục chương trình (Agenda - 6 phần) | *Layout số 01 – 06* | Giữ nguyên 6 mục chuẩn |
| **03** | Section Divider 01: Mục đích & Phạm vi | *Layout divider* | Chuẩn hóa tên section |
| **04** | Đặt vấn đề & Thách thức thực tế | *Layout 3 cột* | Chuẩn hóa 3 khối: Bối cảnh – Thách thức – Mục tiêu |
| **05** | Section Divider 02: Dataset | *Layout divider* | Chuẩn hóa tên section |
| **06** | Callout số liệu: 75.168 Data Points | *Layout callout số lớn* | Bổ sung ngữ cảnh 261 ngày liên tục |
| **07** | **Giới thiệu cảm biến & Nguồn dữ liệu** | `slide_07_iot_station_sensors.png` | **XÓA CHỮ RÁC VENUS/NEPTUNE/MERCURY/SATURN** |
| **08** | Data Features (10 Cảm biến + 4 Thời tiết) | *Bảng phân loại dữ liệu* | Chuẩn hóa đơn vị vật lý và ký hiệu |
| **09** | Data Coverage (Kiểm toán thời gian & tháng) | *Bảng thống kê 9 tháng* | Xác nhận 100% lưới thời gian, missing = 0 |
| **10** | Data Quality (Thống kê min/max, missing %) | *Bảng kiểm toán chất lượng* | Nhấn mạnh nhiệt độ âm, RH = 0% là lỗi vật lý |
| **11** | **Data Insights 1: Xu hướng theo ngày (261 ngày)** | `slide_11_eda_daily_trends.png` | Thay thế ảnh cũ bằng biểu đồ 3 tầng sắc nét |
| **12** | **Data Insights 2: Chu kỳ ngày/đêm (24 giờ)** | `slide_12_eda_hourly_cycles.png` | Thay thế ảnh cũ, làm nổi bật chu kỳ khí tượng vs đất |
| **13** | **Data Insights 3: Ma trận tương quan Pearson** | `slide_13_eda_correlation_matrix.png` | Thay thế ảnh cũ, làm nổi bật khối EC–NPK (r ≈ 0.98) |
| **14** | **Data Insights 4: Quan hệ EC vs NPK & PCA** | `slide_14_eda_npk_ec_scatter.png` | Thay thế ảnh cũ, chứng minh PC1 giải thích 98% |
| **15** | **Data Insights 5: Phân bố tháng & Split dữ liệu** | `slide_15_eda_monthly_events.png` | Thay thế ảnh cũ, làm rõ Train / Val / Test split |
| **16** | Section Divider 03: Pre-processing | `slide_16_preprocessing_imputation.png` | Chèn biểu đồ Benchmark 5 phương pháp điền khuyết |
| **17** | **Phát hiện Outlier & Bảo vệ Sự kiện Bón phân** | `slide_17_outlier_event_protection.png` | Minh họa luật đồng thuận ≥ 3/4 biến EC-NPK |
| **18** | **Kiến trúc Pipeline xử lý 6 giai đoạn** | `slide_18_pipeline_architecture.png` | **XÓA CHỮ RÁC TIMELINE MARS/VENUS/JUPITER** |
| **19** | **Benchmark Mô hình & Dự báo Đa Tầm 24h** | `slide_19_model_benchmark.png`<br>`slide_19_direct_knots_uncertainty.png` | So sánh 5 mô hình (XGBoost +38.9%) & Dải P10-P90 |
| **20** | **Demo: Web Dashboard (Chili Farm OS)** | `slide_20_demo_web_chili_os.png` | Trình diễn 3D Twin, Màn hình LCD, Dự báo 24h |
| **21** | Tổng kết & Hướng phát triển | *Layout 2 cột đóng góp* | Tổng kết đóng góp & đề xuất tương lai |
| **22** | Q&A & Lời cảm ơn | *Layout Q&A* | Câu hỏi phản biện thường gặp |
| **23** | Credits & Icon pack | *Template gốc* | Giữ nguyên bản quyền template |

---

# CHI TIẾT NỘI DUNG TỪNG SLIDE (SLIDE 01 ĐẾN 23)

---

### SLIDE 01: BÌA ĐỀ TÀI (BỐ CỤC CHUẨN THEO ẢNH MẪU UIT)
* **Header góc trên bên trái:**
  * Logo UIT: `report/img/logo_uit.png`
  * Dòng 1: `ĐẠI HỌC QUỐC GIA TP. HỒ CHÍ MINH`
  * Dòng 2: `TRƯỜNG ĐẠI HỌC CÔNG NGHỆ THÔNG TIN` (in đậm, màu xanh UIT)
* **Tag trên cùng:** `B Á O   C Á O   Đ Ề   T À I` (Chữ cam, dãn cách ký tự)
* **Tiêu đề chính:** `Pipeline Phân Tích, Tiền Xử Lý Dữ Liệu IoT & Dự Báo Đa Tầm Vườn Ớt Thông Minh`
* **Tiêu đề phụ:** `Mục tiêu: Khắc phục lỗi đo cảm biến, lọc bón phân đồng thuận và dự báo 24 giờ tới`
* **Môn học:** `Kỹ thuật Xử lý Dữ liệu (IT2047.26.1.CH.01)`
* **Thẻ 1 (Nền xanh nhạt bo góc):**
  * `GIẢNG VIÊN HƯỚNG DẪN`: **ThS. Võ Phương Bình**
* **Thẻ 2 (Nền xanh đậm bo góc):**
  * `LỚP CAO HỌC`: **K2025**
* **Thẻ 3 (Hộp trắng lớn bo góc chứa 2 cột Thành viên):**
  * `THÀNH VIÊN THỰC HIỆN`:
    * Cột 1: **Nguyễn Đình Quốc Bảo** (MSSV: 26848009) & **Nguyễn Lâm Y Khang** (MSSV: 250201065)
    * Cột 2: **Trần Minh Khôi** (MSSV: 250201067) & **Trương Hoàng Duy** (MSSV: 26848055)
* **Khung minh họa bên phải:** Ảnh mockup màn hình điều hành trạm thực tế / Web Dashboard (`slide_20_demo_web_chili_os.png`).
* **Footer cuối trang (Góc dưới bên trái):** `Trường Đại học Công nghệ Thông tin · ĐHQG-TPHCM`

---

### SLIDE 02: NỘI DUNG TRÌNH BÀY (AGENDA)
* **Hiệu ứng chuyển cảnh (Transition):** `Push (Đẩy từ dưới lên - 0.6s)`
* **Hiệu ứng xuất hiện (Animation):** `Wipe (From Top)` hoặc `Fade In` tuần tự từng mục (On Click / After Previous +0.2s)
* **Nội dung ngắn gọn trên Slide (6 mục chuẩn):**
  * **01. Tổng quan & Mục tiêu:** Bối cảnh nông nghiệp 4.0 và thách thức dữ liệu thực tế trạm IoT.
  * **02. Khám phá dữ liệu (EDA):** Kiểm toán chuỗi 261 ngày (75.168 mốc) và 5 quy luật nông học.
  * **03. Kỹ thuật tiền xử lý:** Bộ lọc lỗi 3 lớp, bảo vệ bón phân đồng thuận & benchmark điền khuyết.
  * **04. Kiến trúc Pipeline:** Quy trình 6 bước chuẩn hóa từ dữ liệu thô đến sẵn sàng cho AI.
  * **05. Mô hình & Dự báo 24h:** So sánh 5 mô hình máy học, chiến lược Direct Knots và dải P10-P90.
  * **06. Web Dashboard & Kết luận:** Hệ thống điều hành Chili Farm OS và định hướng mở rộng.
* **Lời thoại gợi ý cho Diễn giả (Speaker Notes):**
  *"Kính thưa Thầy và các bạn, bài báo cáo hôm nay gồm 6 nội dung chính. Nhóm sẽ đi từ bối cảnh phần cứng ngoài thực địa, phân tích tập dữ liệu 75.168 mốc, các thuật toán tiền xử lý, kiến trúc pipeline và kết thúc bằng kết quả thực nghiệm mô hình AI cùng bản demo Web Dashboard."*

---

### SLIDE 03: PHÂN CÁCH PHẦN 1 — TỔNG QUAN ĐỀ TÀI
* **Hiệu ứng chuyển cảnh (Transition):** `Push (Đẩy từ dưới lên - 0.6s)`
* **Số thứ tự:** `01`
* **Tiêu đề lớn:** MỤC ĐÍCH VÀ PHẠM VI NGHIÊN CỨU
* **Tiêu đề nhỏ:** TỔNG QUAN ĐỀ TÀI & BỐI CẢNH THỰC TIỄN
* **Lời thoại gợi ý cho Diễn giả (Speaker Notes):**
  *"Chúng ta cùng bước vào Phần 1: Tổng quan đề tài để làm rõ lý do tại sao canh tác thông minh lại cần một giải pháp tiền xử lý và dự báo chuỗi thời gian chuyên biệt thay vì các ngưỡng tĩnh thông thường."*

---

### SLIDE 04: ĐẶT VẤN ĐỀ & THÁCH THỨC THỰC TẾ
* **Hiệu ứng chuyển cảnh (Transition):** `Fade (0.5s)`
* **Hiệu ứng xuất hiện (Animation):** `Float In / Fade In` lần lượt 3 khối thẻ (On Click)
* **Media minh họa:** Ảnh động `report/img/station_live_demo.gif` (trạm thực địa đang đo lặp vô tận)

**Nội dung ngắn gọn trên Slide (3 khối thẻ):**
* **Khối 1: BỐI CẢNH (Context)**
  * **Trạm quan trắc thực địa:** Thu thập 10 chỉ số lý hóa đất & vi khí hậu (chu kỳ 5 phút).
  * **Hạ tầng IoT hoàn chỉnh:** Bo mạch ESP32, cảm biến 7-in-1, màn hình LCD điều khiển.
  * **Bài toán đặt ra:** Cần pipeline xử lý dữ liệu và AI dự báo thay vì ngưỡng tĩnh đơn giản.
* **Khối 2: THÁCH THỨC (Challenges)**
  * **Nhiễu đo & Lỗi phần cứng:** 814 dòng DHT chết về 0, cảm biến kẹt $\ge 60$ phút, xung nhọn.
  * **Mất mát dữ liệu:** Rớt mạng Wi-Fi/4G, sụt nguồn trạm.
  * **Xung đột nông học:** Bón phân làm vọt EC & NPK $\rightarrow$ Lọc outlier thông thường xóa nhầm dữ liệu thật.
* **Khối 3: MỤC TIÊU (Goals)**
  * **Pipeline chuẩn hóa:** Chuyển đổi dữ liệu thô lỗi $\rightarrow$ Dữ liệu sạch có kiểm chứng.
  * **AI Dự báo đa tầm:** XGBoost, HistGB, RF, LSTM dự báo trực tiếp 24 giờ tới.
  * **Chili Farm OS:** Web Dashboard Digital Twin 3D 360° & Cảnh báo nông học tức thời.
* **Lời thoại gợi ý cho Diễn giả (Speaker Notes):**
  *"Khi triển khai trạm quan trắc thực tế, nhóm nhận thấy 2 thách thức lớn: phần cứng cảm biến thường xuyên gặp lỗi vật lý, và các đợt bón phân làm vọt nồng độ ion dễ bị các bộ lọc thông thường coi là ngoại lai và xóa oan."*

---

### SLIDE 05: PHÂN CÁCH PHẦN 2 — TẬP DỮ LIỆU IOT-AGRICULTURE
* **Hiệu ứng chuyển cảnh (Transition):** `Push (Đẩy từ dưới lên - 0.6s)`
* **Số thứ tự:** `02`
* **Tiêu đề lớn:** DATASET IOT-AGRICULTURE
* **Tiêu đề nhỏ:** DỮ LIỆU CẢM BIẾN & THỜI TIẾT NGOẠI SINH
* **Lời thoại gợi ý cho Diễn giả (Speaker Notes):**
  *"Tiếp theo là Phần 2: Khám phá tập dữ liệu 75.168 bản ghi và các đặc trưng lý hóa đo đạc được."*

---

### SLIDE 06: CALLOUT SỐ LIỆU ĐẶC TRƯNG
* **Hiệu ứng chuyển cảnh (Transition):** `Fade (0.5s)`
* **Hiệu ứng phần tử:** `Zoom In` cho con số `75.168`, `Fade In` cho 3 bullet points
* **Con số nổi bật:** `75.168`
* **Nội dung ngắn gọn trên Slide:**
  * **Chuỗi thời gian liên tục:** 261 ngày thực nghiệm (14/12/2025 $\rightarrow$ 31/08/2026).
  * **Độ phủ lưới thời gian:** Đạt chuẩn **100.0%** (0 trùng lặp, 0 mất dòng trên lưới 5 phút).
  * **Ngoại sinh đồng bộ:** Ghép 4 biến khí tượng TP.HCM từ Open-Meteo.
* **Lời thoại gợi ý cho Diễn giả (Speaker Notes):**
  *"Con số 75.168 mốc thời gian đại diện cho 261 ngày quan sát liên tục, với độ phủ lưới đạt mức tuyệt đối 100%, không mất bất kỳ một mốc 5 phút nào."*

---

### SLIDE 07: GIỚI THIỆU CẢM BIẾN & NGUỒN GỐC DỮ LIỆU
> [!CAUTION]
> **HÃY XÓA TOÀN BỘ CÁC CHỮ RÁC:** *"Venus has extremely high temperatures"*, *"Neptune"*, *"Mercury"*, *"Saturn"*.

* **Hiệu ứng chuyển cảnh (Transition):** `Fade (0.5s)`
* **Hiệu ứng phần tử:** `Zoom In` ảnh trạm, `Wipe` từ trái sang cho các dòng cảm biến
* **Media chèn vào:**
  * **Ảnh đồ họa 16:9:** `report/img/slide_07_iot_station_sensors.png`
  * *(Tùy chọn nâng cao)* **Video chuyển động:** Chèn video Full HD `report/img/station_operation_demo.mp4` (8 giây) hoặc ảnh động `report/img/station_live_demo.gif` để thấy trạm hoạt động thực tế.

**Nội dung ngắn gọn thay thế 5 vị trí trên Slide:**
1. **01 — Đồng bộ dữ liệu Firebase (261 ngày):** Toàn bộ chuỗi 75.168 mốc (5 phút/lần) được trạm đẩy tự động và lưu trữ trên Firebase Realtime Database.
2. **02 — Trích xuất & Chuẩn hóa tự động:** Pipeline kết nối Firebase trích xuất dữ liệu JSON, làm phẳng cấu trúc và đồng bộ lưới thời gian.
3. **03 — Khí tượng Open-Meteo:** Ghép 4 biến thời tiết đồng bộ (Bức xạ mặt trời $W/m^2$, Nhiệt độ, Độ ẩm, Lượng mưa 5 phút).
4. **04 — Cảm biến đất 7-in-1 Modbus RS485:** Đo Độ ẩm, Nhiệt độ đất, pH, EC, Đạm (N), Lân (P), Kali (K).
5. **05 — Trạm vi điều khiển ESP32 & Màn hình LCD:** Bo mạch điều khiển, hạ áp Buck XL1509, relay bơm và hiển thị tại trạm.
* **Lời thoại gợi ý cho Diễn giả (Speaker Notes):**
  *"Đây là trạm quan trắc thực tế do nhóm tự thiết kế và triển khai: sử dụng ESP32 điều khiển, cảm biến 7-in-1 công nghiệp đo vùng rễ qua RS485, kết hợp DHT22 đo tán lá và màn hình LCD tại trạm."*

---

### SLIDE 08: DATA FEATURES (DANH MỤC 14 ĐẶC TRƯNG DỮ LIỆU)
* **Hiệu ứng chuyển cảnh (Transition):** `Fade (0.5s)`
* **Hiệu ứng xuất hiện (Animation):** `Fade In` Cột Sensor $\rightarrow$ Cột Weather
* **Nội dung ngắn gọn trên Slide (2 cột phân loại):**
  * **Cột 1 — 10 Biến Cảm biến Trạm IoT:**
    * **Đất (7-in-1):** `moisture` (1–70 %VWC), `soiltemp` (15–40 °C), `pH` (3.0–9.5), `EC` (0.0–4.0 mS/cm), `N`, `P`, `K` (mg/kg).
    * **Tán lá:** `temperature` (5–48 °C), `humidity` (5–100 %RH), `light` (0–30 klux).
  * **Cột 2 — 4 Biến Thời tiết Ngoại sinh (Open-Meteo):**
    * `w_rad`: Bức xạ mặt trời ngắn ($W/m^2$).
    * `w_air_T`: Nhiệt độ không khí khí tượng ($^\circ C$).
    * `w_air_RH`: Độ ẩm không khí khí tượng ($\%RH$).
    * `w_rain_5min`: Lượng mưa tích lũy chu kỳ 5 phút ($mm$).
* **Lời thoại gợi ý cho Diễn giả (Speaker Notes):**
  *"Nhóm quản lý tổng cộng 14 biến: 10 biến quan trắc tại chỗ và 4 biến khí tượng ngoại sinh từ Open-Meteo để cung cấp bối cảnh thời tiết vĩ mô cho mô hình AI."*

---

### SLIDE 09: DATA COVERAGE (KIỂM TOÁN LƯỚI THỜI GIAN 5 PHÚT)
* **Hiệu ứng chuyển cảnh (Transition):** `Fade (0.5s)`
* **Hiệu ứng xuất hiện (Animation):** `Zoom In` bảng số liệu kiểm toán
* **Nội dung ngắn gọn trên Slide:**
  * **Quy mô lưới 5 phút:** $261 \text{ ngày} \times 288 \text{ bước/ngày} = \mathbf{75.168 \text{ mốc thời gian}}$.
  * **Độ phủ lưới thời gian:** Đạt mức tuyệt đối **100.0%** (Missing timestamps: 0, Duplicate: 0).
  * **Phân bố 9 tháng:** Tháng 1, 3, 5, 7, 8 (8.928 dòng); Tháng 4, 6 (8.640 dòng); Tháng 2 (8.064 dòng); Tháng 12/2025 (5.184 dòng).
  * **Ý nghĩa:** Lưới thời gian nguyên vẹn 100%, tạo điều kiện hoàn hảo cho mô hình học máy chuỗi thời gian.
* **Lời thoại gợi ý cho Diễn giả (Speaker Notes):**
  *"Kiểm toán thời gian khẳng định lưới 5 phút nguyên vẹn 100% qua suốt 261 ngày, không bị mất dòng, đảm bảo tính liên tục của chuỗi thời gian."*

---

### SLIDE 10: DATA QUALITY (KIỂM TOÁN CHẤT LƯỢNG & BẤT THƯỜNG VẬT LÝ)
* **Hiệu ứng chuyển cảnh (Transition):** `Fade (0.5s)`
* **Hiệu ứng xuất hiện (Animation):** `Wipe` bảng thống kê, in đậm các giá trị dị thường
* **Nội dung ngắn gọn trên Slide:**
  * **Nhiệt độ âm & RH = 0%:** Ghi nhận Min `temperature` = **-0.50 °C** và `humidity` = **0.00 %RH** $\rightarrow$ Do cảm biến DHT mất kết nối (TP.HCM không thể có băng tuyết).
  * **Cảm biến ánh sáng:** `light` có 1.830 ô trống (2.43%) và tương quan yếu do bị tán cây che khuất.
  * **Hiện tượng EC & NPK = 0:** Xuất hiện chủ yếu khi độ ẩm đất $< 12\%$ (đất quá khô mất tiếp xúc điện cực, không phải lỗi phần cứng).
  * **Kết luận:** Bắt buộc xây dựng bộ lọc miền vật lý để làm sạch các giá trị phi thực tế.
* **Lời thoại gợi ý cho Diễn giả (Speaker Notes):**
  *"Kiểm toán chất lượng ban đầu phát hiện các lỗi vật lý nghiêm trọng: nhiệt độ âm nửa độ C và độ ẩm 0% khi đầu dò DHT chết. Đây là cơ sở cốt lõi để chúng tôi thiết kế bộ lọc miền vật lý đa tầng."*

---

### SLIDE 11: DATA INSIGHTS 1 — XU HƯỚNG CHUỖI 261 NGÀY
* **Hiệu ứng chuyển cảnh (Transition):** `Fade (0.5s)`
* **Hiệu ứng xuất hiện (Animation):** `Wipe (From Left - 0.75s)` cho biểu đồ chuỗi thời gian
* **Hình ảnh chèn vào:** `slide_11_eda_daily_trends.png`

**Nội dung ngắn gọn trên Slide:**
* **Độ ẩm đất (45–55%):** Duy trì ổn định nhờ tưới tự động; bắt trọn 2 sự cố **bơm hỏng** (tụt về 24% ngày 22–25/03 & 09–11/08).
* **Dinh dưỡng EC & NPK:** Dạng **răng cưa** — tăng vọt khi châm phân qua nước tưới, giảm dần do cây hấp thu & rửa trôi.
* **Mùa mưa (Tháng 5–8):** Bức xạ giảm, lượng mưa tăng $\rightarrow$ Đẩy nhanh tốc độ rửa trôi ion dinh dưỡng.

---

### SLIDE 12: DATA INSIGHTS 2 — CHU KỲ TRONG NGÀY (HOURLY DIURNAL PROFILE)
* **Hiệu ứng chuyển cảnh (Transition):** `Fade (0.5s)`
* **Hiệu ứng xuất hiện (Animation):** `Fade In` lần lượt biểu đồ trái và biểu đồ phải
* **Hình ảnh chèn vào:** `slide_12_eda_hourly_cycles.png`

**Nội dung ngắn gọn trên Slide:**
* **Nhiệt độ & Bức xạ:** Chu kỳ ngày/đêm rõ nét, đạt đỉnh 13h–14h; nhiệt đất rễ trễ 1.5–2h so với khí.
* **Độ ẩm đất & EC:** Gần như **phẳng theo giờ**; dao động theo sự kiện tưới/bón, không theo giờ.
* **Ý nghĩa AI:** Tạo đặc trưng sóng tuần hoàn `sin(giờ)` và `cos(giờ)` để mô hình học nhịp sinh học.

---

### SLIDE 13: DATA INSIGHTS 3 — MA TRẬN TƯƠNG QUAN NHIỆT (CORRELATION MATRIX)
* **Hiệu ứng chuyển cảnh (Transition):** `Fade (0.5s)`
* **Hiệu ứng xuất hiện (Animation):** `Zoom In` nhẹ cho ma trận nhiệt
* **Hình ảnh chèn vào:** `slide_13_eda_correlation_matrix.png`

**Nội dung ngắn gọn trên Slide:**
* **Khối EC–NPK trùng lặp thông tin:** $r(EC, K)=0.985$, $r(EC, P)=0.982$, $r(EC, N)=0.978$.
* **Độ ẩm & pH tương quan âm mạnh ($r \approx -0.65$):** Đặc tính cảm biến điện cực khi đất bão hòa nước.
* **Cảm biến ánh sáng giai đoạn đầu ($r \approx 0.02$):** Bị tán lá che khuất, sau đó nhóm đã di dời ra vị trí thông thoáng và hiệu chuẩn lại.

---

### SLIDE 14: DATA INSIGHTS 4 — BẰNG CHỨNG THỰC NGHIỆM VỀ ĐẦU DÒ NPK & PCA
* **Hiệu ứng chuyển cảnh (Transition):** `Morph (Biến hình 0.6s)` hoặc `Fade`
* **Hiệu ứng xuất hiện (Animation):** `Grow / Wipe` cho biểu đồ phân tán và cột PCA
* **Hình ảnh chèn vào:** `slide_14_eda_npk_ec_scatter.png`

**Nội dung ngắn gọn trên Slide:**
* **Quan hệ tuyến tính tuyệt đối:** Điểm đo N, P, K bám chặt vào đường hồi quy của EC.
* **Phân tích PCA:** Thành phần chính đầu tiên (**PC1**) giải thích đến **98.0% toàn bộ phương sai**.
* **Quyết định giảm chiều:** Gom nhóm dinh dưỡng về EC hoặc PC1, loại bỏ đa cộng tuyến.

---

### SLIDE 15: DATA INSIGHTS 5 — PHÂN BỐ DỮ LIỆU & CHIẾN LƯỢC CHIA TẬP TEST
* **Hiệu ứng chuyển cảnh (Transition):** `Fade (0.5s)`
* **Hiệu ứng xuất hiện (Animation):** `Float Up` 3 nhãn Train / Val / Test
* **Hình ảnh chèn vào:** `slide_15_eda_monthly_events.png`

**Nội dung ngắn gọn trên Slide:**
* **Nguyên tắc nhân quả:** Tuyệt đối không dùng K-fold xáo trộn (Shuffle) gây rò rỉ tương lai (Data Leakage).
* **Train (14/12/2025 – 30/06/2026):** 57.312 bản ghi (~6.5 tháng huấn luyện).
* **Validation (Tháng 07/2026):** 8.928 bản ghi (tinh chỉnh siêu tham số).
* **Test độc lập (Tháng 08/2026):** 8.928 bản ghi (kiểm định độ chính xác thực tế).

---

### SLIDE 16: PHÂN CÁCH PHẦN 3 & BENCHMARK ĐIỀN KHUYẾT
* **Số thứ tự:** `03`
* **Tiêu đề lớn:** CÁC KỸ THUẬT TIỀN XỬ LÝ & TRÍCH XUẤT ĐẶC TRƯNG
* **Hiệu ứng chuyển cảnh (Transition):** `Push (0.6s)`
* **Hình ảnh chèn vào:** `slide_16_preprocessing_imputation.png`

**Nội dung ngắn gọn trên Slide:**
* **Khoảng thiếu ngắn $\le 3$ giờ:** **Nội suy tuyến tính (Linear)** tối ưu nhất ($NRMSE \approx 0.10 - 0.17$).
* **Khoảng thiếu dài $> 3$ giờ đơn biến:** **MICE đa biến** vượt trội ($NRMSE = 0.3606$ so với $0.4403$ của Linear).
* **Mất kết nối toàn bộ trạm:** Quay lại Tuyến tính vì MICE không còn biến quan sát để mượn thông tin.

---

### SLIDE 17: BỘ PHÁT HIỆN LỖI KẾT HỢP & BẢO VỆ ĐỢT BÓN PHÂN
* **Hiệu ứng chuyển cảnh (Transition):** `Fade (0.5s)`
* **Hiệu ứng xuất hiện (Animation):** `Wipe` cho biểu đồ cột, `Zoom In` cho hộp quy tắc đồng thuận
* **Hình ảnh chèn vào:** `slide_17_outlier_event_protection.png`

**Nội dung ngắn gọn trên Slide:**
* **Bộ lọc 3 lớp:** Luật miền vật lý + Hampel thích ứng ($6 \times MAD$ 24h) + Phát hiện kẹt (Stuck $\ge 12$).
* **Quy tắc đồng thuận nông học:** Khi $\ge 3/4$ biến nhóm $\{EC, N, P, K\}$ cùng tăng vọt $\rightarrow$ Xác nhận là **Bón phân thật**.
* **Hiệu quả thực nghiệm:** Bảo tồn nguyên vẹn **8 điểm quan sát** thuộc **4 đợt bón phân lớn** không bị cắt gọt sai lệch.

---

### SLIDE 18: KIẾN TRÚC PIPELINE XỬ LÝ (6 BƯỚC HOÀN CHỈNH)
> [!CAUTION]
> **HÃY XÓA TOÀN BỘ CÁC CHỮ RÁC:** *"A timeline always works well"*, *"Despite being red, Mars is actually a cold place"*, *"Neptune"*, *"Venus"*, *"Jupiter"*, *"Saturn"*, *"Earth"*.

* **Hiệu ứng chuyển cảnh (Transition):** `Morph (0.6s)` hoặc `Fade`
* **Hiệu ứng xuất hiện (Animation):** `Wipe (From Left)` tuần tự 6 khối hộp
* **Hình ảnh chèn vào:** `slide_18_pipeline_architecture.png`

**Nội dung ngắn gọn 6 bước trên Slide:**
1. **Đọc & Lưới thời gian:** Làm phẳng Firebase JSON $\rightarrow$ Kiểm toán lưới 5 phút (75.168 dòng) $\rightarrow$ Ghép Open-Meteo.
2. **Bối cảnh vật lý:** Lọc 814 dòng DHT chết về 0; giữ $EC=0$ khi đất khô $< 12\%$; lọc ánh sáng ban ngày.
3. **Bộ lọc lỗi kết hợp:** Luật miền vật lý + Lọc Hampel MAD thích ứng + Phát hiện kẹt cảm biến ($Stuck \ge 12$).
4. **Bảo vệ biến động nông học:** Quy tắc đồng thuận $\ge 3/4$ biến nhóm EC–NPK giữ nguyên vẹn 4 đợt bón phân.
5. **Điền khuyết & Làm mượt:** Hybrid (Tuyến tính đoạn ngắn, MICE đoạn dài) + Làm mượt nhân quả EMA 0.3.
6. **Mô hình hóa & Dự báo:** Cửa sổ trượt $W=12$ (1 giờ), chiến lược Direct Knots 24h kèm dải bất định $P_{10} - P_{90}$.

---

### SLIDE 19: BENCHMARK MÔ HÌNH MÁY HỌC & DỰ BÁO TRỰC TIẾP 24H
* **Hiệu ứng chuyển cảnh (Transition):** `Fade (0.5s)`
* **Hiệu ứng xuất hiện (Animation):** `Wipe Up` cho biểu đồ cột, `Fade In` cho dải bất định
* **Hình ảnh chèn vào:** `slide_19_model_benchmark.png` và `slide_19_direct_knots_uncertainty.png`

**Nội dung ngắn gọn trên Slide:**
* **Tầm 5 phút ($h=1$):** XGBoost ($NRMSE = 0.1038$) và RF ($0.1048$) cải thiện $+14 - 15\%$ so với Persistence ($0.1223$).
* **Tầm 1 giờ ($h=12$):** **XGBoost chiến thắng áp đảo** ($NRMSE = 0.2069$ so với $0.3387$ của Persistence) $\rightarrow$ **Cải thiện +38.9% Skill**.
* **Đóng góp của Tiền xử lý:** Tiền xử lý đúng phương pháp giúp **giảm 28.7% sai số dự báo**.
* **Chiến lược Direct Knots:** Huấn luyện riêng từng tầm xa kèm **dải bất định thực nghiệm $P_{10}-P_{90}$**, triệt tiêu lỗi tích luỹ đệ quy.

---

### SLIDE 20: DEMO WEB DASHBOARD (CHILI FARM OS)
* **Hiệu ứng chuyển cảnh (Transition):** `Zoom In (0.6s)` hoặc `Push`
* **Media chèn vào:**
  * **Ảnh đồ họa 4 màn hình:** `slide_20_demo_web_chili_os.png`
  * *(Tùy chọn trình chiếu trực tiếp)* Mở trình duyệt Web tại `web/index.html` hoặc chạy video Full HD `report/img/station_operation_demo.mp4`.

**Nội dung ngắn gọn trên Slide:**
* **Bản sao kỹ thuật số 3D (Digital Twin 360°):** Trực quan hóa trạm thực tế đa chiều.
* **Màn hình LCD cảm ứng ảo:** Tái hiện màn hình trạm, đưa khuyến nghị tức thời (*"Bón thêm vôi để nâng pH"*).
* **Biểu đồ dự báo 24 giờ:** Cảnh báo sớm trước khi đất thiếu ẩm, chủ động kích hoạt tưới.
* **Nhật ký sự kiện:** Phân tích trực quan các sự cố bơm hỏng và các đợt bón phân.

---

### SLIDE 21: TỔNG KẾT & HƯỚNG PHÁT TRIỂN
* **Hiệu ứng chuyển cảnh (Transition):** `Fade (0.5s)`
* **Hiệu ứng xuất hiện (Animation):** `Fade In` lần lượt Cột Đóng góp $\rightarrow$ Cột Tương lai (On Click)

**Nội dung ngắn gọn trên Slide:**
* **ĐÓNG GÓP CHÍNH:**
  * **Hệ sinh thái đầu-cuối:** Tự thiết kế trạm IoT thực tế, pipeline dữ liệu 6 giai đoạn và Web Dashboard.
  * **Bảo vệ đợt bón phân:** Cơ chế đồng thuận $\ge 3/4$ biến giữ lại **8 điểm của 4 đợt bón phân**, giảm 5,1% cờ báo nhầm (156 → 148 dòng).
  * **Độ chính xác vượt trội:** Mô hình XGBoost đạt **+38.9% Skill** so với mô hình ngây thơ; tiền xử lý giảm **28.7% sai số**.
* **HƯỚNG PHÁT TRIỂN TƯƠNG LAI:**
  * **Mô hình học sâu chuyên biệt:** Thử nghiệm kiến trúc Transformer PatchTST cho chuỗi siêu dài hạn.
  * **Mở rộng đa trạm:** Phát triển hệ thống xử lý phân tán phục vụ mạng lưới nông trại thông minh quy mô lớn.
* **Lời thoại gợi ý cho Diễn giả (Speaker Notes):**
  *"Tóm lại, đề tài đã giải quyết trọn vẹn bài toán từ chế tạo phần cứng trạm IoT, xử lý dữ liệu thực nghiệm đến triển khai AI dự báo với mức cải thiện 38.9% Skill, mang lại giá trị thiết thực cho canh tác nông nghiệp công nghệ cao."*

---

### SLIDE 22: Q&A & LỜI CẢM ƠN HỘI ĐỒNG
* **Hiệu ứng chuyển cảnh (Transition):** `Fade (0.5s)`
* **Hiệu ứng xuất hiện (Animation):** `Fade In` tiêu đề và danh mục chủ đề phản biện
* **Tiêu đề chính:** XIN CHÂN THÀNH CẢM ƠN THẦY VÀ CÁC BẠN ĐÃ LẮNG NGHE!
* **Nội dung sẵn sàng phản biện:**
  * **Vật lý cảm biến:** Lý do giữ nguyên giá trị $0$ của EC/NPK khi đất khô $< 12\%$.
  * **Thuật toán Outlier:** Hampel MAD thích ứng 24h kết hợp cơ chế đồng thuận 3/4 biến bón phân.
  * **Benchmark điền khuyết:** Cơ sở chọn Linear cho đoạn ngắn $\le 3$h và MICE cho đoạn dài đơn biến.
  * **Chiến lược mô hình:** Huấn luyện Direct Knots 24h và dải bất định thực nghiệm $P_{10} - P_{90}$.
* **Lời thoại gợi ý cho Diễn giả (Speaker Notes):**
  *"Nhóm xin chân thành cảm ơn ThS. Võ Phương Bình và các bạn đã chú ý lắng nghe. Nhóm rất mong nhận được những câu hỏi và ý kiến đóng góp quý báu từ Hội đồng."*

---

### SLIDE 23: TÀI LIỆU THAM KHẢO & BẢN QUYỀN
* **Hiệu ứng chuyển cảnh (Transition):** `Fade (0.5s)`
* **Tài liệu tham khảo chính:**
  * Hampel, F. R. (1974). *The influence curve and its role in robust estimation*. JASA.
  * van Buuren, S. (2011). *mice: Multivariate Imputation by Chained Equations in R*. JSS.
  * Chen, T., & Guestrin, C. (2016). *XGBoost: A scalable tree boosting system*. KDD.
  * Hyndman, R. J., & Athanasopoulos, G. (2018). *Forecasting: principles and practice*. OTexts.
* **Bản quyền slide:** Slide template thiết kế theo chuẩn Slidesgo, tùy biến và đồng bộ hóa bởi Nhóm nghiên cứu UIT.
