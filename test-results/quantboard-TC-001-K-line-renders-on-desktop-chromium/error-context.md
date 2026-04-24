# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: quantboard.spec.js >> TC-001 K-line renders on desktop
- Location: tests/quantboard.spec.js:46:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('#mainChart canvas')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('#mainChart canvas')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - generic [ref=e3]:
      - heading "📊 QuantBoard" [level=1] [ref=e4]
      - text: K 線圖追蹤 Dashboard
    - generic [ref=e5]:
      - generic [ref=e6]: "--"
      - combobox [ref=e7] [cursor=pointer]:
        - option "🇹🇼 加權指數 (TWII)" [selected]
        - option "🇺🇸 SPY (S&P 500 ETF)"
        - option "🇺🇸 QQQ (Nasdaq 100)"
        - option "😱 VIX 恐慌指數"
        - option "🇹🇼 2330 臺積電"
        - option "💵 DXY 美元指數"
        - option "🇺🇸 GOOG Alphabet"
        - option "🇺🇸 MU Micron"
        - option "🇺🇸 SOXX 半導體"
        - option "🇺🇸 POET Technologies"
        - option "🇺🇸 ARM Holdings"
        - option "🇺🇸 AAPL Apple"
        - option "🇺🇸 TSLA Tesla"
        - option "🇺🇸 NBIS Nebius"
        - option "🇺🇸 SMR NuScale"
        - option "🇺🇸 AVGO Broadcom"
        - option "🇺🇸 COHR Coherent"
        - option "🇺🇸 AMKR Amkor"
        - option "🇨🇦 GLXY Galaxy Digital"
        - option "🇺🇸 WOLF Wolfspeed"
        - option "🇺🇸 OUST Ouster"
        - option "🇺🇸 IRDM Iridium"
        - option "🇺🇸 COIN Coinbase"
      - combobox [ref=e8] [cursor=pointer]:
        - option "日線" [selected]
      - button "🔄 更新" [ref=e9] [cursor=pointer]
  - main [ref=e10]:
    - generic [ref=e11]:
      - heading "📈 加權指數 (TWII)" [level=2] [ref=e13]
      - generic [ref=e15]:
        - generic [ref=e16]: "--"
        - generic [ref=e17]: "--"
      - generic [ref=e18]:
        - generic [ref=e19]: "MA5: --"
        - generic [ref=e20]: "MA20: --"
        - generic [ref=e21]: "MA60: --"
        - generic [ref=e22]: "RSI(6): --"
        - generic [ref=e23]: "KD K: --"
        - generic [ref=e24]: "KD D: --"
      - generic [ref=e25]:
        - generic [ref=e29] [cursor=pointer]:
          - text: KD
          - generic [ref=e30]: ▼
        - generic [ref=e33] [cursor=pointer]:
          - text: RSI(6)
          - generic [ref=e34]: ▶
        - generic [ref=e37] [cursor=pointer]:
          - text: MACD
          - generic [ref=e38]: ▶
    - generic [ref=e40]:
      - heading "📋 市場綜合信號" [level=2] [ref=e42]
      - generic [ref=e43]:
        - generic [ref=e44]: 看多 🔼
        - generic [ref=e45]: 中立 ➡️
        - generic [ref=e46]: 看空 🔽
      - paragraph [ref=e48]: 載入中...
  - contentinfo [ref=e49]:
    - paragraph [ref=e50]: 資料來源：Yahoo Finance · 圖表：TradingView Lightweight Charts · 更新頻率：每 60 秒
