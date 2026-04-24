# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: quantboard.spec.js >> TC-004 stock symbol switching (TWII → SPY)
- Location: tests/quantboard.spec.js:161:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.textContent: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('#chartPrice')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - heading "kigochen 的工具箱" [level=1] [ref=e3]
    - paragraph [ref=e4]: 自動掃描 GitHub Pages 專案
  - main [ref=e5]:
    - generic [ref=e6]:
      - link " daily-stock-tracking 無描述" [ref=e7] [cursor=pointer]:
        - /url: https://kigochen.github.io/daily-stock-tracking/
        - generic [ref=e8]: 
        - heading "daily-stock-tracking" [level=3] [ref=e9]
        - paragraph [ref=e10]: 無描述
      - link " kigochen.github.io Create the main landing page for all tools" [ref=e11] [cursor=pointer]:
        - /url: https://kigochen.github.io/
        - generic [ref=e12]: 
        - heading "kigochen.github.io" [level=3] [ref=e13]
        - paragraph [ref=e14]: Create the main landing page for all tools
      - link " 40hz-gamma 無描述" [ref=e15] [cursor=pointer]:
        - /url: https://kigochen.github.io/40hz-gamma/
        - generic [ref=e16]: 
        - heading "40hz-gamma" [level=3] [ref=e17]
        - paragraph [ref=e18]: 無描述
      - link " camera-translate Translate by Gemini 2.5 flash by picture or camera" [ref=e19] [cursor=pointer]:
        - /url: https://kigochen.github.io/camera-translate/
        - generic [ref=e20]: 
        - heading "camera-translate" [level=3] [ref=e21]
        - paragraph [ref=e22]: Translate by Gemini 2.5 flash by picture or camera
      - link " dalang-2025 無描述" [ref=e23] [cursor=pointer]:
        - /url: https://kigochen.github.io/dalang-2025/
        - generic [ref=e24]: 
        - heading "dalang-2025" [level=3] [ref=e25]
        - paragraph [ref=e26]: 無描述
      - link " anan-binky-fairy 無描述" [ref=e27] [cursor=pointer]:
        - /url: https://kigochen.github.io/anan-binky-fairy/
        - generic [ref=e28]: 
        - heading "anan-binky-fairy" [level=3] [ref=e29]
        - paragraph [ref=e30]: 無描述
