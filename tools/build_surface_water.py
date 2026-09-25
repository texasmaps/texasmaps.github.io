#!/usr/bin/env python3
"""Build tx_surface_water.js for the Texas water maps: major rivers, major reservoirs and major river basins.

Sources (https://www.twdb.texas.gov/mapping/gisdata.asp):
  Major Rivers:        Major_Rivers_dd83.zip          (NHD 1:100,000, Oct 2009; 21 named rivers as line reaches; NAD83 lat/lon)
  Existing Reservoirs: Existing_Reservoirs.zip        (2012 State Water Plan major reservoirs, updated Nov 2014; 211 polygons in a
                                                       custom Lambert Conformal Conic projection, converted here to lat/lon)
  Major River Basins:  Major_River_Basins_Shapefile.zip (23 basins, 2014; NAD83 lat/lon)

Output format (window.TX_SURFACE): {rivers:[{n, l:[polyline,...]}], reservoirs:[{n, t, c:[lon,lat], a:sqkm, r:[ring,...]}],
  basins:[{n, c:[lon,lat], r:[ring,...]}]}; polylines and rings use the same encoding as tx_aquifers.js.
Usage: python3 tools/build_surface_water.py [--workdir DIR]   (pure Python 3; downloads ~21 MB, cached in the system temp dir)
"""
import os, sys, math, json, datetime, tempfile
sys.dont_write_bytecode=True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_water_layers import load_zip, fetch, dp, enc_ring, dec_ring

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE='https://www.twdb.texas.gov/mapping/gisdata/doc/'
RIVERS='Major_Rivers_dd83.zip'; RESERVOIRS='Existing_Reservoirs.zip'; BASINS='Major_River_Basins_Shapefile.zip'
TOL_RIVER=0.005; TOL_RES=0.002; TOL_BASIN=0.008; Q=1000

# ---- inverse Lambert Conformal Conic (2 standard parallels) on GRS80, parameters from the reservoirs .prj ----
A=6378137.0; F_INV=298.257222101; E2=2/F_INV-1/F_INV**2; E=math.sqrt(E2)
FE,FN,LON0=1000000.0,1000000.0,-100.0; P1,P2,P0=27.4166666666,34.91666666666,31.166666666
def _m(p): return math.cos(p)/math.sqrt(1-E2*math.sin(p)**2)
def _t(p): return math.tan(math.pi/4-p/2)/((1-E*math.sin(p))/(1+E*math.sin(p)))**(E/2)
_p1,_p2,_p0=map(math.radians,(P1,P2,P0))
N=(math.log(_m(_p1))-math.log(_m(_p2)))/(math.log(_t(_p1))-math.log(_t(_p2)))
FF=_m(_p1)/(N*_t(_p1)**N); RHO0=A*FF*_t(_p0)**N
def lcc_inverse(x,y):
    x-=FE; y-=FN; rho=math.copysign(math.hypot(x,RHO0-y),N); t=(rho/(A*FF))**(1/N); theta=math.atan2(x,RHO0-y)
    lon=math.degrees(theta/N)+LON0; phi=math.pi/2-2*math.atan(t)
    for _ in range(8): phi=math.pi/2-2*math.atan(t*((1-E*math.sin(phi))/(1+E*math.sin(phi)))**(E/2))
    return lon,math.degrees(phi)

def q(pts,tol,closed):
    r=dp(pts,tol); out=[]
    for x,y in r:
        p=(round(x*Q),round(y*Q))
        if not out or out[-1]!=p: out.append(p)
    if closed and len(out)>=2 and out[0]==out[-1]: out.pop()
    return out
def area_km2(ring):  # ring in 1e-3 deg ints
    s=0
    for i in range(len(ring)):
        x0,y0=ring[i]; x1,y1=ring[(i+1)%len(ring)]; s+=x0*y1-x1*y0
    lat=sum(p[1] for p in ring)/len(ring)/Q
    return abs(s)/2/Q/Q*111.32*110.57*math.cos(math.radians(lat))
def centroid(ring):
    s=cx=cy=0
    for i in range(len(ring)):
        x0,y0=ring[i]; x1,y1=ring[(i+1)%len(ring)]; cr=x0*y1-x1*y0; s+=cr; cx+=(x0+x1)*cr; cy+=(y0+y1)*cr
    if not s: return [round(sum(p[0] for p in ring)/len(ring)/Q,3),round(sum(p[1] for p in ring)/len(ring)/Q,3)]
    return [round(cx/(3*s)/Q,3),round(cy/(3*s)/Q,3)]