```

# Test source

```ts
  1   | const { test, expect, beforeEach, afterEach } = require('@playwright/test');
  2   | 
  3   | // ─── Helper: RAF + DOM flush wait ───────────────────────────────────────────
  4   | async function waitForRAF(page) {
  5   |   await page.evaluate(() => {
  6   |     return new Promise(resolve => requestAnimationFrame(() => resolve()));
  7   |   });
  8   |   await page.waitForTimeout(100); // DOM flush buffer
  9   | }
  10  | 
  11  | // ─── Helper: pixel sampling (center 10x10, brightness > 15/255, not pure white) ──
  12  | async function sampleCanvasPixel(page, selector) {
  13  |   return page.evaluate((sel) => {
  14  |     const canvas = document.querySelector(sel);
  15  |     if (!canvas) return null;
  16  |     const ctx = canvas.getContext('2d');
  17  |     const cx = Math.floor(canvas.width / 2) - 5;
  18  |     const cy = Math.floor(canvas.height / 2) - 5;
  19  |     let totalBrightness = 0;
  20  |     let notPureWhite = 0;
  21  |     for (let dx = 0; dx < 10; dx++) {
  22  |       for (let dy = 0; dy < 10; dy++) {
  23  |         const pixel = ctx.getImageData(cx + dx, cy + dy, 1, 1).data;
  24  |         const brightness = (pixel[0] + pixel[1] + pixel[2]) / 3;
  25  |         totalBrightness += brightness;
  26  |         if (!(pixel[0] > 250 && pixel[1] > 250 && pixel[2] > 250)) notPureWhite++;
  27  |       }
  28  |     }
  29  |     return {
  30  |       avgBrightness: totalBrightness / 100,
  31  |       notPureWhiteCount: notPureWhite,
  32  |     };
  33  |   }, selector);
  34  | }
  35  | 
  36  | // ─── Helper: collect console errors ─────────────────────────────────────────
  37  | function collectConsoleErrors(page, arr) {
  38  |   page.on('console', msg => {
  39  |     if (msg.type() === 'error') arr.push(msg.text());
  40  |   });
  41  | }
  42  | 
  43  | // ════════════════════════════════════════════════════════════════════════════
  44  | // TC-001: K-line renders on desktop
  45  | // ════════════════════════════════════════════════════════════════════════════
  46  | test('TC-001 K-line renders on desktop', async ({ page }) => {
  47  |   await page.goto(page.url()); // Ensure we're on the right page
  48  |   // Navigate to baseURL directly using full path
  49  |   await page.goto('https://kigochen.github.io/daily-stock-tracking/');
  50  |   await waitForRAF(page);
  51  |   await page.waitForTimeout(500);
  52  | 
  53  |   console.log('Actual URL:', page.url());
  54  |   console.log('Page title:', await page.title());
  55  | 
  56  |   const canvas = page.locator('#mainChart canvas');
> 57  |   await expect(canvas).toBeVisible();
      |                        ^ Error: expect(locator).toBeVisible() failed
  58  | 
  59  |   const box = await canvas.boundingBox();
  60  |   expect(box.width).toBeGreaterThan(0);
  61  |   expect(box.height).toBeGreaterThan(200);
  62  | 
  63  |   // pixel sampling: non-blank watermark
  64  |   const sample = await sampleCanvasPixel(page, '#mainChart canvas');
  65  |   expect(sample.avgBrightness).toBeGreaterThan(15);
  66  |   expect(sample.notPureWhiteCount).toBeGreaterThan(0);
  67  | });
  68  | 
  69  | // ════════════════════════════════════════════════════════════════════════════
  70  | // TC-002: K-line renders on mobile (iPhone)
  71  | // ════════════════════════════════════════════════════════════════════════════
  72  | test('TC-002 K-line renders on mobile (iPhone)', async ({ page }) => {
  73  |   await page.setViewportSize({ width: 375, height: 667 });
  74  |   await page.goto('/');
  75  |   await waitForRAF(page);
  76  |   await page.waitForTimeout(300);
  77  | 
  78  |   const canvas = page.locator('#mainChart canvas');
  79  |   await expect(canvas).toBeVisible();
  80  | 
  81  |   const box = await canvas.boundingBox();
  82  |   expect(box.width).toBeGreaterThan(0);
  83  |   expect(box.height).toBeGreaterThan(200);
  84  | 
  85  |   const sample = await sampleCanvasPixel(page, '#mainChart canvas');
  86  |   expect(sample.avgBrightness).toBeGreaterThan(15);
  87  |   expect(sample.notPureWhiteCount).toBeGreaterThan(0);
  88  | });
  89  | 
  90  | // ════════════════════════════════════════════════════════════════════════════
  91  | // TC-003: K-line renders on Android viewport
  92  | // ════════════════════════════════════════════════════════════════════════════
  93  | test('TC-003 K-line renders on Android viewport', async ({ page }) => {
  94  |   await page.setViewportSize({ width: 414, height: 896 });
  95  |   await page.goto('/');
  96  |   await waitForRAF(page);
  97  |   await page.waitForTimeout(300);
  98  | 
  99  |   const canvas = page.locator('#mainChart canvas');
  100 |   await expect(canvas).toBeVisible();
  101 | 
  102 |   const box = await canvas.boundingBox();
  103 |   expect(box.width).toBeGreaterThan(0);
  104 |   expect(box.height).toBeGreaterThan(200);
  105 | 
  106 |   const sample = await sampleCanvasPixel(page, '#mainChart canvas');
  107 |   expect(sample.avgBrightness).toBeGreaterThan(15);
  108 |   expect(sample.notPureWhiteCount).toBeGreaterThan(0);
  109 | });
  110 | 
  111 | // ════════════════════════════════════════════════════════════════════════════
  112 | // TC-002a: KD sub-chart renders on mobile (iPhone)
  113 | // ════════════════════════════════════════════════════════════════════════════
  114 | test('TC-002a KD sub-chart renders on mobile (iPhone)', async ({ page }) => {
  115 |   await page.setViewportSize({ width: 375, height: 667 });
  116 |   await page.goto('/');
  117 |   await waitForRAF(page);
  118 |   await page.waitForTimeout(300);
  119 | 
  120 |   const kdCanvas = page.locator('#kdChart canvas');
  121 |   await expect(kdCanvas).toBeVisible();
  122 | 
  123 |   const box = await kdCanvas.boundingBox();
  124 |   expect(box.height).toBeGreaterThanOrEqual(60);
  125 | 
  126 |   const sample = await sampleCanvasPixel(page, '#kdChart canvas');
  127 |   expect(sample.avgBrightness).toBeGreaterThan(15);
  128 |   expect(sample.notPureWhiteCount).toBeGreaterThan(0);
  129 | });
  130 | 
  131 | // ════════════════════════════════════════════════════════════════════════════
  132 | // TC-003a: RSI + MACD sub-charts render on Android
  133 | // ════════════════════════════════════════════════════════════════════════════
  134 | test('TC-003a RSI + MACD sub-charts render on Android', async ({ page }) => {
  135 |   await page.setViewportSize({ width: 414, height: 896 });
  136 |   await page.goto('/');
  137 |   await waitForRAF(page);
  138 |   await page.waitForTimeout(300);
  139 | 
  140 |   const rsiCanvas = page.locator('#rsiChart canvas');
  141 |   await expect(rsiCanvas).toBeVisible();
  142 |   const rsiBox = await rsiCanvas.boundingBox();
  143 |   expect(rsiBox.height).toBeGreaterThanOrEqual(60);
  144 | 
  145 |   const macdCanvas = page.locator('#macdChart canvas');
  146 |   await expect(macdCanvas).toBeVisible();
  147 |   const macdBox = await macdCanvas.boundingBox();
  148 |   expect(macdBox.height).toBeGreaterThanOrEqual(60);
  149 | 
  150 |   const rsiSample = await sampleCanvasPixel(page, '#rsiChart canvas');
  151 |   expect(rsiSample.avgBrightness).toBeGreaterThan(15);
  152 |   const macdSample = await sampleCanvasPixel(page, '#macdChart canvas');
  153 |   expect(macdSample.avgBrightness).toBeGreaterThan(15);
  154 | });
  155 | 
  156 | // ════════════════════════════════════════════════════════════════════════════
  157 | // TC-004: stock symbol switching (TWII → SPY)
```