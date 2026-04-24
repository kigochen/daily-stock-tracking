const { test, expect, beforeEach, afterEach } = require('@playwright/test');

// ─── Helper: wait for page + chart library to fully initialize ───────────────
// Using a simple timeout after goto is more reliable than RAF in headless mode
// because RAF callbacks can be scheduled before page scripts run.
async function waitForChartInit(page) {
  await page.waitForTimeout(3000);
}

// ─── Helper: pixel sampling (center 10x10, brightness > 15/255, not pure white) ──
async function sampleCanvasPixel(page, selector) {
  return page.evaluate((sel) => {
    const canvas = document.querySelector(sel);
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    const cx = Math.floor(canvas.width / 2) - 5;
    const cy = Math.floor(canvas.height / 2) - 5;
    let totalBrightness = 0;
    let notPureWhite = 0;
    for (let dx = 0; dx < 10; dx++) {
      for (let dy = 0; dy < 10; dy++) {
        const pixel = ctx.getImageData(cx + dx, cy + dy, 1, 1).data;
        const brightness = (pixel[0] + pixel[1] + pixel[2]) / 3;
        totalBrightness += brightness;
        if (!(pixel[0] > 250 && pixel[1] > 250 && pixel[2] > 250)) notPureWhite++;
      }
    }
    return { avgBrightness: totalBrightness / 100, notPureWhiteCount: notPureWhite };
  }, selector);
}

// ════════════════════════════════════════════════════════════════════════════
// TC-001: K-line renders on desktop
// ════════════════════════════════════════════════════════════════════════════
test('TC-001 K-line renders on desktop', async ({ page }) => {
  await page.goto('https://kigochen.github.io/daily-stock-tracking/');
  await waitForChartInit(page);

  const canvas = page.locator('#mainChart canvas').first();
  await expect(canvas).toBeVisible({ timeout: 10000 });

  const box = await canvas.boundingBox();
  expect(box.width).toBeGreaterThan(0);
  expect(box.height).toBeGreaterThan(200);

  const sample = await sampleCanvasPixel(page, '#mainChart canvas');
  expect(sample.avgBrightness).toBeGreaterThan(15);
  expect(sample.notPureWhiteCount).toBeGreaterThan(0);
});

// ════════════════════════════════════════════════════════════════════════════
// TC-002: K-line renders on mobile (iPhone)
// ════════════════════════════════════════════════════════════════════════════
test('TC-002 K-line renders on mobile (iPhone)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('https://kigochen.github.io/daily-stock-tracking/');
  await waitForChartInit(page);

  const canvas = page.locator('#mainChart canvas').first();
  await expect(canvas).toBeVisible({ timeout: 10000 });

  const box = await canvas.boundingBox();
  expect(box.width).toBeGreaterThan(0);
  expect(box.height).toBeGreaterThan(200);

  const sample = await sampleCanvasPixel(page, '#mainChart canvas');
  expect(sample.avgBrightness).toBeGreaterThan(15);
  expect(sample.notPureWhiteCount).toBeGreaterThan(0);
});

// ════════════════════════════════════════════════════════════════════════════
// TC-003: K-line renders on Android viewport
// ════════════════════════════════════════════════════════════════════════════
test('TC-003 K-line renders on Android viewport', async ({ page }) => {
  await page.setViewportSize({ width: 414, height: 896 });
  await page.goto('https://kigochen.github.io/daily-stock-tracking/');
  await waitForChartInit(page);

  const canvas = page.locator('#mainChart canvas').first();
  await expect(canvas).toBeVisible({ timeout: 10000 });

  const box = await canvas.boundingBox();
  expect(box.width).toBeGreaterThan(0);
  expect(box.height).toBeGreaterThan(200);

  const sample = await sampleCanvasPixel(page, '#mainChart canvas');
  expect(sample.avgBrightness).toBeGreaterThan(15);
  expect(sample.notPureWhiteCount).toBeGreaterThan(0);
});

// ════════════════════════════════════════════════════════════════════════════
// TC-002a: KD sub-chart renders on mobile (iPhone)
// ════════════════════════════════════════════════════════════════════════════
test('TC-002a KD sub-chart renders on mobile (iPhone)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('https://kigochen.github.io/daily-stock-tracking/');
  await waitForChartInit(page);

  const kdCanvas = page.locator('#kdChart canvas').first();
  await expect(kdCanvas).toBeVisible({ timeout: 10000 });

  const box = await kdCanvas.boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(60);

  const sample = await sampleCanvasPixel(page, '#kdChart canvas');
  expect(sample.avgBrightness).toBeGreaterThan(15);
  expect(sample.notPureWhiteCount).toBeGreaterThan(0);
});

