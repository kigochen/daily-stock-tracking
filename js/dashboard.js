/**
 * dashboard.js — QuantBoard K-line Frontend
 * Uses TradingView Lightweight Charts for candlestick + MA + Volume + KD/RSI/MACD.
 */
const DATA_DIR = 'data/';
const REFRESH_MS = 60_000;

const SYMBOLS = [
  'twii','spy','qqq','vix','2330','dxy',
  'goog','mu','soxx','poet','arm','aapl','tsla',
  'nbis','smr','avgo','cohr','amkr','glxy','wolf','oust','irdm','coin',
];

// ─── Chart instances ──────────────────────────────────────
let mainChart = null;
let volumeChart = null;
let kdChart = null;
let rsiChart = null;
let macdChart = null;

// Series handles
let candleSeries = null;
let ma5Series = null, ma20Series = null, ma60Series = null;
let volSeries = null;
let kSeries = null, dSeries = null;
let rsiSeries = null;
let histSeries = null, difSeries = null, sigSeries = null;

let lastData = null;
let currentSymbol = 'twii';

// ─── Color palette ─────────────────────────────────────────
const C = {
  up:       '#3fb950',
  down:     '#f85149',
  ma5:      '#ffa501',
  ma20:     '#58a6ff',
  ma60:     '#bc8cff',
  grid:     '#30363d',
  text:     '#8b949e',
  bg:       '#0d1117',
  crosshair:'#e6edf3',
};

// ─── Entry Point ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[QuantBoard] DOM loaded, initializing charts...');
  initCharts();
  bindEvents();
  // Ensure chart series are fully bound before loading data
  await new Promise(resolve => setTimeout(resolve, 100));
  console.log('[QuantBoard] initCharts done, candleSeries:', typeof candleSeries, 'mainChart:', typeof mainChart);
  await loadSymbol(currentSymbol);
  setInterval(() => loadSymbol(currentSymbol), REFRESH_MS);
});

function bindEvents() {
  document.getElementById('symbolSelector').addEventListener('change', (e) => {
    loadSymbol(e.target.value);
  });
  document.getElementById('refreshBtn').addEventListener('click', () => {
    loadSymbol(currentSymbol);
  });

  // Toggle sub-panels
  document.querySelectorAll('.toggle-panel').forEach(btn => {
    btn.addEventListener('click', () => {
      const panelId = btn.dataset.panel;
      const panel = document.getElementById(panelId);
      panel.classList.toggle('collapsed');
      btn.textContent = panel.classList.contains('collapsed') ? '▶' : '▼';
    });
  });
}

// ─── Chart Initialization ──────────────────────────────────
function initCharts() {
  const bg = C.bg;

  // Main chart: Candlestick + MA lines
  mainChart = LightweightCharts.createChart(document.getElementById('mainChart'), {
    layout: { background: { color: bg }, textColor: C.text },
    grid: { vertLines: { color: C.grid }, horzLines: { color: C.grid } },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
    timeScale: { borderColor: C.grid, timeVisible: true, secondsVisible: false },
    rightPriceScale: { borderColor: C.grid },
    height: 360,
  });

  // Candlestick series
  candleSeries = mainChart.addSeries(LightweightCharts.CandlestickSeries, {
    upColor: C.up, downColor: C.down, borderUpColor: C.up, borderDownColor: C.down,
    wickUpColor: C.up, wickDownColor: C.down,
  });

  // MA line series (persistent handles)
  ma5Series  = mainChart.addSeries(LightweightCharts.LineSeries, { color: C.ma5,  lineWidth: 1, title: 'MA5' });
  ma20Series = mainChart.addSeries(LightweightCharts.LineSeries, { color: C.ma20, lineWidth: 1, title: 'MA20' });
  ma60Series = mainChart.addSeries(LightweightCharts.LineSeries, { color: C.ma60, lineWidth: 1, title: 'MA60' });

  // Volume chart
  volumeChart = LightweightCharts.createChart(document.getElementById('volumeChart'), {
    layout: { background: { color: bg }, textColor: C.text },
    grid: { vertLines: { visible: false }, horzLines: { color: C.grid } },
    timeScale: { visible: false },
    rightPriceScale: { borderColor: C.grid },
    height: 90,
  });

  // KD chart
  kdChart = LightweightCharts.createChart(document.getElementById('kdChart'), {
    layout: { background: { color: bg }, textColor: C.text },
    grid: { vertLines: { visible: false }, horzLines: { color: C.grid } },
    timeScale: { visible: false },
    rightPriceScale: { borderColor: C.grid },
    height: 90,
  });

  // RSI chart
  rsiChart = LightweightCharts.createChart(document.getElementById('rsiChart'), {
    layout: { background: { color: bg }, textColor: C.text },
    grid: { vertLines: { visible: false }, horzLines: { color: C.grid } },
    timeScale: { visible: false },
    rightPriceScale: { borderColor: C.grid },
    height: 90,
  });

  // MACD chart
  macdChart = LightweightCharts.createChart(document.getElementById('macdChart'), {
    layout: { background: { color: bg }, textColor: C.text },
    grid: { vertLines: { visible: false }, horzLines: { color: C.grid } },
    timeScale: { visible: false },
    rightPriceScale: { borderColor: C.grid },
    height: 90,
  });

  // Sync time scales across all charts
  mainChart.timeScale().subscribe('visibleLogicalRangeChange', () => {
    const range = mainChart.timeScale().getVisibleLogicalRange();
    [volumeChart, kdChart, rsiChart, macdChart].forEach(ch => {
      if (range) ch.timeScale().setVisibleLogicalRange(range);
    });
  });
}

