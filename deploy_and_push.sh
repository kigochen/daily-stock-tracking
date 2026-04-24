#!/bin/bash
# Full automation: sync data + git add + commit + push
# Run from daily-stock-tracking directory

set -e

REPO_DIR="/home/node/.openclaw/workspace/daily-stock-tracking"
SOURCE_DIR="/home/node/.openclaw/workspace/stock-dashboard"

# Sync stock data from NAS fetcher (using cp since rsync not available)
cp "$SOURCE_DIR/data/stock_data.json" "$REPO_DIR/data/"

# Sync all daily JSON files
for f in "$SOURCE_DIR/data/"*_daily.json; do
    if [ -f "$f" ]; then
        cp "$f" "$REPO_DIR/data/"
    fi
done

cd "$REPO_DIR"

# Git add, commit, push (non-interactive)
git add data/ index.html css/ js/ 2>/dev/null || true
git commit -m "Auto-sync stock data $(date '+%Y-%m-%d %H:%M')" 2>/dev/null || echo "No changes to commit"

GIT_SSH_COMMAND="ssh -i /home/node/.openclaw/workspace/.ssh/id_ed25519_github -o UserKnownHostsFile=/home/node/.openclaw/workspace/.ssh/known_hosts" \
    git push origin main 2>&1

echo "✅ Deploy complete at $(date)"
