#!/bin/bash
# uso: lh.sh <porta> <rotulo>
cd $(dirname "$0")
for pg in index cadastro login; do
  CHROME_PATH=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome timeout 180 lighthouse http://localhost:$1/$pg.html --quiet --chrome-flags="--headless=new --no-sandbox" --only-categories=performance,accessibility,best-practices --output=json --output-path=redesign/$2/lh-$pg.json >/dev/null 2>redesign/$2/lh-$pg.err
  python3 -c "
import json;d=json.load(open('redesign/$2/lh-$pg.json'));c=d['categories'];a=d['audits']
ids=[r['id'] for r in c['accessibility']['auditRefs']]
print('$pg', {k:round(v['score']*100) for k,v in c.items()}, 'LCP', a['largest-contentful-paint']['displayValue'], 'CLS', a['cumulative-layout-shift']['displayValue'], 'TBT', a['total-blocking-time']['displayValue'])
print('   falhas de acessibilidade:', [k for k in ids if a[k].get('score')==0])"
done
