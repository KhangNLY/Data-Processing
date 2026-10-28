/* Ensure unified font across all chart canvases */
if (window.Chart) {
  Chart.defaults.font.family = "'Roboto', 'Segoe UI', -apple-system, BlinkMacSystemFont, Tahoma, Arial, sans-serif";
}

const App = {
  VARS: ['moisture', 'EC', 'pH', 'N', 'P', 'K', 'temperature', 'soiltemp', 'humidity', 'light'],
  UNITS: {
    moisture: '%VWC', EC: 'mS/cm', pH: 'pH', N: 'mg/kg', P: 'mg/kg', K: 'mg/kg',
    temperature: '°C', soiltemp: '°C', humidity: '%RH', light: 'klux'
  },
  LABELS: {
    moisture: 'Độ ẩm đất', EC: 'EC Dinh dưỡng', pH: 'Độ chua (pH)', N: 'Đạm (N)',
    P: 'Lân (P)', K: 'Kali (K)', temperature: 'Nhiệt độ khí', soiltemp: 'Nhiệt độ đất',
    humidity: 'Độ ẩm không khí', light: 'Cường độ sáng'
  },
  THRESHOLDS: {
    moisture:    { min: 1, max: 70, safeLo: 38, safeHi: 62 },
    EC:          { min: 0, max: 4.0, safeLo: 0.25, safeHi: 1.50 },
    pH:          { min: 3.0, max: 9.5, safeLo: 5.0, safeHi: 7.5 },
    N:           { min: 0, max: 800, safeLo: 25, safeHi: 250 },
    P:           { min: 0, max: 1200, safeLo: 120, safeHi: 450 },
    K:           { min: 0, max: 1500, safeLo: 130, safeHi: 500 },
    temperature: { min: 10, max: 45, safeLo: 20, safeHi: 36 },
    soiltemp:    { min: 15, max: 40, safeLo: 18, safeHi: 33 },
    humidity:    { min: 20, max: 100, safeLo: 45, safeHi: 92 },
    light:       { min: 0, max: 30, safeLo: 0, safeHi: 25 }
  },
  cache: {},
  currentTelemetry: {},
  replay: {
    timer: null,
    isPlaying: false,
    speed: 1,
    index: 0,
    data: null,
    total: 0
  }
};

/* Data Fetch Helper */
App.json = async function(url) {
  if (!App.cache[url]) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
    App.cache[url] = await res.json();
  }
  return App.cache[url];
};

App.fmt = (val, d = 1) => {
  if (val === null || val === undefined || isNaN(val)) return '–';
  return Number(val).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
};

/* --------------------------------------------------------------------------
   INITIALIZATION
   -------------------------------------------------------------------------- */
App.init = async function() {
  this.setupNavigation();
  this.setupRelayButtons();

  // Load telemetry data
  try {
    const [fc, meta, al] = await Promise.all([
      App.json('data/forecast.json'),
      App.json('data/meta.json'),
      App.json('data/alerts.json')
    ]);

    this.fcData = fc;
    this.metaData = meta;
    this.alertsData = al;

    // Set initial latest record
    const lastArr = fc.last || [];
    const varsOrder = fc.vars || [];
    const initialTel = {};
    varsOrder.forEach((v, idx) => {
      initialTel[v] = lastArr[idx];
    });
    this.currentTelemetry = initialTel;

    // Render Gauges & LCD
    this.renderSensorGauges(initialTel);
    this.updateVirtualLcd(initialTel);
    this.updateQuickStrip(initialTel, fc.last_ts);

    // Initialize Views
    if (window.ForecastView) window.ForecastView.init(fc, al);
    if (window.HistoryView) window.HistoryView.init(meta);

    // Prepare Streaming Replay with august data
    this.initReplayEngine(al);

  } catch (err) {
    console.error('Lỗi tải dữ liệu:', err);
  }
};

/* --------------------------------------------------------------------------
   NAVIGATION
   -------------------------------------------------------------------------- */
