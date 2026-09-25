#!/usr/bin/env python3
"""Build the water-context data files for texas_data_center_map.html from Texas Water Development Board (TWDB) GIS data.

Outputs (written next to this script's parent directory, i.e. the repo root):
  tx_aquifers.js    - major (9) + minor (22) aquifer outlines, generalized, polyline-encoded
  tx_water_grid.js  - NRCS 1981-2010 average annual precipitation raster + TWDB Groundwater Database well-count raster

Sources (https://www.twdb.texas.gov/mapping/gisdata.asp):
  Major/Minor Aquifers: TWDB ArcGIS BaseLayerQueryService, layers 1 and 2 (GeoJSON, WGS84, server-generalized)
  Texas Precipitation:  https://www.twdb.texas.gov/mapping/gisdata/doc/Precipitation_Shapefile.zip
  Well locations:       https://www.twdb.texas.gov/mapping/gisdata/doc/well/TWDB_Groundwater.zip (updated nightly)

Usage:  python3 tools/build_water_layers.py [--workdir DIR]
Pure Python 3 (no third-party packages). Downloads ~13 MB and runs for a minute or two.
"""
import json, math, os, sys, struct, zipfile, collections, statistics, urllib.request, datetime

BASE='https://services.twdb.texas.gov/arcgis/rest/services/Base/BaseLayerQueryService/MapServer'
PRECIP_URL='https://www.twdb.texas.gov/mapping/gisdata/doc/Precipitation_Shapefile.zip'
WELLS_URL='https://www.twdb.texas.gov/mapping/gisdata/doc/well/TWDB_Groundwater.zip'
TOL=0.008        # aquifer generalization tolerance, degrees
MIN_AREA=0.0002  # drop aquifer polygons smaller than this (sq. degrees)

def fetch(url,path):
    if os.path.exists(path): return
    print('downloading',url); urllib.request.urlretrieve(url,path)

# ---------------- shapefile reader ----------------
import struct, zipfile, sys, json, collections, os

def read_dbf(b):
    n=struct.unpack('<I',b[4:8])[0]; hl=struct.unpack('<H',b[8:10])[0]; rl=struct.unpack('<H',b[10:12])[0]
    fields=[]; p=32
    while b[p]!=0x0D:
        name=b[p:p+11].split(b'\x00')[0].decode('latin1'); typ=chr(b[p+11]); ln=b[p+16]; dec=b[p+17]
        fields.append((name,typ,ln,dec)); p+=32
    recs=[]; p=hl
    for i in range(n):
        r=b[p:p+rl]; p+=rl
        if r[0:1]==b'*': recs.append(None); continue
        q=1; d={}
        for name,typ,ln,dec in fields:
            raw=r[q:q+ln]; q+=ln
            s=raw.decode('latin1',errors='replace').strip()
            if typ in 'NF':
                try: v=float(s) if (dec or '.' in s) else int(s)
                except: v=None
            else: v=s
            d[name]=v
        recs.append(d)
    return fields,recs

def read_shp(b):
    shape_type=struct.unpack('<i',b[32:36])[0]
    bbox=struct.unpack('<dddd',b[36:68])
    p=100; out=[]; L=len(b)
    while p<L:
        recno,clen=struct.unpack('>ii',b[p:p+8]); p+=8
        end=p+clen*2
        st=struct.unpack('<i',b[p:p+4])[0]
        if st==0: out.append(None)
        elif st in (1,11,21):
            x,y=struct.unpack('<dd',b[p+4:p+20]); out.append((x,y))
        elif st in (5,15,25,3,13,23):
            nparts,npts=struct.unpack('<ii',b[p+36:p+44])
            parts=struct.unpack('<%di'%nparts,b[p+44:p+44+4*nparts])
            q=p+44+4*nparts
            pts=struct.unpack('<%dd'%(2*npts),b[q:q+16*npts])
            rings=[]
            for i in range(nparts):
                a=parts[i]; z=parts[i+1] if i+1<nparts else npts
                rings.append([(pts[2*j],pts[2*j+1]) for j in range(a,z)])
            out.append(rings)
        else: out.append(None)
        p=end
    return shape_type,bbox,out