SMALL={'of','the','and','at','on','a'}
def title(n):
    w=[]
    for i,t in enumerate(n.lower().split()):
        if len(t)==1: w.append(t.upper())
        elif t in SMALL and i: w.append(t)
        else: w.append('-'.join(part.capitalize() for part in t.split('-')))
    return ' '.join(w)

def build(workdir):
    for z in (RIVERS,RESERVOIRS,BASINS): fetch(BASE+z,os.path.join(workdir,z))
    # rivers: group reaches by name
    d=next(iter(load_zip(os.path.join(workdir,RIVERS)).values())); groups={}
    for s,r in zip(d['shapes'],d['recs']):
        if not s or not r: continue
        for line in s: groups.setdefault(r['NAME'].strip(),[]).append(q(line,TOL_RIVER,False))
    rivers=[]
    for n,lines in sorted(groups.items(),key=lambda kv:-sum(len(l) for l in kv[1])):
        lines=[l for l in lines if len(l)>=2]; enc=[enc_ring(l) for l in lines]
        for l,e in zip(lines,enc): assert dec_ring(e)==l
        rivers.append({'n':n,'l':enc})
    # reservoirs: reproject, simplify, name, area
    d=next(iter(load_zip(os.path.join(workdir,RESERVOIRS)).values())); res=[]
    for s,r in zip(d['shapes'],d['recs']):
        if not s or not r: continue
        rings=[]; best=None; besta=0
        for ring in s:
            ll=[lcc_inverse(x,y) for x,y in ring]; qq=q(ll,TOL_RES,True)
            if len(qq)<3: continue
            a=area_km2(qq); rings.append(qq)
            if a>besta: besta=a; best=qq
        if not rings: continue
        res.append({'n':title(r['RES_NAME']),'t':'supply' if r['TYPE']=='Water Supply' else 'other','c':centroid(best),'a':round(sum(area_km2(x) for x in rings[:1]) if len(rings)==1 else besta,1),'r':[enc_ring(x) for x in rings]})
    res.sort(key=lambda x:-x['a'])
    # basins
    d=next(iter(load_zip(os.path.join(workdir,BASINS)).values())); basins=[]
    for s,r in zip(d['shapes'],d['recs']):
        if not s or not r: continue
        rings=[q(ring,TOL_BASIN,True) for ring in s]; rings=[x for x in rings if len(x)>=3]
        big=max(rings,key=area_km2); basins.append({'n':r['basin_name'].strip(),'c':centroid(big),'r':[enc_ring(x) for x in rings]})
    basins.sort(key=lambda b:b['n'])
    return rivers,res,basins

if __name__=='__main__':
    workdir=sys.argv[sys.argv.index('--workdir')+1] if '--workdir' in sys.argv else os.path.join(tempfile.gettempdir(),'texasmaps_water_build')
    os.makedirs(workdir,exist_ok=True); today=datetime.date.today().isoformat()
    rivers,res,basins=build(workdir)
    js=('// Surface water for the Texas water maps, built by tools/build_surface_water.py on %s. Source: Texas Water Development Board GIS data (https://www.twdb.texas.gov/mapping/gisdata.asp).\n'
        '// rivers: Major Rivers (NHD 1:100k, 2009), %d named rivers, generalized to ~%g deg. reservoirs: Existing Reservoirs (2012 State Water Plan, Nov 2014), %d major reservoirs converted from the file\'s Lambert Conformal Conic projection to lat/lon, generalized to ~%g deg; t = "supply" (water supply) or "other"; a = area in sq km; c = label point. basins: Major River Basins (2014), %d basins, generalized to ~%g deg.\n'
        '// Encoding of l (polylines) and r (rings): zigzag varint pairs (5-bit chunks, alphabet A-Za-z0-9+/, continuation bit 32) of delta lon,lat in 1/1000 degree, as in tx_aquifers.js.\n')%(today,len(rivers),TOL_RIVER,len(res),TOL_RES,len(basins),TOL_BASIN)
    js+='window.TX_SURFACE='+json.dumps({'rivers':rivers,'reservoirs':res,'basins':basins},separators=(',',':'),ensure_ascii=False)+';\n'
    open(os.path.join(ROOT,'tx_surface_water.js'),'w').write(js)
    print('rivers',len(rivers),'| reservoirs',len(res),'| basins',len(basins),'| bytes',len(js.encode()))
    print('largest reservoirs:',[(r['n'],r['a'],r['c']) for r in res[:10]])
    print('rivers:',[r['n'] for r in rivers])
    print('basins:',[b['n'] for b in basins])