App.setupNavigation = function() {
  const navBtns = document.querySelectorAll('.nav-btn');
  const sections = document.querySelectorAll('.view-section');

  const switchTab = (targetId) => {
    navBtns.forEach((b) => b.classList.toggle('active', b.dataset.target === targetId));
    sections.forEach((s) => {
      const isActive = s.id === `view-${targetId}`;
      s.classList.toggle('active', isActive);
      if (isActive) {
        s.style.setProperty('display', s.id === 'view-monitor' ? 'block' : 'flex', 'important');
      } else {
        s.style.setProperty('display', 'none', 'important');
      }
    });
    const isFixedView = targetId === 'forecast' || targetId === 'history';
    document.body.classList.toggle('no-page-scroll', isFixedView);
    document.documentElement.classList.toggle('no-page-scroll', isFixedView);

    window.scrollTo({ top: 0, behavior: 'instant' });
    if (location.hash !== `#${targetId}`) {
      history.replaceState(null, '', `#${targetId}`);
    }
    if (targetId === 'monitor') {
      if (window.VisualTwin) {
        window.VisualTwin.switchMode('motion');
        const modeBtns = document.querySelectorAll('.mode-tab-btn');
        modeBtns.forEach((b) => b.classList.toggle('active', b.dataset.mode === 'motion'));
      }
    } else if (targetId === 'forecast' && window.ForecastView) {
      setTimeout(() => window.ForecastView.renderChart(), 60);
    } else if (targetId === 'history' && window.HistoryView) {
      setTimeout(() => window.HistoryView.renderChart(), 60);
    }
  };

  navBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(btn.dataset.target);
    });
  });

  window.addEventListener('hashchange', () => {
    const h = (location.hash || '#monitor').replace('#', '');
    if (['monitor', 'forecast', 'history'].includes(h)) switchTab(h);
  });

  const hash = (location.hash || '#monitor').replace('#', '');
  if (['monitor', 'forecast', 'history'].includes(hash)) {
    switchTab(hash);
  }
};

/* --------------------------------------------------------------------------
   QUICK STATUS STRIP & SENSOR GAUGES
   -------------------------------------------------------------------------- */
App.updateQuickStrip = function(tel, lastTs) {
  const moisture = tel.moisture ?? 50;
  const ec = tel.EC ?? 0.8;
  const isOk = moisture >= 38 && moisture <= 62 && ec >= 0.25 && ec <= 1.5;

  const statusText = document.getElementById('strip-status-text');
  const tag = document.getElementById('strip-status-tag');
  const timeEl = document.getElementById('strip-time');

  if (statusText) statusText.textContent = isOk ? 'Ổn định (Tối ưu)' : 'Cần chú ý';
  if (tag) {
    tag.textContent = isOk ? 'TỐT' : 'CHÚ Ý';
    tag.className = `strip-tag ${isOk ? 'ok' : 'warn'}`;
  }
  if (timeEl && lastTs) {
    timeEl.textContent = lastTs.replace('T', ' ');
  }
};

App.renderSensorGauges = function(tel) {
  const container = document.getElementById('sensor-gauges-container');
  if (!container) return;

  container.innerHTML = this.VARS.map((v) => {
    const val = tel[v];
    const unit = this.UNITS[v];
    const name = this.LABELS[v];
    const th = this.THRESHOLDS[v];
    const digits = (v === 'pH' || v === 'EC') ? 2 : 1;

    let status = 'ok';
    let statusText = 'CHUẨN';
    if (val === null || val === undefined || isNaN(val)) {
      status = 'fault';
      statusText = 'LỖI ĐO';
    } else if (val < th.safeLo) {
      status = 'warn';
      statusText = 'THẤP';
    } else if (val > th.safeHi) {
      status = 'warn';
      statusText = 'CAO';
    }

    // Range calculation
    const span = th.max - th.min;
    const safeLeft = ((th.safeLo - th.min) / span) * 100;
    const safeWidth = ((th.safeHi - th.safeLo) / span) * 100;
    const ptrPos = Math.max(0, Math.min(100, ((val - th.min) / span) * 100));

    return `
      <div class="sensor-gauge-card" id="gauge-card-${v}">
        <div class="gauge-header">
          <span class="gauge-name">${name}</span>
          <span class="gauge-status-badge ${status}" id="badge-${v}">${statusText}</span>
        </div>
        <div class="gauge-value-display">
          <span class="gauge-num" id="val-${v}">${App.fmt(val, digits)}</span>
          <span class="gauge-unit">${unit}</span>
        </div>
        <div class="gauge-range-meter">
          <div class="range-safe-zone" style="left: ${safeLeft}%; width: ${safeWidth}%;"></div>
          <div class="range-pointer-needle" id="ptr-${v}" style="left: ${ptrPos}%;"></div>
        </div>
        <div class="gauge-limits">
          <span>${th.min}</span>
          <span>[${th.safeLo} - ${th.safeHi}]</span>
          <span>${th.max}</span>
        </div>
      </div>
    `;
  }).join('');
};

