#!/usr/bin/env python3
"""
QuantBoard GitHub Pages Sync Script
Run from ~/workspace/quantboard-gh-pages/ to sync latest data from stock-dashboard.
"""

import os
import shutil
import sys
from pathlib import Path

WORKSPACE = Path("/home/node/.openclaw/workspace")
SRC_DIR = WORKSPACE / "stock-dashboard"
DST_DIR = Path("/home/node/.openclaw/workspace/quantboard-gh-pages")

DATA_DIR = DST_DIR / "data"


def sync():
    """Sync latest stock data files from stock-dashboard."""
    if not SRC_DIR.exists():
        print(f"❌ Source directory not found: {SRC_DIR}")
        return 1

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # Sync stock_data.json
    stock_src = SRC_DIR / "data" / "stock_data.json"
    stock_dst = DATA_DIR / "stock_data.json"
    if stock_src.exists():
        mtime = os.path.getmtime(stock_src)
        shutil.copy2(stock_src, stock_dst)
        print(f"✅ Synced stock_data.json (mtime: {mtime})")
    else:
        print(f"⚠️  stock_data.json not found")
        return 1

    # Sync all *_daily.json files
    daily_files = sorted(SRC_DIR / "data".glob("*_daily.json"))
    print(f"\nSyncing {len(daily_files)} daily files...")
    for f in daily_files:
        shutil.copy2(f, DATA_DIR / f.name)
        print(f"  ✅ {f.name}")

    total = len(daily_files) + 1
    print(f"\n{'='*50}")
    print(f"Sync complete: {total} files updated")
    print(f"Commit and push to update GitHub Pages:")
    print(f"  git add . && git commit -m 'Update stock data' && git push")
    return 0


if __name__ == "__main__":
    sys.exit(sync())