def load_zip(path):
    z=zipfile.ZipFile(path)
    names=z.namelist()
    shp=[n for n in names if n.lower().endswith('.shp')]
    res={}
    for s in shp:
        base=s[:-4]
        prj=next((n for n in names if n.lower()==(base+'.prj').lower()),None)
        dbf=next((n for n in names if n.lower()==(base+'.dbf').lower()),None)
        st,bbox,shapes=read_shp(z.read(s))
        fields,recs=read_dbf(z.read(dbf)) if dbf else ([],[])
        res[base]={'type':st,'bbox':bbox,'shapes':shapes,'fields':fields,'recs':recs,'prj':z.read(prj).decode('latin1') if prj else None}
    return res


# ---------------- aquifer simplification + encoding ----------------

def dp(pts, tol):
    """Douglas-Peucker on a list of [x,y]; returns simplified list (keeps endpoints)."""
    if len(pts) < 3: return pts
    keep=[False]*len(pts); keep[0]=keep[-1]=True
    stack=[(0,len(pts)-1)]
    while stack:
        a,b=stack.pop()
        if b<=a+1: continue
        ax,ay=pts[a]; bx,by=pts[b]
        dx,dy=bx-ax,by-ay; L=math.hypot(dx,dy)
        best=-1; bi=-1
        for i in range(a+1,b):
            px,py=pts[i]
            d = abs(dy*px-dx*py+bx*ay-by*ax)/L if L else math.hypot(px-ax,py-ay)
            if d>best: best=d; bi=i
        if best>tol:
            keep[bi]=True; stack.append((a,bi)); stack.append((bi,b))
    return [p for p,k in zip(pts,keep) if k]

def area(ring):
    s=0
    for i in range(len(ring)-1):
        s+=ring[i][0]*ring[i+1][1]-ring[i+1][0]*ring[i][1]
    return s/2

def simplify_ring(ring, tol, nd):
    # DP (closed ring: ensure closure), round, dedupe consecutive
    r=dp(ring, tol)
    r=[[round(x,nd),round(y,nd)] for x,y in r]
    out=[]
    for p in r:
        if not out or out[-1]!=p: out.append(p)
    if out and out[0]!=out[-1]: out.append(out[0])
    return out

def process(path, tol, nd, min_area):
    d=json.load(open(path))
    groups=collections.OrderedDict()
    raw_v=0; out_v=0
    for f in d['features']:
        g=f['geometry']; name=f['properties']['AquiferName'].strip()
        num=f['properties']['AquiferNumName']
        polys = g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
        for poly in polys:
            raw_v+=sum(len(r) for r in poly)
            outer=simplify_ring(poly[0], tol, nd)
            if len(outer)<4 or abs(area(outer))<min_area: continue
            rings=[outer]
            for hole in poly[1:]:
                h=simplify_ring(hole, tol, nd)
                if len(h)>=4 and abs(area(h))>=min_area: rings.append(h)
            out_v+=sum(len(r) for r in rings)
            groups.setdefault(name,{'n':name,'k':num,'p':[]})['p'].append(rings)
    return list(groups.values()), raw_v, out_v

ALPHA='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
def enc_uint(v,out):
    while v>=32: out.append(ALPHA[(v&31)|32]); v>>=5
    out.append(ALPHA[v])
def enc_ring(ring):
    out=[]; px=py=0
    for x,y in ring:
        dx=x-px; dy=y-py; px=x; py=y
        enc_uint((dx<<1)^(dx>>63),out)  # zigzag (python: dx>>63 gives -1 for negatives => ~ok since (dx<<1)^-1)
        enc_uint((dy<<1)^(dy>>63),out)
    return ''.join(out)
def dec_ring(s):
    pts=[]; i=0; x=y=0; vals=[]
    while i<len(s):
        v=0; sh=0
        while True:
            c=ALPHA.index(s[i]); i+=1; v|=(c&31)<<sh; sh+=5
            if c<32: break
        vals.append((v>>1)^-(v&1))
    for k in range(0,len(vals),2):
        x+=vals[k]; y+=vals[k+1]; pts.append((x,y))
    return pts
def ring_q(ring,tol,Q):
    r=dp(ring,tol)
    q=[(round(x*Q),round(y*Q)) for x,y in r]
    out=[]
    for p in q:
        if not out or out[-1]!=p: out.append(p)
    if len(out)>=2 and out[0]==out[-1]: out.pop()   # SVG Z closes it
    return out