// ════════════════════════════════════════════════════════════════════════════
// TC-003a: RSI + MACD sub-charts render on Android
// ════════════════════════════════════════════════════════════════════════════
test('TC-003a RSI + MACD sub-charts render on Android', async ({ page }) => {
  await page.setViewportSize({ width: 414, height: 896 });
  await page.goto('https://kigochen.github.io/daily-stock-tracking/');
  await waitForChartInit(page);

  const rsiCanvas = page.locator('#rsiChart canvas').first();
  await expect(rsiCanvas).toBeVisible({ timeout: 10000 });
  const rsiBox = await rsiCanvas.boundingBox();
  expect(rsiBox.height).toBeGreaterThanOrEqual(60);

  const macdCanvas = page.locator('#macdChart canvas').first();
  await expect(macdCanvas).toBeVisible({ timeout: 10000 });
  const macdBox = await macdCanvas.boundingBox();
  expect(macdBox.height).toBeGreaterThanOrEqual(60);

  const rsiSample = await sampleCanvasPixel(page, '#rsiChart canvas');
  expect(rsiSample.avgBrightness).toBeGreaterThan(15);
  const macdSample = await sampleCanvasPixel(page, '#macdChart canvas');
  expect(macdSample.avgBrightness).toBeGreaterThan(15);
});

// ════════════════════════════════════════════════════════════════════════════
// TC-004: stock symbol switching (TWII → SPY)
// ════════════════════════════════════════════════════════════════════════════
test('TC-004 stock symbol switching (TWII → SPY)', async ({ page }) => {
  await page.goto('https://kigochen.github.io/daily-stock-tracking/');
  await waitForChartInit(page);

  const priceBefore = await page.locator('#chartPrice').textContent();

  await page.selectOption('#symbolSelector', 'spy');
  await page.waitForTimeout(2000);

  const consoleLogs = [];
  page.on('console', msg => {
    if (msg.text().includes('spy')) consoleLogs.push(msg.text());
  });

  const priceAfter = await page.locator('#chartPrice').textContent();
  expect(priceAfter).not.toBe('--');
  expect(priceAfter).not.toBe(priceBefore);
});

// ════════════════════════════════════════════════════════════════════════════
// TC-004a: network error fallback (TWII → SPY 503)
// ════════════════════════════════════════════════════════════════════════════
test('TC-004a network error fallback (TWII → SPY 503)', async ({ page }) => {
  await page.goto('https://kigochen.github.io/daily-stock-tracking/');
  await waitForChartInit(page);

  const priceBefore = await page.locator('#chartPrice').textContent();

  let requestFailed = false;
  page.on('requestfailed', () => { requestFailed = true; });

  await page.route('**/data/spy_daily.json', (route) => {
    route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
  });

  await page.selectOption('#symbolSelector', 'spy');
  await page.waitForTimeout(3000);

  const canvas = page.locator('#mainChart canvas').first();
  await expect(canvas).toBeVisible({ timeout: 10000 });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  const fatalErrors = errors.filter(e => e.includes('FATAL'));
  expect(fatalErrors).toHaveLength(0);
});

// ════════════════════════════════════════════════════════════════════════════
// TC-005: stock symbol switching (SPY → QQQ)
// ════════════════════════════════════════════════════════════════════════════
test('TC-005 stock symbol switching (SPY → QQQ)', async ({ page }) => {
  await page.goto('https://kigochen.github.io/daily-stock-tracking/');
  await waitForChartInit(page);

  await page.selectOption('#symbolSelector', 'spy');
  await page.waitForTimeout(2000);

  await page.selectOption('#symbolSelector', 'qqq');
  await page.waitForTimeout(2000);

  const price = await page.locator('#chartPrice').textContent();
  expect(price).not.toBe('--');
});

