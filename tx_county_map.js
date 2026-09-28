/* tx_county_map.js — shared engine for county-level Texas maps (v 20260927-1).
   Metrics are numeric (binned color ramp) or categorical ({categories:{value:{label,color}}}, e.g. regions).
   Carved out of the water-map base (tx_water_map.js): same projection, county outlines, sidebar, overlays panel,
   search, legend, welcome card and About panel, but driven by whatever county numbers and pins the page supplies.
   Load after: tx_counties.js (required), tx_surface_water.js (optional: rivers, lakes, basins), then your data file(s).
   The page provides the skeleton (#map svg, #tip, #legend, #side, #stats, #zin/#zout/#zfit, #menubtn) and calls CM.init({...}).
   Config reference: HOW_TO_MAKE_A_MAP.md. Worked example: county_map_template.html. */
(function(){
const CM=window.CM={};
const LAT0=31.3,K=Math.cos(LAT0*Math.PI/180);
const px=(lon,lat)=>[(lon+107)*K*100,(37-lat)*100], W=((-93+107)*K*100), H=(37-25.7)*100;
const $=id=>document.getElementById(id), svgEl=n=>document.createElementNS('http://www.w3.org/2000/svg',n);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>Number(n||0).toLocaleString();
const css=s=>String(s).replace(/[^A-Za-z0-9_-]/g,'_');
const COUNTIES=window.TX_COUNTIES||{features:[]};
Object.assign(CM,{px,K,esc,num,counties:COUNTIES});

// ---------- decoding for tx_surface_water.js (format in its header) ----------
const B64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',B64I={};[...B64].forEach((c,i)=>B64I[c]=i);
function varints(str){const out=[];let v=0,m=1;for(let i=0;i<str.length;i++){const c=B64I[str[i]];v+=(c&31)*m;m*=32;if(c<32){out.push(v);v=0;m=1;}}return out;}
function decRing(str){const v=varints(str),pts=[];let x=0,y=0;for(let i=0;i<v.length;i+=2){x+=v[i]%2?-(v[i]+1)/2:v[i]/2;y+=v[i+1]%2?-(v[i+1]+1)/2:v[i+1]/2;pts.push([x/1000,y/1000]);}return pts;}
function ringsPath(rings){let d='';rings.forEach(r=>{r.forEach((p,i)=>{const [x,y]=px(p[0],p[1]);d+=(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1);});d+='Z';});return d;}
function inRings(a,lon,lat){if(lon<a.bb[0]||lon>a.bb[2]||lat<a.bb[1]||lat>a.bb[3])return false;let ins=false;for(const r of a.rings){for(let i=0,j=r.length-1;i<r.length;j=i++){const xi=r[i][0],yi=r[i][1],xj=r[j][0],yj=r[j][1];if((yi>lat)!==(yj>lat)&&lon<(xj-xi)*(lat-yi)/(yj-yi)+xi)ins=!ins;}}return ins;}
function bbOf(lists){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;lists.forEach(r=>r.forEach(p=>{if(p[0]<x0)x0=p[0];if(p[0]>x1)x1=p[0];if(p[1]<y0)y0=p[1];if(p[1]>y1)y1=p[1];}));return [x0,y0,x1,y1];}
const SW=window.TX_SURFACE||null;
if(SW){
  SW.rivers.forEach(r=>{if(r.l){r.lines=r.l.map(decRing);delete r.l;}r.bb=bbOf(r.lines);r.pl=r.lines.map(l=>l.map(p=>px(p[0],p[1])));const L=r.lines.reduce((a,b)=>b.length>a.length?b:a,[]);r.c=L[Math.floor(L.length/2)];});
  SW.reservoirs.forEach(r=>{if(r.r){r.rings=r.r.map(decRing);delete r.r;}r.bb=bbOf(r.rings);r.pr=r.rings.map(l=>l.map(p=>px(p[0],p[1])));});
  SW.basins.forEach(b=>{if(b.r){b.rings=b.r.map(decRing);delete b.r;}b.bb=bbOf(b.rings);});
}
// ---------- districts (tx_districts.js + tx_district_crosswalk.js, optional) ----------
// the district files are loaded by the page (a topic's data list), so they are read at CM.init, not here
let DS=null,XW=null;const DXW={},DSHORT={congress:'CD',house:'HD',senate:'SD',sboe:'SBOE'},DLONG={congress:'Congressional District',house:'House District',senate:'Senate District',sboe:'SBOE District'};
function initDistricts(){DS=window.TX_DISTRICTS||null;XW=window.TX_DISTRICT_XW||null;Object.keys(DXW).forEach(k=>delete DXW[k]);
  if(DS)Object.keys(DS).forEach(k=>{const p=DS[k];p.id=k;p.short=DSHORT[p.kind]||'District';p.ids=p.districts.map(d=>String(d.n));
    p.districts.forEach(d=>{if(d.r){d.rings=d.r.map(decRing);delete d.r;}if(!d.path){d.bb=bbOf(d.rings);d.path=ringsPath(d.rings);d.cc=px(d.c[0],d.c[1]);d.w=px(d.bb[2],0)[0]-px(d.bb[0],0)[0];}});});
  // DXW[plan][district] = [[fips, residents, share of the district], ...] largest first
  if(XW)Object.keys(XW.counties).forEach(f=>{const c=XW.counties[f];Object.keys(c).forEach(pl=>{DXW[pl]=DXW[pl]||{};c[pl].forEach(([n,pop])=>{(DXW[pl][n]=DXW[pl][n]||[]).push([f,pop]);});});});
  Object.values(DXW).forEach(pl=>Object.values(pl).forEach(l=>{const t=l.reduce((a,b)=>a+b[1],0);l.sort((a,b)=>b[1]-a[1]);l.forEach(x=>x.push(t?x[1]/t:0));}));}
const ensureD=()=>{if(!DS&&window.TX_DISTRICTS)initDistricts();};   // a topic's build() may ask before CM.init has run
CM.plans=()=>{ensureD();return DS?Object.keys(DS).map(k=>DS[k]):[];};
CM.plan=k=>{ensureD();return DS&&DS[k]||null;};
CM.districtName=(plan,n)=>{ensureD();return ((DS&&DS[plan]&&DLONG[DS[plan].kind])||'District')+' '+n;};
CM.districtsOf=(plan,f)=>{ensureD();return (XW&&XW.counties[f]&&XW.counties[f][plan])||[];};      // [[district, residents, share of the county], ...]
CM.districtCounties=(plan,n)=>{ensureD();return (DXW[plan]&&DXW[plan][n])||[];};                  // [[fips, residents, share of the district], ...]
const UNIT_KM=1.1057;  // one projected unit is about 1.1 km
function segDist(X,Y,a,b){const dx=b[0]-a[0],dy=b[1]-a[1];const L2=dx*dx+dy*dy;let t=L2?((X-a[0])*dx+(Y-a[1])*dy)/L2:0;t=Math.max(0,Math.min(1,t));const ex=a[0]+t*dx-X,ey=a[1]+t*dy-Y;return Math.sqrt(ex*ex+ey*ey);}
function nearestRiver(X,Y,maxU){if(!SW)return null;let best=null,bd=maxU;const lon=X/(K*100)-107,lat=37-Y/100,pad=maxU/100;
  for(const r of SW.rivers){if(lon<r.bb[0]-pad||lon>r.bb[2]+pad||lat<r.bb[1]-pad||lat>r.bb[3]+pad)continue;for(const l of r.pl)for(let i=1;i<l.length;i++){const d=segDist(X,Y,l[i-1],l[i]);if(d<bd){bd=d;best=r;}}}
  return best?{n:best.n,km:bd*UNIT_KM}:null;}
function nearestReservoir(X,Y,lon,lat,maxU){if(!SW)return null;let best=null,bd=maxU;const pad=maxU/100;
  for(const r of SW.reservoirs){if(lon<r.bb[0]-pad||lon>r.bb[2]+pad||lat<r.bb[1]-pad||lat>r.bb[3]+pad)continue;if(inRings(r,lon,lat))return {n:r.n,km:0,r};for(const l of r.pr)for(let i=1;i<l.length;i++){const d=segDist(X,Y,l[i-1],l[i]);if(d<bd){bd=d;best=r;}}}
  return best?{n:best.n,km:bd*UNIT_KM,r:best}:null;}
const basinOf=(lon,lat)=>SW?SW.basins.find(b=>inRings(b,lon,lat))||null:null;
const mi=km=>km<1.6?'under 1':String(Math.round(km*0.6214));
Object.assign(CM,{sw:SW,nearestRiver,nearestReservoir,basinOf,inRings,mi});
// aquifers (optional tx_aquifers.js from the water maps: {major:[{n,c,r}],minor:[...]}): drawn as a translucent overlay, one color per major aquifer
const AQ=window.TX_AQUIFERS||null;const AQCOL={'Ogallala':'#eda100','Edwards-Trinity (Plateau)':'#2a78d6','Pecos Valley':'#1baf7a','Trinity':'#008300','Edwards (Balcones Fault Zone)':'#e87ba4','Carrizo-Wilcox':'#4a3aa7','Gulf Coast':'#eb6834','Hueco-Mesilla Bolson':'#e34948','Seymour':'#8c6d3f'};
if(AQ){['major','minor'].forEach(k=>AQ[k].forEach(a=>{if(a.r){a.rings=a.r.map(decRing);delete a.r;}a.bb=bbOf(a.rings);a.kind=k;}));}
const aquifersAt=(lon,lat,minor)=>AQ?AQ.major.filter(a=>inRings(a,lon,lat)).map(a=>a.n).concat(minor?AQ.minor.filter(a=>inRings(a,lon,lat)).map(a=>a.n+' (minor)'):[]):[];
let gAqMa,gAqMi,gAqL;Object.assign(CM,{aq:AQ,aqColor:n=>AQCOL[n]||'',aquifersAt});

// ---------- county geometry ----------
const cname={},cpath={},ccent={},cbbox={},cgeo={},fipsByName={};
const norm=s=>String(s).toLowerCase().replace(/\s+county$/,'').replace(/[^a-z]/g,'');
COUNTIES.features.forEach(f=>{let d='',sx=0,sy=0,n=0,x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;const rings=[];
  const polys=f.geometry.type==='MultiPolygon'?f.geometry.coordinates:[f.geometry.coordinates];
  polys.forEach(poly=>poly.forEach(ring=>{rings.push(ring);ring.forEach((p,i)=>{const [x,y]=px(p[0],p[1]);d+=(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1);sx+=x;sy+=y;n++;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;});d+='Z';}));
  cpath[f.id]=d;ccent[f.id]=[sx/n,sy/n];cbbox[f.id]=[x0,y0,x1-x0,y1-y0];cname[f.id]=f.properties.name;cgeo[f.id]={rings,bb:bbOf(rings)};fipsByName[norm(f.properties.name)]=f.id;});
const FIPS=Object.keys(cname);
// CM.fipsOf('Bexar') / ('Bexar County') / ('48029') / ('029') -> '48029'
CM.fipsOf=name=>{if(name==null)return null;const s=String(name).trim();if(/^\d{5}$/.test(s)&&cname[s])return s;if(/^\d{1,3}$/.test(s)&&cname['48'+s.padStart(3,'0')])return '48'+s.padStart(3,'0');return fipsByName[norm(s)]||null;};
CM.countyAt=(lon,lat)=>{for(const f of FIPS)if(inRings(cgeo[f],lon,lat))return f;return null;};
Object.assign(CM,{cname,ccent,cbbox,fips:FIPS});

// ---------- color ramps (light theme: more = darker; dark theme: more = brighter and more vivid) ----------
const RAMPS={
  orange:{light:['#f9d7cb','#efb19b','#e28969','#d45e2f','#af4517','#883008'],dark:['#7f4c31','#a15930','#c5652d','#e97125','#ff8a47','#ffae85']},
  blue:{light:['#cde2fb','#9ec5f4','#6da7ec','#3987e5','#256abf','#184f95'],dark:['#3b5c87','#4570a8','#4e85ca','#589aed','#72b1ff','#9dc7fe']},
  green:{light:['#d9efd9','#b0dcb2','#82c688','#52ab5c','#2f8a3d','#1a5f27'],dark:['#2f5a38','#3a7546','#469255','#56b066','#78cd84','#a6e7ad']},
  purple:{light:['#e6dff4','#c9b9e8','#a992da','#8669c9','#6647a6','#452b7c'],dark:['#4a3d76','#5c4b98','#7160ba','#8b79dc','#a997f2','#c8bcfb']},
  maroon:{light:['#f3dcdc','#e2b3b3','#cf8787','#b85c5c','#963636','#661515'],dark:['#6a3838','#8a4545','#ab5252','#cc6464','#e98484','#f7adad']},
  teal:{light:['#d4eef0','#a6dade','#75c3ca','#45a8b2','#2a8690','#175f68'],dark:['#2f5f64','#3a7b82','#4699a1','#55b8c2','#7ad4dc','#a8ebf0']},
  // diverging: low (orange) <- neutral gray -> high (blue); give it 6 bins for 7 colors
  diverging:{light:['#883008','#d45e2f','#efb19b','#eceae4','#9ec5f4','#3987e5','#184f95'],dark:['#fea983','#ea763c','#ac603d','#3a3f4a','#4879b7','#5b9df0','#97c4fe']}};
function isDark(){const t=document.documentElement.dataset.theme;return t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);}
const rampOf=m=>{const r=Array.isArray(m.ramp)?{light:m.ramp,dark:m.ramp}:(RAMPS[m.ramp||'orange']||RAMPS.orange);return r[isDark()?'dark':'light'];};
function colorsFor(m){const cols=rampOf(m),k=m.bins.length+1;if(k>=cols.length)return cols;if(k===1)return [cols[cols.length-1]];return Array.from({length:k},(_,i)=>cols[Math.round(i*(cols.length-1)/(k-1))]);}
Object.assign(CM,{RAMPS,isDark});

// ---------- metrics: one entry per "Color the map by" choice ----------
let METRICS={},ORDER=[];
const binOf=(v,b)=>{let i=0;while(i<b.length&&v>=b[i])i++;return i;};
function binLabels(m,vals){const b=m.bins,f=m.fmt;if(!b.length)return [vals.length?f(m.min)+(m.max>m.min?'–'+f(m.max):''):'no data'];
  const intMode=b.every(Number.isInteger)&&vals.every(Number.isInteger);const lo0=vals.length?Math.min(...vals):0;
  return b.map((x,i)=>{const lo=i?b[i-1]:lo0,hi=intMode?x-1:x;if(i===0&&!intMode)return 'under '+f(x);if(intMode&&hi<=lo)return f(lo);return f(lo)+'–'+f(hi);}).concat([f(b[b.length-1])+' and up']);}
const idsOf=m=>(m.plan&&DS&&DS[m.plan])?DS[m.plan].ids:FIPS;
function prepMetric(m){m.values=m.values||{};
  if(m.categories){m.cat=true;m.fmt=m.fmt||(v=>(m.categories[v]&&m.categories[v].label)||String(v));let n=0;idsOf(m).forEach(f=>{const v=m.values[f];if(v==null||v===''||!m.categories[v]){delete m.values[f];return;}n++;});m.n=n;m.bins=[];m.binLabels=[];return;}
  const skip=m.skipZero!==false;const vals=[];
  idsOf(m).forEach(f=>{const v=m.values[f];if(v==null||v==='')return;const n=+v;if(isNaN(n)){delete m.values[f];return;}m.values[f]=n;if(skip&&n===0)return;vals.push(n);});
  m.fmt=m.fmt||(v=>Number.isInteger(v)?num(v):Number(v).toLocaleString(undefined,{maximumFractionDigits:1}));
  m.n=vals.length;m.min=vals.length?Math.min(...vals):0;m.max=vals.length?Math.max(...vals):0;m.sum=vals.reduce((a,b)=>a+b,0);
  const nc=rampOf(m).length;
  if(!m.bins){const s=vals.slice().sort((a,b)=>a-b),br=[];for(let i=1;i<nc;i++){const q=s[Math.floor(i*s.length/nc)];if(q!=null&&(!br.length||q>br[br.length-1])&&q>s[0])br.push(q);}m.bins=br;}
  if(!m.binLabels)m.binLabels=binLabels(m,vals);}
function hasValue(m,f){const v=m.values[f];if(m.cat)return v!=null&&!!m.categories[v];return v!=null&&!isNaN(v)&&!(m.skipZero!==false&&v===0);}
function fillFor(m,f){if(!hasValue(m,f))return '';if(m.cat)return m.categories[m.values[f]].color;const c=colorsFor(m);return c[Math.min(binOf(m.values[f],m.bins),c.length-1)];}
CM.metric=k=>METRICS[k]||null;CM.metrics=()=>ORDER.map(k=>METRICS[k]);
CM.value=(k,f)=>{const m=METRICS[k];return m&&m.values[f]!=null?m.values[f]:null;};
CM.fmtValue=(k,f,dash='—')=>{const m=METRICS[k];if(!m||m.values[f]==null)return dash;return m.fmt(m.values[f])+(m.unit?' '+m.unit:'');};
CM.rank=(k,n,desc=true)=>{const m=METRICS[k];if(!m)return [];const l=idsOf(m).filter(f=>hasValue(m,f));if(m.cat)l.sort((a,b)=>m.fmt(m.values[a]).localeCompare(m.fmt(m.values[b]))||String(cname[a]||a).localeCompare(String(cname[b]||b)));else l.sort((a,b)=>desc?m.values[b]-m.values[a]:m.values[a]-m.values[b]);return n?l.slice(0,n):l;};
CM.categoryCounties=(k,v)=>{const m=METRICS[k];return m?idsOf(m).filter(f=>hasValue(m,f)&&String(m.values[f])===String(v)):[];};
CM.rankOf=(k,f,desc=true)=>{const l=CM.rank(k,0,desc);const i=l.indexOf(f);return i<0?null:{rank:i+1,of:l.length};};
CM.fillFor=(k,f)=>METRICS[k]?fillFor(METRICS[k],f):'';

// ---------- pins ----------
let PINS=[],byId={},STATUS={},cfg;
const HV={light:['#161B26','#FFFFFF','#C2185B','#FFD23F','#1E88A8','#6B6B6B'],dark:['#F7F4EE','#FFD23F','#FF4FA3','#7FA3D6','#5CE1E6','#B8B8B8']};  // pin fills when the map is shaded
const rad=p=>cfg.pinSize?cfg.pinSize(p):(p.r||(p.size?Math.max(4,Math.min(13,2.5+Math.sqrt(p.size)/6)):4.5));
CM.pins=()=>PINS;CM.byId=id=>byId[id];CM.statuses=()=>STATUS;

// ---------- map state ----------
let svg,view,gC,gL,gP,gBas,gRes,gRiv,gSWL,gD,gDL,tip,tx=0,ty=0,sc=1,drag=null;
const state={base:'',pins:true,rivers:false,basins:false,aquifers:false,minor:false,plan:'',hld:'',filter:null,hl:new Set(),selId:null};CM.state=state;
const fstate={status:new Set(),hot:false,sort:'metric'};CM.fstate=fstate;
const listable=p=>fstate.status.has(p.status)&&(!fstate.hot||p.hot);
const visible=p=>state.pins&&listable(p)&&(!state.filter||state.filter(p));
CM.visible=visible;
function apply(){view.setAttribute('transform',`translate(${tx} ${ty}) scale(${sc})`);const k=1/sc;scaleDistricts(k);if(cfg.onView)cfg.onView({sc,tx,ty,W,H});
  PINS.forEach(p=>{if(p.el)p.el.setAttribute('r',rad(p)*Math.sqrt(k));});
  gL.style.display=sc>(cfg.labelsAt||2.2)?'':'none';gL.querySelectorAll('text').forEach(t=>t.setAttribute('font-size',9*k*1.3));
  if(gAqL)gAqL.querySelectorAll('text').forEach(t=>{const ma=t.dataset.k==='major';t.setAttribute('font-size',(ma?11:8.5)*k*1.25);t.setAttribute('stroke-width',3*k);t.style.display=(ma?state.aquifers:(state.minor&&sc>1.8))?'':'none';});
  gSWL.querySelectorAll('text').forEach(t=>{const kind=t.dataset.k;t.setAttribute('font-size',(kind==='basin'?10.5:kind==='river'?9.5:8.5)*k*1.25);t.setAttribute('stroke-width',(kind==='basin'?3:2.5)*k);t.style.opacity=kind==='basin'?((t.dataset.coastal==='1'&&sc<=1.5)?0:1):kind==='river'?(sc>1.3?1:0):(sc>1.8?1:0);});}
function fit(){const r=svg.getBoundingClientRect();sc=Math.min(r.width/W,r.height/H)*.96;tx=(r.width-W*sc)/2;ty=(r.height-H*sc)/2;apply();}
function zoomTo(bx,by,bw,bh){const r=svg.getBoundingClientRect();sc=Math.min(r.width/(bw*1.6),r.height/(bh*1.6),40);tx=r.width/2-(bx+bw/2)*sc;ty=r.height/2-(by+bh/2)*sc;apply();}
function zoomAt(f,cx,cy){const r=svg.getBoundingClientRect();cx=cx??r.width/2;cy=cy??r.height/2;const ns=Math.max(.5,Math.min(60,sc*f));tx=cx-(cx-tx)*ns/sc;ty=cy-(cy-ty)*ns/sc;sc=ns;apply();}
CM.cursorLonLat=e=>cursorLonLat(e);CM.view=()=>({sc,tx,ty,W,H});
function cursorLonLat(e){const r=svg.getBoundingClientRect();return [((e.clientX-r.left-tx)/sc)/(K*100)-107,37-((e.clientY-r.top-ty)/sc)/100];}
Object.assign(CM,{fit,zoomTo,zoomAt,
  zoomLonLat:(lon,lat,span=50)=>{const [x,y]=px(lon,lat);zoomTo(x-span/2,y-span/2,span,span);},
  zoomCounty:f=>{if(cbbox[f])zoomTo(...cbbox[f]);},
  zoomCounties:list=>{let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;list.forEach(f=>{const b=cbbox[f];if(!b)return;x0=Math.min(x0,b[0]);y0=Math.min(y0,b[1]);x1=Math.max(x1,b[0]+b[2]);y1=Math.max(y1,b[1]+b[3]);});if(x1>x0)zoomTo(x0,y0,x1-x0,y1-y0);},
  zoomPin:p=>{if(p.lon==null)return;const [x,y]=px(p.lon,p.lat);zoomTo(x-25,y-25,50,50);}});

CM.init=function(c){
  cfg=Object.assign({metrics:[],base:'',pins:[],pinStatuses:null,pinLabel:'Sites',pinSingular:'site',pinPlural:'sites',hotLabel:'Red ring: flagged',hotChip:'Flagged only',hotFlag:'Flagged',
    controls:['pins','rivers','basins','districts','base'],pages:[],about:'',sources:'',caveats:'',legendNote:'',listMetric:null,listSortLabel:'this map',showPins:true,rivers:false,basins:false,aquifers:false,minor:false},c);
  initDistricts();METRICS={};ORDER=[];(cfg.metrics||[]).forEach(m=>{prepMetric(m);METRICS[m.key]=m;ORDER.push(m.key);});
  PINS=(cfg.pins||[]).filter(p=>p&&p.id!=null);byId={};
  PINS.forEach(p=>{byId[p.id]=p;if(!p.fips&&p.lon!=null&&p.lat!=null)p.fips=CM.countyAt(p.lon,p.lat);if(!p.county&&p.fips)p.county=cname[p.fips];});
  STATUS=cfg.pinStatuses||{};
  if(!Object.keys(STATUS).length){const pal=['#3B5B8C','#C8842A','#A3262A','#4a3aa7','#1baf7a','#9A9A9A'];[...new Set(PINS.map(p=>p.status||'site'))].forEach((k,i)=>STATUS[k]={label:k,color:pal[i%pal.length]});}
  const first=Object.keys(STATUS)[0];PINS.forEach(p=>{if(!p.status||!STATUS[p.status])p.status=first;});
  Object.keys(STATUS).forEach((k,i)=>STATUS[k].i=i);
  fstate.status=new Set(Object.keys(STATUS).filter(k=>STATUS[k].on!==false));fstate.hot=false;fstate.sort='metric';
  Object.assign(state,{base:METRICS[cfg.base]?cfg.base:'',pins:!!PINS.length&&cfg.showPins!==false,rivers:!!SW&&!!cfg.rivers,basins:!!SW&&!!cfg.basins,aquifers:!!AQ&&!!cfg.aquifers,minor:!!AQ&&!!cfg.minor,plan:(DS&&DS[cfg.plan])?cfg.plan:'',hld:'',filter:null,hl:new Set(),selId:null});
  // shareable links work the same on every page: #shade=<metric key>|none, #layers=rivers,basins and #districts=<plan id>|none (plus #county=<fips>, #pin=<id> and #district=<plan>:<n>, opened by the page)
  const hh=decodeURIComponent(location.hash||'').replace(/^#/,'');let hm;
  if((hm=/(?:^|&)shade=([^&]+)/.exec(hh))){if(hm[1]==='none')state.base='';else if(METRICS[hm[1]])state.base=hm[1];}
  if((hm=/(?:^|&)layers=([a-z,]*)/.exec(hh))){const L=hm[1].split(',');state.rivers=!!SW&&L.includes('rivers');state.basins=!!SW&&L.includes('basins');state.aquifers=!!AQ&&L.includes('aquifers');state.minor=!!AQ&&L.includes('minor');}
  if((hm=/(?:^|&)districts=([A-Za-z0-9]+)/.exec(hh))){state.plan=(DS&&DS[hm[1]])?hm[1]:'';}
  svg=$('map');tip=$('tip');
  // overlays panel lives on the map (collapsed by default on phones)
  const oldL=$('layers');if(oldL)oldL.remove();
  const lp=document.createElement('div');lp.className='lpanel'+(window.innerWidth<=800?' closed':'');lp.id='lpanel';
  lp.innerHTML='<button class="lpt" type="button">Map overlays <span class="chev">▾</span></button><div class="lbody" id="layers"></div>';
  svg.parentElement.appendChild(lp);lp.querySelector('.lpt').onclick=()=>lp.classList.toggle('closed');
  const sideEl=$('side');if(sideEl&&!sideEl.dataset.wired){sideEl.dataset.wired='1';
    sideEl.addEventListener('click',e=>{const h=e.target.closest('.blk>h3');if(h){h.parentElement.classList.toggle('closed');return;}
      const ch=e.target.closest('#allpins .chip');if(ch){if(ch.dataset.hot){fstate.hot=!fstate.hot;ch.classList.toggle('on',fstate.hot);}else{const k=ch.dataset.s;if(fstate.status.has(k))fstate.status.delete(k);else fstate.status.add(k);ch.classList.toggle('off',!fstate.status.has(k));}CM.update();return;}
      const r=e.target.closest('.row[data-county],.row[data-pin],.row[data-district]');if(!r)return;
      if(r.dataset.district){const [pl,n]=r.dataset.district.split(':');if(cfg.onDistrict)cfg.onDistrict(pl,+n);}else if(r.dataset.county){if(cfg.onCounty)cfg.onCounty(r.dataset.county);}else if(byId[r.dataset.pin]&&cfg.onPin)cfg.onPin(byId[r.dataset.pin]);CM.closeAside();});
    sideEl.addEventListener('keydown',e=>{if(e.key==='Enter'){const r=e.target.closest('.row[data-county],.row[data-pin],.row[data-district]');if(r)r.click();}});
    sideEl.addEventListener('change',e=>{if(e.target.id==='lsort'){fstate.sort=e.target.value;renderRows();}});}
  svg.innerHTML='<g id="view"><g id="counties"></g><g id="aq-minor"></g><g id="aq-major"></g><g id="districts"></g><g id="basins"></g><g id="reservoirs"></g><g id="rivers"></g><g id="clabels"></g><g id="sw-labels"></g><g id="aq-labels"></g><g id="dlabels"></g><g id="pins"></g></g>';
  view=$('view');gC=$('counties');gL=$('clabels');gP=$('pins');gBas=$('basins');gRes=$('reservoirs');gRiv=$('rivers');gSWL=$('sw-labels');gD=$('districts');gDL=$('dlabels');gAqMa=$('aq-major');gAqMi=$('aq-minor');gAqL=$('aq-labels');buildDistricts();
  if(AQ){[['major',gAqMa],['minor',gAqMi]].forEach(([k,g])=>AQ[k].forEach(a=>{const p=svgEl('path');p.setAttribute('d',ringsPath(a.rings));p.setAttribute('class','aq '+k);p.dataset.n=a.n;if(k==='major'){p.style.fill=AQCOL[a.n]||'#999';p.style.stroke=AQCOL[a.n]||'#777';}g.appendChild(p);
    const t=svgEl('text');t.setAttribute('class','aqlabel '+(k==='major'?'ma':'mi'));const [lx,ly]=px(a.c[0],a.c[1]);t.setAttribute('x',lx);t.setAttribute('y',ly);t.textContent=a.n;t.dataset.k=k;gAqL.appendChild(t);}));}
  if(SW){
    const linesPath=ls=>{let d='';ls.forEach(l=>l.forEach((p,i)=>{d+=(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1);}));return d;};
    SW.basins.forEach(b=>{const p=svgEl('path');p.setAttribute('d',ringsPath(b.rings));p.setAttribute('class','basin');p.dataset.n=b.n;gBas.appendChild(p);
      const t=svgEl('text');t.setAttribute('class','swlabel basin');const [lx,ly]=px(b.c[0],b.c[1]);t.setAttribute('x',lx);t.setAttribute('y',ly);t.textContent=b.n;t.dataset.k='basin';if(b.n.includes('-'))t.dataset.coastal='1';gSWL.appendChild(t);});
    SW.reservoirs.forEach((r,i)=>{const p=svgEl('path');p.setAttribute('d',ringsPath(r.rings));p.setAttribute('class','res');p.dataset.n=r.n;gRes.appendChild(p);
      if(i<30){const t=svgEl('text');t.setAttribute('class','swlabel res');const [lx,ly]=px(r.c[0],r.c[1]);t.setAttribute('x',lx);t.setAttribute('y',ly);t.textContent=r.n;t.dataset.k='res';gSWL.appendChild(t);}});
    SW.rivers.forEach(r=>{const d=linesPath(r.pl);const c=svgEl('path');c.setAttribute('d',d);c.setAttribute('class','river-case');gRiv.appendChild(c);const p=svgEl('path');p.setAttribute('d',d);p.setAttribute('class','river');p.dataset.n=r.n;gRiv.appendChild(p);
      const t=svgEl('text');t.setAttribute('class','swlabel river');const [lx,ly]=px(r.c[0],r.c[1]);t.setAttribute('x',lx);t.setAttribute('y',ly-2);t.textContent=r.n;t.dataset.k='river';gSWL.appendChild(t);});
  }
  FIPS.forEach(f=>{const p=svgEl('path');p.setAttribute('d',cpath[f]);p.setAttribute('class','county');p.dataset.fips=f;gC.appendChild(p);
    const t=svgEl('text');t.setAttribute('class','clabel');t.setAttribute('x',ccent[f][0]);t.setAttribute('y',ccent[f][1]+3);t.textContent=cname[f];gL.appendChild(t);});
  PINS.forEach(p=>{if(p.lon==null||p.lat==null){p.el=null;return;}const [x,y]=px(p.lon,p.lat);const c=svgEl('circle');c.setAttribute('cx',x);c.setAttribute('cy',y);c.setAttribute('r',rad(p));c.setAttribute('fill',`var(--pin-${css(p.status)})`);c.setAttribute('class','pin st-'+css(p.status)+(p.hot?' hot':''));c.dataset.id=p.id;p.el=c;gP.appendChild(c);});
  [...gP.querySelectorAll('.pin.hot')].forEach(e=>gP.appendChild(e));
  // interaction
  svg.addEventListener('wheel',e=>{e.preventDefault();const r=svg.getBoundingClientRect();zoomAt(Math.exp(-e.deltaY*.0018),e.clientX-r.left,e.clientY-r.top);},{passive:false});
  svg.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,tx,ty,moved:false,target:e.target};svg.setPointerCapture(e.pointerId);});
  svg.addEventListener('pointermove',e=>{if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>3){drag.moved=true;svg.classList.add('drag');}tx=drag.tx+dx;ty=drag.ty+dy;apply();}showTip(e);});
  svg.addEventListener('pointerup',e=>{svg.classList.remove('drag');if(drag&&!drag.moved)click(e,drag.target);drag=null;});
  svg.addEventListener('pointerleave',()=>tip.style.display='none');
  $('zin').onclick=()=>zoomAt(1.6);$('zout').onclick=()=>zoomAt(1/1.6);$('zfit').onclick=()=>{fit();if(cfg.onBackground)cfg.onBackground();};
  window.addEventListener('resize',fit);
  const mb=$('menubtn'),aside=document.querySelector('aside');if(mb)mb.onclick=()=>aside.classList.toggle('open');
  try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>CM.update());}catch(e){}
  buildControls();initHeader();initSearch();initAbout();initWelcome();CM.update();fit();
};
CM.openHash=()=>{const h=decodeURIComponent(location.hash||'').replace(/^#/,'');let m;
  if((m=/(?:^|&)pin=([^&]+)/.exec(h))&&byId[m[1]]&&cfg.onPin)cfg.onPin(byId[m[1]]);
  else if((m=/(?:^|&)county=([^&]+)/.exec(h))&&cfg.onCounty){const f=CM.fipsOf(m[1]);if(f)cfg.onCounty(f);}};
CM.setHash=h=>{try{history.replaceState(null,'',location.pathname+location.search+(h?'#'+h:''));}catch(e){}};

function initHeader(){const hdr=document.querySelector('header');if(!hdr)return;const here=cfg.here||(location.pathname.split('/').pop()||'');hdr.querySelectorAll('.src').forEach(e=>e.remove());
  const nav=document.createElement('nav');nav.className='mapnav';nav.setAttribute('aria-label','Other maps');nav.innerHTML=cfg.pages.map(([f,l])=>`<a href="${esc(f)}"${f===here?' class="cur" aria-current="page"':''}>${esc(l)}</a>`).join('');
  const btn=document.createElement('button');btn.type='button';btn.className='aboutbtn';btn.textContent='About this map';btn.onclick=()=>CM.openAbout();
  const anchor=hdr.querySelector('.allmaps');if(anchor){anchor.after(nav);nav.after(btn);}else{hdr.appendChild(nav);hdr.appendChild(btn);}}
function initSearch(){const aside=document.querySelector('aside'),side=$('side');if(!aside||!side||$('q'))return;
  const box=document.createElement('div');box.className='search';box.innerHTML=`<input id="q" type="search" placeholder="${esc(cfg.searchPlaceholder||('Search a county'+(PINS.length?', city or '+cfg.pinSingular:'')+'…'))}" autocomplete="off" aria-label="Search"><div class="sugg" id="sugg" role="listbox"></div>`;aside.insertBefore(box,side);
  const q=box.querySelector('input'),sg=box.querySelector('.sugg');let items=[];
  const cities={};PINS.forEach(p=>{if(!p.city)return;const k=p.city.toLowerCase()+'|'+p.fips;cities[k]=cities[k]||{city:p.city,county:p.county,fips:p.fips,n:0};cities[k].n++;});
  function build(v){v=v.toLowerCase();items=[];
    FIPS.filter(f=>cname[f].toLowerCase().startsWith(v)).slice(0,5).forEach(f=>items.push({t:cname[f]+' County',k:'county',f}));
    Object.values(cities).filter(c=>c.city.toLowerCase().startsWith(v)).slice(0,4).forEach(c=>items.push({t:c.city+', '+c.county+' County',k:'city',c}));
    PINS.filter(p=>p.name.toLowerCase().includes(v)||(p.sub&&p.sub.toLowerCase().includes(v))).slice(0,6).forEach(p=>items.push({t:p.name,k:cfg.pinSingular,p}));
    if(cfg.searchExtra)items=items.concat(cfg.searchExtra(v)||[]);
    sg.innerHTML=items.map((it,i)=>`<div role="option" data-i="${i}">${esc(it.t)}<small>${esc(it.k)}</small></div>`).join('');sg.style.display=items.length?'block':'none';}
  function pick(it){sg.style.display='none';q.value='';
    if(it.go)it.go();else if(it.k==='county'&&cfg.onCounty)cfg.onCounty(it.f);else if(it.k==='city'&&cfg.onCounty&&it.c.fips)cfg.onCounty(it.c.fips);else if(it.p&&cfg.onPin)cfg.onPin(it.p);CM.closeAside();}
  q.addEventListener('input',()=>{const v=q.value.trim();if(v.length<2){sg.style.display='none';return;}build(v);});
  sg.addEventListener('mousedown',e=>{const d=e.target.closest('[data-i]');if(d){e.preventDefault();pick(items[+d.dataset.i]);}});
  q.addEventListener('keydown',e=>{if(e.key==='Enter'&&items.length)pick(items[0]);if(e.key==='Escape')sg.style.display='none';});
  q.addEventListener('blur',()=>setTimeout(()=>sg.style.display='none',150));}
function initWelcome(){const here=(location.pathname.split('/').pop()||'map');const key=cfg.welcomeKey||('txmaps_welcome_'+here);let seen=false;try{seen=localStorage.getItem(key)==='1';}catch(e){}if(seen||cfg.noWelcome)return;
  const m0=ORDER.length?METRICS[state.base||ORDER[0]]:null;const tips=cfg.welcomeTips||[(m0?(m0.plan?'Districts':'Counties')+' are colored by '+m0.label.toLowerCase()+'. Hover one for its '+(m0.cat?'name':'number')+', click it for details.':'Hover a county for details; click it to see more.'),
    PINS.length?'Every dot is a '+cfg.pinSingular+'; click one for its details.':'The lists on the left rank the counties; click any row to jump there.',
    'Use <b>Map overlays</b> (top right) to change what colors the map'+(SW?' and to add rivers and river basins':'')+'.'];
  if(window.innerWidth<=800)tips.push('Tap <b>List</b> for search and the rankings.');
  const w=document.createElement('div');w.className='welcome';w.setAttribute('role','dialog');w.innerHTML=`<h2>${cfg.welcomeTitle||document.title}</h2><ol>${tips.map(t=>`<li>${t}</li>`).join('')}</ol><button type="button">Explore the map</button>`;
  svg.parentElement.appendChild(w);w.querySelector('button').onclick=()=>{w.remove();try{localStorage.setItem(key,'1');}catch(e){}};}
function initAbout(){const here=cfg.here||(location.pathname.split('/').pop()||'');const panel=document.createElement('div');panel.className='about';
  const others=cfg.pages.filter(([f])=>f!==here).map(([f,l])=>`<a href="${esc(f)}">${esc(l)}</a>`);
  panel.innerHTML=`<div class="aboutbox"><button class="close" aria-label="Close">×</button><h2>About this map</h2>${cfg.about||''}
    ${cfg.sources?`<h3>Where the data comes from</h3>${cfg.sources}`:''}
    ${AQ&&cfg.controls.includes('aquifers')?`<h3>Aquifers</h3><p>The <b>Aquifers</b> overlay draws the Texas Water Development Board's outlines of the nine major aquifers, one color each, and the minor aquifers as a faint dashed fill. Hover a county with the overlay on to read which aquifers lie under the cursor. Outlines are generalized for a statewide map.</p>`:''}
    ${SW&&(cfg.controls.includes('rivers')||cfg.controls.includes('basins'))?`<h3>Rivers, river basins and lakes</h3><p><b>Rivers</b> are the channels themselves: the 21 major rivers such as the Rio Grande, Brazos, Colorado and Trinity. <b>River basins</b> are the land that drains to each river; every place in Texas is in exactly one. <b>Lakes</b> on this map are reservoirs, the man-made lakes behind dams. All three come from the Texas Water Development Board.</p>`:''}
    ${cfg.caveats?`<h3>Things to keep in mind</h3>${cfg.caveats}`:''}
    <h3>See also</h3><p>${others.concat(['<a href="index.html">All maps</a>']).join(' · ')}</p>
    ${cfg.aboutFine?`<p class="fine">${cfg.aboutFine}</p>`:''}</div>`;
  document.body.appendChild(panel);const close=()=>panel.classList.remove('open');panel.querySelector('.close').onclick=close;panel.addEventListener('click',e=>{if(e.target===panel)close();});document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  CM.openAbout=()=>panel.classList.add('open');document.addEventListener('click',e=>{if(e.target.closest('.aboutlink')){e.preventDefault();CM.openAbout();}});}

// ---------- sidebar helpers ----------
CM.stat=(v,l)=>`<div class="stat"><b>${v}</b><small>${l}</small></div>`;
CM.glance=facts=>`<div class="blk glance"><h3>At a glance</h3><ul class="facts">${facts.map(f=>`<li>${f}</li>`).join('')}</ul></div>`;
CM.note=text=>`<div class="note">${text} <a href="#" class="aboutlink">About this map and its data</a></div>`;
CM.closeAside=()=>{if(window.innerWidth<=800)document.querySelector('aside').classList.remove('open');};
CM.collapseAfter=n=>{const sideEl=$('side');if(!sideEl)return;const blks=[...sideEl.querySelectorAll('.blk')];blks.forEach((b,i)=>{if(i>=n)b.classList.add('closed');});
  if(blks.length>n){const bar=document.createElement('div');bar.className='secbar';const btn=document.createElement('button');btn.type='button';const sync=()=>{const anyClosed=blks.some(b=>b.classList.contains('closed'));btn.textContent=anyClosed?`Show all ${blks.length} sections ▾`:'Collapse sections ▴';};
    btn.onclick=()=>{const anyClosed=blks.some(b=>b.classList.contains('closed'));blks.forEach((b,i)=>b.classList.toggle('closed',anyClosed?false:i>=n));sync();};bar.appendChild(btn);blks[0].parentElement.insertBefore(bar,blks[0]);sideEl.addEventListener('click',e=>{if(e.target.closest('.blk>h3'))setTimeout(sync,0);});sync();}};
// a county row (click -> cfg.onCounty). val = the figure on the right; sub = small line under the name
CM.countyRow=(f,val,sub)=>{const m=METRICS[state.base];const c=(m&&fillFor(m,f))||'var(--county-line)';return `<div class="row" data-county="${f}" tabindex="0"><span class="sw" style="--c:${c};background:${c}"></span><div><div class="n">${esc(cname[f])} County</div>${sub?`<div class="m">${sub}</div>`:''}</div><span class="v"><b>${val??''}</b></span></div>`;};
// a ranked list of counties for one metric: {metric, n, title, sub, desc, fmt(v), row(fips)->sub html}
CM.countyList=o=>{const m=METRICS[o.metric];if(!m)return '';const rows=CM.rank(o.metric,o.n||10,o.desc!==false);const fv=o.fmt||(v=>m.fmt(v)+(m.unit?' '+m.unit:''));
  return `<div class="blk"><h3>${esc(o.title||m.label)}${o.sub?` <small>${esc(o.sub)}</small>`:''}</h3>${rows.length?rows.map(f=>CM.countyRow(f,fv(m.values[f],f),o.row?o.row(f):'')).join(''):'<div class="empty">No data.</div>'}</div>`;};
CM.pinRow=(p,val)=>`<div class="row" data-pin="${esc(p.id)}" tabindex="0"><span class="sw dot pc${p.hot?' hot':''}" style="background:var(--pin-${css(p.status)})"></span><div><div class="n">${esc(p.name)}</div><div class="m">${esc(p.sub||'')}${p.sub?' · ':''}${esc(p.city||'')}${p.city?', ':''}${esc(p.county||cname[p.fips]||'')}</div></div><span class="v">${val??(p.value??'')}</span></div>`;
// "All <pins>": the Data Center Watch style list with status chips, a flagged-only chip and a sort menu; needs cfg.listMetric(p) -> {html, key}
CM.pinList=function(){if(!cfg.listMetric||!PINS.length)return '';
  const chips=Object.keys(STATUS).map(k=>`<button type="button" class="chip${fstate.status.has(k)?'':' off'}" data-s="${esc(k)}"><i class="pc" style="background:var(--pin-${css(k)})"></i>${esc(STATUS[k].label)}</button>`).join('')+(PINS.some(p=>p.hot)?`<button type="button" class="chip${fstate.hot?' on':''}" data-hot="1"><i></i>${esc(cfg.hotChip)}</button>`:'');
  const sortOpts=[['metric',cfg.listSortLabel],cfg.sizeLabel?['size',cfg.sizeLabel]:null,['name','A–Z'],['county','county']].filter(Boolean);
  return `<div class="blk" id="allpins"><h3>${esc(cfg.listTitle||'All '+cfg.pinPlural)} <small id="lcount"></small></h3><div class="chips">${chips}</div><div class="listhead"><span>Sorted by</span><select id="lsort" aria-label="Sort the list">${sortOpts.map(([k,l])=>`<option value="${k}"${fstate.sort===k?' selected':''}>${esc(l)}</option>`).join('')}</select></div><div class="rows"></div></div>`;};
function renderRows(){const box=document.querySelector('#allpins .rows');if(!box||!cfg.listMetric)return;const m=cfg.listMetric,key=p=>m(p).key,sz=p=>p.size||0;const list=PINS.filter(listable);
  list.sort((a,b)=>fstate.sort==='size'?sz(b)-sz(a):fstate.sort==='name'?a.name.localeCompare(b.name):fstate.sort==='county'?((a.county||'').localeCompare(b.county||'')||sz(b)-sz(a)):(typeof key(a)==='string'?(String(key(a)).localeCompare(String(key(b)))||sz(b)-sz(a)):((cfg.listAsc?key(a)-key(b):key(b)-key(a))||sz(b)-sz(a))));
  box.innerHTML=list.map(p=>CM.pinRow(p,m(p).html)).join('')||'<div class="empty">Nothing matches these filters.</div>';
  const c=$('lcount');if(c)c.textContent=list.length+' of '+PINS.length+' shown';}
CM.renderRows=renderRows;
// a pin's detail card: status, name, sub, place, p.details {label: html}, p.url/p.urlLabel, p.note
CM.pinHTML=function(p,extra=''){const st=STATUS[p.status]||{label:p.status};const kv=p.details?Object.entries(p.details).filter(([k,v])=>v!=null&&v!=='').map(([k,v])=>`<dt>${esc(k)}</dt><dd>${v}</dd>`).join(''):'';
  return `<div class="detail"><span class="status"><i class="pc" style="background:var(--pin-${css(p.status)})"></i>${esc(st.label)}</span>${p.hot?`<span class="hotflag">${esc(cfg.hotFlag)}</span>`:''}<h2>${esc(p.name)}</h2><div class="sub">${esc(p.sub||'')}${p.sub?' · ':''}${esc(p.city||'')}${p.city?', ':''}${esc(p.county||cname[p.fips]||'')} County</div>
  ${kv?`<dl class="kv">${kv}</dl>`:''}${extra}
  <div class="actions">${p.url?`<a class="primary" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.urlLabel||'Source')} ↗</a>`:''}${p.lat!=null?`<a href="https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}" target="_blank" rel="noopener">Map ↗</a>`:''}</div>${p.note?`<div class="note" style="padding:8px 0 0">${p.note}</div>`:''}</div>`;};

// ---------- clicks, tooltips, controls, legend ----------
function click(e,t){
  if(t.classList.contains('pin')){if(cfg.onPin)cfg.onPin(byId[t.dataset.id]);return;}
  if(t.classList.contains('district')){if(cfg.onDistrict)cfg.onDistrict(t.dataset.plan,+t.dataset.n);return;}
  if(t.classList.contains('county')){if(cfg.onCounty)cfg.onCounty(t.dataset.fips);return;}
  if(cfg.onBackground)cfg.onBackground();}
function pinTip(p){if(cfg.pinTip)return cfg.pinTip(p);const st=STATUS[p.status]||{label:''};const lines=[];
  if(state.rivers&&SW&&p.lon!=null){const [X,Y]=px(p.lon,p.lat);const rv=nearestRiver(X,Y,80);if(rv)lines.push(esc(rv.n)+' '+mi(rv.km)+' mi');}
  if(state.basins&&SW&&p.lon!=null){const b=basinOf(p.lon,p.lat);if(b)lines.push(esc(b.n)+' basin');}
  return `<b>${esc(p.name)}</b><small>${esc(st.label)}${p.sub?' · '+esc(p.sub):''}${p.tipExtra?' · '+p.tipExtra:''}</small><small>${esc(p.city||'')}${p.city?', ':''}${esc(p.county||cname[p.fips]||'')} County</small>${lines.length?`<small>${lines.join(' · ')}</small>`:''}`;}
function countyTip(f,e){const lines=[];const m=METRICS[state.base];if(m)lines.push(esc(m.label)+': '+(hasValue(m,f)?CM.fmtValue(m.key,f):esc(m.noneLabel||'none')));
  if(PINS.length){const n=PINS.filter(p=>p.fips===f&&visible(p)).length;lines.push(n+' '+(n===1?cfg.pinSingular:cfg.pinPlural)+(state.pins?'':' (hidden)'));}
  if(cfg.countyTip){const x=cfg.countyTip(f);if(x)lines.push(...[].concat(x).filter(Boolean));}
  const dpl=activePlan();if(dpl&&XW){const ds=CM.districtsOf(dpl,f);if(ds.length)lines.push(ds.length===1?esc(CM.districtName(dpl,ds[0][0])):ds.map(d=>esc(DS[dpl].short)+' '+d[0]+' ('+Math.round(d[2]*100)+'%)').join(', '));}
  const [lon,lat]=cursorLonLat(e);
  if(state.rivers&&SW){const [X,Y]=px(lon,lat);const rs=nearestReservoir(X,Y,lon,lat,0.01);if(rs&&rs.km===0)lines.push(esc(rs.n)+(rs.r.a?' · '+Math.round(rs.r.a*0.3861)+' sq mi':''));const rv=nearestRiver(X,Y,8/sc);if(rv)lines.push(esc(rv.n));}
  if(state.basins&&SW){const b=basinOf(lon,lat);if(b)lines.push(esc(b.n)+' River Basin');}
  if((state.aquifers||state.minor)&&AQ){const an=aquifersAt(lon,lat,state.minor).filter(n=>state.aquifers||n.endsWith('(minor)'));if(an.length)lines.push('Aquifer: '+esc(an.join(', ')));}
  return `<b>${esc(cname[f])} County</b>${lines.map(l=>`<small>${l}</small>`).join('')}`;}
function showTip(e){const t=e.target;const r=svg.getBoundingClientRect();
  if(t.classList.contains('pin'))tip.innerHTML=pinTip(byId[t.dataset.id]);
  else if(t.classList.contains('district'))tip.innerHTML=districtTip(t.dataset.plan,+t.dataset.n);
  else if(t.classList.contains('county'))tip.innerHTML=countyTip(t.dataset.fips,e);
  else{tip.style.display='none';return;}
  tip.style.display='block';const x=e.clientX-r.left+14,y=e.clientY-r.top+14;tip.style.left=Math.min(x,r.width-300)+'px';tip.style.top=Math.min(y,r.height-90)+'px';}
const caption=()=>{const m=METRICS[state.base];return m?(m.caption||''):'';};
function buildControls(){const L=$('layers');if(!L)return;const parts=[];
  if(cfg.controls.includes('pins')&&PINS.length)parts.push(`<label><input type="checkbox" id="c-pins"${state.pins?' checked':''}> ${esc(cfg.pinLabel)}</label>`);
  if(cfg.controls.includes('rivers')&&SW)parts.push(`<label><input type="checkbox" id="c-rivers"${state.rivers?' checked':''}> Rivers &amp; lakes</label>`);
  if(cfg.controls.includes('basins')&&SW)parts.push(`<label><input type="checkbox" id="c-basins"${state.basins?' checked':''}> River basins</label>`);
  if(cfg.controls.includes('aquifers')&&AQ)parts.push(`<label><input type="checkbox" id="c-aq"${state.aquifers?' checked':''}> Major aquifers</label>`,`<label><input type="checkbox" id="c-aqmi"${state.minor?' checked':''}> Minor aquifers</label>`);
  if(cfg.controls.includes('districts')&&DS){const fm=METRICS[state.base],forced=fm&&fm.plan?fm.plan:'';parts.push(`<label class="lsel" for="c-dist">District lines</label><select id="c-dist" aria-label="District lines"${forced?' disabled':''}><option value="">None</option>${Object.keys(DS).map(k=>`<option value="${esc(k)}"${(forced||state.plan)===k?' selected':''}>${esc(DS[k].label)}</option>`).join('')}</select>`);}
  if(cfg.controls.includes('base')&&ORDER.length){const groups=[...new Set(ORDER.map(k=>METRICS[k].group||''))];
    const opt=k=>`<option value="${esc(k)}"${state.base===k?' selected':''}>${esc(METRICS[k].label)}</option>`;
    parts.push(`<label class="lsel" for="c-base">Color the map by</label><select id="c-base" aria-label="Color the map by"><option value="">Nothing (plain map)</option>${groups.map(g=>g?`<optgroup label="${esc(g)}">${ORDER.filter(k=>(METRICS[k].group||'')===g).map(opt).join('')}</optgroup>`:ORDER.filter(k=>!METRICS[k].group).map(opt).join('')).join('')}</select><div class="lcap" id="c-cap">${caption()}</div>`);}
  L.innerHTML=parts.join('');
  const on=(id,fn)=>{const el=$(id);if(el)el.onchange=e=>{fn(e.target);CM.update();};};
  on('c-pins',el=>state.pins=el.checked);on('c-rivers',el=>state.rivers=el.checked);on('c-basins',el=>state.basins=el.checked);on('c-aq',el=>state.aquifers=el.checked);on('c-aqmi',el=>state.minor=el.checked);on('c-dist',el=>state.plan=el.value);on('c-base',el=>{state.base=el.value;const cap=$('c-cap');if(cap)cap.innerHTML=caption();});}
CM.update=function(){const m=METRICS[state.base]||null;
  svg.classList.toggle('choro',!!m);document.body.classList.toggle('shaded',!!m);
  gC.querySelectorAll('.county').forEach(p=>{const f=p.dataset.fips;if(m){const c=fillFor(m,f);p.style.fill=c||'';p.classList.toggle('nodata',!c);}else{p.style.fill='';p.classList.remove('nodata');}p.classList.toggle('hl',state.hl.has(f));});
  const hv=HV[isDark()?'dark':'light'];Object.keys(STATUS).forEach(k=>{const s=STATUS[k];document.body.style.setProperty('--pin-'+css(k),m?(s.shaded||hv[s.i%hv.length]):s.color);});
  const dpl=activePlan(),dm=(m&&m.plan&&DS&&DS[m.plan])?m:null;svg.classList.toggle('dfill',!!dm);
  if(DS){gD.querySelectorAll('g.plan').forEach(g=>g.style.display=g.dataset.plan===dpl?'':'none');gDL.querySelectorAll('g.plan').forEach(g=>g.style.display=g.dataset.plan===dpl?'':'none');
    gD.querySelectorAll('path.district').forEach(p=>{if(dm&&p.dataset.plan===dpl){const c=fillFor(dm,p.dataset.n);p.style.fill=c||'';p.classList.add('dfill');p.classList.toggle('nodata',!c);}else{p.style.fill='';p.classList.remove('dfill','nodata');}p.classList.toggle('hl',state.hld===p.dataset.plan+':'+p.dataset.n);});
    const dsel=$('c-dist');if(dsel){dsel.disabled=!!dm;dsel.value=dpl;}}
  if(gAqMa){gAqMa.style.display=state.aquifers?'':'none';gAqMi.style.display=state.minor?'':'none';gAqL.querySelectorAll('text').forEach(t=>t.style.display=(t.dataset.k==='major'?state.aquifers:(state.minor&&sc>1.8))?'':'none');}
  gBas.style.display=state.basins?'':'none';gRes.style.display=state.rivers?'':'none';gRiv.style.display=state.rivers?'':'none';gSWL.querySelectorAll('text').forEach(t=>t.style.display=(t.dataset.k==='basin'?state.basins:state.rivers)?'':'none');
  PINS.forEach(p=>{if(!p.el)return;p.el.classList.toggle('dim',!visible(p));p.el.classList.toggle('sel',p.id===state.selId);});
  if(state.selId&&byId[state.selId]&&byId[state.selId].el)gP.appendChild(byId[state.selId].el);
  legend();renderRows();if(cfg.onUpdate)cfg.onUpdate();};
CM.setBase=k=>{state.base=METRICS[k]?k:'';buildControls();CM.update();};
CM.setLayers=o=>{Object.assign(state,o);buildControls();CM.update();};
CM.setFilter=fn=>{state.filter=fn;CM.update();};
CM.highlightCounty=f=>{state.hl=new Set(f?[f]:[]);CM.update();};
CM.highlightCounties=list=>{state.hl=new Set(list||[]);CM.update();};
CM.highlightDistrict=(plan,n)=>{state.hld=plan?plan+':'+n:'';CM.update();};
CM.setPlan=k=>{state.plan=(DS&&DS[k])?k:'';buildControls();CM.update();};
CM.zoomDistrict=(plan,n)=>{const p=DS&&DS[plan];const d=p&&p.districts.find(x=>x.n==n);if(!d)return;const [x0,y0]=px(d.bb[0],d.bb[3]),[x1,y1]=px(d.bb[2],d.bb[1]);zoomTo(x0,y0,x1-x0,y1-y0);};
const activePlan=()=>{const m=METRICS[state.base];return (m&&m.plan&&DS&&DS[m.plan])?m.plan:((DS&&DS[state.plan])?state.plan:'');};CM.activePlan=activePlan;
function buildDistricts(){if(!DS)return;Object.keys(DS).forEach(k=>{const p=DS[k];const g=svgEl('g');g.setAttribute('class','plan');g.dataset.plan=k;g.style.display='none';const gl=svgEl('g');gl.setAttribute('class','plan');gl.dataset.plan=k;gl.style.display='none';
  p.districts.forEach(d=>{const e=svgEl('path');e.setAttribute('d',d.path);e.setAttribute('class','district');e.dataset.plan=k;e.dataset.n=d.n;g.appendChild(e);
    const t=svgEl('text');t.setAttribute('class','dlabel');t.setAttribute('x',d.cc[0]);t.setAttribute('y',d.cc[1]+3);t.textContent=d.n;t.dataset.plan=k;t.dataset.w=d.w;gl.appendChild(t);});gD.appendChild(g);gDL.appendChild(gl);});}
function scaleDistricts(k){if(!gDL)return;gDL.querySelectorAll('text').forEach(t=>{t.setAttribute('font-size',10*k*1.3);t.setAttribute('stroke-width',3*k);t.style.opacity=(+t.dataset.w)*sc>34?1:0;});}
function districtTip(plan,n){const m=METRICS[state.base];const lines=[];if(m&&m.plan===plan)lines.push(esc(m.label)+': '+(hasValue(m,String(n))?CM.fmtValue(m.key,String(n)):esc(m.noneLabel||'none')));
  const cs=CM.districtCounties(plan,n);if(cs.length)lines.push((cs.length>4?cs.slice(0,4).map(c=>esc(cname[c[0]])).join(', ')+' and '+(cs.length-4)+' more':cs.map(c=>esc(cname[c[0]])).join(', '))+(cs.length===1?' County':' counties'));
  if(cfg.districtTip){const x=cfg.districtTip(plan,n);if(x)lines.push(...[].concat(x).filter(Boolean));}
  return `<b>${esc(CM.districtName(plan,n))}</b><small>${esc(DS[plan].label)}</small>${lines.map(l=>`<small>${l}</small>`).join('')}`;}
// a district row (click -> cfg.onDistrict)
CM.districtRow=(plan,n,val,sub)=>{const m=METRICS[state.base];const c=(m&&m.plan===plan&&fillFor(m,String(n)))||'var(--county-line)';return `<div class="row" data-district="${esc(plan)}:${n}" tabindex="0"><span class="sw" style="--c:${c};background:${c}"></span><div><div class="n">${esc(CM.districtName(plan,n))}</div>${sub?`<div class="m">${sub}</div>`:''}</div><span class="v"><b>${val??''}</b></span></div>`;};
CM.select=id=>{state.selId=id;CM.update();};
function legend(){const L=$('legend');if(!L)return;let h='';
  if(state.pins&&PINS.length)h+=`<b>${esc(cfg.pinLabel)}</b>`+Object.keys(STATUS).map(k=>`<div class="r"><i class="pc" style="background:var(--pin-${css(k)})"></i>${esc(STATUS[k].label)}</div>`).join('')+(PINS.some(p=>p.hot)?`<div class="r"><i class="ring"></i>${esc(cfg.hotLabel)}</div>`:'')+(cfg.pinSizeNote?`<div class="foot">${cfg.pinSizeNote}</div>`:'');
  if(state.rivers&&SW)h+='<b>Rivers &amp; lakes</b><div class="r"><i class="rivsw"></i>Major river (hover for its name)</div><div class="r"><i class="ressw"></i>Major lake (names appear as you zoom in)</div>';
  if(state.aquifers&&AQ)h+='<b>Major aquifers</b>'+AQ.major.map(a=>`<div class="r"><i class="ramp" style="background:${AQCOL[a.n]||'#999'};opacity:.75"></i>${esc(a.n)}</div>`).join('');
  if(state.minor&&AQ)h+='<b>Minor aquifers</b><div class="r"><i class="aqmisw"></i>Minor aquifer outline (names appear as you zoom in)</div>';
  if(state.basins&&SW)h+='<b>River basins</b><div class="r"><i class="bassw"></i>Basin boundary: all the land that drains to that river</div>';
  const dpl=activePlan(),dmet=METRICS[state.base];if(dpl&&!(dmet&&dmet.plan))h+=`<b>District lines</b><div class="r"><i class="distsw"></i>${esc(DS[dpl].label)}${DS[dpl].districts.length>60?' (numbers appear as you zoom in)':''}</div>`;
  const m=METRICS[state.base];if(m){h+=`<b>${esc(m.legendTitle||m.label)}</b>`;if(m.cat)h+=Object.keys(m.categories).map(k=>`<div class="r"><i class="ramp" style="background:${m.categories[k].color};box-shadow:0 0 0 1px var(--county-line)"></i>${esc(m.categories[k].label||k)}</div>`).join('');else{const cols=colorsFor(m);h+=m.binLabels.map((l,i)=>`<div class="r"><i class="ramp" style="background:${cols[Math.min(i,cols.length-1)]}"></i>${esc(l)}</div>`).join('');}h+=`<div class="r"><i class="ramp none"></i>${esc(m.noneLabel||'None or no data')}</div>`;if(m.plan&&DS[m.plan])h+=`<div class="foot">Each shape is one district of ${esc(DS[m.plan].label)}; county lines show through faintly. Hover or click a district.</div>`;}
  if(cfg.legendNote)h+=`<div class="foot">${cfg.legendNote}</div>`;
  L.innerHTML=`<button class="lgt" type="button" aria-label="Show or hide the legend">Legend ▾</button><div class="lgbody">${h}</div>`;
  L.querySelector('.lgt').onclick=()=>L.classList.toggle('open');}
})();
