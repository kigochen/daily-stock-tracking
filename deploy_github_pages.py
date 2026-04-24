#!/usr/bin/env python3
"""
QuantBoard GitHub Pages Deployment Script
Deploys the stock dashboard to a static site directory for GitHub Pages hosting.
"""

import os
import shutil
import sys
from pathlib import Path

# Configuration
WORKSPACE = Path("/home/node/.openclaw/workspace")
SRC_DIR = WORKSPACE / "stock-dashboard"
DST_DIR = WORKSPACE / "quantboard-gh-pages"

SRC_FILES = {
    "index.html": "index.html",
    "css/dashboard.css": "css/dashboard.css",
    "js/dashboard.js": "js/dashboard.js",
    "js/lightweight-charts.standalone.production.js": "js/lightweight-charts.standalone.production.js",
}

README_CONTENT = """# QuantBoard - 股票追蹤 Dashboard

## 部署方式

1. Fork 或複製這個 repo
2. 開啟 GitHub Pages（Settings → Pages → Source: main branch）
3. 每週或每天執行一次 `python3 deploy_sync.py` 同步最新資料

## 手動更新資料

```bash
cd ~/workspace/stock-dashboard
python3 scripts/fetcher.py  # 更新 stock_data.json
python3 ../quantboard-gh-pages/deploy_sync.py  # 同步到 GH Pages 目錄
git add . && git commit -m "Update stock data" && git push
```
"""


def deploy():
    """Copy all dashboard files to the GitHub Pages output directory."""
    errors = []

    # Ensure destination directory exists
    DST_DIR.mkdir(parents=True, exist_ok=True)
    (DST_DIR / "data").mkdir(parents=True, exist_ok=True)

    # Copy static files
    for src_rel, dst_rel in SRC_FILES.items():
        src = SRC_DIR / src_rel
        dst = DST_DIR / dst_rel

        # Create subdirectories if needed
        dst.parent.mkdir(parents=True, exist_ok=True)

        if src.exists():
            shutil.copy2(src, dst)
            print(f"  ✅ Copied {src_rel}")
        else:
            print(f"  ⚠️  Missing {src_rel} (skipping)")
            errors.append(f"Missing source file: {src_rel}")

    # Copy stock_data.json
    stock_data_src = SRC_DIR / "data" / "stock_data.json"
    stock_data_dst = DST_DIR / "data" / "stock_data.json"
    if stock_data_src.exists():
        shutil.copy2(stock_data_src, stock_data_dst)
        print(f"  ✅ Copied data/stock_data.json")
    else:
        print(f"  ⚠️  Missing data/stock_data.json")
        errors.append("Missing: data/stock_data.json")

    # Copy all *_daily.json files + their gzip versions
    daily_files = list((SRC_DIR / "data").glob("*_daily.json"))
    daily_gz    = list((SRC_DIR / "data").glob("*_daily.json.gz"))
    all_data   = daily_files + daily_gz
    if not all_data:
        print(f"  ⚠️  No *_daily.json* files found in data/")
        errors.append("No *_daily.json* files found")
    else:
        for f in all_data:
            shutil.copy2(f, DST_DIR / "data" / f.name)
            print(f"  ✅ Copied data/{f.name}")

    # Write README.md
    readme = DST_DIR / "README.md"
    readme.write_text(README_CONTENT.strip())
    print(f"  ✅ Written README.md")

    # Summary
    print(f"\n{'='*50}")
    print(f"Deploy complete: {len(daily_files) + len(SRC_FILES) + 1} files copied")
    print(f"Output dir: {DST_DIR}")
    if errors:
        print(f"Warnings: {len(errors)}")
        for e in errors:
            print(f"  - {e}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(deploy())
