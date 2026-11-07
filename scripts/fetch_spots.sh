#!/usr/bin/env bash
# Downloads all disabled parking places in Poland from Overpass as TSV.
# Usage: scripts/fetch_spots.sh <output.tsv>
set -uo pipefail
OUT="${1:?output file}"
QUERY_FILE="$(dirname "$0")/poland.overpassql"
ENDPOINTS=(
  https://overpass-api.de/api/interpreter
  https://overpass.private.coffee/api/interpreter
  https://maps.mail.ru/osm/tools/overpass/api/interpreter
)
for ep in "${ENDPOINTS[@]}"; do
  for attempt in 1 2; do
    echo "== $ep (attempt $attempt)"
    code=$(curl -sS -m 400 -A "Koperty-data/1.0 (+https://github.com/UladzimirUS/my-app)" \
      -o "$OUT" -D headers.txt -w '%{http_code}' --data-urlencode "data@$QUERY_FILE" "$ep") || code=000
    rows=$(($(wc -l < "$OUT" 2>/dev/null || echo 1) - 1))
    echo "HTTP $code, rows $rows, bytes $(stat -c %s "$OUT" 2>/dev/null)"
    grep -i '^content-type' headers.txt || true
    head -c 600 "$OUT"; echo
    if [ "$code" = 200 ] && [ "$rows" -ge 500 ] && head -1 "$OUT" | grep -q '@id'; then
      echo "OK"; exit 0
    fi
    sleep 30
  done
done
echo "All endpoints failed" >&2
exit 1
