# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: quantboard.spec.js >> TC-004a network error fallback (TWII → SPY 503)
- Location: tests/quantboard.spec.js:184:1

# Error details

```
Error: locator.textContent: Target page, context or browser has been closed
Call log:
  - waiting for locator('#chartPrice')

```

```
Error: write EPIPE
```