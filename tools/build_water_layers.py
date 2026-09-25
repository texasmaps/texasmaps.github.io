#!/usr/bin/env python3
"""Build the water-context data files for the Texas water maps.

Outputs (written to the repo root, the parent of this script's folder):
  tx_aquifers.js    - major (9) + minor (22) aquifer outlines, generalized, polyline-encoded
  tx_water_grid.js  - four rasters: PRISM 1991-2020 average annual precipitation; the last 12 months of
                      PRISM precipitation as a percent of that normal; TWDB Groundwater Database wells per
                      cell; water-supply wells drilled since 2020 (TWDB Submitted Driller's Reports) per cell

Sources:
  Major/Minor Aquifers: TWDB ArcGIS BaseLayerQueryService, layers 1 and 2 (GeoJSON, WGS84, server-generalized)
  Rainfall normals:     PRISM Climate Group, Oregon State University, 1991-2020 30-year normals, 800 m annual
                        https://data.prism.oregonstate.edu/normals/us/800m/ppt/monthly/
  Recent rainfall:      PRISM monthly grids, 4 km, via https://services.nacse.org/prism/data/get/us/4km/ppt/YYYYMM
                        (ratio uses the 4 km annual normal). PRISM data are free to use with attribution.
  Well locations:       https://www.twdb.texas.gov/mapping/gisdata/doc/well/TWDB_Groundwater.zip (updated nightly)
  Driller's reports:    https://www.twdb.texas.gov/groundwater/data/SDRDownload.zip (full SDR database, updated nightly)
  Texas mask:           county outlines copied from texas_data_center_map.html (COUNTIES blob)

Usage:  python3 tools/build_water_layers.py [--workdir DIR] [--months YYYYMM-YYYYMM]
Pure Python 3 (no third-party packages). Downloads about 300 MB the first time (cached in the system temp dir).
"""
import json, math, os, sys, struct, zipfile, io, re, collections, statistics, urllib.request, datetime, tempfile

BASE='https://services.twdb.texas.gov/arcgis/rest/services/Base/BaseLayerQueryService/MapServer'
WELLS_URL='https://www.twdb.texas.gov/mapping/gisdata/doc/well/TWDB_Groundwater.zip'
SDR_URL='https://www.twdb.texas.gov/groundwater/data/SDRDownload.zip'
PRISM_NORMAL_800='https://data.prism.oregonstate.edu/normals/us/800m/ppt/monthly/prism_ppt_us_30s_2020_avg_30y.zip'
PRISM_NORMAL_4K='https://data.prism.oregonstate.edu/normals/us/4km/ppt/monthly/prism_ppt_us_25m_2020_avg_30y.zip'
PRISM_MONTH='https://services.nacse.org/prism/data/get/us/4km/ppt/%s'
TOL=0.008        # aquifer generalization tolerance, degrees
MIN_AREA=0.0002  # drop aquifer polygons smaller than this (sq. degrees)
LON0,LAT1,LON1,LAT0=-106.65,36.5,-93.5,25.8   # grid extent: west, north, east, south
NEWWELL_SINCE='2020-01-01'
# TWDB driller's-report "proposed use" values counted as water-supply wells, folded into the same buckets as the Groundwater Database
SDR_USE={'Domestic':'Domestic','Irrigation':'Irrigation','Stock':'Livestock','Public Supply':'Public supply','Industrial':'Industrial','Rig Supply':'Industrial','Fracking Supply':'Industrial','Commercial':'Industrial','Other':'Other'}

def fetch(url,path):
    if os.path.exists(path) and os.path.getsize(path)>1000: return
    print('downloading',url); urllib.request.urlretrieve(url,path)

def head_ok(url):
    try:
        r=urllib.request.urlopen(urllib.request.Request(url,method='HEAD'),timeout=60)
        return 'attachment' in (r.headers.get('Content-Disposition') or '') or int(r.headers.get('Content-Length') or 0)>100000
    except Exception: return False

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


# ---------------- GeoTIFF reader (PRISM: tiled float32, LZW) ----------------
import struct, zipfile, io

