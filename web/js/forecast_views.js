/* ===== Dự báo · Cảnh báo & Live · Checklist ===== */

App.provBanner = (meta) => (meta && meta.provisional) ? App.explain(
  `<b>Lưu ý — số liệu mô hình đang là bản TẠM.</b> Các bảng/biểu đồ dự báo bên dưới được tính từ lần chạy nhanh (hoặc bản cũ), chưa phải kết quả huấn luyện đầy đủ. Chạy <code>python scripts/train_all.py</code> rồi <code>python src/export_web.py</code> để thay bằng kết quả đầy đủ — banner này sẽ tự biến mất.`, "warn") : "";

App.sevCls = (s) => s === "high" ? "high" : s === "low" ? "low" : "";
App.dd = (iso) => iso.slice(8, 10) + "/" + iso.slice(5, 7) + " " + iso.slice(11, 16);

/* =============================== DỰ BÁO =============================== */
App.views.forecast = async () => {
  const [fc, meta] = await Promise.all([App.json("data/forecast.json"), App.json("data/meta.json")]);
  const root = App.$("#forecast-root"), V = fc.vars, STEP = 300000;
  const t0h = App.ts(fc.history.t0), t0f = App.ts(fc.future.t0);
  const hz1 = fc.next.find(n => n.steps === 12);
  const dg = v => (v === "pH" || v === "EC") ? 2 : 1;
  root.innerHTML = `${App.provBanner(meta)}
  <div class="section-title"><div><h2>Dự đoán các điểm dữ liệu sắp tới</h2><p>24 giờ tiếp theo kể từ bản ghi cuối (${fc.last_ts.replace("T", " ")}), bước 5 phút = 288 điểm cho cả 10 chỉ số. Dải màu = khoảng bất định thực nghiệm P10–P90 lấy từ sai số backtest tháng 8, <b>không</b> phải đảm bảo xác suất.</p></div></div>
  <div class="nowcards" id="fc-now"></div>
  <div class="card" style="margin-top:18px"><h3>Quỹ đạo dự báo 24h</h3><div class="sub">Dự báo trực tiếp theo từng tầm (direct multi-horizon) thay vì chạy đệ quy 288 bước để tránh cộng dồn sai số</div>
    <div class="tabs" id="fc-mode"><button class="on" data-m="live">Dự báo thật (sau 31/08/2026)</button><button data-m="bt">Backtest tháng 8 (so với thực tế)</button></div>
    <div class="toolbar" id="fc-tb"></div>
    <div class="chart-box tall"><canvas id="fc-chart"></canvas></div><div id="fc-note"></div></div>
  <div class="grid g-21" style="margin-top:18px">
    <div class="card"><h3>Giá trị dự báo theo mốc</h3><div class="sub" id="fc-tbl-sub"></div><div id="fc-tbl"></div></div>
    <div class="card"><h3>Độ phủ dải P10–P90</h3><div class="sub">Tỉ lệ điểm quan sát hợp lệ tháng 8 nằm trong dải (kỳ vọng ≈ 80%)</div><div id="fc-cov"></div></div>
  </div>
  <div class="card" style="margin-top:18px"><h3>Sai số theo tầm dự báo</h3><div class="sub">NRMSE = RMSE/σ so với quan sát hợp lệ, trung bình 10 biến, các mốc gốc trong tháng 8</div><div id="fc-hz"></div></div>
  <div class="card" style="margin-top:18px"><h3>Cách dự báo hoạt động</h3>
    <ol style="margin-left:20px;line-height:1.9"><li>Với mỗi “nút” tầm (5′, 15′, 30′, 1h, 2h, 3h, 4h, 6h … 24h) huấn luyện RIÊNG một mô hình HistGradientBoosting học <i>mức thay đổi</i> so với giá trị hiện tại từ cửa sổ 12 bước (lag, trung bình/độ lệch chuẩn, chênh 2 bước, sin/cos giờ trong ngày).</li>
    <li>Nội suy tuyến tính giữa các nút để ra 288 điểm 5 phút.</li>
    <li>Dải bất định = phân vị 10%/90% của sai số backtest tại từng nút (các mốc gốc cách nhau 12 giờ trong tháng 8), làm trơn rồi cộng vào dự báo.</li>
    <li>Dự báo “thật” dùng mô hình huấn luyện trên toàn bộ dữ liệu; backtest dùng mô hình chỉ huấn luyện đến hết tháng 7 nên không rò rỉ.</li></ol>
    <div class="ref">Cơ sở: Ben Taieb, Bontempi, Atiya &amp; Sorjamaa 2012 (so sánh chiến lược đệ quy/trực tiếp, <i>Expert Syst. Appl.</i>); Chatfield 1993 (khoảng dự báo thực nghiệm, <i>J. Bus. Econ. Stat.</i>).</div></div>`;

  App.$("#fc-now").innerHTML = V.map((v, i) => { const m = hz1.mean[i], l = fc.last[i], d = m - l;
    return `<div class="nowcard"><div class="t">${App.VI[v]} · +1 giờ</div><div class="val" style="color:${App.COL[v]}">${App.fmt(m, dg(v))}<small> ${App.UNITS[v]}</small></div><div class="delta ${d >= 0 ? "up" : "down"}">${d >= 0 ? "▲" : "▼"} ${App.fmt(Math.abs(d), 2)} so với hiện tại (${App.fmt(l, 2)})</div></div>`; }).join("");

  let mode = "live";
  const vsel = App.varSelect("fc-v", draw, "moisture");
  const kb = document.createElement("label"); kb.className = "legend-note"; kb.id = "fc-k-wrap"; kb.style.display = "none";
  kb.innerHTML = `Mốc gốc <input id="fc-k" type="range" min="0" max="${fc.backtest.origins.length - 1}" value="${fc.backtest.origins.length - 1}" style="vertical-align:middle;accent-color:#2ee6a6"> <b id="fc-k-lab"></b>`;
  App.$("#fc-tb").append(vsel, kb);
  App.$("#fc-k").oninput = draw;
  App.$$("#fc-mode button").forEach(b => b.onclick = () => { mode = b.dataset.m; App.$$("#fc-mode button").forEach(x => x.classList.toggle("on", x === b)); kb.style.display = mode === "bt" ? "" : "none"; draw(); });

  function draw() {
    const v = vsel.value, col = App.COL[v], ds = []; let note = "";
    if (mode === "live") {
      const H = fc.history.series[v], F = fc.future;
      const P = (a, t0) => a.map((y, i) => ({ x: t0 + i * STEP, y }));
      ds.push({ label: "Quan sát (đã xử lý)", data: P(H, t0h), borderColor: "#fff", borderWidth: 1.4, pointRadius: 0 },
        { label: "P10", data: P(F.lo[v], t0f), borderColor: "transparent", pointRadius: 0 },
        { label: "Dải P10–P90", data: P(F.hi[v], t0f), borderColor: "transparent", backgroundColor: col + "33", fill: "-1", pointRadius: 0 },
        { label: "Dự báo", data: P(F.mean[v], t0f), borderColor: col, borderWidth: 2.2, pointRadius: 0 });
      note = App.explain(`<b>Cách đọc:</b> đường trắng là 2 ngày gần nhất của chuỗi đã xử lý; phần màu là dự báo ${App.VI[v]} cho 24 giờ kế tiếp, dải mờ là khoảng bất định. Chuỗi 5 phút gần như tự trùng nên ở tầm ngắn dự báo bám sát giá trị hiện tại; ở tầm dài, dải rộng ra — đó là phản ánh trung thực mức không chắc chắn, không phải lỗi hiển thị.`);
    } else {
      const B = fc.backtest, k = +App.$("#fc-k").value, ot = App.ts(B.origins[k]);
      App.$("#fc-k-lab").textContent = B.origins[k].replace("T", " ");
      const f = B.fc[v][k], act = B.actual[v][k], tru = (B.obs && B.obs[v]) ? B.obs[v][k] : (B.truth ? B.truth[v][k] : act);
      const lo = f.map((y, i) => y + B.q_lo[v][i]), hi = f.map((y, i) => y + B.q_hi[v][i]);
      const P = a => a.map((y, i) => ({ x: ot + i * STEP, y }));
      ds.push({ label: "Thực tế quan sát", data: P(tru), borderColor: "rgba(255,255,255,.55)", borderDash: [4, 3], borderWidth: 1.2, pointRadius: 0 },
        { label: "Chuỗi sau xử lý", data: P(act), borderColor: "#fff", borderWidth: 1.2, pointRadius: 0 },
        { label: "P10", data: P(lo), borderColor: "transparent", pointRadius: 0 },
        { label: "Dải P10–P90", data: P(hi), borderColor: "transparent", backgroundColor: col + "33", fill: "-1", pointRadius: 0 },
        { label: "Dự báo", data: P(f), borderColor: col, borderWidth: 2.2, pointRadius: 0 });
      let se = 0, n = 0, inn = 0; f.forEach((y, i) => { if (tru && tru[i] !== null && !isNaN(tru[i])) { se += (y - tru[i]) ** 2; n++; if (tru[i] >= lo[i] && tru[i] <= hi[i]) inn++; } });
      note = App.explain(`<b>Backtest mốc ${B.origins[k].replace("T", " ")}:</b> mô hình chỉ thấy dữ liệu trước mốc này. RMSE so với quan sát thực tế = <b>${n ? App.fmt(Math.sqrt(se / n), 3) : "–"}</b> ${App.UNITS[v]}; ${n ? App.fmt(inn / n * 100, 0) : 0}% điểm nằm trong dải. Kéo thanh “Mốc gốc” để xem các mốc khác.`);
    }
    App.mk("fc-chart", { type: "line", data: { datasets: ds }, options: { maintainAspectRatio: false, parsing: false, interaction: { mode: "nearest", intersect: false, axis: "x" },
      scales: { x: App.timeScale(), y: { title: { display: true, text: `${App.VI[v]} (${App.UNITS[v]})` } } },
      plugins: { legend: { labels: { filter: it => it.text !== "P10" } }, tooltip: { filter: it => it.dataset.label !== "P10", callbacks: { title: it => App.fullDate(it[0].parsed.x) } } } } });
    App.$("#fc-note").innerHTML = note;
    // bảng mốc
    const i = V.indexOf(v);
    App.$("#fc-tbl-sub").textContent = `${App.VI[v]} (${App.UNITS[v]}) — dự báo thật từ ${fc.future.t0.replace("T", " ")}`;
    App.$("#fc-tbl").innerHTML = App.table([{ h: "Tầm", k: "label" }, { h: "Thời điểm", k: "t" }, { h: "Dự báo", k: "m", d: 2 }, { h: "P10", k: "l", d: 2 }, { h: "P90", k: "u", d: 2 }],
      fc.next.map(n => ({ label: n.label, t: App.fullDate(t0f + (n.steps - 1) * STEP), m: n.mean[i], l: n.lo[i], u: n.hi[i] })));
  }
  draw();

  // độ phủ dải
  const cov = fc.band_coverage;
  App.$("#fc-cov").innerHTML = cov ? App.table([{ h: "Biến", k: "v", f: v => `<b style="color:${App.COL[v]}">${v}</b>` }, { h: "Độ phủ", k: "c", f: v => App.fmt(v * 100, 0) + "%" }], V.map(v => ({ v, c: cov[v] })))
    + `<div class="legend-note" style="margin-top:6px">Trung bình ${App.fmt(App.mean(V.map(v => cov[v])) * 100, 0)}% — khoảng cách tới 80% cho biết dải đang hẹp/rộng so với kỳ vọng.</div>`
    : App.explain("Chưa có — chạy <code>python src/run_forecast.py</code> (hoặc <code>scripts/train_all.py</code>).", "warn");

  // sai số theo tầm
  const rows = fc.direct_horizon;
  if (!rows) { App.$("#fc-hz").innerHTML = App.explain("Chưa có bảng sai số theo tầm của dự báo trực tiếp — chạy <code>python src/run_forecast.py</code> (hoặc <code>scripts/train_all.py</code>) rồi <code>python src/export_web.py</code>.", "warn"); return; }
  const hs = [...new Set(rows.map(r => r.steps))].sort((a, b) => a - b), lab = Object.fromEntries(rows.map(r => [r.steps, r.horizon]));
  const mn = (s, k) => App.mean(rows.filter(r => r.steps === s).map(r => r[k]));
  const tb = hs.map(s => ({ h: lab[s], d: mn(s, "direct_nrmse"), r: mn(s, "recursive_nrmse"), p: mn(s, "persistence_nrmse"), y: mn(s, "yesterday_nrmse") }));
  const losers = tb.filter(r => r.d > r.p).map(r => r.h);
  App.$("#fc-hz").innerHTML = `<div class="grid g-21"><div class="chart-box short"><canvas id="fc-hz-ch"></canvas></div><div>${App.table([{ h: "Tầm", k: "h" }, { h: "Trực tiếp", k: "d" }, { h: "Đệ quy", k: "r" }, { h: "Giữ nguyên", k: "p" }, { h: "Hôm qua", k: "y" }], tb, { best: { d: "min", r: "min", p: "min", y: "min" } })}</div></div>`
    + App.explain(`<b>Nhận xét trung thực:</b> ${losers.length ? `dự báo trực tiếp <b>thua</b> giữ-nguyên ở tầm ${losers.join(", ")}` : "dự báo trực tiếp thắng giữ-nguyên ở mọi tầm"}. Dự báo đệ quy (so sánh) tích luỹ sai số khi tự nạp dự đoán — đó là lý do hệ thống dùng dự báo trực tiếp. NRMSE &gt; 1 nghĩa là sai hơn việc luôn đoán giá trị trung bình; ở tầm 12–24h dữ liệu có các đợt biến động bất thường mà đặc trưng lịch sử không báo trước được.`, losers.length ? "warn" : "good");
  App.mk("fc-hz-ch", { type: "line", data: { labels: tb.map(r => r.h), datasets: [
    { label: "Trực tiếp", data: tb.map(r => r.d), borderColor: "#2ee6a6", backgroundColor: "#2ee6a633", fill: true, tension: .3, borderWidth: 2.5 },
    { label: "Đệ quy", data: tb.map(r => r.r), borderColor: "#c77dff", tension: .3 },
    { label: "Giữ nguyên", data: tb.map(r => r.p), borderColor: "#8ea0b8", tension: .3 },
    { label: "Hôm qua", data: tb.map(r => r.y), borderColor: "#ffb703", borderDash: [4, 3], tension: .3 }] },
    options: { maintainAspectRatio: false, scales: { y: { title: { display: true, text: "NRMSE" } } } } });
};

