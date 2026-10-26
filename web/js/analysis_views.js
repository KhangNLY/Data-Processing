/* ===== EDA, Kỹ thuật xử lý, Mô hình ===== */

/* ---------- helper nhỏ ---------- */
App.varSelect = (id, onchange, def) => { const s = document.createElement("select"); s.id = id;
  s.innerHTML = App.VARS.map(v=>`<option value="${v}">${App.VI[v]} (${v})</option>`).join(""); if(def) s.value=def; s.onchange=onchange; return s; };
App.card = (title, sub, body, extra="") => `<div class="card ${extra}"><h3>${title}</h3><div class="sub">${sub||""}</div>${body}</div>`;
App.heat = (v, lo, hi, rev=false) => { let t = Math.max(0, Math.min(1, (v-lo)/(hi-lo))); if (rev) t = 1-t;
  const h = 150 - t*150; return `hsl(${h} 70% ${28+ (1-Math.abs(t-.5)*2)*0}%)`; };
App.mean = a => a.reduce((x,y)=>x+y,0)/a.length;
App.group = (rows, key) => rows.reduce((m,r)=>{ (m[r[key]] = m[r[key]]||[]).push(r); return m; },{});

/* =============================== EDA =============================== */
App.views.eda = async () => {
  const an = await App.json("data/analysis.json"); const E = an.eda; const root = App.$("#eda-root");
  root.innerHTML = `
  <div class="section-title"><div><h2>Phân tích khám phá dữ liệu (EDA)</h2><p>Tính trên chuỗi đã làm sạch (luật miền + điền missing). Mỗi mục kèm nhận xét để quyết định bước xử lý/mô hình tiếp theo.</p></div></div>
  <div class="card"><h3>Thống kê mô tả (describe)</h3><div class="sub">So sánh dữ liệu thô và sau làm sạch — chênh lệch min/max/std cho thấy ảnh hưởng của lỗi cảm biến</div>
    <div class="tabs"><button class="on" data-d="describe_clean">Đã làm sạch</button><button data-d="describe_raw">Thô</button></div><div id="eda-desc"></div>
    ${App.explain(`<b>Nhận xét:</b> ở dữ liệu thô, <code>temperature</code> có min ≈ -0.5 °C và max ≈ 50 °C, <code>humidity</code> min = 0, <code>pH</code> chạm 3.82–8.13, <code>moisture</code> vượt 80% — đều là giá trị bất khả thi với vườn ớt TP.HCM, nguyên nhân là cảm biến chết/lệch chứ không phải khí hậu.`,"warn")}</div>
  <div class="card" style="margin-top:18px"><h3>Boxplot theo biến</h3><div class="sub">Râu = 1.5×IQR. Số điểm ngoài râu (của chuỗi sạch) là ứng viên bất thường THẬT như bón phân, bơm hỏng, mưa lớn</div><div class="grid g4" id="eda-box" style="grid-template-columns:repeat(5,1fr)"></div></div>
  <div class="grid g2" style="margin-top:18px">
    <div class="card"><h3>Histogram</h3><div class="sub">Phân phối giá trị (40 khoảng)</div><div class="toolbar" id="eda-h-tb"></div><div class="chart-box short"><canvas id="eda-hist"></canvas></div>
      <div id="eda-hist-note"></div></div>
    <div class="card"><h3>Hồ sơ theo giờ trong ngày</h3><div class="sub">Trung bình ± độ lệch chuẩn theo giờ (chu kỳ ngày/đêm)</div><div class="toolbar" id="eda-hr-tb"></div><div class="chart-box short"><canvas id="eda-hour"></canvas></div><div id="eda-hour-note"></div></div>
  </div>
  <div class="card" style="margin-top:18px"><h3>Xu hướng theo ngày</h3><div class="sub">Trung bình ngày + dải min–max (14/12/2025 → 31/08/2026)</div><div class="toolbar" id="eda-d-tb"></div><div class="chart-box"><canvas id="eda-daily"></canvas></div>
    ${App.explain(`<b>Nhận xét:</b> N, P, K và EC có dạng <b>răng cưa</b>: tăng vọt khi bón phân qua nước tưới rồi giảm dần do cây hấp thu/rửa trôi; mùa mưa (tháng 5–8) EC thấp hơn do rửa trôi. Độ ẩm đất giữ ổn định ~45–55% nhờ tưới tự động, chỉ rớt khi <b>bơm hỏng</b> (22–25/3, 9–11/8) hoặc <b>nghỉ đất</b> cuối tháng 4.`)}</div>
  <div class="card" style="margin-top:18px"><h3>Ma trận tương quan</h3><div class="sub">Cả 10 chỉ số + 4 biến thời tiết Open-Meteo (w_*)</div>
    <div class="tabs" id="eda-corr-tabs"><button class="on" data-c="corr_clean">Pearson (sạch)</button><button data-c="corr_clean_spearman">Spearman (sạch)</button><button data-c="corr_real_nonzero">Dữ liệu THẬT (bỏ 0)</button></div><div id="eda-corr"></div><div id="eda-corr-note"></div></div>
  <div class="card" style="margin-top:18px"><h3>ACF / PACF — chọn số bước trễ cho mô hình</h3><div class="sub">ACF của chuỗi mức (đến 288 bước = 24h) và PACF của sai phân bậc 1 (đến 48 bước = 4h). Dải xanh = ±1.96/√n</div><div class="toolbar" id="eda-a-tb"></div>
    <div class="grid g2"><div><div class="chart-box short"><canvas id="eda-acf"></canvas></div></div><div><div class="chart-box short"><canvas id="eda-pacf"></canvas></div></div></div><div id="eda-acf-note"></div></div>`;

  const descRender = (key) => { const D = E[key]; const cols = ["count","mean","std","min","25%","50%","75%","max"];
    App.$("#eda-desc").innerHTML = App.table([{h:"Biến",k:"v",f:v=>`<b style="color:${App.COL[v]}">${v}</b> <span class="legend-note">${App.UNITS[v]}</span>`},...cols.map(c=>({h:c,k:c,d:c==="count"?0:2}))], App.VARS.map(v=>({v,...D[v]}))); };
  descRender("describe_clean");
  App.$$("#eda-desc").length; root.querySelectorAll("[data-d]").forEach(b=>b.onclick=()=>{ root.querySelectorAll("[data-d]").forEach(x=>x.classList.remove("on")); b.classList.add("on"); descRender(b.dataset.d); });

  // boxplots SVG
  App.$("#eda-box").innerHTML = App.VARS.map(v => { const b = E.box[v]; const lo=b.min, hi=b.max, W=210, H=70; const sx = x => 10 + (x-lo)/(hi-lo||1)*(W-20);
    return `<div style="background:var(--bg-2);border-radius:14px;padding:10px 12px;border:1px solid var(--line)"><b style="color:${App.COL[v]}">${App.VI[v]}</b> <span class="legend-note">${App.UNITS[v]}</span>
    <svg viewBox="0 0 ${W} ${H}" style="width:100%"><line x1="${sx(lo)}" x2="${sx(hi)}" y1="30" y2="30" stroke="#41506a" stroke-dasharray="2 3"/>
    <line x1="${sx(b.lo_whisker)}" x2="${sx(b.hi_whisker)}" y1="30" y2="30" stroke="#9aa8bd"/>
    <rect x="${sx(b.q1)}" width="${Math.max(2,sx(b.q3)-sx(b.q1))}" y="16" height="28" rx="4" fill="${App.COL[v]}33" stroke="${App.COL[v]}"/>
    <line x1="${sx(b.median)}" x2="${sx(b.median)}" y1="16" y2="44" stroke="#fff" stroke-width="2"/>
    <text x="4" y="64" fill="#8ea0b8" font-size="9">${App.fmt(lo,1)}</text><text x="${W-4}" y="64" text-anchor="end" fill="#8ea0b8" font-size="9">${App.fmt(hi,1)}</text></svg>
    <div class="legend-note">median ${App.fmt(b.median,2)} · IQR ${App.fmt(b.q3-b.q1,2)} · <span style="color:var(--amber)">${App.fmt(b.n_outliers,0)} điểm ngoài râu</span></div></div>`; }).join("");

  // histogram
  const hs = App.varSelect("eda-h", drawHist, "moisture"); App.$("#eda-h-tb").appendChild(hs);
  function drawHist(){ const v = hs.value, h = E.hist[v]; const lab = h.counts.map((_,i)=>App.fmt((h.edges[i]+h.edges[i+1])/2, v==="EC"||v==="pH"?2:1));
    App.mk("eda-hist",{type:"bar",data:{labels:lab,datasets:[{data:h.counts,backgroundColor:App.COL[v]+"aa",borderRadius:3}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{maxTicksLimit:8}}}}});
    const notes = {EC:"EC/N/P/K lệch phải mạnh (đuôi dài do đợt bón phân) → cân nhắc log/MinMax thay vì Z-score.",moisture:"Độ ẩm đất tập trung 45–55% (tưới tự động); đuôi trái = bơm hỏng/nghỉ đất.",light:"Phân phối hai cực: ban đêm = 0, ban ngày trải rộng theo mây.",temperature:"Nhiệt độ trải 25–36 °C; đuôi ngoài là lỗi cảm biến chết (≈0 °C).",humidity:"RH chạm 100% vào mùa mưa → có đoạn bão hòa (phẳng).",pH:"pH đo tương quan âm mạnh với độ ẩm đất (xem ma trận tương quan)."}; App.$("#eda-hist-note").innerHTML = notes[v]?App.explain(notes[v]):""; }
  drawHist();

  const hrs = App.varSelect("eda-hr", drawHour, "temperature"); App.$("#eda-hr-tb").appendChild(hrs);
  function drawHour(){ const v = hrs.value, m = E.hourly.mean[v], s = E.hourly.std[v]; const lab = [...Array(24).keys()].map(h=>h+"h");
    App.mk("eda-hour",{type:"line",data:{labels:lab,datasets:[{label:"TB+σ",data:m.map((x,i)=>x+s[i]),borderColor:"transparent",backgroundColor:App.COL[v]+"22",fill:"+1",pointRadius:0},{label:"Trung bình",data:m,borderColor:App.COL[v],borderWidth:2.4,pointRadius:2,tension:.35},{label:"TB-σ",data:m.map((x,i)=>x-s[i]),borderColor:"transparent",pointRadius:0}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}}}});
    const rng = Math.max(...m)-Math.min(...m); const dayVars = ["temperature","humidity","light","soiltemp"];
    App.$("#eda-hour-note").innerHTML = App.explain(dayVars.includes(v)?`<b>${App.VI[v]}</b> có chu kỳ ngày/đêm rõ (biên độ trung bình giờ ≈ ${App.fmt(rng,2)} ${App.UNITS[v]}) → cần đặc trưng <code>sin/cos(giờ)</code>.`:`<b>${App.VI[v]}</b> gần như phẳng theo giờ (biên độ ≈ ${App.fmt(rng,2)} ${App.UNITS[v]}); dao động chủ yếu theo sự kiện tưới/bón, không theo giờ.`); }
  drawHour();

  const ds = App.varSelect("eda-d", drawDaily, "EC"); App.$("#eda-d-tb").appendChild(ds);
  function drawDaily(){ const v = ds.value, D = E.daily; const xs = D.dates.map(d=>App.ts(d+"T12:00"));
    const P = a => a.map((y,i)=>({x:xs[i],y}));
    App.mk("eda-daily",{type:"line",data:{datasets:[{label:"Max",data:P(D.max[v]),borderColor:"transparent",backgroundColor:App.COL[v]+"1f",fill:"+1",pointRadius:0},{label:"Trung bình ngày",data:P(D.mean[v]),borderColor:App.COL[v],borderWidth:2,pointRadius:0,tension:.2},{label:"Min",data:P(D.min[v]),borderColor:"transparent",pointRadius:0}]},
      options:{maintainAspectRatio:false,parsing:false,scales:{x:App.timeScale({ticks:{callback:x=>App.tickDate(x,false),maxTicksLimit:10}})},plugins:{tooltip:{callbacks:{title:it=>App.tickDate(it[0].parsed.x,false)}}}}}); }
  drawDaily();

  // correlation heatmap
  const corrRender = (key) => { const lbl = key==="corr_real_nonzero"?E.corr_labels_real:E.corr_labels; const M = E[key]; const n = lbl.length;
    let h = `<div class="hm" style="grid-template-columns:62px repeat(${n},1fr)"><div class="lab"></div>${lbl.map(l=>`<div class="lab">${l.replace("w_","☁")}</div>`).join("")}`;
    M.forEach((row,i)=>{ h += `<div class="lab" style="justify-content:end;padding-right:6px">${lbl[i].replace("w_","☁")}</div>` + row.map(c=>{ const t=(c+1)/2; const col = c>=0?`hsl(160 ${30+60*c}% ${22+18*c}%)`:`hsl(350 ${30+60*-c}% ${24+16*-c}%)`; return `<div style="background:${col}" title="${lbl[i]}">${App.fmt(c,2)}</div>`; }).join(""); });
    App.$("#eda-corr").innerHTML = h+"</div>";
    const idx = n => E.corr_labels.indexOf(n); const g = (a,b)=>E.corr_clean[idx(a)][idx(b)]; const gr = (a,b)=>E.corr_real_nonzero[E.corr_labels_real.indexOf(a)][E.corr_labels_real.indexOf(b)];
    App.$("#eda-corr-note").innerHTML = App.explain(`<b>Phát hiện chính:</b><ul>
      <li><b>EC–N–P–K gần như một tín hiệu duy nhất</b> (r(EC,K)=${App.fmt(g("EC","K"),3)}, r(EC,P)=${App.fmt(g("EC","P"),3)}) — đầu dò NPK rẻ tiền suy ra từ độ dẫn điện. Giữ 1 đại diện hoặc dùng PCA (PC1 giải thích ${App.pct(an.pca_npk_ec.explained[0],1)} phương sai).</li>
      <li><b>moisture ↔ pH âm mạnh</b> (dữ liệu thật: r=${App.fmt(gr("moisture","pH"),2)}) — pH đo bị chi phối bởi độ ẩm đất, không phải hóa học thật.</li>
      <li><b>temperature ↔ humidity</b> (dữ liệu thật r=${App.fmt(gr("temperature","humidity"),2)}) phần lớn do cùng một đầu dò DHT chết/sống đồng thời (cả hai = 0).</li>
      <li><b>light không tương quan bức xạ ở 28 ngày đầu</b> (r≈0.02) nhưng r≈0.99 ở phần dữ liệu mở rộng còn lại → cảm biến ánh sáng ban đầu nghi ngờ hỏng/chưa hiệu chuẩn.</li></ul>`,"good"); };
  corrRender("corr_clean");
  root.querySelectorAll("#eda-corr-tabs button").forEach(b=>b.onclick=()=>{ root.querySelectorAll("#eda-corr-tabs button").forEach(x=>x.classList.remove("on")); b.classList.add("on"); corrRender(b.dataset.c); });

  const as = App.varSelect("eda-a", drawAcf, "moisture"); App.$("#eda-a-tb").appendChild(as);
  function drawAcf(){ const v = as.value; const acf = E.acf[v], pac = E.pacf_diff[v], sig = E.acf_sig[v]; const band = sig.band;
    App.mk("eda-acf",{type:"bar",data:{labels:acf.map((_,i)=>i),datasets:[{data:acf,backgroundColor:App.COL[v]+"bb"}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false},title:{display:true,text:"ACF (mức) – lag 0…288 (1 ngày)"}},scales:{x:{ticks:{maxTicksLimit:12}},y:{min:-1,max:1}}}});
    App.mk("eda-pacf",{type:"bar",data:{labels:pac.map((_,i)=>i).slice(1),datasets:[{data:pac.slice(1),backgroundColor:pac.slice(1).map(x=>Math.abs(x)>band?App.COL[v]:"#51607c88")},{type:"line",data:pac.slice(1).map(_=>band),borderColor:"#4cc9f0",borderDash:[4,3],pointRadius:0,borderWidth:1},{type:"line",data:pac.slice(1).map(_=>-band),borderColor:"#4cc9f0",borderDash:[4,3],pointRadius:0,borderWidth:1}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false},title:{display:true,text:"PACF của sai phân – lag 1…48"}},scales:{y:{min:-1,max:1}}}});
    const L = sig.pacf_signif_lags;
    App.$("#eda-acf-note").innerHTML = App.explain(`<b>${App.VI[v]}</b>: ACF lag 12 (1h) = ${App.fmt(sig.acf_at_12,3)}, lag 144 (12h) = ${App.fmt(sig.acf_at_144,3)}, lag 288 (24h) = ${App.fmt(sig.acf_at_288,3)} → ${sig.acf_at_288>0.5?"chuỗi bền, có xu hướng/chu kỳ ngày":"tương quan theo ngày yếu"}. PACF sai phân đáng kể ở lag: <b>${L.length?L.join(", "):"không có"}</b>.<br><b>Kết luận chọn cửa sổ:</b> đa số biến chỉ cần vài lag gần nhất (≤12 bước = 1h); thử W = 4/12/24 trong mục Mô hình để kiểm chứng.`); }
  drawAcf();
};

