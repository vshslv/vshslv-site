#!/usr/bin/env bash
# Commits changes, pushes to GitHub, purges jsDelivr cache for every CSS/JS file.
set -euo pipefail

msg="${1:-update}"
cd "$(dirname "$0")"

git add -A
if git diff --cached --quiet; then
  echo "nothing to commit"
else
  git commit -m "$msg"
fi
git push -q

echo ""
echo "purging jsDelivr cache (@main + @latest)…"
FILES=$(find . -type f \( -name "*.css" -o -name "*.js" \) -not -path "./.git/*" | sed 's|^\./||')
for f in $FILES; do
  for alias in main latest; do
    curl -s "https://purge.jsdelivr.net/gh/vshslv/vshslv-site@$alias/$f" | \
      python3 -c "
import sys,json;
d=json.load(sys.stdin);
p=d['paths'].popitem();
info=p[1];
ok='THROTTLED' if info.get('throttled') else d['status']
print(' ',p[0],'→',ok)
" 2>/dev/null || echo "  $f → purge call failed"
  done
done

SHA=$(git rev-parse --short HEAD)
echo ""
echo "✓ Live URLs base (use @main):"
echo "  https://cdn.jsdelivr.net/gh/vshslv/vshslv-site@main/<folder>/<file>"
echo ""
echo "✓ Pinned to this commit ($SHA):"
echo "  https://cdn.jsdelivr.net/gh/vshslv/vshslv-site@$SHA/<folder>/<file>"