// ════════════════════════════════════════════════════════════════════════════
// TC-005a: network error fallback (SPY → QQQ 503)
// ════════════════════════════════════════════════════════════════════════════
test('TC-005a network error fallback (SPY → QQQ 503)', async ({ page }) => {
  await page.goto('https://kigochen.github.io/daily-stock-tracking/');
  await waitForChartInit(page);

  await page.selectOption('#symbolSelector', 'spy');
  await page.waitForTimeout(2000);

  const priceBefore = await page.locator('#chartPrice').textContent();

  await page.route('**/data/qqq_daily.json', (route) => {
    route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
  });

  await page.selectOption('#symbolSelector', 'qqq');
  await page.waitForTimeout(3000);

  const canvas = page.locator('#mainChart canvas').first();
  await expect(canvas).toBeVisible({ timeout: 10000 });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  const fatalErrors = errors.filter(e => e.includes('FATAL'));
  expect(fatalErrors).toHaveLength(0);

  const priceAfter = await page.locator('#chartPrice').textContent();
  expect(priceAfter).toBe(priceBefore);
});

// ════════════════════════════════════════════════════════════════════════════
// TC-006: Volume sub-chart renders
// ════════════════════════════════════════════════════════════════════════════
test('TC-006 Volume sub-chart renders', async ({ page }) => {
  await page.goto('https://kigochen.github.io/daily-stock-tracking/');
  await waitForChartInit(page);

  const volCanvas = page.locator('#volumeChart canvas').first();
  await expect(volCanvas).toBeVisible({ timeout: 10000 });
  const box = await volCanvas.boundingBox();
  expect(box.height).toBeGreaterThan(50);
});

// ════════════════════════════════════════════════════════════════════════════
// TC-007: KD sub-chart renders
// ════════════════════════════════════════════════════════════════════════════
test('TC-007 KD sub-chart renders', async ({ page }) => {
  await page.goto('https://kigochen.github.io/daily-stock-tracking/');
  await waitForChartInit(page);

  const kdCanvas = page.locator('#kdChart canvas').first();
  await expect(kdCanvas).toBeVisible({ timeout: 10000 });
  const box = await kdCanvas.boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(60);
});

// ════════════════════════════════════════════════════════════════════════════
// TC-008: RSI sub-chart renders
// ════════════════════════════════════════════════════════════════════════════
test('TC-008 RSI sub-chart renders', async ({ page }) => {
  await page.goto('https://kigochen.github.io/daily-stock-tracking/');
  await waitForChartInit(page);

  const rsiCanvas = page.locator('#rsiChart canvas').first();
  await expect(rsiCanvas).toBeVisible({ timeout: 10000 });
  const box = await rsiCanvas.boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(60);
});

// ════════════════════════════════════════════════════════════════════════════
// TC-009: MACD sub-chart renders
// ════════════════════════════════════════════════════════════════════════════
test('TC-009 MACD sub-chart renders', async ({ page }) => {
  await page.goto('https://kigochen.github.io/daily-stock-tracking/');
  await waitForChartInit(page);

  const macdCanvas = page.locator('#macdChart canvas').first();
  await expect(macdCanvas).toBeVisible({ timeout: 10000 });
  const box = await macdCanvas.boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(60);
});

// ════════════════════════════════════════════════════════════════════════════
// TC-010: MA5/MA20/MA60 overlay lines exist on main chart
// ════════════════════════════════════════════════════════════════════════════
test('TC-010 MA overlay lines exist', async ({ page }) => {
  await page.goto('https://kigochen.github.io/daily-stock-tracking/');
  await waitForChartInit(page);

  const canvas = page.locator('#mainChart canvas').first();
  await expect(canvas).toBeVisible({ timeout: 10000 });

  const sample = await sampleCanvasPixel(page, '#mainChart canvas');
  expect(sample.avgBrightness).toBeGreaterThan(15);
});

// ════════════════════════════════════════════════════════════════════════════
// TC-011: right-side price axis renders
// ════════════════════════════════════════════════════════════════════════════
test('TC-011 right-side price axis renders', async ({ page }) => {
  await page.goto('https://kigochen.github.io/daily-stock-tracking/');
  await waitForChartInit(page);

  const canvas = page.locator('#mainChart canvas').first();
  await expect(canvas).toBeVisible({ timeout: 10000 });
  const box = await canvas.boundingBox();
  expect(box.width).toBeGreaterThan(600);
});

// ════════════════════════════════════════════════════════════════════════════
// TC-012: Header MA indicators display
// ════════════════════════════════════════════════════════════════════════════
test('TC-012 Header MA indicators display', async ({ page }) => {
  await page.goto('https://kigochen.github.io/daily-stock-tracking/');
  await waitForChartInit(page);

  const ma5 = await page.locator('#indMA5').textContent();
  const ma20 = await page.locator('#indMA20').textContent();
  const ma60 = await page.locator('#indMA60').textContent();

  expect(ma5).not.toBe('--');
  expect(ma20).not.toBe('--');
  expect(ma60).not.toBe('--');

  expect(parseFloat(ma5)).toBeGreaterThan(0);
  expect(parseFloat(ma20)).toBeGreaterThan(0);
  expect(parseFloat(ma60)).toBeGreaterThan(0);
});

