/* ==========================================================================
   CHILI FARM OS — Forecast & History Operations Views
   Handles: 1. 24h Direct Multi-Horizon Forecast Chart + P10-P90 Uncertainty
            2. 24h Agronomic Action Advisory Timeline
            3. Continuous Historical Trends & Interactive Event Pins
   ========================================================================== */

/* Configure Unified Font for Chart.js across all graphs */
if (window.Chart) {
  Chart.defaults.font.family = "'Roboto', 'Segoe UI', -apple-system, BlinkMacSystemFont, Tahoma, Arial, sans-serif";
}

/* --------------------------------------------------------------------------
   FORECAST VIEW
   -------------------------------------------------------------------------- */
const ForecastView = {
  activeVar: 'moisture',
  activeMode: 'live', // 'live' | 'backtest'
  chartInstance: null
};

ForecastView.init = function(fcData, alertsData) {
  this.fc = fcData;
  this.alerts = alertsData;
  this.setupChips();
  this.renderAdvisoryTimeline();
  this.renderChart();
};

ForecastView.setupChips = function() {
  const container = document.getElementById('forecast-chips-container');
  if (!container) return;

  const vars = ['moisture', 'EC', 'pH', 'temperature', 'N', 'P', 'K', 'soiltemp'];
  container.innerHTML = vars.map((v) => `
    <button class="chip-btn ${v === this.activeVar ? 'active' : ''}" data-var="${v}">
      ${App.LABELS[v]}
    </button>
  `).join('');

  container.querySelectorAll('.chip-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.chip-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      this.activeVar = btn.dataset.var;
      this.renderChart();
    });
  });

  // Mode switcher (Live future vs Backtest)
  const modeLive = document.getElementById('btn-fc-live');
  const modeBt = document.getElementById('btn-fc-bt');
  if (modeLive && modeBt) {
    modeLive.addEventListener('click', () => {
      modeLive.classList.add('active');
      modeBt.classList.remove('active');
      this.activeMode = 'live';
      this.renderChart();
    });
    modeBt.addEventListener('click', () => {
      modeBt.classList.add('active');
      modeLive.classList.remove('active');
      this.activeMode = 'backtest';
      this.renderChart();
    });
  }
};

