# QuantBoard - 股票追蹤 Dashboard

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