```

# Test source

```ts
  66  | 
  67  | // ════════════════════════════════════════════════════════════════════════════
  68  | // TC-002: K-line renders on mobile (iPhone)
  69  | // ════════════════════════════════════════════════════════════════════════════
  70  | test('TC-002 K-line renders on mobile (iPhone)', async ({ page }) => {
  71  |   await page.setViewportSize({ width: 375, height: 667 });
  72  |   await page.goto('/');
  73  |   await waitForRAF(page);
  74  |   await page.waitForTimeout(300);
  75  | 
  76  |   const canvas = page.locator('#mainChart canvas').first();
  77  |   if (await canvas.count() === 0) { console.log('[TC-002] #mainChart canvas not present on this viewport'); return; }
  78  |   if (!(await canvas.isVisible())) { console.log('[TC-002] #mainChart canvas present but not visible (mobile layout hides it)'); return; }
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
  95  |   await page.goto('https://kigochen.github.io/daily-stock-tracking/');
  96  |   await waitForRAF(page);
  97  |   await page.waitForTimeout(300);
  98  | 
  99  |   const canvas = page.locator('#mainChart canvas').first();
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
  120 |   const kdCanvas = page.locator('#kdChart canvas').first();
  121 |   if (await kdCanvas.count() === 0) { console.log('[TC-002a] #kdChart canvas not present on this viewport'); return; }
  122 |   await expect(kdCanvas).toBeVisible();
  123 | 
  124 |   const box = await kdCanvas.boundingBox();
  125 |   expect(box.height).toBeGreaterThanOrEqual(60);
  126 | 
  127 |   const sample = await sampleCanvasPixel(page, '#kdChart canvas');
  128 |   expect(sample.avgBrightness).toBeGreaterThan(15);
  129 |   expect(sample.notPureWhiteCount).toBeGreaterThan(0);
  130 | });
  131 | 
  132 | // ════════════════════════════════════════════════════════════════════════════
  133 | // TC-003a: RSI + MACD sub-charts render on Android
  134 | // ════════════════════════════════════════════════════════════════════════════
  135 | test('TC-003a RSI + MACD sub-charts render on Android', async ({ page }) => {
  136 |   await page.setViewportSize({ width: 414, height: 896 });
  137 |   await page.goto('/');
  138 |   await waitForRAF(page);
  139 |   await page.waitForTimeout(300);
  140 | 
  141 |   const rsiCanvas = page.locator('#rsiChart canvas').first();
  142 |   if (await rsiCanvas.count() === 0) { console.log('[TC-003a] #rsiChart canvas not present'); return; }
  143 |   await expect(rsiCanvas).toBeVisible();
  144 |   const rsiBox = await rsiCanvas.boundingBox();
  145 |   expect(rsiBox.height).toBeGreaterThanOrEqual(60);
  146 | 
  147 |   const macdCanvas = page.locator('#macdChart canvas').first();
  148 |   if (await macdCanvas.count() === 0) { console.log('[TC-003a] #macdChart canvas not present'); return; }
  149 |   const macdBox = await macdCanvas.boundingBox();
  150 |   expect(macdBox.height).toBeGreaterThanOrEqual(60);
  151 | 
  152 |   const rsiSample = await sampleCanvasPixel(page, '#rsiChart canvas');
  153 |   expect(rsiSample.avgBrightness).toBeGreaterThan(15);
  154 |   const macdSample = await sampleCanvasPixel(page, '#macdChart canvas');
  155 |   expect(macdSample.avgBrightness).toBeGreaterThan(15);
  156 | });
  157 | 
  158 | // ════════════════════════════════════════════════════════════════════════════
  159 | // TC-004: stock symbol switching (TWII → SPY)
  160 | // ════════════════════════════════════════════════════════════════════════════
  161 | test('TC-004 stock symbol switching (TWII → SPY)', async ({ page }) => {
  162 |   await page.goto('/');
  163 |   await waitForRAF(page);
  164 |   await page.waitForTimeout(500);
  165 | 
> 166 |   const priceBefore = await page.locator('#chartPrice').textContent();
      |                                                         ^ Error: locator.textContent: Test timeout of 30000ms exceeded.
  167 | 
  168 |   await page.selectOption('#symbolSelector', 'spy');
  169 |   await page.waitForTimeout(800);
  170 | 
  171 |   const consoleLogs = [];
  172 |   page.on('console', msg => {
  173 |     if (msg.text().includes('spy')) consoleLogs.push(msg.text());
  174 |   });
  175 | 
  176 |   const priceAfter = await page.locator('#chartPrice').textContent();
  177 |   expect(priceAfter).not.toBe('--');
  178 |   expect(priceAfter).not.toBe(priceBefore);
  179 | });
  180 | 
  181 | // ════════════════════════════════════════════════════════════════════════════
  182 | // TC-004a: network error fallback (TWII → SPY 503)
  183 | // ════════════════════════════════════════════════════════════════════════════
  184 | test('TC-004a network error fallback (TWII → SPY 503)', async ({ page }) => {
  185 |   await page.goto('/');
  186 |   await waitForRAF(page);
  187 |   await page.waitForTimeout(500);
  188 | 
  189 |   const priceBefore = await page.locator('#chartPrice').textContent();
  190 | 
  191 |   let requestFailed = false;
  192 |   page.on('requestfailed', () => { requestFailed = true; });
  193 | 
  194 |   await page.route('**/data/spy_daily.json', (route) => {
  195 |     route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
  196 |   });
  197 | 
  198 |   await page.selectOption('#symbolSelector', 'spy');
  199 |   await page.waitForTimeout(3000);
  200 | 
  201 |   // Page should not crash
  202 |   const canvas = page.locator('#mainChart canvas').first();
  203 |   await expect(canvas).toBeVisible();
  204 | 
  205 |   // No FATAL error
  206 |   const errors = [];
  207 |   collectConsoleErrors(page, errors);
  208 |   const fatalErrors = errors.filter(e => e.includes('FATAL'));
  209 |   expect(fatalErrors).toHaveLength(0);
  210 | });
  211 | 
  212 | // ════════════════════════════════════════════════════════════════════════════
  213 | // TC-005: stock symbol switching (SPY → QQQ)
  214 | // ════════════════════════════════════════════════════════════════════════════
  215 | test('TC-005 stock symbol switching (SPY → QQQ)', async ({ page }) => {
  216 |   await page.goto('/');
  217 |   await waitForRAF(page);
  218 |   await page.waitForTimeout(500);
  219 | 
  220 |   await page.selectOption('#symbolSelector', 'spy');
  221 |   await page.waitForTimeout(800);
  222 | 
  223 |   await page.selectOption('#symbolSelector', 'qqq');
  224 |   await page.waitForTimeout(800);
  225 | 
  226 |   const price = await page.locator('#chartPrice').textContent();
  227 |   expect(price).not.toBe('--');
  228 | });
  229 | 
  230 | // ════════════════════════════════════════════════════════════════════════════
  231 | // TC-005a: network error fallback (SPY → QQQ 503)
  232 | // ════════════════════════════════════════════════════════════════════════════
  233 | test('TC-005a network error fallback (SPY → QQQ 503)', async ({ page }) => {
  234 |   await page.goto('/');
  235 |   await waitForRAF(page);
  236 |   await page.waitForTimeout(500);
  237 | 
  238 |   await page.selectOption('#symbolSelector', 'spy');
  239 |   await page.waitForTimeout(800);
  240 | 
  241 |   const priceBefore = await page.locator('#chartPrice').textContent();
  242 | 
  243 |   await page.route('**/data/qqq_daily.json', (route) => {
  244 |     route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
  245 |   });
  246 | 
  247 |   await page.selectOption('#symbolSelector', 'qqq');
  248 |   await page.waitForTimeout(3000);
  249 | 
  250 |   const canvas = page.locator('#mainChart canvas').first();
  251 |   await expect(canvas).toBeVisible();
  252 | 
  253 |   const errors = [];
  254 |   collectConsoleErrors(page, errors);
  255 |   const fatalErrors = errors.filter(e => e.includes('FATAL'));
  256 |   expect(fatalErrors).toHaveLength(0);
  257 | 
  258 |   // Price should maintain previous value
  259 |   const priceAfter = await page.locator('#chartPrice').textContent();
  260 |   expect(priceAfter).toBe(priceBefore);
  261 | });
  262 | 
  263 | // ════════════════════════════════════════════════════════════════════════════
  264 | // TC-006: Volume sub-chart renders
  265 | // ════════════════════════════════════════════════════════════════════════════
  266 | test('TC-006 Volume sub-chart renders', async ({ page }) => {
```