App.updateGaugesDynamic = function(tel) {
  this.VARS.forEach((v) => {
    const val = tel[v];
    const th = this.THRESHOLDS[v];
    const digits = (v === 'pH' || v === 'EC') ? 2 : 1;

    const valEl = document.getElementById(`val-${v}`);
    const badgeEl = document.getElementById(`badge-${v}`);
    const ptrEl = document.getElementById(`ptr-${v}`);

    if (valEl) valEl.textContent = App.fmt(val, digits);

    let status = 'ok';
    let statusText = 'CHUẨN';
    if (val === null || isNaN(val)) {
      status = 'fault';
      statusText = 'LỖI ĐO';
    } else if (val < th.safeLo) {
      status = 'warn';
      statusText = 'THẤP';
    } else if (val > th.safeHi) {
      status = 'warn';
      statusText = 'CAO';
    }

    if (badgeEl) {
      badgeEl.className = `gauge-status-badge ${status}`;
      badgeEl.textContent = statusText;
    }

    if (ptrEl) {
      const span = th.max - th.min;
      const ptrPos = Math.max(0, Math.min(100, ((val - th.min) / span) * 100));
      ptrEl.style.left = `${ptrPos}%`;
    }
  });
};

/* --------------------------------------------------------------------------
   VIRTUAL TOUCH LCD SCREEN (RECREATING PHOTO 3 REAL UI)
   -------------------------------------------------------------------------- */
App.updateVirtualLcd = function(tel) {
  const recList = document.getElementById('lcd-rec-items');
  const nStat = document.getElementById('lcd-stat-n');
  const pStat = document.getElementById('lcd-stat-p');
  const kStat = document.getElementById('lcd-stat-k');
  const phStat = document.getElementById('lcd-stat-ph');
  const ecStat = document.getElementById('lcd-stat-ec');

  const moisture = tel.moisture ?? 50;
  const ec = tel.EC ?? 0.8;
  const ph = tel.pH ?? 6.0;
  const n = tel.N ?? 80;
  const p = tel.P ?? 200;
  const k = tel.K ?? 220;

  // Recommendations localized in Vietnamese, preserving EC, pH, N, P, K
  const recs = [];
  if (ph < 5.2) {
    recs.push('Bón thêm vôi để nâng độ pH của đất!');
  } else if (ph > 7.4) {
    recs.push('Đất hơi kiềm — tạm hoãn bón vôi!');
  }

  if (p > 350) {
    recs.push('Lân (P) cao — tạm dừng bón thêm Lân!');
  }
  if (k > 400) {
    recs.push('Kali (K) cao — tạm dừng bón thêm Kali!');
  }

  if (moisture < 38) {
    recs.push('Độ ẩm đất thấp (< 38%) — kích hoạt tưới nhỏ giọt 15 phút!');
  } else if (moisture > 62) {
    recs.push('Đất ngập úng — kiểm tra hệ thống thoát nước!');
  }

  if (ec < 0.25) {
    recs.push('Dinh dưỡng EC thấp — cần châm thêm phân bón!');
  }

  if (recs.length === 0) {
    recs.push('Các chỉ số dinh dưỡng và độ ẩm đất đạt chuẩn tối ưu.');
    recs.push('Duy trì lịch tưới và chiếu sáng tự động.');
  }

  if (recList) {
    recList.innerHTML = recs.map((r) => `<li>${r}</li>`).join('');
  }

  // Fertilizer & Detail Status rows
  const setStatus = (el, val, lo, hi) => {
    if (!el) return;
    if (val < lo) {
      el.textContent = 'Thấp';
      el.className = 'status low';
    } else if (val > hi) {
      el.textContent = 'Dư thừa';
      el.className = 'status high';
    } else {
      el.textContent = 'Đạt';
      el.className = 'status good';
    }
  };

  setStatus(nStat, n, 25, 250);
  setStatus(pStat, p, 120, 350);
  setStatus(kStat, k, 130, 400);
  setStatus(phStat, ph, 5.0, 7.5);
  setStatus(ecStat, ec, 0.25, 1.50);
};

/* --------------------------------------------------------------------------
   HARDWARE RELAY BUTTONS
   -------------------------------------------------------------------------- */