// ─── Load Symbol (Progressive Loading) ──────────────────────
async function loadSymbol(symbol) {
  currentSymbol = symbol;
  showLoadingState(true);
  console.log('[QuantBoard] loadSymbol start:', symbol);
  console.log('[QuantBoard] loadSymbol — candleSeries type:', typeof candleSeries, 'value:', candleSeries);
  try {
    const [ohlcvRes, metaRes] = await Promise.all([
      fetch(`${DATA_DIR}${symbol}_daily.json?t=${Date.now()}`),
      fetch(`${DATA_DIR}stock_data.json?t=${Date.now()}`),
    ]);
    console.log('[QuantBoard] fetch responses:', symbol, 'ohlcvRes.status:', ohlcvRes.status, 'metaRes.status:', metaRes.status);
    if (!ohlcvRes.ok || !metaRes.ok) throw new Error('Fetch failed');

    const ohlcv = await ohlcvRes.json();
    lastData = await metaRes.json();
    console.log('[QuantBoard] JSON parsed, ohlcv rows:', ohlcv.length);
    console.log('[QuantBoard] loadSymbol — candleSeries after fetch:', typeof candleSeries, 'value:', candleSeries);

    // Progressive: show last 30 immediately
    const recent30 = ohlcv.slice(-30);
    console.log('[QuantBoard] rendering recent30, ohlcv.length:', recent30.length);
    renderCharts(recent30);

    // Then render full dataset
    console.log('[QuantBoard] rendering full dataset, ohlcv.length:', ohlcv.length);
    renderCharts(ohlcv);
    updateMetaUI(lastData[symbol], symbol);
    updateSummary(lastData);
    showLoadingState(false);
  } catch (err) {
    console.error('❌ loadSymbol failed:', err);
    showLoadingState(false);
  }
}

function showLoadingState(loading) {
  const chartArea = document.getElementById('chartArea');
  if (!chartArea) return;
  if (loading) {
    chartArea.style.opacity = '0.3';
    chartArea.style.pointerEvents = 'none';
  } else {
    chartArea.style.opacity = '1';
    chartArea.style.pointerEvents = 'auto';
  }
}

// ─── Technical Indicator Computations ─────────────────────
function computeMA(data, period) {
  return data.map((row, i) => {
    if (i < period - 1) return null;
    const slice = data.slice(i - period + 1, i + 1);
    const avg = slice.reduce((s, r) => s + r.close, 0) / period;
    return { time: row.time, value: +avg.toFixed(4) };
  }).filter(r => r !== null);
}

function computeKD(data) {
  const k = [], d = [];
  const period = 9;
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const h = Math.max(...slice.map(r => r.high));
    const l = Math.min(...slice.map(r => r.low));
    const c = data[i].close;
    const rsv = h === l ? 50 : (c - l) / (h - l) * 100;
    k.push(k.length ? +((2/3) * k[k.length-1] + (1/3) * rsv).toFixed(2) : rsv);
    d.push(d.length ? +((2/3) * d[d.length-1] + (1/3) * k[k.length-1]).toFixed(2) : rsv);
  }
  const offset = period - 1;
  return k.map((ki, i) => ({
    time: data[i + offset].time,
    k: ki,
    d: d[i],
  }));
}

function computeRSI(data, period = 6) {
  const result = [];
  let gains = 0, losses = 0;
  for (let i = 1; i < data.length; i++) {
    const diff = data[i].close - data[i-1].close;
    if (i <= period) {
      if (diff > 0) gains += diff;
      else losses -= diff;
    }
    if (i === period) {
      const rs = gains / losses || 0;
      result.push({ time: data[i].time, value: +(100 - 100/(1+rs)).toFixed(2) });
    } else if (i > period) {
      gains = gains - gains/period + (diff > 0 ? diff : 0);
      losses = losses - losses/period + (diff < 0 ? -diff : 0);
      const rs = losses === 0 ? 999 : gains / losses;
      result.push({ time: data[i].time, value: +(100 - 100/(1+rs)).toFixed(2) });
    }
  }
  return result;
}