/* =============================== CẢNH BÁO & LIVE =============================== */
App.views.alerts = async () => {
  const [al, R] = await Promise.all([App.json("data/alerts.json"), App.json("data/series_2026-08.json")]);
  const root = App.$("#alerts-root"), V = App.VARS, STEP = 300000, RULES = al.rules;
  const item = (e, extra = "") => `<div class="alert-item ${App.sevCls(e.severity)}"><div class="when">${App.dd(e.start)} → ${e.end.slice(11, 16)}</div><div><b>${e.rule}</b> · ${e.message} ${extra}<br><span class="legend-note">${e.var}: ${e.peak_basis === "band" ? (RULES.find(x => x.id === e.rule).lt != null ? "cận dưới dải P10" : "cận trên dải P90") : "đỉnh"} ${App.fmt(e.peak, 2)} ${App.UNITS[e.var]} · kéo dài ${App.fmt(e.hours, 2)} giờ</span></div></div>`;
  const nowHtml = al.now.length ? al.now.map(n => `<div class="alert-item ${App.sevCls(n.severity)}"><div class="when">${al.last_ts.replace("T", " ")}</div><div><b>${n.rule}</b> · ${n.message}<br><span class="legend-note">${n.var} = ${App.fmt(n.value, 2)} ${App.UNITS[n.var]}</span></div></div>`).join("") : `<div class="legend-note">Không có ngưỡng nào đang bị vượt ở bản ghi cuối.</div>`;
  const fa = al.forecast_alerts;
  const faHtml = fa.length ? fa.map(e => item(e, `<span class="pill ${e.kind === "du_bao" ? "syn" : "ok"}">${e.kind === "du_bao" ? "dự báo vượt ngưỡng" : "nguy cơ (theo dải P10–P90)"}</span>`)).join("") : `<div class="legend-note">Dự báo 24h tới không vượt ngưỡng nào (đoạn ≥ 30 phút).</div>`;
  root.innerHTML = `
  <div class="section-title"><div><h2>Cảnh báo theo ngưỡng &amp; phát lại dữ liệu trực tiếp</h2><p>Ngưỡng nằm trong <code>config/thresholds.json</code> (nhóm tự đặt, tham khảo — cần hiệu chỉnh theo giống/đầu dò). Cảnh báo tính trên chuỗi đã làm sạch + làm mượt; lỗi cảm biến (giá trị 0, NaN, ngoài khoảng, kẹt) được báo riêng là <b>SENSOR_FAULT</b>.</p></div></div>
  <div class="grid g2"><div class="card"><h3>Hiện trạng</h3><div class="sub">Bản ghi cuối ${al.last_ts.replace("T", " ")}</div>${nowHtml}</div>
    <div class="card"><h3>Cảnh báo từ dự báo 24h tới</h3><div class="sub">Đoạn ≥ 30 phút; “nguy cơ” = chỉ dải P10–P90 chạm ngưỡng</div>${faHtml}</div></div>
  <div class="card" style="margin-top:18px"><h3>Bảng ngưỡng &amp; thống kê lịch sử</h3><div class="sub">Số đợt (≥ 30 phút) và tổng giờ vi phạm trên toàn chuỗi 14/12/2025 → 31/08/2026</div><div id="al-rules"></div>
    <div class="legend-note" style="margin-top:8px">${al.sensor_fault || ""}</div></div>
  <div class="grid g2" style="margin-top:18px"><div class="card"><h3>Giờ vi phạm theo ngày</h3><div class="toolbar"><select id="al-rule"></select></div><div class="chart-box short"><canvas id="al-daily"></canvas></div></div>
    <div class="card"><h3>Lỗi cảm biến theo ngày</h3><div class="sub">Số ô (biến × 5 phút) bị gắn cờ mỗi ngày</div><div class="chart-box short"><canvas id="al-faults"></canvas></div></div></div>
  <div class="card" style="margin-top:18px"><h3>Các đợt cảnh báo gần đây</h3><div class="toolbar"><select id="al-ep-rule"></select></div><div id="al-eps"></div></div>

  <div class="card" style="margin-top:18px"><h3><span class="dot"></span> Phát lại dữ liệu trực tiếp mỗi 5 phút</h3>
    <div class="sub">Phát lại tháng 8/2026 từng bản ghi 5 phút, áp dụng pipeline <b>online (nhân quả)</b>: luật miền → thay giá trị lỗi bằng giá trị hợp lệ gần nhất → EMA 0.3 → kiểm tra ngưỡng. Bản dòng lệnh tương đương: <code>python src/replay.py</code></div>
    <div class="toolbar"><select id="lv-scn"></select><select id="lv-speed"><option value="1">1 bản ghi/giây</option><option value="6" selected>6 bản ghi/giây</option><option value="24">24 bản ghi/giây</option><option value="72">72 bản ghi/giây</option></select>
      <button class="btn" id="lv-play">▶ Chạy</button><button class="btn ghost" id="lv-step">+1 bản ghi</button><button class="btn ghost" id="lv-reset">↺ Về đầu</button><select id="lv-var"></select><span class="pill" id="lv-time"></span></div>
    <div class="nowcards" id="lv-cards" style="grid-template-columns:repeat(5,1fr)"></div>
    <div class="grid g-21" style="margin-top:14px"><div class="chart-box"><canvas id="lv-chart"></canvas></div><div><div class="legend-note" style="margin-bottom:6px">Cảnh báo đang hoạt động</div><div id="lv-alerts" style="min-height:70px"></div><div class="legend-note" style="margin:10px 0 6px">Nhật ký</div><div class="live-log" id="lv-log"></div></div></div></div>`;

  // bảng ngưỡng
  const opName = r => r.lt !== undefined && r.lt !== null ? `< ${r.lt}` : `> ${r.gt}`;
  App.$("#al-rules").innerHTML = App.table([{ h: "Mã", k: "id", f: v => `<b>${v}</b>` }, { h: "Biến", k: "var", f: v => `<span style="color:${App.COL[v]}">${v}</span>` }, { h: "Điều kiện", k: "op" }, { h: "Mức", k: "severity", f: v => `<span class="pill ${v === "high" ? "syn" : "ok"}">${v}</span>` }, { h: "Số đợt", k: "ep", d: 0 }, { h: "Giờ vi phạm", k: "hr", d: 1 }, { h: "Thông điệp", k: "message", f: v => `<span style="white-space:normal;display:block;min-width:240px;text-align:left">${v}</span>` }],
    RULES.map(r => ({ ...r, op: opName(r), ep: al.totals[r.id].episodes, hr: al.totals[r.id].hours })));
  // biểu đồ ngày
  const rsel = App.$("#al-rule"); rsel.innerHTML = RULES.map(r => `<option value="${r.id}">${r.id} — ${r.message}</option>`).join(""); rsel.value = "WATER_LOW";
  const drawD = () => { const r = RULES.find(x => x.id === rsel.value); App.mk("al-daily", { type: "bar", data: { labels: al.days.map(d => d.slice(5)), datasets: [{ label: "giờ vi phạm/ngày", data: al.daily_hours[r.id], backgroundColor: (r.severity === "high" ? "#ff5d8f" : "#ffb703") + "cc" }] }, options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { maxTicksLimit: 12 } }, y: { title: { display: true, text: "giờ" }, max: 24 } } } }); };
  rsel.onchange = drawD; drawD();
  const fcol = { 1: "#ff5d8f", 2: "#ff7a59", 3: "#ffd166", 4: "#c77dff", 5: "#8ea0b8" };
  App.mk("al-faults", { type: "bar", data: { labels: al.days.map(d => d.slice(5)), datasets: Object.keys(al.faults).map(k => ({ label: al.faults[k].name, data: al.faults[k].daily, backgroundColor: fcol[k] })) }, options: { maintainAspectRatio: false, scales: { x: { stacked: true, ticks: { maxTicksLimit: 12 } }, y: { stacked: true } } } });
  // đợt gần đây
  const esel = App.$("#al-ep-rule"); esel.innerHTML = `<option value="">Tất cả luật</option>` + RULES.map(r => `<option>${r.id}</option>`).join("");
  const drawE = () => { const e = al.episodes.filter(x => !esel.value || x.rule === esel.value).slice(0, 300);
    App.$("#al-eps").innerHTML = App.table([{ h: "Bắt đầu", k: "start", f: v => v.replace("T", " ") }, { h: "Kết thúc", k: "end", f: v => v.replace("T", " ") }, { h: "Luật", k: "rule", f: v => `<b>${v}</b>` }, { h: "Giờ", k: "hours", d: 2 }, { h: "Đỉnh", k: "peak", d: 2 }], e, { maxh: 360 }); };
  esel.onchange = drawE; drawE();

  /* ---------- live replay ---------- */
  const PHYS = { temperature: [5, 48], humidity: [5, 100], light: [0, 30], soiltemp: [15, 40], moisture: [1, 70], pH: [3, 9.5], EC: [0, 4], N: [0, 1500], P: [0, 2500], K: [0, 3000] };
  const NUTR = ["EC", "N", "P", "K"], t0 = App.ts(R.t0), N = R.n, WIN = 144;
  const meta = await App.json("data/meta.json");
  const scn = [["Cuối chuỗi (31/08 12:00)", "2026-08-31T12:00"], ["Giảm ẩm đất 09/08", "2026-08-09T06:00"], ["Biến động dinh dưỡng 13/08", "2026-08-13T05:30"], ["Ngày bình thường 20/08", "2026-08-20T05:00"]]
    .concat((meta.events || []).filter(e => e.start.startsWith("2026-08")).map(e => [`${e.type}: ${e.start.slice(5, 16).replace(" ", " ")}`, e.start.replace(" ", "T").slice(0, 16)]));
  App.$("#lv-scn").innerHTML = scn.map((s, i) => `<option value="${i}">${s[0]}</option>`).join("");
  const lvv = App.$("#lv-var"); lvv.innerHTML = V.map(v => `<option value="${v}">${App.VI[v]}</option>`).join(""); lvv.value = "moisture";
  let pos = 0, timer = null, S, active, bufR, bufC;
  const reset = () => { S = { last: {}, ema: {}, prev: {}, same: {} }; active = new Set(); bufR = {}; bufC = {}; V.forEach(c => { bufR[c] = []; bufC[c] = []; });
    const s = scn[+App.$("#lv-scn").value][1]; pos = Math.max(0, Math.floor((App.ts(s) - t0) / STEP) - 36); App.$("#lv-log").innerHTML = ""; App.$("#lv-alerts").innerHTML = ""; pause(); App.$("#lv-time").textContent = "sẵn sàng"; cards(null); chart(); };
  const log = (cls, txt, ts) => { const d = document.createElement("div"); d.style.color = cls === "fault" ? "#c77dff" : cls === "on" ? "#ffb703" : cls === "off" ? "#4cc9f0" : "#5f7690"; d.textContent = `[${App.fullDate(ts).slice(5)}] ${txt}`; const L = App.$("#lv-log"); L.appendChild(d); while (L.children.length > 220) L.removeChild(L.firstChild); L.scrollTop = L.scrollHeight; };
  const cards = (cur) => { App.$("#lv-cards").innerHTML = V.map(c => { const o = cur && cur[c]; const bad = o && o.bad;
    return `<div class="nowcard" style="${bad ? "border-color:#c77dff;box-shadow:0 0 0 1px #c77dff55" : ""}"><div class="t">${App.VI[c]}</div><div class="val" style="color:${App.COL[c]}">${o && o.clean !== undefined ? App.fmt(o.clean, c === "pH" || c === "EC" ? 2 : 1) : "–"}<small> ${App.UNITS[c]}</small></div><div class="delta" style="color:${bad ? "#c77dff" : "var(--muted)"}">${o ? (bad ? "⚠ thô: " + (o.raw === null ? "NaN" : o.raw) + " — " + bad : "thô: " + App.fmt(o.raw, 2)) : "chưa có dữ liệu"}</div></div>`; }).join(""); };
  const chart = () => { const c = lvv.value;
    App.mk("lv-chart", { type: "line", data: { datasets: [{ label: "Thô (nhận từ cảm biến)", data: bufR[c], borderColor: "rgba(160,180,210,.7)", borderWidth: 1, pointRadius: 1.5, showLine: false, spanGaps: false }, { label: "Sau xử lý online (EMA 0.3)", data: bufC[c], borderColor: "#2ee6a6", borderWidth: 2, pointRadius: 0 }] }, options: { maintainAspectRatio: false, parsing: false, animation: false, scales: { x: App.timeScale(), y: { title: { display: true, text: `${App.VI[c]} (${App.UNITS[c]})` } } }, plugins: { tooltip: { callbacks: { title: it => App.fullDate(it[0].parsed.x) } } } } }); };
  const tick = () => {
    if (pos >= N) { pause(); App.$("#lv-time").textContent = "hết dữ liệu"; return; }
    const ts = t0 + pos * STEP, cur = {}; let nFault = 0;
    V.forEach(c => { const x = R.raw[c][pos], [lo, hi] = PHYS[c]; let bad = null;
      if (x === null) bad = "NaN"; else if (x < lo || x > hi) bad = "ngoài khoảng vật lý";
      else if (x === 0 && NUTR.includes(c) && (R.raw.moisture[pos] ?? 0) >= 12) bad = "0 khi đất ẩm ≥12%";
      else if (c === "light" && x === 0 && R.weather.rad[pos] > 300) bad = "0 ban ngày";
      S.same[c] = (x !== null && x === S.prev[c]) ? (S.same[c] || 0) + 1 : 0; S.prev[c] = x;
      if (!bad && S.same[c] >= 11) bad = "kẹt giá trị ≥12 bước";
      let xc; if (bad) { xc = S.last[c] ?? null; nFault++; log("fault", `SENSOR_FAULT ${c}=${x === null ? "NaN" : x} (${bad}) → giữ ${xc === null ? "–" : App.fmt(xc, 2)}`, ts); } else { xc = x; S.last[c] = x; }
      if (xc !== null) S.ema[c] = S.ema[c] === undefined ? xc : .3 * xc + .7 * S.ema[c];
      cur[c] = { raw: x, clean: S.ema[c], bad };
      if (x !== null) bufR[c].push({ x: ts, y: x }); bufC[c].push({ x: ts, y: S.ema[c] ?? NaN });
      if (bufR[c].length > WIN) bufR[c].shift(); if (bufC[c].length > WIN) bufC[c].shift(); });
    RULES.forEach(r => { const v = S.ema[r.var]; const on = v !== undefined && ((r.lt !== undefined && r.lt !== null && v < r.lt) || (r.gt !== undefined && r.gt !== null && v > r.gt));
      if (on && !active.has(r.id)) { active.add(r.id); log("on", `▲ ${r.id}: ${r.message} (${r.var}=${App.fmt(v, 2)})`, ts); }
      if (!on && active.has(r.id)) { active.delete(r.id); log("off", `▼ hết ${r.id}`, ts); } });
    if (pos % 12 === 0 && !nFault) log("ok", "· hệ thống bình thường", ts);
    App.$("#lv-alerts").innerHTML = active.size ? [...active].map(id => { const r = RULES.find(x => x.id === id); return `<div class="alert-item ${App.sevCls(r.severity)}"><div><b>${r.id}</b> · ${r.message}</div></div>`; }).join("") : `<div class="legend-note">Không có cảnh báo ngưỡng.</div>`;
    cards(cur); App.$("#lv-time").textContent = App.fullDate(ts) + ` · ${pos + 1}/${N}`;
    const ch = App.charts["lv-chart"], c = lvv.value; if (ch) { ch.data.datasets[0].data = bufR[c]; ch.data.datasets[1].data = bufC[c]; ch.update("none"); }
    pos++; };
  function pause() { if (timer) { clearInterval(timer); timer = null; } App.$("#lv-play").textContent = "▶ Chạy"; }
  App.$("#lv-play").onclick = () => { if (timer) { pause(); return; } const per = +App.$("#lv-speed").value; timer = setInterval(tick, Math.max(40, 1000 / per)); App.$("#lv-play").textContent = "⏸ Dừng"; };
  App.$("#lv-speed").onchange = () => { if (timer) { pause(); App.$("#lv-play").click(); } };
  App.$("#lv-step").onclick = () => { pause(); tick(); };
  App.$("#lv-reset").onclick = reset; App.$("#lv-scn").onchange = reset; lvv.onchange = chart;
  reset();
};