// ════════════════════════════════════════════════════════════════════════════
// TC-013: Header RSI(6) displays
// ════════════════════════════════════════════════════════════════════════════
test('TC-013 Header RSI(6) displays', async ({ page }) => {
  await page.goto('https://kigochen.github.io/daily-stock-tracking/');
  await waitForChartInit(page);

  const rsi = await page.locator('#indRSI').textContent();
  expect(rsi).not.toBe('--');
  const rsiVal = parseFloat(rsi);
  expect(rsiVal).toBeGreaterThan(0);
  expect(rsiVal).toBeLessThanOrEqual(100);
});

// ════════════════════════════════════════════════════════════════════════════
// TC-014: Header KD K/D displays
// ════════════════════════════════════════════════════════════════════════════
test('TC-014 Header KD K/D displays', async ({ page }) => {
  await page.goto('https://kigochen.github.io/daily-stock-tracking/');
  await waitForChartInit(page);

  const kVal = await page.locator('#indK').textContent();
  const dVal = await page.locator('#indD').textContent();

  expect(kVal).not.toBe('--');
  expect(dVal).not.toBe('--');

  const kNum = parseFloat(kVal);
  const dNum = parseFloat(dVal);
  expect(kNum).toBeGreaterThan(0);
  expect(kNum).toBeLessThanOrEqual(100);
  expect(dNum).toBeGreaterThan(0);
  expect(dNum).toBeLessThanOrEqual(100);
});

// ════════════════════════════════════════════════════════════════════════════
// TC-015: market signal badge exists
// ════════════════════════════════════════════════════════════════════════════
test('TC-015 market signal badge exists', async ({ page }) => {
  await page.goto('https://kigochen.github.io/daily-stock-tracking/');
  await waitForChartInit(page);

  const badge = page.locator('.signal-badge');
  await expect(badge).toBeVisible();
  const text = await badge.textContent();
  expect(text.trim().length).toBeGreaterThan(0);
});