function computeMACD(data) {
  const close = data.map(r => r.close);
  const ema = (arr, n) => {
    const k2 = 2/(n+1);
    let e = arr[0];
    return arr.map(v => e = v*k2 + e*(1-k2));
  };
  const ema12 = ema(close, 12);
  const ema26 = ema(close, 26);
  const dif = ema12.map((v, i) => v - ema26[i]);
  const signal = ema(dif, 9);
  const hist = dif.map((v, i) => v - signal[i]);
  return data.map((r, i) => ({
    time: r.time,
    dif: +dif[i].toFixed(4),
    signal: +signal[i].toFixed(4),
    hist: +hist[i].toFixed(4),
  })).filter((_, i) => i >= 26);
}

// ─── Render All Charts ──────────────────────────────────────
function renderCharts(ohlcv) {
  console.log('[QuantBoard] renderCharts called, ohlcv.length:', ohlcv?.length);
  if (!ohlcv || ohlcv.length < 5) return;

  // ── Main chart: Candlestick + MAs ──
  candleSeries.setData(ohlcv);

  const ma5Data  = computeMA(ohlcv, 5);
  const ma20Data = computeMA(ohlcv, 20);
  const ma60Data = computeMA(ohlcv, 60);

  ma5Series.setData(ma5Data);
  ma20Series.setData(ma20Data);
  ma60Series.setData(ma60Data);
  mainChart.timeScale().fitContent();

  // ── Volume chart ──
  if (volSeries) { volumeChart.removeSeries(volSeries); volSeries = null; }
  volSeries = volumeChart.addSeries(LightweightCharts.HistogramSeries, {
    color: C.up, priceFormat: { type: 'volume' }, priceScaleId: '',
  });
  volSeries.setData(ohlcv.map(r => ({
    time: r.time, value: r.volume,
    color: r.close >= r.open ? C.up : C.down,
  })));
  volumeChart.timeScale().fitContent();

  // ── KD chart ──
  if (kSeries) { kdChart.removeSeries(kSeries); kSeries = null; }
  if (dSeries) { kdChart.removeSeries(dSeries); dSeries = null; }
  const kdData = computeKD(ohlcv);
  kSeries = kdChart.addSeries(LightweightCharts.LineSeries, { color: '#ffa501', lineWidth: 1 });
  dSeries = kdChart.addSeries(LightweightCharts.LineSeries, { color: '#58a6ff', lineWidth: 1 });
  kSeries.setData(kdData.map(r => ({ time: r.time, value: r.k })));
  dSeries.setData(kdData.map(r => ({ time: r.time, value: r.d })));
  kdChart.timeScale().fitContent();

  // ── RSI chart ──
  if (rsiSeries) { rsiChart.removeSeries(rsiSeries); rsiSeries = null; }
  rsiSeries = rsiChart.addSeries(LightweightCharts.LineSeries, {
    color: '#bc8cff', lineWidth: 1,
    priceLines: [
      { price: 70, color: '#f85149', lineWidth: 1, lineStyle: 2 },
      { price: 30, color: '#3fb950', lineWidth: 1, lineStyle: 2 },
    ],
  });
  rsiSeries.setData(computeRSI(ohlcv));
  rsiChart.timeScale().fitContent();

  // ── MACD chart ──
  if (histSeries) { macdChart.removeSeries(histSeries); histSeries = null; }
  if (difSeries)  { macdChart.removeSeries(difSeries);  difSeries = null; }
  if (sigSeries)  { macdChart.removeSeries(sigSeries);  sigSeries = null; }
  const macdData = computeMACD(ohlcv);
  histSeries = macdChart.addSeries(LightweightCharts.HistogramSeries, { color: C.ma5, priceScaleId: '' });
  histSeries.setData(macdData.map(r => ({ time: r.time, value: r.hist, color: r.hist >= 0 ? C.up : C.down })));
  difSeries = macdChart.addSeries(LightweightCharts.LineSeries, { color: C.ma20, lineWidth: 1 });
  difSeries.setData(macdData.map(r => ({ time: r.time, value: r.dif })));
  sigSeries = macdChart.addSeries(LightweightCharts.LineSeries, { color: C.down, lineWidth: 1 });
  sigSeries.setData(macdData.map(r => ({ time: r.time, value: r.signal })));
  macdChart.timeScale().fitContent();
}