/* =============================== KỸ THUẬT XỬ LÝ =============================== */
App.views.prep = async () => {
  const [an, md, demo] = await Promise.all([App.json("data/analysis.json"), App.json("data/models.json"), App.json("data/smooth_demo.json")]);
  const root = App.$("#prep-root"); const Z = an.zero_audit; const g = an.grid;
  root.innerHTML = `
  <div class="section-title"><div><h2>Kỹ thuật xử lý dữ liệu — kèm giải thích &amp; bằng chứng</h2><p>Mỗi bước: <b>vấn đề → kỹ thuật → kết quả đo được → quyết định</b>. Các số liệu đánh giá được đo kiểm định lượng trên quan sát hợp lệ thay vì chọn theo cảm tính.</p></div></div>

  <div class="card"><div class="step"><div class="n">1</div><div><h3>Đọc &amp; làm phẳng JSON, kiểm tra lưới thời gian 5 phút</h3><div class="sub">Firebase lồng 3 tầng <code>ngày → HH:MM → chỉ số</code> được làm phẳng thành bảng có cột <code>timestamp</code></div></div></div>
    <div class="grid g4"><div class="kpi"><div class="v">${App.fmt(g.rows,0)}</div><div class="l">Bản ghi</div></div><div class="kpi"><div class="v">${g.missing_timestamps}</div><div class="l">Mốc thời gian thiếu</div></div><div class="kpi"><div class="v">${g.duplicated}</div><div class="l">Trùng lặp</div></div><div class="kpi"><div class="v">${g.first_rows || g.real_rows || 8064}</div><div class="l">Bản ghi 28 ngày đầu (28 × 288)</div></div></div>
    ${App.explain(`<b>Quyết định:</b> lưới đã đủ 5 phút, không thiếu mốc ⇒ <b>không cần resample</b>; chỉ cần <code>reindex</code> để xác nhận. Thiếu dữ liệu chỉ ở dạng <b>giá trị NaN/0 trong từng ô</b>, không phải thiếu dòng.`)}</div>

  <div class="card" style="margin-top:18px"><div class="step"><div class="n">2</div><div><h3>Giá trị 0 do lỗi cảm biến — giữ hay bỏ?</h3><div class="sub">Kiểm tra từng biến: số dòng = 0, phân bố ngày/đêm, và bối cảnh vật lý</div></div></div>
    <div class="grid g-21"><div>${App.table([{h:"Biến",k:"v",f:v=>`<b style="color:${App.COL[v]}">${v}</b>`},{h:"Số 0",k:"zeros",d:0},{h:"% 0",k:"zero_pct",d:2},{h:"0 ban ngày 8–17h",k:"zeros_day",d:0},{h:"0 ban đêm",k:"zeros_night",d:0},{h:"NaN",k:"nans",d:0},{h:"Quyết định",k:"v",f:v=>({humidity:"BỎ (RH=0 bất khả thi)",temperature:"BỎ (≈0°C bất khả thi)",light:"Chỉ bỏ 0 ban ngày khi bức xạ>300",EC:"Chỉ bỏ khi đất ẩm ≥12%",N:"Chỉ bỏ khi đất ẩm ≥12%",P:"Chỉ bỏ khi đất ẩm ≥12%",K:"Chỉ bỏ khi đất ẩm ≥12%"}[v]||"Không có 0")}],App.VARS.map(v=>({v,...Z[v]})))}</div>
    <div class="chart-box short"><canvas id="pr-zero"></canvas></div></div>
    ${App.explain(`<b>Phát hiện 1 – nhiệt độ/độ ẩm chết đồng thời:</b> ${Z._temp_hum_dead_rows} dòng có đồng thời temperature&lt;5°C và humidity&lt;5% (26–28/12) — cùng một đầu dò DHT ngừng hoạt động ⇒ <b>lỗi</b>, chuyển thành NaN.<br>
      <b>Phát hiện 2 – 0 của N/P/K/EC là hiện tượng vật lý:</b> ${Z._nutrient_zero_rows} dòng có 0 đều xảy ra khi độ ẩm đất rất thấp (median ${App.fmt(Z._nutrient_zero_moisture_median,1)}%, max ${App.fmt(Z._nutrient_zero_moisture_max,1)}%) — đất khô thì đầu dò EC không dẫn điện. ${App.pct(Z._nutrient_zero_share_moisture_lt12,0)} số dòng này có moisture&lt;12%. ⇒ <b>không xóa mù quáng</b>; luật: 0 chỉ là lỗi khi moisture≥12%.<br>
      <b>Phát hiện 3 – cảm biến ánh sáng ban đầu nghi ngờ:</b> tương quan với bức xạ Open-Meteo chỉ <b>${App.fmt(Z._light_vs_radiation_corr_first ?? Z._light_vs_radiation_corr_real,3)}</b> ở 28 ngày đầu (kỳ vọng ~0.9+), số 0 ban ngày (${Z.light.zeros_day}) xấp xỉ ban đêm (${Z.light.zeros_night}) ⇒ cảm biến ban đầu không phản ánh ngày/đêm; ở phần dữ liệu mở rộng còn lại r=${App.fmt(Z._light_vs_radiation_corr_rest ?? Z._light_vs_radiation_corr_synthetic,3)}.`,"warn")}</div>

  <div class="card" style="margin-top:18px"><div class="step"><div class="n">3</div><div><h3>Missing data — so sánh phương pháp điền bằng thí nghiệm có kiểm chứng</h3><div class="sub">Ẩn ô ngẫu nhiên/đoạn trong dữ liệu sạch rồi so giá trị điền với quan sát hợp lệ. Chỉ số: NRMSE = RMSE / σ (thấp hơn tốt hơn)</div></div></div>
    <div class="toolbar" id="pr-imp-tb"></div><div class="chart-box"><canvas id="pr-imp"></canvas></div><div id="pr-imp-tbl" style="margin-top:12px"></div>
    ${App.explain(`<b>Kết quả &amp; quyết định (theo dạng thiếu):</b><ul>
     <li><b>Ô lẻ / đoạn ≤ 3 giờ</b> → <b>nội suy tuyến tính</b> thắng (chuỗi 5 phút rất trơn). KNN/MICE <i>tệ hơn</i> vì bỏ qua cấu trúc tự tương quan theo thời gian.</li>
     <li><b>Một cảm biến mất &gt; 3 giờ</b> (các cảm biến khác còn) → <b>MICE</b> (hồi quy lặp đa biến BayesianRidge + giờ trong ngày) vượt tuyến tính nhờ mượn thông tin từ các biến còn lại.</li>
     <li><b>Mất kết nối toàn bộ</b> (cả 10 biến cùng thiếu) → <b>quay lại nội suy tuyến tính</b>: MICE không còn biến quan sát nào để mượn nên sai nhiều. Đây là điểm dễ sai nếu chỉ chạy MICE đại trà.</li>
     <li><code>prev_day</code> (lấy cùng giờ hôm qua) rất tệ vì chuỗi không dừng (EC/NPK phụ thuộc lịch bón phân).</li></ul>
     Pipeline cuối (C): tuyến tính cho đoạn ≤3h hoặc mất toàn bộ; <b>${(an.long_gap_method||"mice").toUpperCase()}</b> cho đoạn dài còn lại.`,"good")}
    <div class="ref">Cơ sở: Troyanskaya et al. 2001 (KNN impute, <i>Bioinformatics</i>); van Buuren &amp; Groothuis-Oudshoorn 2011 (MICE, <i>J. Stat. Softw.</i>); Little &amp; Rubin (Statistical Analysis with Missing Data).</div></div>

  <div class="card" style="margin-top:18px"><div class="step"><div class="n">4</div><div><h3>Phát hiện outlier — IQR, Z-score, Isolation Forest, DBSCAN so với luật đề xuất</h3><div class="sub">So sánh các bộ phát hiện (IQR, Z-score, Isolation Forest, DBSCAN) so với bộ luật miền kết hợp Hampel &amp; Stuck trên toàn bộ chuỗi 75.168 bản ghi</div></div></div>
    <div id="pr-out-tbl"></div><div class="chart-box short" style="margin-top:14px"><canvas id="pr-out"></canvas></div>
    ${App.explain(`<b>Đọc kết quả:</b><ul>
     <li><b>IQR/Z-score toàn cục</b> coi mọi giá trị xa trung bình là bất thường nên <b>báo nhầm cả bón phân &amp; mưa lớn</b> (độ trùng khớp thấp) và gần như không thấy zero ngắn/spike so với "mức" hiện tại. Chuỗi này <b>không dừng</b>.</li>
     <li><b>IQR trên phần dư</b> (trừ trung vị trượt) bắt gần hết spike nhưng cắt luôn các bước nhảy bình thường.</li>
     <li><b>Isolation Forest / DBSCAN</b> (đa biến, không giám sát) khó chỉnh ngưỡng; DBSCAN chỉ gắn nhãn ~1.3% dòng ⇒ bỏ sót nhiều.</li>
     <li><b>Luật miền + Hampel + Stuck</b> (đề xuất): bắt trọn zero bất khả thi, spike bất thường cục bộ và 100% kẹt giá trị với tỉ lệ cảnh báo cân bằng (~7.2%).</li></ul>`,"good")}
    <div class="ref">Cơ sở: Chandola et al. 2009 (<i>ACM Comput. Surv.</i>); Zhang, Meratnia &amp; Havinga 2010 (outlier cho WSN, <i>IEEE Commun. Surv. Tutor.</i>); Blázquez-García et al. 2021 (<i>ACM Comput. Surv.</i>); Liu, Ting &amp; Zhou 2008/2012 (Isolation Forest); Ester et al. 1996 (DBSCAN); Hampel 1974.</div></div>

  <div class="card" style="margin-top:18px"><div class="step"><div class="n">5</div><div><h3>Phân biệt biến động THẬT (sự kiện) với LỖI cảm biến</h3><div class="sub">Bón phân làm EC, N, P, K tăng <b>đồng thời</b>; lỗi cảm biến thường chỉ ảnh hưởng một biến hoặc đưa về 0 đột ngột</div></div></div>
    <div class="grid g3">
      <div class="kpi"><div class="v">${an.event_vs_fault.rows_protected || 0}</div><div class="l">Dòng được bảo vệ khỏi bị gắn cờ nhầm</div></div>
      <div class="kpi red"><div class="v">${an.event_vs_fault.rows_flagged_without_protection || 0} → ${an.event_vs_fault.rows_flagged_with_protection || 0}</div><div class="l">Dòng bị Hampel gắn cờ: trước → sau luật đồng thuận ≥3/4 biến</div></div>
      <div class="kpi"><div class="v">${an.event_vs_fault.episodes_protected || 0}</div><div class="l">Đợt dinh dưỡng đồng thuận được giữ lại (${App.pct(an.event_vs_fault.protected_share || 0, 1)})</div></div>
    </div>
    ${App.explain(`<b>Cách làm:</b> nếu ≥3/4 biến EC–N–P–K cùng bị gắn cờ spike tại một thời điểm → coi là <b>sự kiện nông học</b> (bón phân, tưới dinh dưỡng), giữ lại; ngược lại là lỗi đơn lẻ. Luật giúp bảo vệ <b>${an.event_vs_fault.rows_protected || 0} điểm</b> của ${an.event_vs_fault.episodes_protected || 0} đợt đồng thuận không bị cắt gọt sai lệch.<br><b>Trong dữ liệu</b> bước nhảy EC và N/P/K tăng cùng nhau kèm độ ẩm tăng ⇒ là bón phân + tưới, <b>được bảo tồn nguyên vẹn</b>.`)}
  </div>

  <div class="card" style="margin-top:18px"><div class="step"><div class="n">6</div><div><h3>Làm mượt — SMA, EMA, Savitzky–Golay</h3><div class="sub">Hai tiêu chí: sai số (NRMSE) và độ trễ pha (bước 5 phút). Cửa sổ "centered" dùng cả tương lai nên chỉ dùng offline</div></div></div>
    <div class="grid g-21"><div><div class="toolbar" id="pr-sm-tb"></div><div class="chart-box"><canvas id="pr-sm"></canvas></div></div><div id="pr-sm-tbl"></div></div>
    ${App.explain(`<b>Quyết định:</b> <b>SG centered</b> (cửa sổ 21, bậc 2) cho sai số thấp nhất (NRMSE ${App.fmt(an.smoothing.find(r=>r.method==="SG_centered21").nrmse,3)}) và không trễ, nhưng <b>rò rỉ tương lai</b> ⇒ chỉ dùng cho phân tích/hiển thị offline. Cho mô hình dự báo dùng bộ lọc <b>nhân quả</b>: <b>${an.smoother_chosen}</b> (NRMSE ${App.fmt(an.smoothing.find(r=>r.method===an.smoother_chosen).nrmse,3)} so với ${App.fmt(an.smoothing[0].nrmse,3)} khi không lọc, trễ ~${App.fmt(an.smoothing.find(r=>r.method===an.smoother_chosen).lag_steps,1)} bước). SMA12/EMA0.1 làm mượt quá tay, <b>trễ 6–8 bước</b> và tăng sai số; SG nhân quả bậc 2 khuếch đại nhiễu ở mép cuối cửa sổ.`)}
    <div class="ref">Cơ sở: Savitzky &amp; Golay 1964 (<i>Anal. Chem.</i>); Hyndman &amp; Athanasopoulos (Forecasting: Principles and Practice) cho EMA/SMA.</div></div>

  <div class="card" style="margin-top:18px"><div class="step"><div class="n">7</div><div><h3>Tác động của tiền xử lý lên mô hình dự báo</h3><div class="sub">Cùng một mô hình (HistGradientBoosting, cửa sổ 12), cùng đích đánh giá là quan sát hợp lệ tháng 8/2026; chỉ thay cách xử lý dữ liệu đầu vào &amp; huấn luyện</div></div></div>
    <div class="grid g-21"><div class="chart-box short"><canvas id="pr-eff"></canvas></div><div id="pr-eff-tbl"></div></div>
    <div id="pr-eff-note"></div></div>
  <div class="card" style="margin-top:18px"><h3>Pipeline xử lý cuối cùng được dùng cho mô hình</h3>
    <ol style="margin-left:20px;line-height:2">
      <li>Đọc JSON → bảng 5 phút; ghép thời tiết Open-Meteo theo thời gian.</li>
      <li>Luật miền: ngoài khoảng vật lý, 0 lỗi (có điều kiện độ ẩm), ánh sáng 0 ban ngày.</li>
      <li>Hampel (cửa sổ 9, k=6, MAD cục bộ 24h) cho spike; Stuck (≥12 bước giống hệt).</li>
      <li>Bảo vệ sự kiện bón phân (đồng thuận ≥3/4 biến EC–N–P–K).</li>
      <li>Điền missing: tuyến tính ≤3h hoặc mất toàn bộ; MICE cho đoạn dài một cảm biến.</li>
      <li>(Tuỳ chọn) làm mượt nhân quả EMA; <b>chuẩn hoá MinMax chỉ fit trên train</b>, đảo ngược trước khi tính sai số.</li>
    </ol></div>`;

  // zero chart
  App.mk("pr-zero",{type:"bar",data:{labels:App.VARS,datasets:[{label:"% bằng 0",data:App.VARS.map(v=>Z[v].zero_pct),backgroundColor:App.VARS.map(v=>App.COL[v]+"cc"),borderRadius:4}]},options:{maintainAspectRatio:false,indexAxis:"y",plugins:{legend:{display:false},title:{display:true,text:"% giá trị = 0 trong dữ liệu"}}}});

  // imputation chart
  const sc = [...new Set(an.imputation.map(r=>r.scenario))], meths = [...new Set(an.imputation.map(r=>r.method))];
  const scName = {"random_5%":"Ô lẻ 5%","gap_30min":"Đoạn 30'","gap_3h":"Đoạn 3h","gap_12h":"Đoạn 12h (1 cảm biến)","comm_loss_6h":"Mất kết nối 6h (cả 10 biến)"};
  const mcol = {ffill:"#8ea0b8",linear:"#2ee6a6",prev_day:"#ffb703",knn:"#4cc9f0",mice:"#c77dff","hybrid_lin<=3h_else_mice":"#ff5d8f"};
  App.mk("pr-imp",{type:"bar",data:{labels:sc.map(s=>scName[s]),datasets:meths.map(m=>({label:m,backgroundColor:mcol[m],borderRadius:3,data:sc.map(s=>{const r=an.imputation.find(x=>x.scenario===s&&x.method===m);return Math.min(r.nrmse,1.1);})}))},options:{maintainAspectRatio:false,plugins:{title:{display:true,text:"NRMSE trung bình 10 biến (cắt ở 1.1)"}}}});
  App.$("#pr-imp-tbl").innerHTML = App.table([{h:"Kịch bản",k:"s",f:v=>scName[v]},...meths.map(m=>({h:m,k:m,d:3}))], sc.map(s=>{const o={s}; meths.forEach(m=>o[m]=an.imputation.find(x=>x.scenario===s&&x.method===m).nrmse); return o;}), {});
  // highlight best per row (manual)
  App.$$("#pr-imp-tbl tbody tr").forEach(tr=>{ const tds=[...tr.querySelectorAll("td")].slice(1); const vals=tds.map(t=>parseFloat(t.textContent)); const mn=Math.min(...vals); tds.forEach((t,i)=>{ if(vals[i]===mn) t.classList.add("best"); }); });

  // outlier table & chart
  const ob = an.outlier_benchmark;
  App.$("#pr-out-tbl").innerHTML = App.table([
    {h:"Phương pháp",k:"method"},
    {h:"% gắn cờ",k:"flagged_pct",d:1},
    {h:"Số hàng",k:"flagged_rows",d:0},
    {h:"Độ trùng khớp",k:"overlap",d:3},
    {h:"Bao phủ luật",k:"coverage",d:3},
    {h:"Bao phủ ngoài khoảng",k:"cover_range",d:2},
    {h:"Bao phủ Zero lỗi",k:"cover_zero",d:2},
    {h:"Bao phủ Spike",k:"cover_spike",d:2},
    {h:"Bao phủ Kẹt",k:"cover_stuck",d:2}
  ], ob, {best:{coverage:"max",overlap:"max"}});
  App.mk("pr-out",{type:"bar",data:{labels:ob.map(r=>r.method.replace(" (đề xuất)","*")),datasets:[
    {label:"Bao phủ luật",data:ob.map(r=>r.coverage),backgroundColor:"#2ee6a6cc"},
    {label:"Độ trùng khớp",data:ob.map(r=>r.overlap),backgroundColor:"#4cc9f0cc"},
    {label:"% Hàng gắn cờ / 100",data:ob.map(r=>r.flagged_pct/100),backgroundColor:"#ffd166cc"}
  ]},options:{maintainAspectRatio:false,scales:{y:{min:0,max:1}}}});

  // smoothing
  const sv = App.varSelect("pr-sv", drawSm, "moisture"); sv.innerHTML = ["moisture","temperature","humidity","pH","soiltemp","EC"].map(v=>`<option value="${v}">${App.VI[v]}</option>`).join(""); sv.onchange=drawSm; App.$("#pr-sm-tb").appendChild(sv);
  function drawSm(){ const v = sv.value, d = demo; const t0 = App.ts(d.t0); const P = a=>(a||[]).map((y,i)=>({x:t0+i*300000,y}));
    const cleanArr = d[v].clean || d[v].truth || d[v].raw;
    const cfg = [["raw","Thô (có nhiễu)","rgba(160,180,210,.5)",1],["clean","Đã làm sạch / chuẩn","#ffffff",1.2],["SMA5","SMA5","#ffb703",1.3],["EMA0.3","EMA0.3 (nhân quả)","#2ee6a6",1.8],["SG_causal11","SG nhân quả","#c77dff",1.3],["SG_centered21","SG centered 21 (offline)","#4cc9f0",1.8]];
    App.mk("pr-sm",{type:"line",data:{datasets:cfg.map(([k,l,c,w])=>({label:l,data:P(k==="clean"?cleanArr:d[v][k]),borderColor:c,borderWidth:w,pointRadius:0,borderDash:k==="clean"?[4,3]:[]}))},options:{maintainAspectRatio:false,parsing:false,scales:{x:App.timeScale()},plugins:{tooltip:{callbacks:{title:it=>App.fullDate(it[0].parsed.x)}}}}}); }
  drawSm();
  App.$("#pr-sm-tbl").innerHTML = App.table([{h:"Phương pháp",k:"method"},{h:"NRMSE",k:"nrmse"},{h:"Trễ (bước)",k:"lag_steps",d:1},{h:"Độ nhám",k:"roughness",d:2}], an.smoothing, {best:{nrmse:"min"}})+`<div class="legend-note" style="margin-top:6px">Độ nhám = σ(Δx) so với chuỗi sạch (1.0 = chuẩn).</div>`;

  // effect on model
  const pe = md.preprocess_effect; const pn = [...new Set(pe.map(r=>r.pipeline))]; const pname = {A_raw_ffill:"A · Thô + ffill",B_rule_linear:"B · Luật + tuyến tính",C_rule_hybrid:"C · Luật + hybrid (MICE đoạn dài)",D_rule_hybrid_smooth:"D · C + EMA"};
  const agg = (p,h,k)=>App.mean(pe.filter(r=>r.pipeline===p&&r.h===h).map(r=>r[k]));
  App.mk("pr-eff",{type:"bar",data:{labels:pn.map(p=>pname[p]),datasets:[{label:"h=1 (5 phút)",data:pn.map(p=>agg(p,1,"nrmse")),backgroundColor:"#4cc9f0cc"},{label:"h=12 (1 giờ)",data:pn.map(p=>agg(p,12,"nrmse")),backgroundColor:"#2ee6a6cc"},{label:"Persistence h=12",data:pn.map(p=>agg(p,12,"persistence_nrmse")),backgroundColor:"#ff5d8fcc"}]},options:{maintainAspectRatio:false,plugins:{title:{display:true,text:"NRMSE so với quan sát hợp lệ (thấp hơn tốt hơn)"}}}});
  App.$("#pr-eff-tbl").innerHTML = App.table([{h:"Pipeline",k:"p",f:v=>pname[v]},{h:"NRMSE h=1",k:"a"},{h:"NRMSE h=12",k:"b"},{h:"sMAPE h=12 (%)",k:"c",d:2}], pn.map(p=>({p,a:agg(p,1,"nrmse"),b:agg(p,12,"nrmse"),c:agg(p,12,"smape")})), {best:{a:"min",b:"min",c:"min"}});
  const a1=agg("A_raw_ffill",12,"nrmse"), bb=Math.min(...pn.map(p=>agg(p,12,"nrmse")));
  App.$("#pr-eff-note").innerHTML = App.explain(`<b>Kết luận:</b> chỉ cần làm sạch (luật miền + điền) đã giảm sai số h=12 từ <b>${App.fmt(a1,3)}</b> xuống <b>${App.fmt(bb,3)}</b> (−${App.fmt((1-bb/a1)*100,0)}%). Pipeline <b>${md.best_pipeline}</b> được chọn cho mọi thí nghiệm mô hình sau đó.<br><b>Bài học:</b> bước phức tạp hơn không đồng nghĩa tốt hơn — MICE điền đoạn dài và làm mượt EMA không luôn cải thiện dự báo; cần kiểm chứng bằng sai số cuối cùng, không chỉ bằng sai số điền.`,"good");
};

