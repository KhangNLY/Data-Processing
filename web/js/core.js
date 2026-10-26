/* ===== Core: helpers + Overview + Data Explorer ===== */
const App = {
  VARS: ["temperature","humidity","light","soiltemp","moisture","pH","EC","N","P","K"],
  UNITS: {temperature:"°C",humidity:"%RH",light:"a.u.",soiltemp:"°C",moisture:"%VWC",pH:"pH",EC:"mS/cm",N:"mg/kg",P:"mg/kg",K:"mg/kg"},
  VI: {temperature:"Nhiệt độ không khí",humidity:"Độ ẩm không khí",light:"Ánh sáng",soiltemp:"Nhiệt độ đất",moisture:"Độ ẩm đất",pH:"pH đất",EC:"EC đất",N:"Đạm (N)",P:"Lân (P)",K:"Kali (K)"},
  COL: {temperature:"#ff7a59",humidity:"#4cc9f0",light:"#ffd166",soiltemp:"#f08a4b",moisture:"#3a86ff",pH:"#c77dff",EC:"#2ee6a6",N:"#80ed99",P:"#ff5d8f",K:"#ffb703"},
  FAULT: {1:"Ngoài khoảng vật lý",2:"Giá trị 0 lỗi",3:"Spike (Hampel)",4:"Kẹt giá trị",5:"Missing"},
  FCOL: {1:"#ff5d8f",2:"#ff7a59",3:"#ffd166",4:"#c77dff",5:"#8ea0b8"},
  cache: {}, charts: {}, ready: {}
};
App.json = async (u) => { if (!App.cache[u]) App.cache[u] = fetch(u).then(r => { if(!r.ok) throw new Error(u+" "+r.status); return r.json(); }); return App.cache[u]; };
App.$ = (s, r=document) => r.querySelector(s);
App.$$ = (s, r=document) => [...r.querySelectorAll(s)];
App.fmt = (x, d=2) => (x===null||x===undefined||isNaN(x)) ? "–" : Number(x).toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d});
App.pct = (x,d=1)=> App.fmt(x*100,d)+"%";
App.ts = (iso) => new Date(iso+"+07:00").getTime();       // dữ liệu ở giờ VN (UTC+7)
App.tickDate = (ms, withTime=true) => { const d = new Date(ms + 7*3600e3); const p=n=>String(n).padStart(2,"0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth()+1)}` + (withTime?` ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`:""); };
App.fullDate = (ms) => { const d = new Date(ms + 7*3600e3); const p=n=>String(n).padStart(2,"0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth()+1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`; };
App.mk = (id, cfg) => { if (App.charts[id]) App.charts[id].destroy(); const c = document.getElementById(id); if(!c) return;
  App.charts[id] = new Chart(c.getContext("2d"), cfg); return App.charts[id]; };
App.varSelect = (id, onchange, def) => { const s = document.createElement("select"); s.id = id;
  s.innerHTML = App.VARS.map(v=>`<option value="${v}">${App.VI[v]} (${v})</option>`).join(""); if(def) s.value=def; s.onchange=onchange; return s; };
App.card = (title, sub, body, extra="") => `<div class="card ${extra}"><h3>${title}</h3><div class="sub">${sub||""}</div>${body}</div>`;
App.heat = (v, lo, hi, rev=false) => { let t = Math.max(0, Math.min(1, (v-lo)/(hi-lo))); if (rev) t = 1-t;
  const h = 150 - t*150; return `hsl(${h} 70% ${28+ (1-Math.abs(t-.5)*2)*0}%)`; };
App.mean = a => a.reduce((x,y)=>x+y,0)/a.length;
App.group = (rows, key) => rows.reduce((m,r)=>{ (m[r[key]] = m[r[key]]||[]).push(r); return m; },{});

Chart.defaults.color = "#9aa8bd"; Chart.defaults.borderColor = "rgba(120,140,170,.14)";
Chart.defaults.font.family = "Inter, system-ui, sans-serif"; Chart.defaults.font.size = 11;
Chart.defaults.plugins.legend.labels.usePointStyle = true; Chart.defaults.plugins.legend.labels.boxWidth = 8;
Chart.defaults.animation.duration = 500;
Chart.defaults.plugins.tooltip.backgroundColor = "rgba(8,12,22,.95)"; Chart.defaults.plugins.tooltip.borderColor = "rgba(120,140,170,.3)";
Chart.defaults.plugins.tooltip.borderWidth = 1; Chart.defaults.plugins.tooltip.padding = 10;

App.timeScale = (extra={}) => ({type:"linear", ticks:{maxTicksLimit:9, callback:v=>App.tickDate(v)}, grid:{color:"rgba(120,140,170,.1)"}, ...extra});

/* ---- tables ---- */
App.table = (cols, rows, opts={}) => {
  const best = opts.best || {};   // {colKey:'min'|'max'}
  const bestVal = {};
  Object.keys(best).forEach(k => { const v = rows.map(r=>r[k]).filter(x=>typeof x==="number"); bestVal[k] = best[k]==="min"?Math.min(...v):Math.max(...v); });
  return `<div class="tbl-wrap" ${opts.maxh?`style="max-height:${opts.maxh}px"`:""}><table><thead><tr>${cols.map(c=>`<th>${c.h}</th>`).join("")}</tr></thead><tbody>${
    rows.map(r=>`<tr>${cols.map(c=>{ let v=r[c.k]; let cls="";
      if (best[c.k] && typeof v==="number" && Math.abs(v-bestVal[c.k])<1e-12) cls="best";
      const txt = c.f ? c.f(v,r) : (typeof v==="number" ? App.fmt(v, c.d ?? 3) : (v ?? "–"));
      return `<td class="${cls}">${txt}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div>`;
};
App.explain = (html, cls="") => `<div class="explain ${cls}">${html}</div>`;

/* ---- tabs/navigation ---- */
App.show = (name) => {
  App.$$("nav button").forEach(b => b.classList.toggle("active", b.dataset.view===name));
  App.$$(".view").forEach(v => v.classList.toggle("active", v.id==="view-"+name));
  window.scrollTo({top:0,behavior:"smooth"});
  if (!App.ready[name] && App.views[name]) { App.ready[name]=true; App.views[name](); }
  history.replaceState(null,"","#"+name);
};
App.views = {};

/* =============================== OVERVIEW =============================== */
App.views.overview = async () => {
  const [meta, an] = await Promise.all([App.json("data/meta.json"), App.json("data/analysis.json")]);
  const g = an.grid, fc = (an.fault_counts && (an.fault_counts.all || an.fault_counts.synthetic || an.fault_counts.real)) || {};
  const flagged = Object.values(fc).reduce((a,o)=>a+Object.values(o||{}).reduce((x,y)=>x+y,0),0);
  App.$("#kpis").innerHTML = [
    ["red", App.fmt(meta.rows,0), "Bản ghi 5 phút", `${g.start.slice(0,10)} → ${g.end.slice(0,10)}`],
    ["", App.fmt(meta.rows/288,0), "Số ngày", "288 bản ghi/ngày"],
    ["", "10", "Chỉ số cảm biến", "EC, N, P, K, pH, moisture, soiltemp, temp, humidity, light"],
    ["", "4", "Biến thời tiết", "Open-Meteo: nhiệt độ, RH, bức xạ, mưa"],
    ["red", App.fmt(flagged/(meta.rows*10)*100,2)+"%", "Ô dữ liệu bị gắn cờ lỗi/thiếu", "luật miền + Hampel + stuck + missing"],
    ["", meta.best_pipeline.split("_")[0], "Pipeline xử lý chọn cuối", meta.best_pipeline],
  ].map(([c,v,l,d])=>`<div class="card kpi ${c}"><div class="v">${v}</div><div class="l">${l}</div><div class="d">${d}</div></div>`).join("");

  // phạm vi dữ liệu
  App.$("#timeline").innerHTML = `<div style="width:100%;background:linear-gradient(90deg,hsl(152 60% 24%),hsl(200 60% 32%))">${App.fmt(meta.rows,0)} bản ghi · lưới 5 phút</div>`;

  // bảng nguồn gốc dữ liệu (checklist mục 3)
  const prov = [
    ["Cảm biến IoT (10 chỉ số)","14/12/2025 → 31/08/2026","Firebase (soil_all_extended.json)","Chuỗi đo liên tục 75.168 bản ghi ở lưới 5 phút, 10 chỉ số lý hóa đất và môi trường"],
    ["Thời tiết TP.HCM","14/12/2025 → 31/08/2026","Open-Meteo archive","Nhiệt độ, RH, bức xạ, mưa theo giờ → nội suy 5 phút; dùng làm biến ngoại sinh cho EDA và luật miền"],
  ];
  App.$("#prov").innerHTML = App.table([{h:"Thành phần",k:0,f:v=>v},{h:"Thời gian",k:1,f:v=>v},{h:"Nguồn",k:2,f:v=>`<span class="pill real">${v}</span>`},{h:"Ghi chú",k:3,f:v=>`<span style="white-space:normal;display:block;min-width:300px;text-align:left">${v}</span>`}], prov.map(r=>({0:r[0],1:r[1],2:r[2],3:r[3]})));
};

/* =============================== EXPLORER =============================== */
App.views.explore = async () => {
  const meta = await App.json("data/meta.json");
  const months = meta.months;
  const vsel = App.$("#ex-var"), msel = App.$("#ex-month");
  vsel.innerHTML = App.VARS.map(v=>`<option value="${v}">${App.VI[v]} (${v})</option>`).join("");
  msel.innerHTML = months.map(m=>`<option value="${m}">${m}</option>`).join("");
  msel.value = "2026-03";
  const st = {layers:{raw:true,clean:true,smooth:false,flags:true,rain:false}};
  const layerDefs = [["raw","Dữ liệu thô","#8ea0b8"],["clean","Đã làm sạch (luật + điền)","#2ee6a6"],["smooth","+ Làm mượt EMA","#4cc9f0"],["flags","Điểm bị gắn cờ","#ffd166"],["rain","Mưa (mm/5')","#3a86ff"]];
  App.$("#ex-layers").innerHTML = layerDefs.map(([k,l,c])=>`<span class="chip ${st.layers[k]?"on":""}" data-k="${k}" style="--c:${c}"><i></i>${l}</span>`).join("");
  App.$$("#ex-layers .chip").forEach(ch => ch.onclick = () => { st.layers[ch.dataset.k]=!st.layers[ch.dataset.k]; ch.classList.toggle("on"); draw(); });
  const jumps = [
    ["Cảm biến ngừng đọc 25–28/12 (moisture)","2025-12","moisture",["2025-12-25T12:00","2025-12-28T12:00"]],
    ["Cảm biến ngừng đọc 25–28/12 (temperature)","2025-12","temperature",["2025-12-25T12:00","2025-12-28T12:00"]],
    ["EC tăng vọt 3/1","2026-01","EC",["2026-01-02T12:00","2026-01-06T12:00"]],
    ["Đất khô → NPK = 0 (7–11/1)","2026-01","K",["2026-01-07T00:00","2026-01-11T12:00"]],
    ["Độ ẩm đất tụt 22–25/3","2026-03","moisture",["2026-03-21T00:00","2026-03-27T00:00"]],
    ["pH lệch dần 2–10/3","2026-03","pH",["2026-03-01T00:00","2026-03-12T00:00"]],
    ["EC tăng cao kéo dài 3/7","2026-07","EC",["2026-07-02T00:00","2026-07-08T00:00"]],
    ["Độ ẩm đất tụt 9–11/8","2026-08","moisture",["2026-08-08T00:00","2026-08-13T00:00"]],
  ];
  App.$("#ex-jumps").innerHTML = `<span class="legend-note">Nhảy tới tình huống:</span>` + jumps.map((j,i)=>`<button class="btn ghost" data-i="${i}" style="padding:6px 11px;font-size:.76rem">${j[0]}</button>`).join("");
  let range = null;
  App.$$("#ex-jumps button").forEach(b => b.onclick = () => { const j = jumps[+b.dataset.i]; vsel.value=j[2]; msel.value=j[1]; range=[App.ts(j[3][0]),App.ts(j[3][1])]; draw(); });
  vsel.onchange = () => { range=null; draw(); }; msel.onchange = () => { range=null; draw(); };
  App.$("#ex-span").onchange = () => { range=null; draw(); };
  App.$("#ex-start").oninput = () => { range=null; draw(); };

  async function draw() {
    const v = vsel.value, m = msel.value;
    const d = await App.json(`data/series_${m}.json`);
    const t0 = App.ts(d.t0), n = d.n, step = 300000;
    let a = 0, b = n;
    const span = +App.$("#ex-span").value;
    if (range) { a = Math.max(0, Math.floor((range[0]-t0)/step)); b = Math.min(n, Math.ceil((range[1]-t0)/step)); }
    else if (span>0) { a = Math.min(+App.$("#ex-start").value*288, Math.max(0,n-288)); b = Math.min(n, a + span*288); }
    // chọn mốc chọn (offset) nếu span<ngày tháng
    const mk = (arr) => { const out=[]; for (let i=a;i<b;i++){ const y=arr[i]; out.push({x:t0+i*step, y: (y===null? NaN : y)}); } return out; };
    const ds = [];
    if (st.layers.rain && d.weather) ds.push({type:"bar",label:"Mưa",data:mk(d.weather.rain),backgroundColor:"rgba(58,134,255,.55)",yAxisID:"y2",barThickness:2,order:5});
    if (st.layers.raw) ds.push({label:"Thô",data:mk(d.raw[v]),borderColor:"rgba(160,180,210,.7)",borderWidth:1,pointRadius:0,spanGaps:false,order:4});
    if (st.layers.clean) ds.push({label:"Đã làm sạch",data:mk(d.clean[v]),borderColor:"#2ee6a6",borderWidth:1.6,pointRadius:0,order:2});
    if (st.layers.smooth) ds.push({label:"Làm mượt EMA",data:mk(d.smooth[v]),borderColor:"#4cc9f0",borderWidth:1.8,pointRadius:0,order:1});
    if (st.layers.flags) {
      const fl = d.flag[v];
      for (const code of [1,2,3,4]) {
        const pts=[]; for (let i=a;i<b;i++) if (fl.charCodeAt(i)-48===code) { const y = d.raw[v][i]; pts.push({x:t0+i*step,y: y===null? (d.clean[v][i]) : y}); }
        if (pts.length) ds.push({type:"scatter",label:App.FAULT[code],data:pts,backgroundColor:App.FCOL[code],borderColor:"#000",borderWidth:.5,pointRadius:4,pointStyle:code===2?"rectRot":code===3?"triangle":code===4?"rect":"crossRot",order:0});
      }
      const miss=[]; const yy = d.clean[v]; let lo=Infinity,hi=-Infinity; for(let i=a;i<b;i++){ const y=yy[i]; if(y!==null){lo=Math.min(lo,y);hi=Math.max(hi,y);} }
      for (let i=a;i<b;i++) if (fl.charCodeAt(i)-48===5) miss.push({x:t0+i*step,y:lo});
      if (miss.length) ds.push({type:"scatter",label:"Missing (NaN)",data:miss,backgroundColor:App.FCOL[5],pointRadius:2.5,order:0});
    }
    App.mk("ex-chart", {type:"line",data:{datasets:ds},options:{responsive:true,maintainAspectRatio:false,parsing:false,normalized:true,interaction:{mode:"nearest",intersect:false,axis:"x"},
      scales:{x:App.timeScale(),y:{title:{display:true,text:`${App.VI[v]} (${App.UNITS[v]})`}},y2:{display:st.layers.rain,position:"right",grid:{display:false},reverse:true,title:{display:true,text:"mm/5'"}}},
      plugins:{tooltip:{callbacks:{title:(it)=>App.fullDate(it[0].parsed.x)}},decimation:{enabled:true,algorithm:"lttb",samples:1400}}}});
    // thống kê cửa sổ
    const cnt = {1:0,2:0,3:0,4:0,5:0}; const fl=d.flag[v]; for(let i=a;i<b;i++){ const c=fl.charCodeAt(i)-48; if(c) cnt[c]++; }
    App.$("#ex-stats").innerHTML = Object.keys(cnt).map(c=>`<span class="pill" style="border-color:${App.FCOL[c]}66;color:${App.FCOL[c]}">${App.FAULT[c]}: ${cnt[c]}</span>`).join("")+`<span class="pill">${b-a} bản ghi trong cửa sổ</span>`;
  }
  await draw();

  // bảng điểm bất thường
  const an = await App.json("data/analysis.json");
  const tbl = an.anomaly_table;
  const fsel = App.$("#an-var"), tsel = App.$("#an-type");
  fsel.innerHTML = `<option value="">Tất cả biến</option>`+App.VARS.map(v=>`<option>${v}</option>`).join("");
  tsel.innerHTML = `<option value="">Tất cả loại</option>`+[...new Set(tbl.map(r=>r.type))].map(v=>`<option>${v}</option>`).join("");
  const render = () => { let r = tbl.filter(x => (!fsel.value||x.var===fsel.value) && (!tsel.value||x.type===tsel.value));
    App.$("#an-count").textContent = `${r.length} / ${an.anomaly_table_n} đoạn bất thường (hiển thị tối đa 1500 dòng đầu)`;
    App.$("#an-tbl").innerHTML = App.table([{h:"Bắt đầu",k:"start",f:v=>v.slice(0,16)},{h:"Kết thúc",k:"end",f:v=>v.slice(0,16)},{h:"Biến",k:"var",f:v=>`<b style="color:${App.COL[v]}">${v}</b>`},{h:"Loại",k:"type"},{h:"Số bước",k:"steps",d:0},{h:"Min thô",k:"raw_min",d:2},{h:"Max thô",k:"raw_max",d:2}], r.slice(0,400), {maxh:420}); };
  [fsel,tsel].forEach(s=>s.onchange=render); render();
};