def lzw_decode(data):
    out=bytearray(); nbits=len(data)*8; bitpos=0; width=9; table=None; prev=None
    while True:
        if bitpos+width>nbits: break
        byte=bitpos>>3; off=bitpos&7
        chunk=int.from_bytes(data[byte:byte+3].ljust(3,b'\0'),'big')
        code=(chunk>>(24-off-width))&((1<<width)-1); bitpos+=width
        if code==257: break
        if code==256:
            table=[bytes((i,)) for i in range(256)]+[b'',b'']; width=9
            if bitpos+width>nbits: break
            byte=bitpos>>3; off=bitpos&7
            chunk=int.from_bytes(data[byte:byte+3].ljust(3,b'\0'),'big')
            code=(chunk>>(24-off-width))&((1<<width)-1); bitpos+=width
            if code==257: break
            entry=table[code]; out+=entry; prev=entry; continue
        if code<len(table): entry=table[code]
        elif code==len(table): entry=prev+prev[:1]
        else: raise ValueError('bad LZW code %d'%code)
        out+=entry; table.append(prev+entry[:1]); prev=entry
        if len(table)+1>=(1<<width) and width<12: width+=1
    return bytes(out)

class GeoTiff:
    def __init__(self, b):
        self.b=b; E='<' if b[:2]==b'II' else '>'; self.E=E
        off=struct.unpack(E+'I',b[4:8])[0]; n=struct.unpack(E+'H',b[off:off+2])[0]; tags={}
        for i in range(n):
            t,ty,cnt,val=struct.unpack(E+'HHII',b[off+2+i*12:off+14+i*12]); tags[t]=(ty,cnt,val,off+10+i*12)
        def vals(t):
            ty,cnt,val,vpos=tags[t]; size={3:2,4:4,12:8,2:1}[ty]; fmt={3:'H',4:'I',12:'d',2:'s'}[ty]
            pos=val if cnt*size>4 else vpos
            if ty==2: return b[pos:pos+cnt]
            return struct.unpack(E+fmt*cnt,b[pos:pos+cnt*size])
        self.w=vals(256)[0]; self.h=vals(257)[0]; assert vals(259)[0]==5, 'expects LZW'
        assert vals(258)[0]==32 and vals(339)[0]==3, 'expects float32'
        self.tw=vals(322)[0]; self.th=vals(323)[0]; self.toff=vals(324); self.tcnt=vals(325)
        sx,sy,_=vals(33550); tp=vals(33922); self.x0=tp[3]; self.y0=tp[4]; self.sx=sx; self.sy=sy
        self.nodata=float(vals(42113).split(b'\0')[0]) if 42113 in tags else -9999.0
        self.tiles_across=(self.w+self.tw-1)//self.tw; self._cache={}
    def tile(self,ti,tj):
        k=tj*self.tiles_across+ti
        if k not in self._cache:
            raw=lzw_decode(self.b[self.toff[k]:self.toff[k]+self.tcnt[k]])
            self._cache[k]=struct.unpack(self.E+'f'*(self.tw*self.th),raw[:self.tw*self.th*4])
        return self._cache[k]
    def value(self,lon,lat):
        c=int((lon-self.x0)/self.sx); r=int((self.y0-lat)/self.sy)
        if c<0 or r<0 or c>=self.w or r>=self.h: return None
        v=self.tile(c//self.tw,r//self.th)[(r%self.th)*self.tw+(c%self.tw)]
        return None if v==self.nodata else v
    def block(self,lon0,lat1,lon1,lat0):
        """all pixel centers within [lon0,lon1]x[lat0,lat1] -> list of (lon,lat,value), nodata skipped"""
        c0=max(0,int((lon0-self.x0)/self.sx)); c1=min(self.w-1,int((lon1-self.x0)/self.sx))
        r0=max(0,int((self.y0-lat1)/self.sy)); r1=min(self.h-1,int((self.y0-lat0)/self.sy)); out=[]
        for r in range(r0,r1+1):
            lat=self.y0-(r+.5)*self.sy; tj=r//self.th; rr=(r%self.th)*self.tw
            for c in range(c0,c1+1):
                v=self.tile(c//self.tw,tj)[rr+(c%self.tw)]
                if v!=self.nodata: out.append((self.x0+(c+.5)*self.sx,lat,v))
        return out

def open_zip_tif(path):
    z=zipfile.ZipFile(path); name=[n for n in z.namelist() if n.lower().endswith('.tif')][0]
    return GeoTiff(z.read(name))


# ---------------- polygon rasterizer (even-odd scanline on cell centers) ----------------
def rasterize(polys, res, west, north, cols, rows):
    """polys: list of (value, rings). Returns a row-major list of lists."""
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

def blob(html,name):
    m=re.search(r'const '+name+r'=/\*'+name+r'\*/(.*?);\n',html,re.S); return json.loads(m.group(1))

def county_polys(root):
    html=open(os.path.join(root,'texas_data_center_map.html'),encoding='utf-8').read(); C=blob(html,'COUNTIES'); out=[]
    for k,f in enumerate(C['features'],1):
        g=f['geometry']; rings=[r for p in g['coordinates'] for r in p] if g['type']=='MultiPolygon' else list(g['coordinates'])
        out.append((k,rings))
    return out

def texas_mask(root,res):
    """County-index raster, then dilated by one cell so pins on the coast or a state line still get values."""
    cols=round((LON1-LON0)/res); rows=round((LAT1-LAT0)/res)
    g=rasterize(county_polys(root),res,LON0,LAT1,cols,rows)
    out=[row[:] for row in g]
    for r in range(rows):
        for c in range(cols):
            if g[r][c]: continue
            for dr in (-1,0,1):
                for dc in (-1,0,1):
                    rr,cc=r+dr,c+dc
                    if 0<=rr<rows and 0<=cc<cols and g[rr][cc]: out[r][c]=g[rr][cc]; break
                if out[r][c]: break
    for _ in range(3):   # fill pinholes: interior zero cells with at least three filled 4-neighbours
        for r in range(1,rows-1):
            for c in range(1,cols-1):
                if out[r][c]: continue
                nb=[x for x in (out[r-1][c],out[r+1][c],out[r][c-1],out[r][c+1]) if x]
                if len(nb)>=3: out[r][c]=nb[0]
    return out,cols,rows

# ---------------- rasters ----------------
def build_precip(root, workdir, mask, res, cols, rows):
    """PRISM 1991-2020 annual normal (800 m) averaged into each cell; whole inches; 0 outside Texas."""
    p=os.path.join(workdir,'prism_normal_800m.zip'); fetch(PRISM_NORMAL_800,p); t=open_zip_tif(p)
    acc=[[0.0]*cols for _ in range(rows)]; cnt=[[0]*cols for _ in range(rows)]
    for lon,lat,v in t.block(LON0,LAT1,LON1,LAT0):
        c=int((lon-LON0)/res); r=int((LAT1-lat)/res)
        if 0<=c<cols and 0<=r<rows: acc[r][c]+=v; cnt[r][c]+=1
    grid=[[0]*cols for _ in range(rows)]; miss=0
    for r in range(rows):
        for c in range(cols):
            if not mask[r][c]: continue
            if cnt[r][c]: grid[r][c]=max(1,round(acc[r][c]/cnt[r][c]/25.4))
            else:
                v=t.value(LON0+(c+.5)*res,LAT1-(r+.5)*res)
                if not v:
                    for d in (1,2):
                        near=[acc[rr][cc]/cnt[rr][cc] for rr in range(max(0,r-d),min(rows-1,r+d)+1) for cc in range(max(0,c-d),min(cols-1,c+d)+1) if cnt[rr][cc]]
                        if near: v=sum(near)/len(near); break
                grid[r][c]=max(1,round(v/25.4)) if v else 0; miss+=1
    print('precip: cells',sum(1 for r in grid for v in r if v),'| no-pixel fallbacks',miss,'| sample Austin',grid[int((LAT1-30.27)/res)][int((-97.74-LON0)/res)],'in')
    return grid

def month_list(arg):
    if arg:
        a,b=arg.split('-'); y,m=int(a[:4]),int(a[4:]); out=[]
        while True:
            out.append('%04d%02d'%(y,m))
            if '%04d%02d'%(y,m)==b: break
            m+=1
            if m>12: m=1; y+=1
        return out
    today=datetime.date.today(); y,m=today.year,today.month
    for _ in range(8):   # find the latest month PRISM serves
        m-=1
        if m==0: m=12; y-=1
        if head_ok(PRISM_MONTH%('%04d%02d'%(y,m))): break
    out=[]
    for _ in range(12):
        out.append('%04d%02d'%(y,m)); m-=1
        if m==0: m=12; y-=1
    return out[::-1]

def build_recent(workdir, months, mask, mres):
    """Sum of the 12 monthly PRISM grids (4 km) divided by the 4 km annual normal, as whole percent, on PRISM's own 4 km grid
    clipped to the Texas extent and masked to Texas counties (mask is the 0.025-degree county mask)."""
    pn=os.path.join(workdir,'prism_normal_4km.zip'); fetch(PRISM_NORMAL_4K,pn); tn=open_zip_tif(pn)
    tot={}
    for ym in months:
        p=os.path.join(workdir,'prism_m_%s_4km.zip'%ym); fetch(PRISM_MONTH%ym,p); t=open_zip_tif(p)
        assert abs(t.x0-tn.x0)<1e-6 and abs(t.sx-tn.sx)<1e-9, 'monthly grid must align with the 4 km normal'
        for lon,lat,v in t.block(LON0-0.1,LAT1+0.1,LON1+0.1,LAT0-0.1):
            k=(int((lon-t.x0)/t.sx),int((t.y0-lat)/t.sy)); tot[k]=tot.get(k,0.0)+v
    c0=int((LON0-tn.x0)/tn.sx); c1=int((LON1-tn.x0)/tn.sx); r0=int((tn.y0-LAT1)/tn.sy); r1=int((tn.y0-LAT0)/tn.sy)
    cols=c1-c0+1; rows=r1-r0+1; west=tn.x0+c0*tn.sx; north=tn.y0-r0*tn.sy
    mrows=len(mask); mcols=len(mask[0])
    grid=[[0]*cols for _ in range(rows)]
    for r in range(rows):
        lat=north-(r+.5)*tn.sy
        for c in range(cols):
            lon=west+(c+.5)*tn.sx
            mc0=int((lon-tn.sx/2-LON0)/mres); mc1=int((lon+tn.sx/2-LON0)/mres); mr0=int((LAT1-lat-tn.sy/2)/mres); mr1=int((LAT1-lat+tn.sy/2)/mres)
            if not any(mask[mr][mc] for mr in range(max(0,mr0),min(mrows-1,mr1)+1) for mc in range(max(0,mc0),min(mcols-1,mc1)+1)): continue
            n=tn.value(lon,lat); tsum=tot.get((c0+c,r0+r))
            if n and tsum is not None: grid[r][c]=max(1,min(400,round(100*tsum/n)))
    for _ in range(2):   # fill pinholes (4 km cells over water bodies etc.) from their neighbours
        for r in range(1,rows-1):
            for c in range(1,cols-1):
                if grid[r][c]: continue
                nb=[x for x in (grid[r-1][c],grid[r+1][c],grid[r][c-1],grid[r][c+1]) if x]
                if len(nb)>=3: grid[r][c]=round(sum(nb)/len(nb))
    vals=[v for row in grid for v in row if v]
    print('recent: months',months[0],'-',months[-1],'| 4 km cells',len(vals),'| median % of normal',statistics.median(vals),'| sample Austin',grid[int((north-30.27)/tn.sy)][int((-97.74-west)/tn.sx)],'%')
    return grid,tn.sx,cols,rows,west,north

def build_wells(workdir, res, cols, rows):
    wz=os.path.join(workdir,'wells.zip'); fetch(WELLS_URL,wz); w=next(iter(load_zip(wz).values()))
    grid=[[0]*cols for _ in range(rows)]; n=0
    for pt in w['shapes']:
        if not pt: continue
        c=int((pt[0]-LON0)/res); r=int((LAT1-pt[1])/res)
        if 0<=c<cols and 0<=r<rows: grid[r][c]+=1; n+=1
    print('wells:',n,'in grid')
    return grid,n

def sdr_rows(workdir):
    """Yield (date, use_bucket, lon, lat, county) for water-supply wells drilled since NEWWELL_SINCE in the TWDB SDR database."""
    p=os.path.join(workdir,'SDRDownload.zip'); fetch(SDR_URL,p); z=zipfile.ZipFile(p)
    f=io.TextIOWrapper(z.open('SDRDownload/WellData.txt'),encoding='latin1'); hdr=f.readline().rstrip('\r\n').split('|'); idx={h:i for i,h in enumerate(hdr)}
    for line in f:
        r=line.rstrip('\r\n').split('|')
        if len(r)<len(hdr): continue
        d=r[idx['DrillingEndDate']] or r[idx['DrillingStartDate']] or r[idx['DateSubmitted']]
        if not d or d<NEWWELL_SINCE or r[idx['TypeOfWork']] not in ('New Well','Replacement'): continue
        use=SDR_USE.get(r[idx['ProposedUse']])
        if not use: continue
        try: lat=float(r[idx['CoordDDLat']]); lon=float(r[idx['CoordDDLong']])
        except ValueError: continue
        yield d,use,lon,lat,r[idx['County']].strip()

def build_newwells(workdir, res, cols, rows):
    grid=[[0]*cols for _ in range(rows)]; n=0; uses=collections.Counter(); through=''
    for d,use,lon,lat,_ in sdr_rows(workdir):
        c=int((lon-LON0)/res); r=int((LAT1-lat)/res)
        if 0<=c<cols and 0<=r<rows: grid[r][c]+=1; n+=1; uses[use]+=1; through=max(through,d[:10])
    print('new wells since',NEWWELL_SINCE,':',n,'| through',through,'| by use',uses.most_common())
    return grid,n,dict(uses),through

def grid_obj(grid,res,cols,rows,**extra):
    o={'res':res,'cols':cols,'rows':rows,'west':LON0,'north':LAT1}; o.update(extra); o['d']=rle([v for row in grid for v in row]); return o

def build_grids(root, workdir, today, months_arg=None):
    pres=0.025; mask,cols,rows=texas_mask(root,pres)
    precip=build_precip(root,workdir,mask,pres,cols,rows)
    months=month_list(months_arg); recent,rres,rcols,rrows,rwest,rnorth=build_recent(workdir,months,mask,pres)
    wres=0.05; wcols=round((LON1-LON0)/wres); wrows=round((LAT1-LAT0)/wres)
    wells,n_wells=build_wells(workdir,wres,wcols,wrows)
    newwells,n_new,uses,through=build_newwells(workdir,wres,wcols,wrows)
    mname=lambda ym: datetime.date(int(ym[:4]),int(ym[4:]),1).strftime('%b %Y')
    label_recent='%s – %s'%(mname(months[0]),mname(months[-1]))
    js=('// Water context rasters for the Texas water maps, built by tools/build_water_layers.py on %s.\n'
        '// precip: PRISM Climate Group (Oregon State University) 1991-2020 average annual precipitation, 800 m grid averaged into %g-degree cells; whole inches/yr; 0 = outside Texas.\n'
        '// recent: PRISM monthly precipitation %s-%s (4 km) summed and divided by the PRISM 4 km 1991-2020 annual normal; whole percent on PRISM\'s own 4 km grid; 0 = outside Texas.\n'
        '// wells: TWDB Groundwater Database well locations (%d wells, updated nightly by TWDB) counted per %g-degree cell.\n'
        '// newwells: water-supply wells drilled since %s in the TWDB Submitted Driller\'s Reports database (%d wells; new + replacement wells; excludes monitoring wells, soil borings, test/injection/geothermal holes) counted per %g-degree cell.\n'
        '// Each grid: {res, cols, rows, west, north, d} where d is run-length encoded (value, runLength) pairs as unsigned varints (5-bit chunks, alphabet A-Za-z0-9+/, continuation bit 32), row-major from the north-west corner.\n'
        '// PRISM data: https://prism.oregonstate.edu (free with attribution).\n')%(today,pres,months[0],months[-1],n_wells,wres,NEWWELL_SINCE,n_new,wres)
    obj={'precip':grid_obj(precip,pres,cols,rows,label='PRISM 1991–2020',source='PRISM Climate Group, Oregon State University'),
         'recent':{'res':rres,'cols':rcols,'rows':rrows,'west':rwest,'north':rnorth,'label':label_recent,'months':months,'normal':'1991–2020','d':rle([v for row in recent for v in row])},
         'wells':grid_obj(wells,wres,wcols,wrows,total=n_wells,label='TWDB Groundwater Database',asof=today),
         'newwells':grid_obj(newwells,wres,wcols,wrows,total=n_new,since=NEWWELL_SINCE,through=through,uses=uses,label='water-supply wells drilled since 2020 (TWDB driller\'s reports)')}
    return js+'window.TX_WATER='+json.dumps(obj,separators=(',',':'),ensure_ascii=False)+';\n'

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
    workdir=sys.argv[sys.argv.index('--workdir')+1] if '--workdir' in sys.argv else os.path.join(tempfile.gettempdir(),'texasmaps_water_build')
    months_arg=sys.argv[sys.argv.index('--months')+1] if '--months' in sys.argv else None
    os.makedirs(workdir,exist_ok=True)
    today=datetime.date.today().isoformat()
    open(os.path.join(root,'tx_aquifers.js'),'w').write(build_aquifers(workdir,today))
    open(os.path.join(root,'tx_water_grid.js'),'w').write(build_grids(root,workdir,today,months_arg))
    print('wrote tx_aquifers.js and tx_water_grid.js in',root)