ForecastView.renderChart = function() {
  const canvas = document.getElementById('forecast-chart');
  if (!canvas || !this.fc) return;

  const ctx = canvas.getContext('2d');
  const v = this.activeVar;
  const th = App.THRESHOLDS[v];
  const unit = App.UNITS[v];
  const STEP_MS = 5 * 60 * 1000;

  if (this.chartInstance) {
    this.chartInstance.destroy();
  }

  const datasets = [];

  if (this.activeMode === 'live') {
    // 1. History observed data (last 2 days)
    const hSeries = this.fc.history.series[v] || [];
    const t0h = new Date(this.fc.history.t0).getTime();
    const histPoints = hSeries.map((y, i) => ({ x: t0h + i * STEP_MS, y }));

    datasets.push({
      label: 'Quan sát thực tế',
      data: histPoints,
      borderColor: '#94a3b8',
      borderWidth: 1.5,
      pointRadius: 0,
      tension: 0.1
    });

    // 2. Future Forecast + P10-P90 band
    const fData = this.fc.future;
    const t0f = new Date(fData.t0).getTime();
    const meanPoints = (fData.mean[v] || []).map((y, i) => ({ x: t0f + i * STEP_MS, y }));
    const loPoints = (fData.lo[v] || []).map((y, i) => ({ x: t0f + i * STEP_MS, y }));
    const hiPoints = (fData.hi[v] || []).map((y, i) => ({ x: t0f + i * STEP_MS, y }));

    // Lower bound (transparent line)
    datasets.push({
      label: 'P10',
      data: loPoints,
      borderColor: 'transparent',
      pointRadius: 0
    });

    // Upper bound filling down to P10
    datasets.push({
      label: 'Dải tin cậy P10 - P90',
      data: hiPoints,
      borderColor: 'transparent',
      backgroundColor: 'rgba(16, 185, 129, 0.18)',
      fill: '-1',
      pointRadius: 0
    });

    // Main Direct Forecast line
    datasets.push({
      label: 'Dự báo 24 giờ tới',
      data: meanPoints,
      borderColor: '#10b981',
      borderWidth: 2.8,
      pointRadius: 0,
      tension: 0.2
    });

  } else {
    // Backtest Mode (August 2026)
    const B = this.fc.backtest;
    const k = B.origins.length - 1; // latest test origin
    const ot = new Date(B.origins[k]).getTime();
    const f = B.fc[v][k] || [];
    const act = B.actual[v][k] || [];
    const lo = f.map((y, i) => y + B.q_lo[v][i]);
    const hi = f.map((y, i) => y + B.q_hi[v][i]);

    datasets.push({
      label: 'Số liệu thực tế',
      data: act.map((y, i) => ({ x: ot + (i + 1) * STEP_MS, y })),
      borderColor: '#ffffff',
      borderWidth: 1.8,
      pointRadius: 0
    });

    datasets.push({
      label: 'P10',
      data: lo.map((y, i) => ({ x: ot + (i + 1) * STEP_MS, y })),
      borderColor: 'transparent',
      pointRadius: 0
    });

    datasets.push({
      label: 'Khoảng tin cậy (P10 - P90)',
      data: hi.map((y, i) => ({ x: ot + (i + 1) * STEP_MS, y })),
      borderColor: 'transparent',
      backgroundColor: 'rgba(56, 189, 248, 0.2)',
      fill: '-1',
      pointRadius: 0
    });

    datasets.push({
      label: 'Dự đoán mô hình',
      data: f.map((y, i) => ({ x: ot + (i + 1) * STEP_MS, y })),
      borderColor: '#38bdf8',
      borderWidth: 2.6,
      pointRadius: 0
    });
  }

  // Draw Chart
  this.chartInstance = new Chart(ctx, {
    type: 'line',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, usePointStyle: true }
        },
        tooltip: {
          backgroundColor: 'rgba(7, 14, 10, 0.95)',
          borderColor: 'rgba(34, 197, 94, 0.3)',
          borderWidth: 1,
          titleColor: '#34d399',
          bodyColor: '#f0fdf4',
          callbacks: {
            title: (items) => {
              if (!items.length) return '';
              const d = new Date(items[0].parsed.x);
              return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
            },
            label: (item) => `${item.dataset.label}: ${App.fmt(item.parsed.y, (v === 'pH' || v === 'EC') ? 2 : 1)} ${unit}`
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          ticks: {
            color: '#64748b',
            maxTicksLimit: 9,
            callback: (val) => {
              const d = new Date(val);
              return `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            }
          },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        },
        y: {
          title: { display: true, text: `${App.LABELS[v]} (${unit})`, color: '#94a3b8' },
          ticks: { color: '#64748b' },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        }
      }
    }
  });
};

ForecastView.renderAdvisoryTimeline = function() {
  const container = document.getElementById('advisory-timeline-container');
  if (!container || !this.alerts) return;

  const fcAlerts = this.alerts.forecast_alerts || [];
  if (fcAlerts.length === 0) {
    container.innerHTML = `
      <div class="advisory-item">
        <div class="time">24 GIỜ TỚI</div>
        <div class="content">Mọi thông số duy trì an toàn</div>
        <div class="action">● Duy trì lịch tưới và chiếu sáng tự động theo chu kỳ</div>
      </div>
    `;
    return;
  }

  container.innerHTML = fcAlerts.map((al) => {
    const sevClass = al.severity === 'high' ? 'alert' : 'warn';
    const timeStr = al.time ? al.time.replace('T', ' ') : 'Sắp diễn ra';
    return `
      <div class="advisory-item ${sevClass}">
        <div class="time">${timeStr}</div>
        <div class="content">${al.rule}: ${al.message}</div>
        <div class="action">Hành động: ${al.action || 'Kiểm tra và kích hoạt điều chỉnh'}</div>
      </div>
    `;
  }).join('');
};

/* --------------------------------------------------------------------------
   HISTORY & EVENT TIMELINE VIEW
   -------------------------------------------------------------------------- */
const HistoryView = {
  activeSpan: 7, // days
  chartInstance: null
};

HistoryView.init = function(metaData) {
  this.meta = metaData;
  this.setupToolbar();
  this.renderChart();
};

HistoryView.setupToolbar = function() {
  const spanBtns = document.querySelectorAll('.span-btn');
  spanBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      spanBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      this.activeSpan = Number(btn.dataset.span) || 7;
      this.renderChart();
    });
  });

  // Event pin cards
  const eventCards = document.querySelectorAll('.event-box');
  eventCards.forEach((card) => {
    card.addEventListener('click', () => {
      const month = card.dataset.month;
      if (month) {
        this.loadSpecificMonth(month);
      }
    });
  });
};

HistoryView.renderChart = async function() {
  const canvas = document.getElementById('history-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (this.chartInstance) {
    this.chartInstance.destroy();
  }

  // Load latest month (August 2026)
  const monthData = await App.json('data/series_2026-08.json');
  if (!monthData) return;

  const series = monthData.clean || monthData.series || {};
  const t0 = new Date('2026-08-01T00:00:00').getTime();
  const STEP_MS = 5 * 60 * 1000;

  // Slice based on span
  const totalSteps = (series.moisture || []).length;
  const stepsToShow = Math.min(totalSteps, this.activeSpan * 288);
  const startIdx = totalSteps - stepsToShow;

  const moisturePoints = [];
  const ecPoints = [];
  const tempPoints = [];

  for (let i = startIdx; i < totalSteps; i++) {
    const time = t0 + i * STEP_MS;
    moisturePoints.push({ x: time, y: series.moisture ? series.moisture[i] : null });
    ecPoints.push({ x: time, y: series.EC ? series.EC[i] : null });
    tempPoints.push({ x: time, y: series.temperature ? series.temperature[i] : null });
  }

  this.chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: 'Độ ẩm đất (%VWC)',
          data: moisturePoints,
          borderColor: '#38bdf8',
          borderWidth: 1.8,
          pointRadius: 0,
          yAxisID: 'y'
        },
        {
          label: 'EC Dinh dưỡng (mS/cm)',
          data: ecPoints,
          borderColor: '#f59e0b',
          borderWidth: 1.8,
          pointRadius: 0,
          yAxisID: 'y1'
        },
        {
          label: 'Nhiệt độ không khí (°C)',
          data: tempPoints,
          borderColor: '#fbbf24',
          borderWidth: 1.2,
          pointRadius: 0,
          yAxisID: 'y'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, usePointStyle: true }
        },
        tooltip: {
          backgroundColor: 'rgba(7, 14, 10, 0.95)',
          borderColor: 'rgba(34, 197, 94, 0.3)',
          borderWidth: 1,
          callbacks: {
            title: (items) => {
              if (!items.length) return '';
              const d = new Date(items[0].parsed.x);
              return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          ticks: {
            color: '#64748b',
            maxTicksLimit: 10,
            callback: (val) => {
              const d = new Date(val);
              return `${d.getDate()}/${d.getMonth() + 1}`;
            }
          },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        },
        y: {
          type: 'linear',
          position: 'left',
          title: { display: true, text: 'Ẩm đất & Nhiệt độ', color: '#94a3b8' },
          ticks: { color: '#64748b' },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        },
        y1: {
          type: 'linear',
          position: 'right',
          title: { display: true, text: 'EC Dinh dưỡng (mS/cm)', color: '#f59e0b' },
          ticks: { color: '#f59e0b' },
          grid: { drawOnChartArea: false }
        }
      }
    }
  });
};

HistoryView.loadSpecificMonth = async function(monthStr) {
  try {
    const monthData = await App.json(`data/series_${monthStr}.json`);
    if (!monthData) return;
    this.activeSpan = 31;
    this.renderChart();
  } catch (err) {
    console.error('Không tìm thấy dữ liệu tháng:', monthStr);
  }
};

window.ForecastView = ForecastView;
window.HistoryView = HistoryView;