def process(path,tol,Q,min_area):
    d=json.load(open(path)); groups=collections.OrderedDict()
    for f in d['features']:
        g=f['geometry']; name=f['properties']['AquiferName'].strip(); num=f['properties']['AquiferNumName']
        polys=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
        a=groups.setdefault(name,{'n':name,'k':num,'rings':[],'best':None,'bestA':0})
        for poly in polys:
            outer=ring_q(poly[0],tol,Q)
            if len(outer)<3: continue
            A=abs(area(outer+[outer[0]]))
            if A<min_area*Q*Q: continue
            a['rings'].append(outer)
            if A>a['bestA']:
                a['bestA']=A
                # centroid of largest outer ring (polygon centroid formula)
                pts=outer+[outer[0]]; cx=cy=0; s=0
                for i in range(len(pts)-1):
                    cr=pts[i][0]*pts[i+1][1]-pts[i+1][0]*pts[i][1]; s+=cr; cx+=(pts[i][0]+pts[i+1][0])*cr; cy+=(pts[i][1]+pts[i+1][1])*cr
                a['best']=[round(cx/(3*s)/Q,3),round(cy/(3*s)/Q,3)]
            for hole in poly[1:]:
                h=ring_q(hole,tol,Q)
                if len(h)>=3 and abs(area(h+[h[0]]))>=min_area*Q*Q: a['rings'].append(h)
    return groups

def rle(vals):
    """run-length encode a sequence of small non-negative ints as (value, run) varint pairs"""
    out=[]; prev=None; run=0
    for v in vals:
        if v==prev: run+=1
        else:
            if prev is not None: enc_uint(prev,out); enc_uint(run,out)
            prev=v; run=1
    enc_uint(prev,out); enc_uint(run,out)
    return ''.join(out)

# ---------------- rasters ----------------
def build_grids(precip_zip, wells_zip, today):
    LON0,LAT1,LON1,LAT0=-106.65,36.5,-93.5,25.8   # west, north, east, south
    # ---------- precipitation raster (0.025 deg) ----------
    res=0.025; cols=round((LON1-LON0)/res); rows=round((LAT1-LAT0)/res)
    grid=[bytearray(cols) for _ in range(rows)]
    pz=load_zip(precip_zip); d=next(iter(pz.values()))
    vals=sorted(set(r['PrecipInch'] for r in d['recs']))
    print('precip distinct inches:',vals)
    edges_n=0
    for shape,rec in zip(d['shapes'],d['recs']):
        if not shape: continue
        v=int(rec['PrecipInch'])
        cross=collections.defaultdict(list)
        for ring in shape:
            n=len(ring)
            for i in range(n):
                x0,y0=ring[i]; x1,y1=ring[(i+1)%n]
                if y0==y1: continue
                edges_n+=1
                ya,yb=(y0,y1) if y0<y1 else (y1,y0)
                # rows whose center lat yc in [ya,yb)
                r_start=math.ceil((LAT1-yb)/res-0.5); r_end=math.floor((LAT1-ya)/res-0.5)
                for r in range(max(0,r_start),min(rows-1,r_end)+1):
                    yc=LAT1-(r+0.5)*res
                    if yc<ya or yc>=yb: continue
                    cross[r].append(x0+(yc-y0)*(x1-x0)/(y1-y0))
        for r,xs in cross.items():
            xs.sort()
            for k in range(0,len(xs)-1,2):
                xa,xb=xs[k],xs[k+1]
                c0=math.ceil((xa-LON0)/res-0.5); c1=math.floor((xb-LON0)/res-0.5)
                if c1<c0: continue
                c0=max(0,c0); c1=min(cols-1,c1)
                for c in range(c0,c1+1): grid[r][c]=v
    print('precip edges',edges_n,'| filled cells',sum(1 for r in grid for v in r if v),'of',rows*cols)
    flat=[v for r in grid for v in r]
    precip={'res':res,'cols':cols,'rows':rows,'west':LON0,'north':LAT1,'d':rle(flat)}
    hist=collections.Counter(flat); print('precip cell hist (inches:cells) sample:',sorted((k,c) for k,c in hist.items() if k)[:8],'... max',max(hist))
    # ---------- wells raster (0.05 deg) ----------
    wres=0.05; wcols=round((LON1-LON0)/wres); wrows=round((LAT1-LAT0)/wres)
    wg=[[0]*wcols for _ in range(wrows)]
    wz=load_zip(wells_zip); w=next(iter(wz.values()))
    n_in=0; n_out=0
    for pt,rec in zip(w['shapes'],w['recs']):
        if not pt: continue
        x,y=pt
        c=int((x-LON0)/wres); r=int((LAT1-y)/wres)
        if 0<=c<wcols and 0<=r<wrows: wg[r][c]+=1; n_in+=1
        else: n_out+=1
    wflat=[v for r in wg for v in r]
    nz=[v for v in wflat if v]
    print('wells in grid',n_in,'| outside bbox',n_out,'| nonzero cells',len(nz),'| max',max(nz))
    qs=statistics.quantiles(nz,n=20)
    print('nonzero-cell quantiles (5%..95%):',[round(q,1) for q in qs])
    for b in (1,3,5,10,20,40,80): print('  cells >=',b,':',sum(1 for v in nz if v>=b))
    wells={'res':wres,'cols':wcols,'rows':wrows,'west':LON0,'north':LAT1,'total':n_in,'d':rle(wflat)}
    js=('// Water context rasters for the Texas data center map. Source: Texas Water Development Board GIS data (https://www.twdb.texas.gov/mapping/gisdata.asp), fetched %s.\n'
        '// precip: NRCS average annual precipitation 1981-2010 (TX_Precip_1981_2010_NRCS shapefile, 1-inch bands) rasterized to %g-degree cells; value = whole inches per year, 0 = outside Texas.\n'
        '// wells: TWDB Groundwater Database well locations (TWDB_Groundwater shapefile, updated nightly; %d wells) counted per %g-degree cell.\n'
        '// Each grid: {res, cols, rows, west, north, d} where d is run-length encoded (value, runLength) pairs as unsigned varints (5-bit chunks, alphabet A-Za-z0-9+/, continuation bit 32), row-major from the north-west corner.\n')%(today,res,n_in,wres)
    js+='window.TX_WATER={precip:'+json.dumps(precip,separators=(',',':'))+',wells:'+json.dumps(wells,separators=(',',':'))+'};\n'
    return js
    print('bytes',len(js.encode()),'| precip string',len(precip['d']),'| wells string',len(wells['d']))

