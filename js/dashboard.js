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
  try {
    console.log('[QuantBoard] DOM loaded, starting init...');

    // Wait for initCharts RAF chain to complete before loading data.
    // Double-RAF ensures the outer RAF schedules the inner one, then we wait
    // for the inner RAF callback to finish (covers all platforms including mobile).
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => {
      initCharts();
      setTimeout(resolve, 50);
    })));

    // Extra safety垫: ensure sub-chart RAFs also settle
    await new Promise(resolve => setTimeout(resolve, 100));

    bindEvents();
    console.log('[QuantBoard] Charts ready, candleSeries:', typeof candleSeries, 'mainChart:', typeof mainChart);
    await loadSymbol(currentSymbol);
    setInterval(() => loadSymbol(currentSymbol), REFRESH_MS);
  } catch(err) {
    console.error('[QuantBoard] FATAL:', err.message, err.stack);
  }
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
  console.log('[QuantBoard] initCharts called');
  const bg = C.bg;

  try {
    // Main chart: Candlestick + MA lines
    const container = document.getElementById('mainChart');

    // ⚡ Mobile fix: wait for CSS media query to apply before measuring
    requestAnimationFrame(() => {
      // Fix Android viewport: fallback when CSS height hasn't applied yet
      const containerWidth  = container.clientWidth  || Math.min(window.innerWidth,  800);
      const containerHeight = container.clientHeight || Math.min(window.innerHeight * 0.45, 400);

      mainChart = LightweightCharts.createChart(container, {
        layout: { background: { color: bg }, textColor: C.text },
        grid: { vertLines: { color: C.grid }, horzLines: { color: C.grid } },
        crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
        timeScale: { borderColor: C.grid, timeVisible: true, secondsVisible: false },
        rightPriceScale: { borderColor: C.grid },
        width: containerWidth,
        height: containerHeight,
        autoSize: true,
        handleScroll: { horzTouchDrag: true, mouseWheel: true, pressedMouseMove: true },
        handleScale: { mouseWheel: true, pinch: true },
      });

      // ⚡ Force immediate resize to sync ResizeObserver to correct dimensions
      mainChart.resize(containerWidth, containerHeight, true);
      console.log('[QuantBoard] mainChart created:', mainChart ? 'success' : 'NULL');

      // Delegate series creation + data loading to separated function
      initSeriesAndLoadData(containerWidth, containerHeight);
    });
  } catch(err) {
    console.error('[QuantBoard] initCharts ERROR:', err.message, err.stack);
  }
}

