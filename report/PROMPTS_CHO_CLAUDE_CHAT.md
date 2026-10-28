# BỘ PROMPTS CHUYÊN DỤNG CHO CLAUDE CHAT
> **Mục đích:** Sử dụng trực tiếp trong cuộc hội thoại với **Claude Chat (Claude 3.5 Sonnet / Claude 3 Opus)** để tự động hóa chỉnh sửa slide PowerPoint, viết kịch bản thuyết trình, và luyện tập bảo vệ trước Hội đồng phản biện.  
> **Dự án:** Chili Smart-Farm Data Lab — Pipeline Tiền xử lý IoT & Dự báo Đa Tầm (UIT Cao học)  

---

## 📋 MỤC LỤC BỘ PROMPTS

1. [Prompt 1: Master Prompt — Khởi Tạo Ngữ Cảnh Chuyên Gia Cho Claude](#prompt-1-master-prompt--khởi-tạo-ngữ-cảnh-chuyên-gia-cho-claude)
2. [Prompt 2: Yêu Cầu Claude Chỉnh Sửa & Điền Nội Dung Từng Slide Cụ Thể](#prompt-2-yêu-cầu-claude-chỉnh-sửa--điền-nội-dung-từng-slide-cụ-thể)
3. [Prompt 3: Soạn Kịch Bản Thuyết Trình Khớp Thời Gian (Speaker Script 15 Phút)](#prompt-3-soạn-kịch-bản-thuyết-trình-khớp-thời-gian-speaker-script-15-phút)
4. [Prompt 4: Đóng Vai Giảng Viên Phản Biện — Mock Defense & 10 Câu Hỏi Hóc Búa](#prompt-4-đóng-vai-giảng-viên-phản-biện--mock-defense--10-câu-hỏi-hóc-búa)
5. [Prompt 5: Sinh Code Python (python-pptx) Tự Động Chèn Nội Dung & Ảnh Vào Slide](#prompt-5-sinh-code-python-python-pptx-tự-động-chèn-nội-dung--ảnh-vào-slide)
6. [Prompt 6: Mở Rộng Slide Thành Báo Cáo / Luận Văn Đồ Án Chi Tiết](#prompt-6-mở-rộng-slide-thành-báo-cáo--luận-văn-đồ-án-chi-tiết)

---

## PROMPT 1: MASTER PROMPT — KHỞI TẠO NGỮ CẢNH CHUYÊN GIA CHO CLAUDE
> **Cách dùng:** Copy toàn bộ nội dung bên dưới và dán vào tin nhắn đầu tiên gửi cho Claude Chat trong Project/Chat mới.

```markdown
Bạn là một chuyên gia hàng đầu về Khoa học Dữ liệu (Data Science), Kỹ thuật Xử lý Dữ liệu Chuỗi Thời gian (Time-Series Engineering) và Hệ thống IoT Nông nghiệp Thông minh, đồng thời là Cố vấn học thuật cho chương trình Cao học tại Trường Đại học Công nghệ Thông tin, ĐHQG-HCM (UIT).

Hiện tại tôi đang hoàn thiện slide báo cáo đồ án môn "Kỹ thuật Xử lý Dữ liệu" (Mã lớp: IT2047.26.1.CH.01, GVHD: ThS. Võ Phương Bình).
Nhóm học viên gồm:
- Nguyễn Đình Quốc Bảo (26848009)
- Nguyễn Lâm Y Khang (250201065)
- Trần Minh Khôi (250201067)
- Trương Hoàng Duy (26848055)

QUY CHUẨN THIẾT KẾ & ĐỘ LINH HOẠT CỦA BỘ SLIDE:
- Bám sát format, tông màu, phong cách đồ họa và bố cục thẻ (cards/typography) của file mẫu gốc: "Kỹ thuật Xử lý dữ liệu.ppt".
- SỐ LƯỢNG SLIDE LINH HOẠT (Không cố định cứng 23 slide): Có thể nhiều hơn hoặc ít hơn (thường từ 18 đến 26 slide), ưu tiên cao nhất là ĐẦY ĐỦ NỘI DUNG khoa học, mạch lạc, dễ đọc và không bị dồn ép chữ.
- Nếu một phần có nhiều số liệu/biểu đồ (như EDA, Tiền xử lý, Benchmark mô hình), có thể linh hoạt tách làm 2 slide riêng để không gian thoáng đãng và chèn được hình ảnh/video trực quan.
- Nhiệm vụ trọng tâm: Điền nội dung kỹ thuật chuẩn xác, súc tích (Rule of Keywords) vào các slide, xóa sạch chữ rác mặc định (Mars, Venus, Neptune, Saturn), chèn đúng biểu đồ/media động vào khung hình.

TÓM TẮT DỰ ÁN VÀ BẰNG CHỨNG KHOA HỌC THEN CHỐT:
1. Nền tảng hệ thống: Nhóm tự thiết kế, chế tạo và triển khai trạm quan trắc thực địa phần cứng hoàn chỉnh (bo mạch ESP32, mạch hạ áp Buck XL1509, màn hình cảm ứng LCD, cảm biến đất 7-in-1 NPK/pH/EC/độ ẩm/nhiệt độ đất qua RS485 Modbus, cảm biến không khí DHT22, ánh sáng và relay điều khiển bơm tưới). Hệ thống đẩy dữ liệu tự động lên Firebase Realtime Database chu kỳ 5 phút/lần. Đồ án xây dựng một giải pháp toàn diện từ trạm IoT phần cứng đến pipeline tiền xử lý khoa học và mô hình AI dự báo đa tầm 24 giờ.
2. Bộ dữ liệu: Toàn bộ chuỗi 261 ngày liên tục được thu thập trực tiếp từ trạm IoT và đồng bộ lên Firebase Realtime Database (75.168 mốc thời gian, bước lấy mẫu 5 phút) từ 14/12/2025 đến 31/08/2026, độ phủ lưới thời gian đạt mức tuyệt đối 100% (không thiếu dòng, không trùng lặp) + 4 biến khí tượng ngoại sinh đồng bộ từ Open-Meteo (bức xạ mặt trời, nhiệt độ, độ ẩm không khí, lượng mưa 5 phút).
3. Tiền xử lý thực nghiệm có kiểm chứng (Đo bằng NRMSE = RMSE / sigma):
   - Kiểm toán giá trị 0: 814 dòng DHT chết về 0 (temperature và humidity < 5 đồng thời) -> chuyển thành NaN; Giá trị 0 của nhóm EC/NPK chủ yếu xảy ra khi độ ẩm đất < 12% (đất khô thì điện cực không dẫn điện, giữ lại); Cảm biến ánh sáng ở giai đoạn đầu thử nghiệm bị tán lá che khuất nên tương quan yếu (r = 0.02 với bức xạ), sau đó đã được nhóm hiệu chuẩn và đưa vào vị trí thông thoáng.
   - Bộ phát hiện lỗi kết hợp: Luật miền vật lý + Bộ lọc Hampel thích ứng (cửa sổ 9 bước = 45 phút, ngưỡng 6.0 x MAD cục bộ 24h) + Phát hiện kẹt giá trị (Stuck sensor >= 12 bước liên tiếp = 60 phút).
   - Cơ chế đồng thuận bảo vệ biến động nông học (Event vs Fault Consensus): Khi >= 3/4 biến nhóm [EC, N, P, K] cùng tăng vọt đột ngột -> Xác định là đợt bón phân qua hệ thống tưới -> Giữ nguyên dữ liệu, bảo vệ nguyên vẹn 8 điểm đo của 4 đợt bón phân lớn không bị cắt gọt sai lệch.
   - Thí nghiệm điền khuyết: Tuyến tính tối ưu cho đoạn ngắn <= 3h (NRMSE ≈ 0.10 - 0.17); MICE đa biến tối ưu cho đoạn dài > 3h của 1 cảm biến (NRMSE = 0.3606 so với 0.4403 của Linear); Mất kết nối cả 10 biến thì quay lại Tuyến tính.
   - Làm mượt nhân quả: EMA 0.3 (độ trễ pha chỉ 1.67 bước ≈ 8 phút, không rò rỉ tương lai như Savitzky-Golay).
4. Mô hình máy học & Dự báo đa tầm (Direct Multi-Horizon 24h):
   - Chia tập dữ liệu chuẩn thời gian: Train (14/12/2025 - 30/06/2026, 57.312 dòng), Val (tháng 7/2026, 8.928 dòng), Test độc lập (tháng 8/2026, 8.928 dòng). Tuyệt đối không xáo trộn K-fold.
   - Cửa sổ trượt W = 12 bước (1 giờ quá khứ), dự đoán phần gia tăng Delta_y để cây ngoại suy tốt.
   - Kết quả benchmark: Tại h=12 (1 giờ), XGBoost đạt NRMSE = 0.2069, vượt trội hoàn toàn mô hình ngây thơ Persistence (0.3387) với Skill cải thiện +38.9%. Random Forest đạt +36.1%, HistGB đạt +35.1%, LSTM (PyTorch) đạt +20.9%. Tiền xử lý đúng phương pháp giúp giảm 28.7% sai số dự báo.
   - Chiến lược Direct Knots: Huấn luyện độc lập 17 mô hình cho các mốc tầm xa từ 5 phút đến 24 giờ kèm dải bất định thực nghiệm P10 - P90, khắc phục triệt để lỗi tích lũy cấp số nhân của dự báo đệ quy.
5. Ứng dụng Web Dashboard (Chili Farm OS): Tích hợp Digital Twin 3D 360°, mô phỏng màn hình cảm ứng LCD phần cứng, biểu đồ dự báo 24h kèm dải tin cậy và hệ thống cảnh báo nông học tự động.
6. Quy chuẩn thương hiệu UIT (BẮT BUỘC TRÊN TẤT CẢ CÁC SLIDE):
   - Header (góc trên bên trái mọi slide): Chèn Logo `report/img/logo_uit.png` kèm text 2 dòng:
     Dòng 1: "ĐẠI HỌC QUỐC GIA TP. HỒ CHÍ MINH" (size nhỏ, xám)
     Dòng 2: "TRƯỜNG ĐẠI HỌC CÔNG NGHỆ THÔNG TIN" (size vừa, đậm, xanh UIT)
   - Footer (góc dưới bên trái mọi slide):
     "Trường Đại học Công nghệ Thông tin · ĐHQG-TPHCM"
   - Slide 01 (Bìa): Bố cục chuẩn theo ảnh mẫu (Tag cam "BÁO CÁO ĐỀ TÀI", thẻ GVHD, thẻ lớp K2025, thẻ trắng 2 cột 4 thành viên, và ảnh mockup bên phải).

Hãy ghi nhận toàn bộ bối cảnh trên. Hãy xác nhận bạn đã sẵn sàng hỗ trợ tôi tinh chỉnh slide, viết kịch bản thuyết trình và giải quyết các yêu cầu kỹ thuật tiếp theo theo chuẩn mực học thuật cao cấp nhất.
```

---

## PROMPT 2: YÊU CẦU CLAUDE CHỈNH SỬA & ĐIỀN NỘI DUNG TỪNG SLIDE CỤ THỂ
> **Cách dùng:** Dùng prompt này khi bạn muốn Claude viết lại chữ cho một slide cụ thể trong template (ví dụ Slide 07 hoặc Slide 18 đang bị dính chữ rác Mars/Venus).

```markdown
Dựa trên Master Context và format chuẩn của bộ slide gốc "Kỹ thuật Xử lý dữ liệu.ppt" (23 slide), hãy giúp tôi viết lại nội dung hoàn chỉnh cho [ĐIỀN SỐ SLIDE, ví dụ: Slide 18 - Kiến trúc Pipeline]. Nội dung đề xuất phải bám sát chính xác từng vị trí khung chữ và layout của slide này trong file gốc "Kỹ thuật Xử lý dữ liệu.ppt".

Yêu cầu cụ thể:
1. Định dạng hiển thị trên slide (On-Slide Content):
   - Cực kỳ ngắn gọn, súc tích theo dạng Bullet Points từ khóa: `[Từ khóa in đậm] : [Thông số định lượng / Kết luận]`.
   - Giới hạn: Tối đa 3 - 4 dòng, mỗi dòng từ 6 - 10 từ. Tuyệt đối không viết đoạn văn dài.
   - Làm nổi bật các số liệu khoa học (NRMSE, % cải thiện, thời lượng, số mốc).
2. Hiệu ứng trình chiếu (Presentation Dynamics):
   - Đề xuất hiệu ứng chuyển slide (Slide Transition): Fade / Push / Morph kèm thời lượng (0.5s - 0.6s).
   - Đề xuất hiệu ứng xuất hiện phần tử (Element Animation): Wipe / Zoom in / Fade in (On Click hoặc After Previous).
3. Media minh họa & Chuyển động:
   - Chỉ định rõ tệp ảnh từ `report/img/` (ví dụ: `slide_18_pipeline_architecture.png`).
   - Nếu là slide về trạm thực tế (Slide 04, 07) hoặc demo (Slide 20), gợi ý chèn video `report/img/station_operation_demo.mp4` hoặc ảnh động GIF `report/img/station_live_demo.gif` để tạo hiệu ứng chuyển động chân thực.
4. Lời thoại diễn giả (Speaker Notes): Cung cấp 3 - 4 câu nói tự nhiên, tự tin, mạch lạc để người thuyết trình nói trong 45 - 60 giây.
```

---

## PROMPT 3: SOẠN KỊCH BẢN THUYẾT TRÌNH KHỚP THỜI GIAN (SPEAKER SCRIPT 15 PHÚT)
> **Cách dùng:** Dùng prompt này để yêu cầu Claude viết kịch bản phân vai cho 4 thành viên trong nhóm.

```markdown
Hãy xây dựng cho nhóm chúng tôi một Kịch bản thuyết trình hoàn chỉnh (Speaker Script) cho buổi báo cáo bảo vệ đồ án môn học trước Giảng viên và Hội đồng UIT.

Thông tin cấu hình buổi báo cáo:
- Tổng số slide: Linh hoạt (dựa trên format chuẩn của bộ slide "Kỹ thuật Xử lý dữ liệu.ppt", miễn sao đầy đủ nội dung, chia đều thời lượng cho 4 thành viên).
- Phân công 4 thành viên (mỗi bạn phụ trách một phần chuyên môn sâu):
  + Bạn 1 (Nguyễn Đình Quốc Bảo): Trình bày Phần 1 & 2 (Tổng quan đề tài, Đặt vấn đề, Bối cảnh trạm IoT, Quy mô tập dữ liệu) — Khoảng 3.5 phút.
  + Bạn 2 (Nguyễn Lâm Y Khang): Trình bày Phần 2 tiếp theo (Danh mục cảm biến, Kiểm toán chất lượng & vật lý, Các phân tích khám phá EDA chuyên sâu) — Khoảng 4.5 phút.
  + Bạn 3 (Trần Minh Khôi): Trình bày Phần 3 & 4 (Kỹ thuật tiền xử lý, Benchmark điền khuyết NRMSE, Bộ lọc Outlier & Bảo vệ bón phân, Kiến trúc Pipeline) — Khoảng 3.5 phút.
  + Bạn 4 (Trương Hoàng Duy): Trình bày Phần 5 & 6 (Benchmark mô hình XGBoost/LSTM, Chiến lược Direct Knots 24h, Demo Web Dashboard Chili Farm OS, Tổng kết & Hướng mở rộng) — Khoảng 3.5 phút.

Yêu cầu định dạng kịch bản:
- Ghi rõ từng slide: [Số Slide] - [Tên Slide] - [Thời lượng ước tính].
- Lời thoại tự nhiên, học thuật, tự tin, chỉ rõ thời điểm diễn giả chỉ tay vào hình ảnh/biểu đồ trên slide.
- Nhấn mạnh các từ khóa "ăn điểm": hệ sinh thái đầu-cuối hoàn chỉnh từ phần cứng trạm IoT đến AI, kiểm toán vật lý thực nghiệm, luật đồng thuận bón phân, MICE vs Linear, XGBoost vượt trội +38.9% Skill, dải bất định thực nghiệm P10-P90.
```

---

## PROMPT 4: ĐÓNG VAI GIẢNG VIÊN PHẢN BIỆN — MOCK DEFENSE & 10 CÂU HỎI HÓC BÚA
> **Cách dùng:** Dùng prompt này để luyện tập trả lời câu hỏi phản biện của Thầy/Cô.

```markdown
Hãy đóng vai ThS. Võ Phương Bình và các Giảng viên phản biện khó tính, am hiểu sâu sắc về Machine Learning và Xử lý dữ liệu tại Đại học Công nghệ Thông tin UIT.

Hãy đưa ra danh sách 10 câu hỏi chất vấn hóc búa nhất nhằm kiểm tra mức độ hiểu sâu của nhóm về dữ liệu thực tế và thuật toán, tập trung vào:
1. Tại sao không xóa giá trị 0 của EC, N, P, K mà lại giữ lại khi độ ẩm đất < 12%?
2. Thuật toán Hampel hoạt động như thế nào, tại sao lại dùng MAD cục bộ 24h mà không dùng Standard Deviation toàn cục?
3. Cơ chế đồng thuận >= 3/4 biến EC-NPK bảo vệ đợt bón phân có cơ sở khoa học hóa học/vật lý nào hay chỉ là kinh nghiệm cảm tính?
4. Tại sao với chuỗi thời gian ngắn (<= 3h) thì Linear Interpolation lại tốt hơn các thuật toán phức tạp như KNN hay MICE? Khi nào MICE thực sự phát huy tác dụng?
5. Tại sao Savitzky-Golay cho sai số cực thấp nhưng nhóm lại không dùng cho mô hình dự báo online mà lại chọn EMA 0.3? Khái niệm rò rỉ tương lai (Data Leakage) ở đây là gì?
6. Tại sao lại dùng Time-series split mà không dùng K-fold Cross Validation thông thường?
7. Tại sao XGBoost và Random Forest lại chiến thắng mô hình học sâu LSTM trên tập dữ liệu này?
8. Kỹ thuật dự đoán phần gia tăng Delta_y giải quyết được nhược điểm cốt tử nào của Decision Trees trong bài toán dự báo chuỗi thời gian?
9. Cơ chế Direct Knots kết hợp dải bất định P10-P90 giải quyết bài toán gì so với cách tiếp cận dự báo đệ quy (Recursive Forecasting)?
10. Hệ thống Web Dashboard đóng vai trò gì trong việc chuyển giao công nghệ cho người nông dân/kỹ sư nông nghiệp thực tế?

Với mỗi câu hỏi, hãy cung cấp:
- Mục đích giảng viên muốn "bẫy" học viên ở điểm nào.
- Câu trả lời mẫu súc tích, đanh thép, chuẩn xác theo phương pháp luận khoa học dựa trên số liệu thực nghiệm đã đo đạc trong dự án.
```

---

## PROMPT 5: SINH CODE PYTHON (PYTHON-PPTX) TỰ ĐỘNG CHÈN NỘI DUNG & ẢNH VÀO SLIDE
> **Cách dùng:** Nếu bạn có file PowerPoint gốc (ví dụ `slide_goc.pptx`) và muốn viết script tự động điền text và dán các ảnh trong `report/img/` vào các slide.

```markdown
Tôi có thư mục chứa các ảnh biểu đồ mới tại `report/img/`:
- `slide_07_iot_station_sensors.png`
- `slide_11_eda_daily_trends.png`
- `slide_12_eda_hourly_cycles.png`
- `slide_13_eda_correlation_matrix.png`
- `slide_14_eda_npk_ec_scatter.png`
- `slide_15_eda_monthly_events.png`
- `slide_16_preprocessing_imputation.png`
- `slide_17_outlier_event_protection.png`
- `slide_18_pipeline_architecture.png`
- `slide_19_model_benchmark.png`
- `slide_19_direct_knots_uncertainty.png`
- `slide_20_demo_web_chili_os.png`

Hãy viết cho tôi một script Python hoàn chỉnh sử dụng thư viện `python-pptx` để:
1. Mở file PowerPoint gốc "Kỹ thuật Xử lý dữ liệu.ppt" (hoặc file mẫu tại "report/ChiliFarm_UIT_Presentation.pptx").
2. Tự động duyệt qua từng slide, tìm các text box chứa chữ rác (như "Venus", "Neptune", "Mars", "Saturn") và thay thế bằng nội dung kỹ thuật chuẩn của đồ án Chili Farm.
3. Chèn các hình ảnh biểu đồ tương ứng vào đúng vị trí của Slide 07, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20 với kích thước và tỷ lệ căn chỉnh chuẩn 16:9.
4. Lưu thành file mới `report/ChiliFarm_Slide_Final.pptx`.
```

---

## PROMPT 6: MỞ RỘNG SLIDE THÀNH BÁO CÁO / LUẬN VĂN ĐỒ ÁN CHI TIẾT
> **Cách dùng:** Dùng prompt này khi bạn cần viết cuốn Báo cáo đồ án môn học (Report Word / PDF 30 - 40 trang) dựa trên nội dung các slide.

```markdown
Dựa trên kiến trúc và kết quả thực nghiệm đã trình bày trong 23 slide của đồ án Chili Smart-Farm Data Lab, hãy giúp tôi viết nội dung chi tiết cho [Chương 3: Phương pháp Tiền xử lý Dữ liệu Thực nghiệm / Chương 4: Mô hình hóa & Đánh giá] theo văn phong luận văn khoa học cao học.

Cấu trúc yêu cầu:
- Trình bày mạch lạc theo mô hình: Đặt vấn đề thực tế -> Thách thức toán học/vật lý -> Đề xuất giải pháp -> Thiết kế thí nghiệm đối chứng -> Bảng kết quả định lượng (NRMSE, RMSE, MAE, sMAPE) -> Phân tích biện luận -> Quyết định chọn giải pháp cho pipeline cuối cùng.
- Trích dẫn các nghiên cứu và tài liệu tham khảo kinh điển (Hampel 1974, Troyanskaya et al. 2001 về KNN Imputation, van Buuren 2011 về MICE, Savitzky-Golay 1964, Hyndman về Time-series, Grinsztajn 2022 về Tree models vs Deep Learning).
- Văn phong khách quan, học thuật, chính xác, không dùng từ ngữ cảm tính.
```
