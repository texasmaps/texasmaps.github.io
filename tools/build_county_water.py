#!/usr/bin/env python3
"""Build the shared data files used by the standalone water maps (texas_aquifers_map.html,
texas_rainfall_map.html, texas_wells_map.html):

  tx_counties.js      - county outlines, copied from the COUNTIES blob in texas_data_center_map.html
  tx_dc_sites.js      - data center pins (a slim copy of the SITES blob in texas_data_center_map.html)
  tx_county_water.js  - per-county mean annual rainfall (from tx_water_grid.js) and TWDB well counts by primary use

Run after tools/build_water_layers.py, or whenever texas_data_center_map.html's site list changes:
  python3 tools/build_county_water.py [--workdir DIR]
Pure Python 3. Downloads the TWDB well shapefile (~7 MB) if it is not already in the work directory.
"""
import json, os, re, sys, math, collections, datetime, tempfile
sys.dont_write_bytecode=True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_water_layers import load_zip, fetch, WELLS_URL, ALPHA

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HOTWORDS=re.compile(r'(oppos|lawsuit|sue|sued|suit|moratorium|petition|protest|recall|rescind|denied|reject|withdr|contested|water|aquifer|air permit|emission|noise|abatement|tax break|town hall|ban\b|blocked|resident)',re.I)

def blob(html,name):
    m=re.search(r'const '+name+r'=/\*'+name+r'\*/(.*?);\n',html,re.S)
    return json.loads(m.group(1))

def varints(s):
    out=[];v=0;sh=0
    for ch in s:
        c=ALPHA.index(ch);v|=(c&31)<<sh;sh+=5
        if c<32: out.append(v);v=0;sh=0
    return out

def rasterize(polys, res, west, north, cols, rows):
    """polys: list of (value, rings). Even-odd scanline fill of cell centers; returns row-major list."""
    grid=[[0]*cols for _ in range(rows)]
    for value,rings in polys:
        cross=collections.defaultdict(list)
        for ring in rings:
            n=len(ring)
            for i in range(n):
                x0,y0=ring[i]; x1,y1=ring[(i+1)%n]
                if y0==y1: continue
                ya,yb=(y0,y1) if y0<y1 else (y1,y0)
                r0=math.ceil((north-yb)/res-0.5); r1=math.floor((north-ya)/res-0.5)
                for r in range(max(0,r0),min(rows-1,r1)+1):
                    yc=north-(r+0.5)*res
                    if yc<ya or yc>=yb: continue
                    cross[r].append(x0+(yc-y0)*(x1-x0)/(y1-y0))
        for r,xs in cross.items():
            xs.sort()
            for k in range(0,len(xs)-1,2):
                c0=max(0,math.ceil((xs[k]-west)/res-0.5)); c1=min(cols-1,math.floor((xs[k+1]-west)/res-0.5))
                for c in range(c0,c1+1): grid[r][c]=value
    return grid

def norm(name): return re.sub(r'[^a-z]','',name.lower())