/* =============================== CHECKLIST =============================== */
App.views.checklist = async () => {
  const meta = await App.json("data/meta.json"); const prov = !!meta.provisional;
  // st: ok = đã làm | mid = làm một phần / cần bổ sung | man = cần làm tay (ngoài code); model = phụ thuộc kết quả train
  const G = [
    ["Proposal", [
      [1, "Chốt đề tài, bài toán", "ok", "Pipeline phân tích, xử lý dữ liệu IoT nông nghiệp (ớt, TP.HCM) từ soil_all.json + dự báo + cảnh báo", "Tab Tổng quan"],
      [2, "Mô tả bộ dữ liệu", "ok", "8.064 bản ghi thật, 28 ngày (14/12/2025–10/01/2026), 288 bản/ngày, 10 chỉ số", "Tab Tổng quan · KPI"],
      [3, "Ghi rõ nguồn gốc dữ liệu", "ok", "Bảng nguồn gốc (Firebase ban đầu, dữ liệu mở rộng, thời tiết Open-Meteo)", "Tổng quan · Bảng nguồn gốc"],
      [4, "Sơ đồ luồng dữ liệu", "ok", "Cảm biến → Firebase → Xử lý → Mô hình → Dashboard", "Tổng quan · Sơ đồ luồng"],
      [5, "Hình ảnh, video hệ thống", "man", "Ảnh/video máy bơm, thiết bị thực tế do nhóm cung cấp; ảnh dashboard chụp từ web này", "—"],
      [6, "Hoàn thiện slide, chia phần trình bày", "man", "Thuộc phần nhóm tự làm — web này cung cấp hình/bảng để chèn slide", "—"]]],
    ["Thu thập dữ liệu", [
      [7, "Đọc và làm phẳng JSON Firebase", "ok", "ngày → HH:MM → chỉ số thành bảng có cột timestamp", "src/common.py · load_raw_json"],
      [8, "Lấy thêm dữ liệu thời tiết", "ok", "Open-Meteo archive (có retry + cache), nội suy 5 phút và ghép theo thời gian", "src/weather.py"],
      [9, "Phát lại dữ liệu trực tiếp mỗi 5 phút", "ok", "Phát lại từng bản ghi 5 phút qua pipeline online (replay)", "src/replay.py · Tab Cảnh báo & Live"]]],
    ["Tiền xử lý", [
      [10, "Kiểm tra lưới thời gian", "ok", "Đủ 5 phút, không thiếu mốc, không trùng", "Kỹ thuật xử lý · bước 1"],
      [11, "Xử lý giá trị 0 do lỗi cảm biến", "ok", "Kiểm từng biến; độ ẩm/nhiệt độ = 0 là lỗi; N/P/K/EC = 0 chỉ là lỗi khi đất ẩm ≥ 12%", "Kỹ thuật xử lý · bước 2"],
      [12, "Quyết định giữ hay bỏ", "ok", "Bảng quyết định theo từng biến kèm lý do (đất khô → đầu dò không dẫn điện)", "Kỹ thuật xử lý · bước 2"],
      [13, "Missing data", "ok", "So sánh ffill / tuyến tính / hôm qua / KNN / MICE trên thí nghiệm ẩn ô có đáp án", "Kỹ thuật xử lý · bước 3"],
      [14, "Phát hiện outlier", "ok", "IQR, Z-score, Isolation Forest, DBSCAN so với luật miền + Hampel + Stuck; bảng điểm bất thường", "Kỹ thuật xử lý · bước 4 · Dữ liệu & Lỗi"],
      [15, "Phân biệt bất thường thật và lỗi", "ok", "Đồng thuận ≥3/4 biến EC–N–P–K ⇒ sự kiện dinh dưỡng/bón phân, giữ lại", "Kỹ thuật xử lý · bước 5"],
      [16, "Làm mượt dữ liệu", "ok", "SMA, EMA, Savitzky–Golay (nhân quả vs centered), đo NRMSE + độ trễ", "Kỹ thuật xử lý · bước 6"],
      [17, "Đo tác động tiền xử lý lên mô hình", "model", "Cùng 1 mô hình HGB, 4 pipeline A–D, đo sai số trên tập test", "Kỹ thuật xử lý · bước 7"]]],
    ["EDA", [
      [18, "Thống kê mô tả", "ok", "describe (thô vs sạch), boxplot, histogram", "Tab EDA"],
      [19, "Biểu đồ theo thời gian", "ok", "Xu hướng ngày, hồ sơ theo giờ, nhận xét", "Tab EDA"],
      [20, "Tương quan giữa các biến", "ok", "Pearson/Spearman/dữ liệu thật + biến thời tiết", "Tab EDA"],
      [21, "ACF / PACF", "ok", "Chọn số bước trễ cho mô hình", "Tab EDA"]]],
    ["Đặc trưng", [
      [22, "Sinh đặc trưng", "ok", "Lag, rolling mean/std, sin/cos giờ trong ngày, chênh lệch 2 bước", "src/modeling.py · Windows"],
      [23, "Chuẩn hoá", "ok", "MinMax [0,1] chỉ fit trên train, đảo ngược trước khi tính sai số", "src/modeling.py · Scaled"],
      [24, "Chọn đặc trưng", "model", "Tất cả / 1 đại diện / PCA / Lasso / RFE / RF-importance", "Mô hình · Chọn đặc trưng"],
      [25, "Window sliding", "model", "Cửa sổ 4, 12, 24", "Mô hình · Cửa sổ trượt"]]],
    ["Mô hình", [
      [26, "Baseline", "model", "Giữ nguyên giá trị; cùng giờ hôm qua", "Mô hình · Baseline vs mô hình"],
      [27, "Thử các mô hình", "model", "Random Forest, HistGradientBoosting, XGBoost, LSTM (PyTorch)", "src/run_models.py"],
      [28, "Đánh giá", "model", "Chia theo thời gian (train ≤30/06, val tháng 7, test tháng 8); RMSE, MAE, sMAPE, NRMSE; walk-forward", "Mô hình · Walk-forward"],
      [29, "Tối ưu mô hình tốt nhất", "model", "Random search HGB trên validation; chốt mô hình train+val", "Mô hình · Tối ưu tham số"]]],
    ["Dashboard", [
      [30, "Dashboard (Streamlit)", "mid", "Làm bằng web tĩnh HTML/JS theo yêu cầu “Demo Web” (dữ liệu gốc vs làm sạch, giá trị dự báo). Nếu giảng viên yêu cầu đúng Streamlit cần viết thêm app.py", "web/index.html"],
      [31, "Cảnh báo theo ngưỡng", "ok", "File ngưỡng riêng; cảnh báo thiếu nước/thiếu phân và SENSOR_FAULT khi giá trị 0/NaN/kẹt", "config/thresholds.json · Tab Cảnh báo"]]]];
  const sym = { ok: ["✓", "var(--leaf)"], mid: ["◐", "var(--amber)"], man: ["✎", "var(--sky)"], tmp: ["◐", "var(--amber)"] };
  const all = G.flatMap(g => g[1]); const cnt = s => all.filter(r => (r[2] === "model" ? (prov ? "tmp" : "ok") : r[2]) === s).length;
  App.$("#checklist-root").innerHTML = `${App.provBanner(meta)}
  <div class="section-title"><div><h2>Checklist &amp; tài liệu</h2><p>Đối chiếu 31 đầu việc của đề bài với những gì đã có trong dự án.</p></div></div>
  <div class="grid g4" style="margin-bottom:18px"><div class="card kpi"><div class="v">${cnt("ok")}</div><div class="l">Hoàn thành</div></div><div class="card kpi"><div class="v">${cnt("tmp") + cnt("mid")}</div><div class="l">Một phần / kết quả tạm</div></div><div class="card kpi"><div class="v">${cnt("man")}</div><div class="l">Cần nhóm làm tay</div></div><div class="card kpi"><div class="v">${all.length}</div><div class="l">Tổng đầu việc</div></div></div>
  <div class="card">${G.map(([name, rows]) => `<div class="cl-group"><h3 style="margin:6px 0">${name}</h3>${rows.map(([n, t, st, d, loc]) => { const s = st === "model" ? (prov ? "tmp" : "ok") : st; const [ic, co] = sym[s];
    return `<div class="cl-row"><div class="ck" style="color:${co}">${ic}</div><div><b>${n}. ${t}</b>${s === "tmp" ? `<div class="legend-note" style="color:var(--amber)">kết quả tạm — chờ train đầy đủ</div>` : ""}</div><div>${d}</div><div class="loc">${loc}</div></div>`; }).join("")}</div>`).join("")}</div>
  <div class="card" style="margin-top:18px"><h3>Giới hạn đã biết</h3><ul style="margin-left:20px;line-height:1.9">
    <li>Bộ dữ liệu mở rộng 14/12/2025 → 31/08/2026 (75.168 bản ghi, bước 5 phút) nối tiếp chuỗi gốc từ Firebase, được làm sạch và xử lý đồng nhất qua toàn bộ pipeline.</li>
    <li>Cảm biến ánh sáng thật ở 28 ngày đầu tương quan rất yếu với bức xạ Open-Meteo (nghi ngờ đầu dò) — kết quả cho biến <code>light</code> giai đoạn đầu kém tin cậy.</li>
    <li>Không bộ phát hiện nào bắt được <b>drift</b> (trôi chậm); cần CUSUM/so sánh chéo cảm biến.</li>
    <li>Ngưỡng cảnh báo do nhóm tự đặt, không phải chuẩn nông học cố định.</li></ul></div>`;
};