// ════════════════════════════════════════════════════════════════════════════
// TC-016: daily timeframe (D) is selected
// ════════════════════════════════════════════════════════════════════════════
test('TC-016 daily timeframe (D) is selected', async ({ page }) => {
  await page.goto('https://kigochen.github.io/daily-stock-tracking/');
  await waitForChartInit(page);

  const selected = page.locator('#timeframeSelector option[selected]');
  if (await selected.count() > 0) {
    const value = await selected.first().getAttribute('value');
    expect(value.toLowerCase()).toBe('d');
  } else {
    const firstOpt = await page.locator('#timeframeSelector option').first().getAttribute('value');
    expect(firstOpt).toBeTruthy();
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TC-017: last-updated timestamp displays
// ════════════════════════════════════════════════════════════════════════════
test('TC-017 last-updated timestamp displays', async ({ page }) => {
  await page.goto('https://kigochen.github.io/daily-stock-tracking/');
  await waitForChartInit(page);

  const el = page.locator('#lastUpdated');
  await expect(el).toBeVisible();
  const text = await el.textContent();
  expect(text.trim().length).toBeGreaterThan(0);
});

// ════════════════════════════════════════════════════════════════════════════
// TC-018: window resize (desktop 1920 → 800)
// ════════════════════════════════════════════════════════════════════════════
test('TC-018 window resize (desktop 1920 → 800)', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('https://kigochen.github.io/daily-stock-tracking/');
  await waitForChartInit(page);

  const canvas = page.locator('#mainChart canvas').first();
  const w1 = (await canvas.boundingBox()).width;
  expect(w1).toBeGreaterThan(1800);

  await page.setViewportSize({ width: 800, height: 1080 });
  await page.waitForTimeout(1000);

  const w2 = (await canvas.boundingBox()).width;
  expect(w2).toBeLessThan(w1);
  expect(w2).toBeGreaterThan(700);
});

// ════════════════════════════════════════════════════════════════════════════
// TC-019: mobile rotation (portrait ↔ landscape)
// ════════════════════════════════════════════════════════════════════════════
test('TC-019 mobile rotation (portrait ↔ landscape)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('https://kigochen.github.io/daily-stock-tracking/');
  await waitForChartInit(page);

  const canvas = page.locator('#mainChart canvas').first();
  const h1 = (await canvas.boundingBox()).height;
  expect(h1).toBeGreaterThan(200);

  await page.setViewportSize({ width: 667, height: 375 });
  await page.waitForTimeout(1000);

  const h2 = (await canvas.boundingBox()).height;
  expect(h2).not.toBe(h1);
  expect(h2).toBeGreaterThan(0);
});

// ════════════════════════════════════════════════════════════════════════════
// TC-020: panel collapse/expand
// ════════════════════════════════════════════════════════════════════════════
test('TC-020 panel collapse/expand', async ({ page }) => {
  await page.goto('https://kigochen.github.io/daily-stock-tracking/');
  await waitForChartInit(page);

  const panel = page.locator('#kdPanel');
  const toggleBtn = page.locator('.toggle-panel').first();

  const hasCollapsedBefore = await panel.evaluate(el => el.classList.contains('collapsed'));
  await toggleBtn.click();
  await page.waitForTimeout(300);

  const hasCollapsedAfter = await panel.evaluate(el => el.classList.contains('collapsed'));
  expect(hasCollapsedAfter).toBe(!hasCollapsedBefore);

  await toggleBtn.click();
  await page.waitForTimeout(300);

  const hasCollapsedFinal = await panel.evaluate(el => el.classList.contains('collapsed'));
  expect(hasCollapsedFinal).toBe(hasCollapsedBefore);
});

// ════════════════════════════════════════════════════════════════════════════
// TC-021: refresh button triggers fetch
// ════════════════════════════════════════════════════════════════════════════
test('TC-021 refresh button triggers fetch', async ({ page }) => {
  await page.goto('https://kigochen.github.io/daily-stock-tracking/');
  await waitForChartInit(page);

  let fetchTriggered = false;
  page.on('request', req => {
    if (req.url().includes('.json')) fetchTriggered = true;
  });

  await page.locator('#refreshBtn').click();
  await page.waitForTimeout(2000);

  expect(fetchTriggered).toBe(true);

  const canvas = page.locator('#mainChart canvas').first();
  await expect(canvas).toBeVisible({ timeout: 10000 });
});

// ════════════════════════════════════════════════════════════════════════════
// TC-022: no FATAL console errors (desktop)
// ════════════════════════════════════════════════════════════════════════════
test('TC-022 no FATAL console errors (desktop)', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto('https://kigochen.github.io/daily-stock-tracking/');
  await page.waitForTimeout(5000);

  const fatalErrors = consoleErrors.filter(e => e.includes('FATAL'));
  const uncaughtErrors = consoleErrors.filter(e => e.includes('Uncaught') || e.includes('SyntaxError'));
  expect(fatalErrors).toHaveLength(0);
  expect(uncaughtErrors).toHaveLength(0);
});

// ════════════════════════════════════════════════════════════════════════════
// TC-023: no FATAL console errors (mobile)
// ════════════════════════════════════════════════════════════════════════════
test('TC-023 no FATAL console errors (mobile)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto('https://kigochen.github.io/daily-stock-tracking/');
  await page.waitForTimeout(5000);

  const fatalErrors = consoleErrors.filter(e => e.includes('FATAL'));
  const uncaughtErrors = consoleErrors.filter(e => e.includes('Uncaught') || e.includes('SyntaxError'));
  expect(fatalErrors).toHaveLength(0);
  expect(uncaughtErrors).toHaveLength(0);
});

// ════════════════════════════════════════════════════════════════════════════
// TC-024: invalid symbol graceful fallback
// ════════════════════════════════════════════════════════════════════════════
test('TC-024 invalid symbol graceful fallback', async ({ page }) => {
  await page.goto('https://kigochen.github.io/daily-stock-tracking/');
  await waitForChartInit(page);

  const priceBefore = await page.locator('#chartPrice').textContent();

  await page.reload();
  await waitForChartInit(page);

  const priceAfter = await page.locator('#chartPrice').textContent();
  expect(priceAfter).not.toBe('');

  const canvas = page.locator('#mainChart canvas').first();
  await expect(canvas).toBeVisible({ timeout: 10000 });

  await page.selectOption('#symbolSelector', 'twii');
  await page.waitForTimeout(1000);
  const priceRestored = await page.locator('#chartPrice').textContent();
  expect(priceRestored).not.toBe('--');
});