App.setupRelayButtons = function() {
  const btnPump = document.getElementById('btn-relay-pump');
  const btnLight = document.getElementById('btn-relay-light');

  if (btnPump) {
    btnPump.addEventListener('click', () => {
      if (window.VisualTwin) window.VisualTwin.togglePump();
    });
  }
  if (btnLight) {
    btnLight.addEventListener('click', () => {
      if (window.VisualTwin) window.VisualTwin.toggleLight();
    });
  }
};

/* --------------------------------------------------------------------------
   STREAMING REPLAY CONTROLLER (DOCK BAR)
   -------------------------------------------------------------------------- */
App.initReplayEngine = function(al) {
  // Use august data series if available or synthetic time series
  const fc = this.fcData;
  if (!fc || !fc.history) return;

  const series = fc.history.series || {};
  const len = fc.history.n || 288;
  const t0 = new Date(fc.history.t0).getTime();
  const stepMs = 5 * 60 * 1000;

  this.replay.data = [];
  for (let i = 0; i < len; i++) {
    const item = { ts: t0 + i * stepMs };
    this.VARS.forEach((v) => {
      item[v] = series[v] ? series[v][i] : 0;
    });
    this.replay.data.push(item);
  }
  this.replay.total = len;

  // Setup Dock Elements
  const playBtn = document.getElementById('dock-play-btn');
  const stepBtn = document.getElementById('dock-step-btn');
  const speedSel = document.getElementById('dock-speed-sel');
  const scrubber = document.getElementById('dock-scrubber');
  const timeReadout = document.getElementById('dock-time-readout');

  if (scrubber) {
    scrubber.max = len - 1;
    scrubber.value = len - 1;
    this.replay.index = len - 1;
  }

  const updateFrame = (idx) => {
    if (!this.replay.data || idx >= this.replay.data.length) return;
    const rec = this.replay.data[idx];
    this.currentTelemetry = rec;
    this.updateGaugesDynamic(rec);
    this.updateVirtualLcd(rec);

    if (window.VisualTwin) {
      window.VisualTwin.telemetry = rec;
      // Auto-trigger water mist if moisture dropped below 38%
      if (rec.moisture < 38 && !window.VisualTwin.relayState.pump) {
        window.VisualTwin.togglePump();
      }
    }

    if (scrubber) scrubber.value = idx;
    if (timeReadout) {
      const d = new Date(rec.ts);
      timeReadout.textContent = `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    }
  };

  if (playBtn) {
    playBtn.addEventListener('click', () => {
      if (this.replay.isPlaying) {
        clearInterval(this.replay.timer);
        this.replay.isPlaying = false;
        playBtn.textContent = '▶ Chạy';
      } else {
        this.replay.isPlaying = true;
        playBtn.textContent = '⏸ Dừng';
        const interval = Math.max(80, 1000 / this.replay.speed);
        this.replay.timer = setInterval(() => {
          this.replay.index = (this.replay.index + 1) % this.replay.total;
          updateFrame(this.replay.index);
        }, interval);
      }
    });
  }

  if (stepBtn) {
    stepBtn.addEventListener('click', () => {
      if (this.replay.isPlaying) {
        clearInterval(this.replay.timer);
        this.replay.isPlaying = false;
        if (playBtn) playBtn.textContent = '▶ Chạy';
      }
      this.replay.index = (this.replay.index + 1) % this.replay.total;
      updateFrame(this.replay.index);
    });
  }

  if (speedSel) {
    speedSel.addEventListener('change', () => {
      this.replay.speed = Number(speedSel.value) || 1;
      if (this.replay.isPlaying) {
        clearInterval(this.replay.timer);
        const interval = Math.max(80, 1000 / this.replay.speed);
        this.replay.timer = setInterval(() => {
          this.replay.index = (this.replay.index + 1) % this.replay.total;
          updateFrame(this.replay.index);
        }, interval);
      }
    });
  }

  if (scrubber) {
    scrubber.addEventListener('input', () => {
      this.replay.index = Number(scrubber.value);
      updateFrame(this.replay.index);
    });
  }

  // Initial update
  updateFrame(this.replay.index);
};

/* Start App when DOM is loaded */
document.addEventListener('DOMContentLoaded', () => {
  App.init();
  if (window.VisualTwin) window.VisualTwin.init();
});

window.App = App;