def main():
    workdir=sys.argv[sys.argv.index('--workdir')+1] if '--workdir' in sys.argv else os.path.join(tempfile.gettempdir(),'texasmaps_water_build')
    os.makedirs(workdir,exist_ok=True)
    today=datetime.date.today().isoformat()
    html=open(os.path.join(ROOT,'texas_data_center_map.html'),encoding='utf-8').read()
    COUNTIES=blob(html,'COUNTIES'); SITES=blob(html,'SITES'); NEWS=blob(html,'NEWS')
    # ---- tx_counties.js
    open(os.path.join(ROOT,'tx_counties.js'),'w').write('// Texas county outlines (generalized), copied from the COUNTIES blob in texas_data_center_map.html by tools/build_county_water.py on %s. FIPS id + name.\nwindow.TX_COUNTIES='%today+json.dumps(COUNTIES,separators=(',',':'))+';\n')
    # ---- tx_dc_sites.js (slim pins)
    by_site=NEWS.get('by_site',{}); slim=[]
    for s in SITES:
        news=by_site.get(s['id'],[])
        hot=bool(s.get('controversy') and len(s['controversy'])>20 and HOTWORDS.search(s['controversy'])) or any(a.get('hot') for a in news)
        slim.append({k:s.get(k) for k in ('id','name','operator','city','county','fips','status','mw','acres','lat','lon','kind','precision')}|{'hot':hot,'news':len(news)})
    open(os.path.join(ROOT,'tx_dc_sites.js'),'w').write('// Data center sites (slim copy of the SITES blob in texas_data_center_map.html, news generated %s), built by tools/build_county_water.py on %s. Full details live in the Data Center Watch map: texas_data_center_map.html#site=<id>.\nwindow.TX_DC_SITES='%(NEWS.get('generated',''),today)+json.dumps(slim,separators=(',',':'),ensure_ascii=False)+';\n')
    # ---- county mean rainfall from the precip raster
    grid_js=open(os.path.join(ROOT,'tx_water_grid.js')).read()
    pm=re.search(r'precip:(\{.*?\}),wells:',grid_js,re.S); g=json.loads(pm.group(1))
    v=varints(g['d']); rain=[]
    for i in range(0,len(v),2): rain.extend([v[i]]*v[i+1])
    polys=[]; fips_index={}
    for k,f in enumerate(COUNTIES['features'],1):
        fips_index[k]=f['id']
        rings=[ring for poly in f['geometry']['coordinates'] for ring in poly] if f['geometry']['type']=='MultiPolygon' else list(f['geometry']['coordinates'])
        polys.append((k,rings))
    cg=rasterize(polys,g['res'],g['west'],g['north'],g['cols'],g['rows'])
    acc=collections.defaultdict(lambda:[0,0])
    for r in range(g['rows']):
        row=cg[r]
        for c in range(g['cols']):
            k=row[c]
            if k:
                val=rain[r*g['cols']+c]
                if val: acc[fips_index[k]][0]+=val; acc[fips_index[k]][1]+=1
    # ---- wells by county and primary use
    wz=os.path.join(workdir,'wells.zip'); fetch(WELLS_URL,wz)
    w=next(iter(load_zip(wz).values()))
    name2fips={norm(f['properties']['name']):f['id'] for f in COUNTIES['features']}
    USE_MAP={'irrigation':'Irrigation','domestic':'Domestic','stock':'Livestock','public supply':'Public supply','institution':'Public supply',
             'industrial':'Industrial','industrial (cooling)':'Industrial','commercial':'Industrial','power':'Industrial','rig supply':'Industrial','fracking supply':'Industrial','de-watering':'Industrial','air conditioning':'Industrial','bottling':'Industrial','mining':'Industrial','desalination':'Industrial',
             'unused':'Unused','plugged or destroyed':'Unused','reserve':'Unused','':'Unknown','unknown':'Unknown'}
    cw=collections.defaultdict(lambda:{'w':0,'u':collections.Counter()}); state_use=collections.Counter(); unmatched=collections.Counter(); raw_use=collections.Counter()
    for rec in w['recs']:
        if not rec: continue
        f=name2fips.get(norm(rec['CountyName'] or ''))
        use=(rec['PrimaryWat'] or '').strip().lower(); raw_use[use]+=1
        cat=USE_MAP.get(use,'Other' if use else 'Unknown')
        state_use[cat]+=1
        if not f: unmatched[rec['CountyName']]+=1; continue
        cw[f]['w']+=1; cw[f]['u'][cat]+=1
    out={}
    for f in COUNTIES['features']:
        fid=f['id']; a=acc.get(fid); c=cw.get(fid)
        out[fid]={'n':f['properties']['name'],'r':round(a[0]/a[1],1) if a and a[1] else None,'w':c['w'] if c else 0,'u':dict(c['u']) if c else {}}
    total=sum(1 for r in w['recs'] if r)
    js=('// Per-county water context for the Texas water maps, built by tools/build_county_water.py on %s.\n'
        '// r = mean of the NRCS 1981-2010 average annual precipitation raster (inches/yr) over the county; w = TWDB Groundwater Database wells in the county (%d statewide); u = wells by primary water use (TWDB categories folded: Irrigation, Domestic, Livestock, Public supply, Industrial, Unused, Other).\n')%(today,total)
    js+='window.TX_COUNTY_WATER={generated:%s,total:%d,use:%s,counties:%s};\n'%(json.dumps(today),total,json.dumps(dict(state_use)),json.dumps(out,separators=(',',':')))
    open(os.path.join(ROOT,'tx_county_water.js'),'w').write(js)
    print('counties',len(out),'| sites',len(slim),'| wells matched to counties',sum(c['w'] for c in cw.values()),'of',total,'| unmatched county names:',dict(unmatched))
    print('statewide use:',state_use.most_common())
    print('raw TWDB primary-use values (top 25):',raw_use.most_common(25))
    print('sample:',{k:out[k] for k in list(out)[:2]})
    print('sizes:',{f:os.path.getsize(os.path.join(ROOT,f)) for f in ('tx_counties.js','tx_dc_sites.js','tx_county_water.js')})

if __name__=='__main__': main()