def build_aquifers(workdir, today):
    res={}
    for key,layer in (('major',1),('minor',2)):
        path=os.path.join(workdir,key+'_raw.geojson')
        fetch(f"{BASE}/{layer}/query?where=1%3D1&outFields=*&outSR=4326&f=geojson&maxAllowableOffset=0.004&geometryPrecision=4", path)
        groups=process(path,TOL,1000,MIN_AREA)
        arr=[]
        for a in sorted(groups.values(),key=lambda a:int(''.join(ch for ch in a['k'] if ch.isdigit()) or 0)):
            rings=[enc_ring(r) for r in a['rings']]
            for r,e in zip(a['rings'],rings): assert dec_ring(e)==r, a['n']
            arr.append({'n':a['n'],'c':a['best'],'r':rings})
        res[key]=arr
        print(key,len(arr),'aquifers | rings',sum(len(a['r']) for a in arr))
    js=('// Texas major & minor aquifer outlines. Source: Texas Water Development Board (TWDB) BaseLayerQueryService, Major Aquifers (layer 1) & Minor Aquifers (layer 2), fetched %s; generalized to ~%g deg (~%d m) for a statewide map.\n'
        '// Format: {n:name, c:[lon,lat] label point, r:[ring,...]}; each ring is a polyline-style string: zigzag varint pairs (5-bit chunks, alphabet A-Za-z0-9+/, continuation bit 32) of delta lon,lat in 1/1000 degree. Rings are drawn together with fill-rule evenodd (holes included).\n')%(today,TOL,int(TOL*111000))
    return js+'window.TX_AQUIFERS='+json.dumps(res,separators=(',',':'),ensure_ascii=False)+';\n'

if __name__=='__main__':
    root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    workdir=sys.argv[sys.argv.index('--workdir')+1] if '--workdir' in sys.argv else os.path.join(root,'_water_build')
    os.makedirs(workdir,exist_ok=True)
    today=datetime.date.today().isoformat()
    open(os.path.join(root,'tx_aquifers.js'),'w').write(build_aquifers(workdir,today))
    pz=os.path.join(workdir,'precip.zip'); wz=os.path.join(workdir,'wells.zip')
    fetch(PRECIP_URL,pz); fetch(WELLS_URL,wz)
    open(os.path.join(root,'tx_water_grid.js'),'w').write(build_grids(pz,wz,today))
    print('wrote tx_aquifers.js and tx_water_grid.js in',root)