// ─── Series Initialization + Data Loading ──────────────────
function initSeriesAndLoadData(containerWidth, containerHeight) {
  const bg = C.bg;

  // Candlestick series — Fix 6: enhanced try-catch with diagnostics
  try {
    console.log('[QuantBoard] Attempting to add CandlestickSeries...');
    candleSeries = mainChart.addCandlestickSeries({
      upColor: C.up, downColor: C.down,
      borderUpColor: C.up, borderDownColor: C.down,
      wickUpColor: C.up, wickDownColor: C.down,
    });
    console.log('[QuantBoard] ✅ candleSeries created:', typeof candleSeries);
    console.log('[QuantBoard] candleSeries.data() length:', candleSeries ? candleSeries.data().length : 'N/A');
  } catch(e) {
    console.error('[QuantBoard] ❌ CandlestickSeries creation FAILED:', e.message);
  }

  // MA line series (persistent handles)
  ma5Series  = mainChart.addLineSeries({ color: C.ma5,  lineWidth: 1, title: 'MA5' });
  ma20Series = mainChart.addLineSeries({ color: C.ma20, lineWidth: 1, title: 'MA20' });
  ma60Series = mainChart.addLineSeries({ color: C.ma60, lineWidth: 1, title: 'MA60' });
  console.log('[QuantBoard] MA series created');

  // ⚡ Volume chart — use RAF to ensure DOM dimensions are correct
  requestAnimationFrame(() => {
    const volContainer = document.getElementById('volumeChart');
    const volW = volContainer.clientWidth || containerWidth;
    volumeChart = LightweightCharts.createChart(volContainer, {
      layout: { background: { color: bg }, textColor: C.text },
      grid: { vertLines: { visible: false }, horzLines: { color: C.grid } },
      timeScale: { visible: false },
      rightPriceScale: { borderColor: C.grid },
      width: volW,
      height: 90,
      autoSize: true,
    });
    volumeChart.resize(volW, 90, true);
    console.log('[QuantBoard] volumeChart created');

    // KD chart
    const kdContainer = document.getElementById('kdChart');
    const kdW = kdContainer.clientWidth || containerWidth;
    kdChart = LightweightCharts.createChart(kdContainer, {
      layout: { background: { color: bg }, textColor: C.text },
      grid: { vertLines: { visible: false }, horzLines: { color: C.grid } },
      timeScale: { visible: false },
      rightPriceScale: { borderColor: C.grid },
      width: kdW,
      height: 90,
      autoSize: true,
    });
    kdChart.resize(kdW, 90, true);
    console.log('[QuantBoard] kdChart created');

    // RSI chart
    const rsiContainer = document.getElementById('rsiChart');
    const rsiW = rsiContainer.clientWidth || containerWidth;
    rsiChart = LightweightCharts.createChart(rsiContainer, {
      layout: { background: { color: bg }, textColor: C.text },
      grid: { vertLines: { visible: false }, horzLines: { color: C.grid } },
      timeScale: { visible: false },
      rightPriceScale: { borderColor: C.grid },
      width: rsiW,
      height: 90,
      autoSize: true,
    });
    rsiChart.resize(rsiW, 90, true);
    console.log('[QuantBoard] rsiChart created');

    // MACD chart
    const macdContainer = document.getElementById('macdChart');
    const macdW = macdContainer.clientWidth || containerWidth;
    macdChart = LightweightCharts.createChart(macdContainer, {
      layout: { background: { color: bg }, textColor: C.text },
      grid: { vertLines: { visible: false }, horzLines: { color: C.grid } },
      timeScale: { visible: false },
      rightPriceScale: { borderColor: C.grid },
      width: macdW,
      height: 90,
      autoSize: true,
    });
    macdChart.resize(macdW, 90, true);
    console.log('[QuantBoard] macdChart created');

    // Sync time scales across all charts
    const ts = mainChart.timeScale();
    ts.subscribeVisibleLogicalRangeChange((range) => {
      if (!range) return;
      [volumeChart, kdChart, rsiChart, macdChart].forEach(ch => {
        ch.timeScale().setVisibleLogicalRange(range);
      });
    });

    // Mobile resize handler
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const mainEl = document.getElementById('mainChart');
        // Fix Android viewport: fallback to CSS-pixel height when clientHeight is 0
        const w = mainEl.clientWidth  || Math.min(window.innerWidth,  800);
        const h = mainEl.clientHeight || Math.min(window.innerHeight * 0.45, 400);
        mainChart.resize(w, h);
        volumeChart.resize(w, 90);
        kdChart.resize(w, 90);
        rsiChart.resize(w, 90);
        macdChart.resize(w, 90);
      }, 200);
    });

    console.log('[QuantBoard] initSeriesAndLoadData completed successfully');
    // Load symbol data
    loadSymbol(currentSymbol || 'twii');
  });
}

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

    // Progressive: show last 30 immediately (intentional double-call; subsequent full render replaces it)
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
  // Fix 8: diagnostic header
  console.log('[QuantBoard] renderCharts === DIAGNOSTIC START ===');
  console.log('[QuantBoard] ohlcv sample:', JSON.stringify(ohlcv[0]));
  console.log('[QuantBoard] mainChart exists:', !!mainChart);
  if (mainChart && typeof mainChart === 'object') {
    console.log('[QuantBoard] mainChart.width:', mainChart.width);
    console.log('[QuantBoard] mainChart.height:', mainChart.height);
    const ts = mainChart.timeScale();
    const visRange = ts.getVisibleRange?.();
    console.log('[QuantBoard] visibleRange:', visRange ? JSON.stringify(visRange) : 'N/A');
  }
  console.log('[QuantBoard] candleSeries exists:', !!candleSeries);
  if (candleSeries && ohlcv.length > 0) {
    console.log('[QuantBoard] first candle time:', ohlcv[0].time,
      '→ as date:', new Date(ohlcv[0].time * (ohlcv[0].time > 1e10 ? 1 : 1000)));
  }

  console.log('[QuantBoard] renderCharts called, ohlcv.length:', ohlcv?.length);
  if (!ohlcv || ohlcv.length < 5) {
    console.warn('[QuantBoard] renderCharts skipped: insufficient data');
    return;
  }

  // ── Validate + coerce data types (Lightweight Charts v5 requires number primitives) ──
  const validated = ohlcv.map((row, i) => {
    const time  = typeof row.time  === 'number' ? row.time  : Number(row.time);
    const open  = typeof row.open  === 'number' ? row.open  : parseFloat(row.open);
    const high  = typeof row.high  === 'number' ? row.high  : parseFloat(row.high);
    const low   = typeof row.low   === 'number' ? row.low   : parseFloat(row.low);
    const close = typeof row.close === 'number' ? row.close : parseFloat(row.close);
    return { time, open, high, low, close };
  });
  console.log('[QuantBoard] validated[0]:', JSON.stringify(validated[0]));

  // ── Main chart: Candlestick + MAs ──
  if (!candleSeries) {
    console.error('[QuantBoard] candleSeries is NULL — cannot setData');
    return;
  }
  console.log('[QuantBoard] candleSeries.setData() called, rows:', validated.length);
  try {
    candleSeries.setData(validated);
    console.log('[QuantBoard] candleSeries.setData completed, data().length:', candleSeries.data().length);
  } catch(e) {
    console.error('[QuantBoard] candleSeries.setData ERROR:', e.message, e.stack);
  }

  const ma5Data  = computeMA(validated, 5);
  const ma20Data = computeMA(validated, 20);
  const ma60Data = computeMA(validated, 60);

  ma5Series.setData(ma5Data);
  ma20Series.setData(ma20Data);
  ma60Series.setData(ma60Data);
  mainChart.timeScale().fitContent();
  // Note: autoSize:true handles resize automatically — manual resize call removed (M1 fix)

  // ── Volume chart ──

  // ── Volume chart ──
  if (volSeries) { volumeChart.removeSeries(volSeries); volSeries = null; }
  volSeries = volumeChart.addHistogramSeries({ color: C.up, priceFormat: { type: 'volume' }, priceScaleId: '' });
  volSeries.setData(ohlcv.map(r => ({
    time: r.time, value: r.volume,
    color: r.close >= r.open ? C.up : C.down,
  })));
  volumeChart.timeScale().fitContent();
  volumeChart.resize(volumeChart.width(), volumeChart.height());

  // ── KD chart ──
  if (kSeries) { kdChart.removeSeries(kSeries); kSeries = null; }
  if (dSeries) { kdChart.removeSeries(dSeries); dSeries = null; }
  const kdData = computeKD(ohlcv);
  kSeries = kdChart.addLineSeries({ color: '#ffa501', lineWidth: 1 });
  dSeries = kdChart.addLineSeries({ color: '#58a6ff', lineWidth: 1 });
  kSeries.setData(kdData.map(r => ({ time: r.time, value: r.k })));
  dSeries.setData(kdData.map(r => ({ time: r.time, value: r.d })));
  kdChart.timeScale().fitContent();
  kdChart.resize(kdChart.width(), kdChart.height());

  // ── RSI chart ──
  if (rsiSeries) { rsiChart.removeSeries(rsiSeries); rsiSeries = null; }
  rsiSeries = rsiChart.addLineSeries({
    color: '#bc8cff', lineWidth: 1,
    priceLines: [
      { price: 70, color: '#f85149', lineWidth: 1, lineStyle: 2 },
      { price: 30, color: '#3fb950', lineWidth: 1, lineStyle: 2 },
    ],
  });
  rsiSeries.setData(computeRSI(ohlcv));
  rsiChart.timeScale().fitContent();
  rsiChart.resize(rsiChart.width(), rsiChart.height());

  // ── MACD chart ──
  if (histSeries) { macdChart.removeSeries(histSeries); histSeries = null; }
  if (difSeries)  { macdChart.removeSeries(difSeries);  difSeries = null; }
  if (sigSeries)  { macdChart.removeSeries(sigSeries);  sigSeries = null; }
  const macdData = computeMACD(ohlcv);
  histSeries = macdChart.addHistogramSeries({ color: C.ma5, priceScaleId: '' });
  histSeries.setData(macdData.map(r => ({ time: r.time, value: r.hist, color: r.hist >= 0 ? C.up : C.down })));
  difSeries = macdChart.addLineSeries({ color: C.ma20, lineWidth: 1 });
  difSeries.setData(macdData.map(r => ({ time: r.time, value: r.dif })));
  sigSeries = macdChart.addLineSeries({ color: C.down, lineWidth: 1 });
  sigSeries.setData(macdData.map(r => ({ time: r.time, value: r.signal })));
  macdChart.timeScale().fitContent();
  macdChart.resize(macdChart.width(), macdChart.height());
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