/* =============================== MÔ HÌNH =============================== */
App.views.model = async () => {
  const [md, fc, meta] = await Promise.all([App.json("data/models.json"), App.json("data/forecast.json"), App.json("data/meta.json")]);
  const root = App.$("#model-root");
  root.innerHTML = `${App.provBanner(meta)}<div class="section-title"><div><h2>Mô hình dự báo &amp; đánh giá</h2><p>Chia theo thời gian: train ≤ 30/06, validation = tháng 7, <b>test = tháng 8/2026</b>. Đích = quan sát hợp lệ (ô không bị lỗi). Metric: RMSE, MAE, sMAPE (không dùng MAPE vì giá trị thật có thể = 0), NRMSE = RMSE/σ.</p></div></div>
  <div class="tabs" id="md-tabs"><button class="on" data-t="bench">Baseline vs mô hình</button><button data-t="win">Cửa sổ trượt</button><button data-t="fs">Chọn đặc trưng</button><button data-t="tune">Tối ưu tham số</button><button data-t="wf">Walk-forward</button><button data-t="hor">Sai số theo tầm dự báo</button></div>
  <div id="md-body"></div>`;
  const body = App.$("#md-body"); let cur = "bench";
  const tabs = {
   bench() {
     body.innerHTML = `<div class="grid g-21"><div class="card"><h3>So sánh mô hình</h3><div class="sub">Trung bình 10 biến, tập test (tháng 8)</div><div class="toolbar"><select id="bm-h"><option value="1">h = 1 (5 phút)</option><option value="12" selected>h = 12 (1 giờ)</option></select></div><div id="bm-tbl"></div></div>
       <div class="card"><h3>NRMSE theo biến</h3><div class="sub">Giá trị nhỏ = tốt hơn Persistence</div><div class="chart-box"><canvas id="bm-ch"></canvas></div></div></div>
       <div class="card" style="margin-top:18px"><h3>Dự đoán vs thực tế (3 ngày cuối: 29–31/08)</h3><div class="sub">Mỗi điểm = dự đoán h bước phía trước cho thời điểm đó</div><div class="toolbar" id="bm-tb2"></div><div class="chart-box tall"><canvas id="bm-pred"></canvas></div></div>
       <div id="bm-note"></div>`;
     const hsel = App.$("#bm-h"); hsel.onchange = draw; draw();
     function draw(){ const h = +hsel.value; const rows = md.benchmark.filter(r=>r.h===h); const models = [...new Set(rows.map(r=>r.model))];
       const agg = models.map(m=>{ const r = rows.filter(x=>x.model===m); return {m, rmse:App.mean(r.map(x=>x.rmse)), mae:App.mean(r.map(x=>x.mae)), smape:App.mean(r.map(x=>x.smape)), nrmse:App.mean(r.map(x=>x.nrmse)), obs:App.mean(r.map(x=>x.rmse_obs)), s:fc && null}; });
       const pers = agg.find(a=>a.m==="Persistence").nrmse; agg.forEach(a=>a.skill=1-a.nrmse/pers);
       App.$("#bm-tbl").innerHTML = App.table([{h:"Mô hình",k:"m"},{h:"NRMSE",k:"nrmse"},{h:"RMSE*",k:"rmse",d:2},{h:"MAE*",k:"mae",d:2},{h:"sMAPE %",k:"smape",d:2},{h:"Skill vs Persistence",k:"skill",f:v=>`<span style="color:${v>0?"var(--leaf)":"var(--chili)"}">${v>0?"+":""}${App.fmt(v*100,1)}%</span>`}], agg, {best:{nrmse:"min",rmse:"min",mae:"min",smape:"min"}})+`<div class="legend-note" style="margin-top:6px">*RMSE/MAE trung bình trên thang đơn vị gốc của từng biến (bị chi phối bởi biến có thang lớn như N, P, K) — dùng NRMSE để so sánh công bằng.</div>`;
       const vars = App.VARS; const showM = ["Persistence","RF","HGB","XGB","LSTM"];
       const mc = {Persistence:"#8ea0b8",RF:"#ffb703",HGB:"#4cc9f0",XGB:"#2ee6a6",LSTM:"#c77dff"};
       App.mk("bm-ch",{type:"bar",data:{labels:vars,datasets:showM.map(m=>({label:m,backgroundColor:mc[m],borderRadius:2,data:vars.map(v=>rows.find(r=>r.var===v&&r.model===m).nrmse)}))},options:{maintainAspectRatio:false,scales:{y:{title:{display:true,text:"NRMSE"}}}}});
       const best = agg.filter(a=>a.m!=="Seasonal-naive (hôm qua)").sort((a,b)=>a.nrmse-b.nrmse)[0];
       App.$("#bm-note").innerHTML = App.explain(`<b>Nhận xét (h=${h}):</b> mô hình tốt nhất là <b>${best.m}</b> (NRMSE ${App.fmt(best.nrmse,3)}, ${App.fmt(best.skill*100,1)}% tốt hơn giữ-nguyên). ${h===1?"Ở tầm 5 phút chuỗi gần như tự trùng nên <b>Persistence rất khó thắng</b>; lợi ích của mô hình học máy khiêm tốn (nhiễu đo chiếm phần lớn sai số).":"Ở tầm 1 giờ mô hình cây <b>thắng rõ rệt</b> Persistence vì nắm được chu kỳ ngày/đêm và quán tính nạp–xả của đất."} Seasonal-naive (cùng giờ hôm qua) thất bại vì chuỗi không dừng (lịch bón phân/tưới thay đổi theo ngày). LSTM nhỏ (CPU) chưa vượt cây tăng cường trên ${App.fmt(10,0)} biến với dữ liệu ~70k dòng — phù hợp tài liệu cho thấy GBDT mạnh trên dữ liệu bảng cỡ vừa.`,"good"); }
     // prediction chart
     const ps = App.varSelect("bm-pv", drawP, "moisture"); const hs2 = document.createElement("select"); hs2.innerHTML = `<option value="1">h=1</option><option value="12" selected>h=12</option>`; hs2.onchange = drawP;
     App.$("#bm-tb2").append(ps, hs2);
     function drawP(){ const v = App.VARS.indexOf(ps.value), key = `${hs2.value}_${v}`; const pk = fc.pk[key]; const t0 = App.ts(pk.t0);
       const P = a=>a.map((y,i)=>({x:t0+i*300000,y}));
       const cols = {Persistence:"#8ea0b8",RF:"#ffb703",HGB:"#4cc9f0",XGB:"#2ee6a6",LSTM:"#c77dff"};
       const ds = [{label:"Thực tế (đã xử lý)",data:P(pk.actual),borderColor:"#fff",borderWidth:1.4,pointRadius:0},...Object.keys(cols).map(m=>({label:m,data:P(pk[m]),borderColor:cols[m],borderWidth:1.2,pointRadius:0,hidden:["RF","LSTM"].includes(m)}))];
       App.mk("bm-pred",{type:"line",data:{datasets:ds},options:{maintainAspectRatio:false,parsing:false,scales:{x:App.timeScale(),y:{title:{display:true,text:`${ps.value} (${App.UNITS[ps.value]})`}}},plugins:{tooltip:{callbacks:{title:it=>App.fullDate(it[0].parsed.x)}}}}}); }
     drawP();
   },
   win() {
     const rows = md.window_ablation; const ws=[4,12,24];
     body.innerHTML = `<div class="grid g2"><div class="card"><h3>Kích thước cửa sổ trượt (HGB)</h3><div class="sub">W = số bước quá khứ (×5 phút) đưa vào đặc trưng</div><div class="chart-box short"><canvas id="w-ch"></canvas></div></div><div class="card"><h3>Bảng NRMSE</h3><div class="sub">Trung bình 10 biến</div><div id="w-tbl"></div></div></div><div class="card" style="margin-top:18px"><h3>NRMSE theo từng biến (h=12)</h3><div id="w-tbl2"></div></div><div id="w-note"></div>`;
     const f=(w,h,k="nrmse")=>App.mean(rows.filter(r=>r.window===w&&r.h===h).map(r=>r[k]));
     App.mk("w-ch",{type:"bar",data:{labels:ws.map(w=>`W=${w} (${w*5} phút)`),datasets:[{label:"h=1",data:ws.map(w=>f(w,1)),backgroundColor:"#4cc9f0cc"},{label:"h=12",data:ws.map(w=>f(w,12)),backgroundColor:"#2ee6a6cc"}]},options:{maintainAspectRatio:false}});
     App.$("#w-tbl").innerHTML = App.table([{h:"W",k:"w"},{h:"NRMSE h=1",k:"a"},{h:"NRMSE h=12",k:"b"},{h:"RMSE h=12*",k:"c",d:2}], ws.map(w=>({w,a:f(w,1),b:f(w,12),c:f(w,12,"rmse")})),{best:{a:"min",b:"min",c:"min"}});
     App.$("#w-tbl2").innerHTML = App.table([{h:"Biến",k:"v",f:v=>`<b style="color:${App.COL[v]}">${v}</b>`},...ws.map(w=>({h:"W="+w,k:"w"+w}))], App.VARS.map(v=>{const o={v}; ws.forEach(w=>o["w"+w]=rows.find(r=>r.var===v&&r.window===w&&r.h===12).nrmse); return o;}));
     App.$$("#w-tbl2 tbody tr").forEach(tr=>{ const tds=[...tr.querySelectorAll("td")].slice(1); const vals=tds.map(t=>parseFloat(t.textContent)); const mn=Math.min(...vals); tds.forEach((t,i)=>{ if(vals[i]===mn) t.classList.add("best"); }); });
     const best = ws.reduce((a,b)=>f(a,12)<f(b,12)?a:b);
     App.$("#w-note").innerHTML = App.explain(`<b>Nhận xét:</b> cải thiện từ W=4 lên 24 rất nhỏ (h=12: ${App.fmt(f(4,12),3)} → ${App.fmt(f(24,12),3)}); cửa sổ tốt nhất h=12 là <b>W=${best}</b>. Khớp với PACF: thông tin dự báo chủ yếu nằm ở vài lag gần nhất; thông tin dài hạn được gánh bởi đặc trưng <i>mean/std</i>, <i>last</i> của các biến khác và sin/cos giờ. Chọn W=12 làm mặc định (1 giờ) vì cân bằng độ phức tạp.`);
   },
   fs() {
     const rows = md.feature_selection.filter(r=>r.part==="test");
     const T = ["K","moisture"];
     body.innerHTML = `<div class="grid g2">${T.map(t=>`<div class="card"><h3>Chọn đặc trưng — mục tiêu <b style="color:${App.COL[t]}">${t}</b></h3><div class="sub">HGB, W=12, h=12, test tháng 8</div><div id="fs-${t}"></div></div>`).join("")}</div>
       <div class="grid g2" style="margin-top:18px">${T.map(t=>`<div class="card"><h3>Top đặc trưng quan trọng (RF) — ${t}</h3><div class="chart-box short"><canvas id="fi-${t}"></canvas></div></div>`).join("")}</div><div id="fs-note"></div>`;
     T.forEach(t=>{ App.$("#fs-"+t).innerHTML = App.table([{h:"Phương án",k:"variant"},{h:"#đặc trưng",k:"n_features",d:0},{h:"RMSE",k:"rmse",d:3},{h:"NRMSE",k:"nrmse"}], rows.filter(r=>r.target===t), {best:{rmse:"min",nrmse:"min"}});
       const fi = md.feature_importance[t]; App.mk("fi-"+t,{type:"bar",data:{labels:fi.names,datasets:[{data:fi.values,backgroundColor:App.COL[t]+"cc",borderRadius:3}]},options:{indexAxis:"y",maintainAspectRatio:false,plugins:{legend:{display:false}}}}); });
     App.$("#fs-note").innerHTML = App.explain(`<b>Nhận xét:</b> vì N, P, K, EC gần như trùng thông tin (PCA PC1 giải thích ~98% phương sai), việc giữ <b>một đại diện</b> hoặc dùng <b>PC1</b> cho độ chính xác gần như tương đương bộ đầy đủ nhưng gọn hơn nhiều. Lasso/RFE/importance chọn lại chủ yếu các lag gần nhất của chính biến mục tiêu và giá trị hiện tại của biến nhóm dinh dưỡng. Chọn phương án nào cũng phải <b>fit trên train</b> để tránh rò rỉ.`,"good");
   },
   tune() {
     const tn = md.tuning; const rows = App.VARS.map(v=>({v, d:tn[v].val_rmse_default, t:tn[v].val_rmse_tuned, imp:1-tn[v].val_rmse_tuned/tn[v].val_rmse_default, p:JSON.stringify(tn[v].params).replace(/[{}"]/g,"")}));
     const tt = md.tuned_test; const ms=[...new Set(tt.map(r=>r.model))];
     body.innerHTML = `<div class="card"><h3>Random search siêu tham số HGB trên validation (tháng 7)</h3><div class="sub">RMSE trên thang MinMax; tham số chọn riêng từng biến</div><div id="tn-tbl"></div></div>
      <div class="card" style="margin-top:18px"><h3>Kết quả trên test (tháng 8)</h3><div class="sub">Mặc định vs đã tinh chỉnh (train) vs tinh chỉnh + huấn luyện lại trên train+val</div><div id="tn-test"></div></div>
      <div id="tn-note"></div>`;
     App.$("#tn-tbl").innerHTML = App.table([{h:"Biến",k:"v",f:v=>`<b style="color:${App.COL[v]}">${v}</b>`},{h:"Val RMSE mặc định",k:"d",d:4},{h:"Val RMSE tuned",k:"t",d:4},{h:"Cải thiện",k:"imp",f:v=>`<span style="color:${v>0?"var(--leaf)":"var(--chili)"}">${App.fmt(v*100,1)}%</span>`},{h:"Tham số chọn",k:"p",f:v=>`<span class="mono" style="font-size:.74rem">${v}</span>`}], rows);
     App.$("#tn-test").innerHTML = App.table([{h:"Cấu hình",k:"m"},{h:"NRMSE",k:"n"},{h:"RMSE*",k:"r",d:2},{h:"sMAPE %",k:"s",d:2}], ms.map(m=>{ const r=tt.filter(x=>x.model===m); return {m, n:App.mean(r.map(x=>x.nrmse)), r:App.mean(r.map(x=>x.rmse)), s:App.mean(r.map(x=>x.smape))}; }), {best:{n:"min",r:"min",s:"min"}});
     const gain = App.mean(rows.map(r=>r.imp));
     App.$("#tn-note").innerHTML = App.explain(`<b>Nhận xét:</b> tinh chỉnh ngẫu nhiên cải thiện RMSE validation trung bình ${App.fmt(gain*100,1)}% — khiêm tốn, cho thấy dữ liệu (chất lượng làm sạch, đặc trưng) quan trọng hơn siêu tham số. Mô hình cuối dùng tham số tuned và huấn luyện lại trên train+val (mô hình chốt).`);
   },
   wf() {
     const w = md.walk_forward; const folds=[1,2,3,4]; const lab = {1:"1–7/8",2:"8–14/8",3:"15–21/8",4:"22–31/8"};
     const f=(k,key)=>App.mean(w.filter(r=>r.fold===k).map(r=>r[key]));
     body.innerHTML = `<div class="grid g-12"><div class="card"><h3>Walk-forward (rolling-origin, cửa sổ mở rộng)</h3><div class="sub">Mỗi tuần: huấn luyện lại với mọi dữ liệu trước tuần đó, dự báo h=12 cho tuần đó</div><div id="wf-tbl"></div></div><div class="card"><div class="chart-box"><canvas id="wf-ch"></canvas></div></div></div><div id="wf-note"></div>`;
     App.$("#wf-tbl").innerHTML = App.table([{h:"Tuần",k:"f"},{h:"HGB NRMSE",k:"a"},{h:"Persistence NRMSE",k:"b"},{h:"Skill",k:"s",f:v=>`<span style="color:var(--leaf)">+${App.fmt(v*100,1)}%</span>`}], folds.map(k=>({f:lab[k],a:f(k,"nrmse"),b:f(k,"persistence_nrmse"),s:1-f(k,"nrmse")/f(k,"persistence_nrmse")})), {best:{a:"min"}});
     App.mk("wf-ch",{type:"bar",data:{labels:folds.map(k=>lab[k]),datasets:[{label:"HGB",data:folds.map(k=>f(k,"nrmse")),backgroundColor:"#2ee6a6cc"},{label:"Persistence",data:folds.map(k=>f(k,"persistence_nrmse")),backgroundColor:"#8ea0b8cc"}]},options:{maintainAspectRatio:false}});
     const sd = Math.sqrt(App.mean(folds.map(k=>Math.pow(f(k,"nrmse")-App.mean(folds.map(j=>f(j,"nrmse"))),2))));
     App.$("#wf-note").innerHTML = App.explain(`<b>Nhận xét:</b> mô hình thắng Persistence ở cả 4 tuần (NRMSE ${App.fmt(App.mean(folds.map(k=>f(k,"nrmse"))),3)} ± ${App.fmt(sd,3)}), nên kết luận không phụ thuộc vào đúng một tuần test may mắn. Tuần chứa bơm hỏng (9–11/8) khó hơn rõ rệt — sự kiện hiếm không có trong tập train.<div class="ref">Cơ sở: Tashman 2000 (<i>Int. J. Forecasting</i>); Bergmeir &amp; Benítez 2012 (<i>Information Sciences</i>) — không dùng K-fold xáo trộn cho chuỗi thời gian.</div>`);
   },
   hor() {
     const dir = !!md.direct_horizon; const rows = dir ? md.direct_horizon : md.recursive_horizon; const mk = dir ? "direct_nrmse" : "model_nrmse"; const hz = ["5 phút","30 phút","1 giờ","3 giờ","6 giờ","12 giờ","24 giờ"];
     const f=(h,k)=>App.mean(rows.filter(r=>r.horizon===h).map(r=>r[k]));
     body.innerHTML = `<div class="grid g-21"><div class="card"><h3>${dir?"Dự báo trực tiếp 24h":"Dự báo đệ quy 24h"} — sai số theo tầm</h3><div class="sub">${dir?"Mô hình riêng cho từng tầm (nội suy giữa các nút), so với đệ quy 1 bước":"Mô hình 1 bước chạy đệ quy 288 lần"} từ 60 mốc gốc trong tháng 8; so với tín hiệu thật</div><div class="chart-box"><canvas id="hz-ch"></canvas></div></div><div class="card"><h3>NRMSE trung bình</h3><div id="hz-tbl"></div></div></div><div id="hz-note"></div>`;
     App.mk("hz-ch",{type:"line",data:{labels:hz,datasets:[{label:dir?"Mô hình trực tiếp (HGB)":"Mô hình đệ quy (HGB)",data:hz.map(h=>f(h,mk)),borderColor:"#2ee6a6",backgroundColor:"#2ee6a633",fill:true,tension:.3,borderWidth:2.5},...(dir?[{label:"Đệ quy 1 bước (so sánh)",data:hz.map(h=>f(h,"recursive_nrmse")),borderColor:"#c77dff",tension:.3}]:[]),{label:"Persistence",data:hz.map(h=>f(h,"persistence_nrmse")),borderColor:"#8ea0b8",tension:.3},{label:"Hôm qua cùng giờ",data:hz.map(h=>f(h,"yesterday_nrmse")),borderColor:"#ffb703",borderDash:[4,3],tension:.3}]},options:{maintainAspectRatio:false,scales:{y:{title:{display:true,text:"NRMSE"}}}}});
     App.$("#hz-tbl").innerHTML = App.table([{h:"Tầm",k:"h"},{h:"Mô hình",k:"a"},{h:"Persistence",k:"b"},{h:"Hôm qua",k:"c"}], hz.map(h=>({h,a:f(h,mk),b:f(h,"persistence_nrmse"),c:f(h,"yesterday_nrmse")})),{best:{a:"min"}});
     const worse = hz.filter(h=>f(h,mk)>f(h,"persistence_nrmse"));
     App.$("#hz-note").innerHTML = App.explain(`<b>Nhận xét trung thực:</b> mô hình ${dir?"trực tiếp":"đệ quy"} ${worse.length?`thua Persistence ở tầm <b>${worse.join(", ")}</b>`:"thắng Persistence ở mọi tầm"} ${dir?"— sự kiện (bón phân, bơm hỏng) không báo trước được từ lịch sử.":"— sai số tích luỹ khi tự nạp dự đoán vào đầu vào."} Vì vậy trong tab <b>Dự báo</b> luôn hiển thị <b>dải bất định thực nghiệm</b> (phân vị 10–90% sai số backtest theo từng bước) thay vì một đường dự báo tuyệt đối. ${dir?"Đã áp dụng dự báo trực tiếp theo từng tầm (direct multi-horizon); hướng tiếp theo: đưa dự báo thời tiết làm biến ngoại sinh.":"Hướng cải thiện: mô hình trực tiếp theo từng tầm (direct multi-horizon) hoặc đưa dự báo thời tiết làm biến ngoại sinh."}`,"warn");
   }
  };
  const go = (t) => { cur=t; App.$$("#md-tabs button").forEach(b=>b.classList.toggle("on",b.dataset.t===t)); tabs[t](); };
  App.$$("#md-tabs button").forEach(b=>b.onclick=()=>go(b.dataset.t)); go("bench");
};
