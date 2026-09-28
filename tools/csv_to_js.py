#!/usr/bin/env python3
"""Turn a CSV of county data into a tx_*.js data file for tx_county_map.js.

    python3 tools/csv_to_js.py data.csv --var TX_PRISONS --out tx_prisons.js
        [--county-col county] [--fips-col fips] [--counties tx_counties.js] [--keep beds,facilities]

Writes   window.TX_PRISONS={"48029":{"beds":1200,"facilities":3,...},...};
one object per county keyed by 5-digit FIPS. The county is found from a FIPS column
(fips / geoid / county_fips, 5 or 3 digits) or a name column (county / county_name / name;
"Bexar", "Bexar County", "DeWitt" and "De Witt" all match). Numbers become numbers
($ , % stripped), blanks become null, text stays text. Rows whose county cannot be matched
are listed on stderr and skipped. If a county appears more than once, numeric columns are summed.
Pure Python 3, no packages.
"""
import argparse, csv, json, re, sys, datetime, os

def load_counties(path):
    s = open(path, encoding='utf-8').read()
    body = s[s.index('{', s.index('window.TX_COUNTIES')):].strip().rstrip(';')
    d = json.loads(body)
    by_name = {}
    for f in d['features']:
        by_name[norm(f['properties']['name'])] = f['id']
    return by_name

def norm(s):
    s = str(s).strip().lower()
    s = re.sub(r'\s+county$', '', s)
    return re.sub(r'[^a-z]', '', s)

def coerce(v):
    if v is None: return None
    t = str(v).strip()
    if t == '' or t.lower() in ('na', 'n/a', 'null', 'none', '.'): return None
    n = t.replace(',', '').replace('$', '').replace('%', '')
    if re.fullmatch(r'-?\d+', n): return int(n)
    if re.fullmatch(r'-?\d*\.\d+(e-?\d+)?', n) or re.fullmatch(r'-?\d+\.?\d*e-?\d+', n): return float(n)
    return t

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('csv'); ap.add_argument('--var', required=True, help='JS global, e.g. TX_PRISONS')
    ap.add_argument('--out', required=True, help='output .js file'); ap.add_argument('--county-col'); ap.add_argument('--fips-col')
    ap.add_argument('--counties', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tx_counties.js'))
    ap.add_argument('--keep', help='comma-separated columns to keep (default: all except the county/fips column)')
    a = ap.parse_args()
    by_name = load_counties(a.counties)
    rows = list(csv.DictReader(open(a.csv, encoding='utf-8-sig')))
    if not rows: sys.exit('empty CSV')
    cols = list(rows[0].keys())
    low = {c.lower().strip(): c for c in cols}
    fcol = a.fips_col or next((low[k] for k in ('fips', 'geoid', 'county_fips', 'fips_code', 'cnty_fips') if k in low), None)
    ccol = a.county_col or next((low[k] for k in ('county', 'county_name', 'countyname', 'name', 'cnty') if k in low), None)
    if not fcol and not ccol: sys.exit('no FIPS or county column found; pass --fips-col or --county-col. Columns: ' + ', '.join(cols))
    keep = [c.strip() for c in a.keep.split(',')] if a.keep else [c for c in cols if c not in (fcol, ccol)]
    out, bad, dup = {}, [], 0
    for r in rows:
        fips = None
        if fcol and r.get(fcol):
            t = re.sub(r'\D', '', str(r[fcol]))
            if len(t) == 3: t = '48' + t
            if len(t) == 5 and t.startswith('48'): fips = t
        if not fips and ccol and r.get(ccol):
            fips = by_name.get(norm(r[ccol]))
        if not fips:
            bad.append(r.get(ccol) or r.get(fcol) or '?'); continue
        rec = {c: coerce(r.get(c)) for c in keep}
        if fips in out:
            dup += 1
            for c in keep:
                if isinstance(rec[c], (int, float)) and isinstance(out[fips].get(c), (int, float)): out[fips][c] += rec[c]
                elif out[fips].get(c) is None: out[fips][c] = rec[c]
        else:
            out[fips] = rec
    hdr = ('// %s: county data for tx_county_map.js, built by tools/csv_to_js.py on %s from %s (%d rows, %d counties matched%s%s). Keyed by 5-digit FIPS.\n'
           % (a.var, datetime.date.today().isoformat(), os.path.basename(a.csv), len(rows), len(out),
              ', %d duplicate county rows summed' % dup if dup else '', ', %d rows unmatched' % len(bad) if bad else ''))
    with open(a.out, 'w', encoding='utf-8') as f:
        f.write(hdr); f.write('window.%s=' % a.var); f.write(json.dumps(out, separators=(',', ':'), ensure_ascii=False)); f.write(';\n')
    print('wrote %s: %d counties, columns %s' % (a.out, len(out), keep))
    if bad: print('UNMATCHED (%d): %s' % (len(bad), ', '.join(sorted(set(map(str, bad))))), file=sys.stderr)

if __name__ == '__main__':
    main()