// ─── Update Metadata UI ────────────────────────────────────
function updateMetaUI(info, symbol) {
  if (!info) return;
  document.getElementById('chartTitle').textContent = SYMBOL_LABELS[symbol] || symbol;
  document.getElementById('chartPrice').textContent =
    info.price != null ? info.price.toLocaleString('en-US', {maximumFractionDigits: 2}) : '--';

  const ch = info.change;
  const arrow = ch > 0 ? '▲' : ch < 0 ? '▼' : '─';
  const dir = ch > 0 ? 'up' : ch < 0 ? 'down' : 'flat';
  const changeEl = document.getElementById('chartChange');
  changeEl.textContent = `${arrow} ${Math.abs(ch || 0).toFixed(2)}%`;
  changeEl.className = `change ${dir}`;

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val != null && !isNaN(val) ? (typeof val === 'number' ? val.toFixed(2) : val) : '--';
  };
  set('indMA5',  info.ma5);
  set('indMA20', info.ma20);
  set('indMA60', info.ma60);
  set('indRSI',  info.rsi6);
  if (info.kd) {
    set('indK', info.kd.k);
    set('indD', info.kd.d);
  }

  const badge = document.getElementById('chartSignal');
  if (badge) {
    const macd = info.macd_signal || 'neutral';
    badge.className = `signal-badge ${macd}`;
    badge.textContent = macd === 'bullish' ? '多頭 🐂' : macd === 'bearish' ? '空頭 🐻' : '中立';
  }

  document.getElementById('lastUpdated').textContent =
    `更新：${formatTs(info.last_updated || lastData?.last_updated)}`;
}

const SYMBOL_LABELS = {
  twii: '📈 加權指數 (TWII)', spy: '🇺🇸 SPY (S&P 500 ETF)', qqq: '🇺🇸 QQQ (Nasdaq 100)',
  vix: '😱 VIX 恐慌指數', '2330': '🇹🇼 2330 臺積電', dxy: '💵 DXY 美元指數',
  goog: '🇺🇸 GOOG Alphabet', mu: '🇺🇸 MU Micron', soxx: '🇺🇸 SOXX 半導體',
  poet: '🇺🇸 POET Technologies', arm: '🇺🇸 ARM Holdings', aapl: '🇺🇸 AAPL Apple',
  tsla: '🇺🇸 TSLA Tesla', nbis: '🇺🇸 NBIS Nebius', smr: '🇺🇸 SMR NuScale',
  avgo: '🇺🇸 AVGO Broadcom', cohr: '🇺🇸 COHR Coherent', amkr: '🇺🇸 AMKR Amkor',
  glxy: '🇨🇦 GLXY Galaxy Digital', wolf: '🇺🇸 WOLF Wolfspeed', oust: '🇺🇸 OUST Ouster',
  irdm: '🇺🇸 IRDM Iridium', coin: '🇺🇸 COIN Coinbase',
};

function updateSummary(d) {
  const bullish = [], bearish = [], neutral = [];
  for (const sym of ['twii','spy','qqq','vix']) {
    if (!d[sym] || !d[sym].ok) continue;
    const macd = d[sym].macd_signal;
    if (macd === 'bullish') bullish.push(sym.toUpperCase());
    else if (macd === 'bearish') bearish.push(sym.toUpperCase());
    else neutral.push(sym.toUpperCase());
  }
  const setSum = (id, list, label, cls) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = `${label} ${list.length}`;
    el.className = `summary-item ${cls}`;
  };
  setSum('sumBullish', bullish, '看多', 'up');
  setSum('sumNeutral', neutral, '中立', 'neutral');
  setSum('sumBearish', bearish, '看空', 'down');

  const lines = [];
  const TWII = d.twii || {};
  const VIX  = d.vix  || {};
  if (TWII.bias != null) lines.push(`加權偏離率 ${TWII.bias > 0 ? '+' : ''}${TWII.bias}%`);
  if (TWII.kdj_j != null) {
    if (TWII.kdj_j > 100) lines.push(`⚠️ 加權 KDJ J值 ${TWII.kdj_j} > 100（超買區）`);
    else if (TWII.kdj_j < 0) lines.push(`⚠️ 加權 KDJ J值 ${TWII.kdj_j} < 0（超賣區）`);
  }
  if (VIX.price != null) {
    if (VIX.price > 30) lines.push(`😱 VIX ${VIX.price} 高檔（恐慌區）`);
    else if (VIX.price < 15) lines.push(`😊 VIX ${VIX.price} 低檔（樂觀區）`);
  }
  const macds = ['twii','spy','qqq'].filter(s => d[s]?.ok && d[s].macd_signal === 'bullish');
  if (macds.length >= 2) lines.push(`✅ ${macds.map(s=>s.toUpperCase()).join('/')} MACD 多頭共振`);
  else if (macds.length === 0) lines.push(`🔴 主要指標 MACD 偏空`);

  const textEl = document.getElementById('signalText');
  if (textEl) textEl.textContent = lines.length ? lines.join('\n') : '綜合信號無特別警示';
}

// ─── Utilities ────────────────────────────────────────────
function formatTs(ts) {
  if (!ts) return '--';
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch { return ts; }
}
