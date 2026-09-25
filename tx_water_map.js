/* Shared map engine for the standalone TWDB water maps (texas_aquifers_map.html, texas_rainfall_map.html, texas_wells_map.html).
   Load after: tx_counties.js, tx_dc_sites.js, tx_aquifers.js, tx_water_grid.js, tx_county_water.js.
   The page provides the skeleton (#map svg, #tip, #legend, #layers, #zin/#zout/#zfit) and calls WM.init({...}). */
(function(){
const WM=window.WM={};
const LAT0=31.3,K=Math.cos(LAT0*Math.PI/180);
const px=(lon,lat)=>[(lon+107)*K*100,(37-lat)*100], W=((-93+107)*K*100), H=(37-25.7)*100;
const $=id=>document.getElementById(id), svgEl=n=>document.createElementNS('http://www.w3.org/2000/svg',n);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtMW=m=>m>=1000?(m/1000).toFixed(m%1000?1:0)+' GW':m+' MW';
const num=n=>Number(n||0).toLocaleString();
const COUNTIES=window.TX_COUNTIES||{features:[]}, SITES=window.TX_DC_SITES||[], AQ=window.TX_AQUIFERS||{major:[],minor:[]};
const WATER=(window.TX_WATER&&window.TX_WATER.precip)?window.TX_WATER:null, CW=window.TX_COUNTY_WATER||{counties:{},use:{},total:0};
const COL={operating:'var(--op)',under_construction:'var(--uc)',proposed:'var(--pr)',withdrawn:'var(--wd)'};
const LBL={operating:'Operating',under_construction:'Under construction',proposed:'Proposed',withdrawn:'Withdrawn / blocked'};
const AQVAR={'Ogallala':'--aq-ogallala','Edwards-Trinity (Plateau)':'--aq-etp','Pecos Valley':'--aq-pecos','Trinity':'--aq-trinity','Edwards (Balcones Fault Zone)':'--aq-ebfz','Carrizo-Wilcox':'--aq-cw','Gulf Coast':'--aq-gc','Hueco-Mesilla Bolson':'--aq-hueco','Seymour':'--aq-cw'};
const EBFZ='Edwards (Balcones Fault Zone)';
Object.assign(WM,{px,K,esc,fmtMW,num,COL,LBL,AQVAR,EBFZ,sites:SITES,aq:AQ,water:WATER,cw:CW,counties:COUNTIES});

// ---------- decoding (see tx_aquifers.js / tx_water_grid.js headers) ----------
const B64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',B64I={};[...B64].forEach((c,i)=>B64I[c]=i);
function varints(str){const out=[];let v=0,m=1;for(let i=0;i<str.length;i++){const c=B64I[str[i]];v+=(c&31)*m;m*=32;if(c<32){out.push(v);v=0;m=1;}}return out;}
function decRing(str){const v=varints(str),pts=[];let x=0,y=0;for(let i=0;i<v.length;i+=2){x+=v[i]%2?-(v[i]+1)/2:v[i]/2;y+=v[i+1]%2?-(v[i+1]+1)/2:v[i+1]/2;pts.push([x/1000,y/1000]);}return pts;}
function ringsPath(rings){let d='';rings.forEach(r=>{r.forEach((p,i)=>{const [x,y]=px(p[0],p[1]);d+=(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1);});d+='Z';});return d;}
function inRings(a,lon,lat){if(lon<a.bb[0]||lon>a.bb[2]||lat<a.bb[1]||lat>a.bb[3])return false;let ins=false;for(const r of a.rings){for(let i=0,j=r.length-1;i<r.length;j=i++){const xi=r[i][0],yi=r[i][1],xj=r[j][0],yj=r[j][1];if((yi>lat)!==(yj>lat)&&lon<(xj-xi)*(lat-yi)/(yj-yi)+xi)ins=!ins;}}return ins;}
['major','minor'].forEach(k=>AQ[k].forEach(a=>{if(a.r){a.rings=a.r.map(decRing);delete a.r;}let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;a.rings.forEach(r=>r.forEach(p=>{if(p[0]<x0)x0=p[0];if(p[0]>x1)x1=p[0];if(p[1]<y0)y0=p[1];if(p[1]>y1)y1=p[1];}));a.bb=[x0,y0,x1,y1];a.kind=k;}));
if(WATER){Object.keys(WATER).forEach(k=>{const g=WATER[k];if(!g||!g.d||g.a)return;const v=varints(g.d);const a=new Uint16Array(g.cols*g.rows);let p=0;for(let i=0;i<v.length;i+=2){a.fill(v[i],p,p+v[i+1]);p+=v[i+1];}g.a=a;});}
function gval(g,lon,lat){const c=Math.floor((lon-g.west)/g.res),r=Math.floor((g.north-lat)/g.res);return(c<0||r<0||c>=g.cols||r>=g.rows)?0:g.a[r*g.cols+c];}
function near(g,lon,lat,km){if(!g||!g.a)return 0;const cl=Math.cos(lat*Math.PI/180);let n=0;const dc=Math.ceil(km/(111.32*cl*g.res)),dr=Math.ceil(km/(110.57*g.res));const c0=Math.floor((lon-g.west)/g.res),r0=Math.floor((g.north-lat)/g.res);
  for(let r=r0-dr;r<=r0+dr;r++)for(let c=c0-dc;c<=c0+dc;c++){if(r<0||c<0||r>=g.rows||c>=g.cols)continue;const dx=(g.west+(c+.5)*g.res-lon)*111.32*cl,dy=(g.north-(r+.5)*g.res-lat)*110.57;if(dx*dx+dy*dy<=km*km)n+=g.a[r*g.cols+c];}return n;}
const wellsNear=(lon,lat,km)=>WATER?near(WATER.wells,lon,lat,km):0;
function waterAt(lon,lat){const o={ma:AQ.major.filter(a=>inRings(a,lon,lat)).sort((a,b)=>(a.n===EBFZ?0:1)-(b.n===EBFZ?0:1)),mi:AQ.minor.filter(a=>inRings(a,lon,lat))};if(WATER){o.rain=gval(WATER.precip,lon,lat);o.wells=gval(WATER.wells,lon,lat);o.recent=WATER.recent?gval(WATER.recent,lon,lat):0;o.newwells=WATER.newwells?gval(WATER.newwells,lon,lat):0;}return o;}
Object.assign(WM,{waterAt,wellsNear,near,gval,inRings});
SITES.forEach(s=>{const w=waterAt(s.lon,s.lat);s.aqMs=w.ma.map(a=>a.n);s.aqM=s.aqMs[0]||null;s.aqm=w.mi.map(a=>a.n);s.rain=w.rain||0;s.recent=w.recent||0;s.wellsCell=w.wells||0;s.newwellsCell=w.newwells||0;s.wells10=wellsNear(s.lon,s.lat,10);s.newwells10=WATER&&WATER.newwells?near(WATER.newwells,s.lon,s.lat,10):0;});
// ---------- surface water (TWDB major rivers, reservoirs, river basins) ----------
const SW=window.TX_SURFACE||null;
function bbOf(lists){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;lists.forEach(r=>r.forEach(p=>{if(p[0]<x0)x0=p[0];if(p[0]>x1)x1=p[0];if(p[1]<y0)y0=p[1];if(p[1]>y1)y1=p[1];}));return [x0,y0,x1,y1];}
if(SW){
  SW.rivers.forEach(r=>{r.lines=r.l.map(decRing);delete r.l;r.bb=bbOf(r.lines);r.pl=r.lines.map(l=>l.map(p=>px(p[0],p[1])));const L=r.lines.reduce((a,b)=>b.length>a.length?b:a,[]);r.c=L[Math.floor(L.length/2)];});
  SW.reservoirs.forEach(r=>{r.rings=r.r.map(decRing);delete r.r;r.bb=bbOf(r.rings);r.pr=r.rings.map(l=>l.map(p=>px(p[0],p[1])));});
  SW.basins.forEach(b=>{b.rings=b.r.map(decRing);delete b.r;b.bb=bbOf(b.rings);});
}
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
if(SW)SITES.forEach(s=>{const [X,Y]=px(s.lon,s.lat);s.river=nearestRiver(X,Y,80);s.res=nearestReservoir(X,Y,s.lon,s.lat,80);const b=basinOf(s.lon,s.lat);s.basin=b?b.n:null;});
Object.assign(WM,{sw:SW,nearestRiver,nearestReservoir,basinOf});
const byId={};SITES.forEach(s=>byId[s.id]=s);WM.byId=byId;
WM.projects=SITES.filter(s=>s.kind!=='facility'&&s.status!=='withdrawn');

// ---------- ramps / bins (same as the Data Center Watch map) ----------
const ORANGE={light:['#f9d7cb','#efb19b','#e28969','#d45e2f','#af4517','#883008'],dark:['#883008','#af4517','#d45e2f','#e28969','#efb19b','#f9d7cb']};
const RAMP={precip:{light:['#cde2fb','#9ec5f4','#6da7ec','#3987e5','#256abf','#184f95'],dark:['#184f95','#256abf','#3987e5','#6da7ec','#9ec5f4','#cde2fb']},
            wells:ORANGE,newwells:ORANGE,
            // diverging: dry (orange) <- neutral gray -> wet (blue); extremes are darkest in light mode, lightest in dark mode
            recent:{light:['#883008','#d45e2f','#efb19b','#eceae4','#9ec5f4','#3987e5','#184f95'],dark:['#efb19b','#e28969','#d45e2f','#3a3f4a','#3987e5','#6da7ec','#9ec5f4']}};
const BINS={precip:[12,20,28,36,48],wells:[3,6,11,21,41],newwells:[3,6,11,21,41],recent:[50,70,90,110,130,150]};
const BINLBL={precip:['under 12','12–20','20–28','28–36','36–48','48 and up'],wells:['1–2','3–5','6–10','11–20','21–40','41 and up'],newwells:['1–2','3–5','6–10','11–20','21–40','41 and up'],
              recent:['under half the usual rain (below 50%)','much drier: 50–70% of usual','drier: 70–90%','about usual: 90–110%','wetter: 110–130%','much wetter: 130–150%','over 1.5× the usual rain']};
const BASEOPT={aquifers:'Major aquifers',precip:'Average yearly rainfall',recent:'Last 12 months vs. average',wells:'All recorded wells',newwells:'Water wells drilled since 2020'};
const BASEGROUP={aquifers:'Aquifers',precip:'Rainfall',recent:'Rainfall',wells:'Groundwater wells',newwells:'Groundwater wells'};
const hasBase=k=>k==='aquifers'?AQ.major.length>0:!!(WATER&&WATER[k]);
function baseCaption(k){const g=(WATER&&WATER[k])||{};return k==='aquifers'?'The nine major aquifers mapped by TWDB, one color each. Where two stack, a site lists both.':k==='precip'?`Average rain per year, ${g.label?g.label.replace('PRISM ',''):'1991–2020'} (PRISM)`:k==='recent'?`Rain in ${g.label||'the last 12 months'} as a share of the ${g.normal||'1991–2020'} average. Orange = drier than usual, blue = wetter.`:k==='wells'?'TWDB-recorded wells per ~10 square miles':k==='newwells'?`Water-supply wells drilled since ${(g.since||'2020').slice(0,4)} per ~10 square miles (driller's reports)`:'';}
function binTitle(k){const g=(WATER&&WATER[k])||{};return k==='precip'?`Average yearly rainfall, inches (${g.label||'normal'})`:k==='recent'?`Rain, ${g.label||'last 12 months'}, compared with the ${g.normal||'1991–2020'} average`:k==='wells'?'Recorded wells per ~10 sq mi':`Water wells drilled since ${(g.since||'2020').slice(0,4)}, per ~10 sq mi`;}
const BINTITLE={get precip(){return binTitle('precip');},get recent(){return binTitle('recent');},get wells(){return binTitle('wells');},get newwells(){return binTitle('newwells');}};
function binOf(v,b){let i=0;while(i<b.length&&v>=b[i])i++;return i;}
function isDark(){const t=document.documentElement.dataset.theme;return t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);}
function ramp(kind){return RAMP[kind][isDark()?'dark':'light'];}
Object.assign(WM,{RAMP,BINS,BINLBL,BINTITLE,BASEOPT,BASEGROUP,baseCaption,binTitle,binOf,isDark,ramp});
const rasterCache={};
function rasterURL(kind){const key=kind+(isDark()?'d':'l');if(rasterCache[key])return rasterCache[key];const g=WATER[kind],cv=document.createElement('canvas');cv.width=g.cols;cv.height=g.rows;const ctx=cv.getContext('2d'),img=ctx.createImageData(g.cols,g.rows);
  const rg=ramp(kind).map(h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]),b=BINS[kind];
  for(let i=0;i<g.a.length;i++){const v=g.a[i];if(!v)continue;const c=rg[binOf(v,b)];img.data[i*4]=c[0];img.data[i*4+1]=c[1];img.data[i*4+2]=c[2];img.data[i*4+3]=255;}
  ctx.putImageData(img,0,0);return rasterCache[key]=cv.toDataURL();}

// ---------- county geometry ----------
const cname={},cpath={},ccent={},cbbox={};
COUNTIES.features.forEach(f=>{let d='',sx=0,sy=0,n=0,x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  const polys=f.geometry.type==='MultiPolygon'?f.geometry.coordinates:[f.geometry.coordinates];
  polys.forEach(poly=>poly.forEach(ring=>{ring.forEach((p,i)=>{const [x,y]=px(p[0],p[1]);d+=(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1);sx+=x;sy+=y;n++;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;});d+='Z';}));
  cpath[f.id]=d;ccent[f.id]=[sx/n,sy/n];cbbox[f.id]=[x0,y0,x1-x0,y1-y0];cname[f.id]=f.properties.name;});
Object.assign(WM,{cname,ccent,cbbox});

// ---------- map ----------
let svg,view,gC,gL,gWR,gAqMi,gAqMa,gAqLn,gAqL,gP,gBas,gRes,gRiv,gSWL,tip,cfg,tx=0,ty=0,sc=1,drag=null;
const state={major:false,minor:false,base:'',pins:true,colo:false,rivers:false,basins:false,aqlines:false,filter:null,hlAq:null,hlCounty:null,selId:null};WM.state=state;
const rad=s=>s.kind==='facility'?2.6:(s.mw?Math.max(4,Math.min(13,2.5+Math.sqrt(s.mw)/6)):4.5);
const fstate={status:new Set(['operating','under_construction','proposed']),hot:false,sort:'metric'};WM.fstate=fstate;
const listable=s=>(state.colo||s.kind!=='facility')&&s.status!=='withdrawn'&&fstate.status.has(s.status)&&(!fstate.hot||s.hot);
function visible(s){return state.pins&&listable(s)&&(!state.filter||state.filter(s));}
// "All data center projects": the Data Center Watch list, with this map's water figure on every row
WM.siteList=function(){if(!cfg.listMetric)return '';
  const chips=[['operating','Operating'],['under_construction','Under construction'],['proposed','Proposed']].map(([k,l])=>`<button type="button" class="chip${fstate.status.has(k)?'':' off'}" data-s="${k}"><i style="background:${COL[k]}"></i>${l}</button>`).join('')+`<button type="button" class="chip${fstate.hot?' on':''}" data-hot="1"><i></i>Contested only</button>`;
  return `<div class="blk" id="allsites"><h3>All data center projects <small id="lcount"></small></h3><div class="chips">${chips}</div><div class="listhead"><span>Sorted by</span><select id="lsort" aria-label="Sort the list"><option value="metric"${fstate.sort==='metric'?' selected':''}>${esc(cfg.listSortLabel||'this map')}</option><option value="mw"${fstate.sort==='mw'?' selected':''}>largest (MW)</option><option value="name"${fstate.sort==='name'?' selected':''}>A–Z</option><option value="county"${fstate.sort==='county'?' selected':''}>county</option></select></div><div class="rows"></div></div>`;};
function renderRows(){const box=document.querySelector('#allsites .rows');if(!box||!cfg.listMetric)return;const m=cfg.listMetric,key=s=>m(s).key;const list=SITES.filter(listable);
  list.sort((a,b)=>fstate.sort==='mw'?(b.mw||0)-(a.mw||0):fstate.sort==='name'?a.name.localeCompare(b.name):fstate.sort==='county'?(a.county.localeCompare(b.county)||(b.mw||0)-(a.mw||0)):(typeof key(a)==='string'?(String(key(a)).localeCompare(String(key(b)))||(b.mw||0)-(a.mw||0)):((cfg.listAsc?key(a)-key(b):key(b)-key(a))||(b.mw||0)-(a.mw||0))));
  box.innerHTML=list.map(s=>WM.siteRow(s,m(s).html)).join('')||'<div class="empty">No sites match these filters.</div>';
  const c=$('lcount');if(c)c.textContent=list.length+' of '+SITES.filter(s=>s.kind!=='facility'&&s.status!=='withdrawn').length+' shown';}
WM.renderRows=renderRows;
WM.visible=visible;
function apply(){view.setAttribute('transform',`translate(${tx} ${ty}) scale(${sc})`);const k=1/sc;
  gP.querySelectorAll('.pin').forEach(p=>p.setAttribute('r',rad(byId[p.dataset.id])*Math.sqrt(k)));
  gL.style.display=sc>2.2?'':'none';gL.querySelectorAll('text').forEach(t=>t.setAttribute('font-size',9*k*1.3));
  gAqL.querySelectorAll('text').forEach(t=>{t.setAttribute('font-size',(t.dataset.k==='major'?11:8.5)*k*1.25);t.setAttribute('stroke-width',3*k);if(t.dataset.k==='minor')t.style.opacity=sc>1.6?1:0;});
  gSWL.querySelectorAll('text').forEach(t=>{const kind=t.dataset.k;t.setAttribute('font-size',(kind==='basin'?10.5:kind==='river'?9.5:8.5)*k*1.25);t.setAttribute('stroke-width',(kind==='basin'?3:2.5)*k);t.style.opacity=kind==='basin'?((t.dataset.coastal==='1'&&sc<=1.5)||(state.base==='aquifers'&&sc<=1.3)?0:1):kind==='river'?(sc>1.3?1:0):(sc>1.8?1:0);});
  ['hatch-mi','hatch-aq'].forEach(id=>$(id).setAttribute('patternTransform','rotate(45) scale('+k+')'));}
function fit(){const r=svg.getBoundingClientRect();sc=Math.min(r.width/W,r.height/H)*.96;tx=(r.width-W*sc)/2;ty=(r.height-H*sc)/2;apply();}
function zoomTo(bx,by,bw,bh){const r=svg.getBoundingClientRect();sc=Math.min(r.width/(bw*1.6),r.height/(bh*1.6),40);tx=r.width/2-(bx+bw/2)*sc;ty=r.height/2-(by+bh/2)*sc;apply();}
function zoomAt(f,cx,cy){const r=svg.getBoundingClientRect();cx=cx??r.width/2;cy=cy??r.height/2;const ns=Math.max(.5,Math.min(60,sc*f));tx=cx-(cx-tx)*ns/sc;ty=cy-(cy-ty)*ns/sc;sc=ns;apply();}
function cursorLonLat(e){const r=svg.getBoundingClientRect();return [((e.clientX-r.left-tx)/sc)/(K*100)-107,37-((e.clientY-r.top-ty)/sc)/100];}
Object.assign(WM,{fit,zoomTo,zoomAt,
  zoomLonLat:(lon,lat,span=50)=>{const [x,y]=px(lon,lat);zoomTo(x-span/2,y-span/2,span,span);},
  zoomAquifer:name=>{const a=AQ.major.concat(AQ.minor).find(a=>a.n===name);if(!a)return;const [x0,y1]=px(a.bb[0],a.bb[1]),[x1,y0]=px(a.bb[2],a.bb[3]);zoomTo(x0,y0,x1-x0,y1-y0);},
  zoomCounty:f=>{if(cbbox[f])zoomTo(...cbbox[f]);},
  zoomSite:s=>{const [x,y]=px(s.lon,s.lat);zoomTo(x-25,y-25,50,50);}});

WM.init=function(c){
  cfg=Object.assign({major:false,minor:false,base:'',pins:true,colo:false,rivers:false,basins:false,aqlines:false,controls:['pins','colo','aqlines','rivers','basins','base'],baseChoices:null,onSite:null,onCounty:null,onAquifer:null,onBackground:null,legendNote:''},c);
  if(!cfg.baseChoices)cfg.baseChoices=Object.keys(BASEOPT).filter(hasBase);
  Object.assign(state,{major:false,minor:cfg.minor,base:hasBase(cfg.base)?cfg.base:'',pins:cfg.pins,colo:cfg.colo,rivers:!!SW&&cfg.rivers,basins:!!SW&&cfg.basins,aqlines:!!cfg.aqlines});
  if(cfg.major&&!state.base)state.base='aquifers';   // legacy config: 'major aquifers on' means shade by aquifers
  // shareable links work the same on every page: #shade=precip|recent|wells|newwells|none and #layers=major,minor
  const hh=decodeURIComponent(location.hash||'').replace(/^#/,'');let hm;
  if((hm=/(?:^|&)shade=([a-z]+)/.exec(hh))){const k={aquifers:'aquifers',aq:'aquifers',rain:'precip',precip:'precip',normal:'precip',recent:'recent',wells:'wells',new:'newwells',newwells:'newwells',none:''}[hm[1]];if(k!==undefined&&(k===''||hasBase(k)))state.base=k;}
  if((hm=/(?:^|&)layers=([a-z,]*)/.exec(hh))){const L=hm[1].split(',');if((L.includes('major')||L.includes('aquifers'))&&!/shade=/.test(hh))state.base='aquifers';state.minor=L.includes('minor');state.rivers=!!SW&&L.includes('rivers');state.basins=!!SW&&L.includes('basins');state.aqlines=L.includes('outlines')||L.includes('aqlines');}
  svg=$('map');tip=$('tip');
  // overlays panel lives on the map (collapsed by default on phones); an old sidebar #layers container is retired
  const oldL=$('layers');if(oldL)oldL.remove();
  const lp=document.createElement('div');lp.className='lpanel'+(window.innerWidth<=800?' closed':'');lp.id='lpanel';
  lp.innerHTML='<button class="lpt" type="button">Map overlays <span class="chev">▾</span></button><div class="lbody" id="layers"></div>';
  svg.parentElement.appendChild(lp);lp.querySelector('.lpt').onclick=()=>lp.classList.toggle('closed');
  const sideEl=$('side');if(sideEl){sideEl.addEventListener('click',e=>{const h=e.target.closest('.blk>h3');if(h)h.parentElement.classList.toggle('closed');
    const ch=e.target.closest('#allsites .chip');if(!ch)return;if(ch.dataset.hot){fstate.hot=!fstate.hot;ch.classList.toggle('on',fstate.hot);}else{const k=ch.dataset.s;if(fstate.status.has(k))fstate.status.delete(k);else fstate.status.add(k);ch.classList.toggle('off',!fstate.status.has(k));}WM.update();});
    sideEl.addEventListener('change',e=>{if(e.target.id==='lsort'){fstate.sort=e.target.value;renderRows();}});}
  svg.innerHTML='<defs><pattern id="hatch-mi" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5"/></pattern><pattern id="hatch-aq" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5"/></pattern></defs><g id="view"><image id="wraster" preserveAspectRatio="none" style="display:none"></image><g id="counties"></g><g id="aq-minor"></g><g id="aq-major"></g><g id="aq-lines"></g><g id="basins"></g><g id="reservoirs"></g><g id="rivers"></g><g id="clabels"></g><g id="aq-labels"></g><g id="sw-labels"></g><g id="pins"></g></g>';
  view=$('view');gC=$('counties');gL=$('clabels');gWR=$('wraster');gAqMi=$('aq-minor');gAqMa=$('aq-major');gAqLn=$('aq-lines');gAqL=$('aq-labels');gP=$('pins');gBas=$('basins');gRes=$('reservoirs');gRiv=$('rivers');gSWL=$('sw-labels');
  if(SW){
    const linesPath=ls=>{let d='';ls.forEach(l=>l.forEach((p,i)=>{d+=(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1);}));return d;};
    SW.basins.forEach(b=>{const p=svgEl('path');p.setAttribute('d',ringsPath(b.rings));p.setAttribute('class','basin');p.dataset.n=b.n;gBas.appendChild(p);
      const t=svgEl('text');t.setAttribute('class','swlabel basin');const [lx,ly]=px(b.c[0],b.c[1]);t.setAttribute('x',lx);t.setAttribute('y',ly);t.textContent=b.n;t.dataset.k='basin';if(b.n.includes('-'))t.dataset.coastal='1';gSWL.appendChild(t);});
    SW.reservoirs.forEach((r,i)=>{const p=svgEl('path');p.setAttribute('d',ringsPath(r.rings));p.setAttribute('class','res');p.dataset.n=r.n;gRes.appendChild(p);
      if(i<30){const t=svgEl('text');t.setAttribute('class','swlabel res');const [lx,ly]=px(r.c[0],r.c[1]);t.setAttribute('x',lx);t.setAttribute('y',ly);t.textContent=r.n;t.dataset.k='res';gSWL.appendChild(t);}});
    SW.rivers.forEach(r=>{const d=linesPath(r.pl);const c=svgEl('path');c.setAttribute('d',d);c.setAttribute('class','river-case');gRiv.appendChild(c);const p=svgEl('path');p.setAttribute('d',d);p.setAttribute('class','river');p.dataset.n=r.n;gRiv.appendChild(p);
      const t=svgEl('text');t.setAttribute('class','swlabel river');const [lx,ly]=px(r.c[0],r.c[1]);t.setAttribute('x',lx);t.setAttribute('y',ly-2);t.textContent=r.n;t.dataset.k='river';gSWL.appendChild(t);});
  }
  COUNTIES.features.forEach(f=>{const p=svgEl('path');p.setAttribute('d',cpath[f.id]);p.setAttribute('class','county');p.dataset.fips=f.id;gC.appendChild(p);
    const t=svgEl('text');t.setAttribute('class','clabel');t.setAttribute('x',ccent[f.id][0]);t.setAttribute('y',ccent[f.id][1]+3);t.textContent=f.properties.name;gL.appendChild(t);});
  [['major',gAqMa],['minor',gAqMi]].forEach(([k,g])=>AQ[k].forEach(a=>{const p=svgEl('path');p.setAttribute('d',ringsPath(a.rings));p.setAttribute('class','aq '+k);p.dataset.n=a.n;
    if(k==='major'){p.style.fill=a.n==='Seymour'?'url(#hatch-aq)':`var(${AQVAR[a.n]})`;p.style.stroke=`var(${AQVAR[a.n]})`;}
    a.el=p;g.appendChild(p);
    const t=svgEl('text');t.setAttribute('class','aqlabel '+(k==='major'?'ma':'mi'));const [lx,ly]=px(a.c[0],a.c[1]);t.setAttribute('x',lx);t.setAttribute('y',ly);t.textContent=a.n;t.dataset.k=k;a.label=t;gAqL.appendChild(t);}));
  // outline set: only rings covering roughly 500 sq km or more (about 400 projected units), so the overlay stays clean; the fill view keeps every pod
  const ringArea=r=>{let s=0;for(let i=0,j=r.length-1;i<r.length;j=i++){const [x0,y0]=px(r[j][0],r[j][1]),[x1,y1]=px(r[i][0],r[i][1]);s+=x0*y1-x1*y0;}return Math.abs(s)/2;};
  AQ.major.forEach(a=>{const big=a.rings.filter(r=>ringArea(r)>=400);if(!big.length)return;const d=ringsPath(big);
    const c=svgEl('path');c.setAttribute('d',d);c.setAttribute('class','aqline-case');gAqLn.appendChild(c);
    const p=svgEl('path');p.setAttribute('d',d);p.setAttribute('class','aqline');p.style.stroke=`var(${AQVAR[a.n]})`;p.dataset.n=a.n;gAqLn.appendChild(p);});
  SITES.forEach(s=>{const [x,y]=px(s.lon,s.lat);const c=svgEl('circle');c.setAttribute('cx',x);c.setAttribute('cy',y);c.setAttribute('r',rad(s));c.setAttribute('fill',COL[s.status]||'#888');c.setAttribute('class','pin'+(s.hot?' hot':''));c.dataset.id=s.id;s.el=c;gP.appendChild(c);});
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
  try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{for(const k in rasterCache)delete rasterCache[k];WM.update();});}catch(e){}
  buildControls();initHeader();initSearch();initAbout();initWelcome();WM.update();fit();
};
const PAGES=[['texas_aquifers_map.html','Aquifers'],['texas_rainfall_map.html','Rainfall'],['texas_wells_map.html','Wells'],['texas_data_center_map.html','Data Center Watch']];
function initHeader(){const hdr=document.querySelector('header');if(!hdr)return;const here=(location.pathname.split('/').pop()||'');hdr.querySelectorAll('.src').forEach(e=>e.remove());
  const nav=document.createElement('nav');nav.className='mapnav';nav.setAttribute('aria-label','Other maps');nav.innerHTML=PAGES.map(([f,l])=>`<a href="${f}"${f===here?' class="cur" aria-current="page"':''}>${l}</a>`).join('');
  const btn=document.createElement('button');btn.type='button';btn.className='aboutbtn';btn.textContent='About this map';btn.onclick=()=>WM.openAbout();
  const anchor=hdr.querySelector('.allmaps');if(anchor){anchor.after(nav);nav.after(btn);}else{hdr.appendChild(nav);hdr.appendChild(btn);}}
function initSearch(){const aside=document.querySelector('aside'),side=$('side');if(!aside||!side||$('q'))return;
  const box=document.createElement('div');box.className='search';box.innerHTML='<input id="q" type="search" placeholder="Search a city, county, company or site…" autocomplete="off" aria-label="Search"><div class="sugg" id="sugg" role="listbox"></div>';aside.insertBefore(box,side);
  const q=box.querySelector('input'),sg=box.querySelector('.sugg');let items=[];const P=WM.projects;
  const cities={};P.forEach(s=>{if(!s.city)return;const k=s.city.toLowerCase()+'|'+s.fips;cities[k]=cities[k]||{city:s.city,county:s.county,fips:s.fips,n:0};cities[k].n++;});
  const co=s=>(s.operator||'').split(/[\/(,;]/)[0].trim();const ops={};P.forEach(s=>{const o=co(s);if(o)ops[o]=(ops[o]||0)+1;});
  function build(v){v=v.toLowerCase();items=[];
    Object.keys(cname).filter(f=>cname[f].toLowerCase().startsWith(v)).slice(0,4).forEach(f=>items.push({t:cname[f]+' County',k:'county',f}));
    Object.values(cities).filter(c=>c.city.toLowerCase().startsWith(v)).slice(0,4).forEach(c=>items.push({t:c.city+', '+c.county+' County',k:'city',c}));
    Object.keys(ops).filter(o=>o.toLowerCase().includes(v)).sort((a,b)=>ops[b]-ops[a]).slice(0,4).forEach(o=>items.push({t:o+' ('+ops[o]+')',k:'company',o}));
    P.filter(s=>s.name.toLowerCase().includes(v)).slice(0,6).forEach(s=>items.push({t:s.name,k:'site',s}));
    sg.innerHTML=items.map((it,i)=>`<div role="option" data-i="${i}">${esc(it.t)}<small>${it.k}</small></div>`).join('');sg.style.display=items.length?'block':'none';}
  function pick(it){sg.style.display='none';q.value='';
    if(it.k==='county'&&cfg.onCounty)cfg.onCounty(it.f);else if(it.k==='city'&&cfg.onCounty)cfg.onCounty(it.c.fips);
    else if(it.k==='site'&&cfg.onSite)cfg.onSite(it.s);else if(it.k==='company')showCompany(it.o);WM.closeAside();}
  function showCompany(o){WM.highlightCounty(null);WM.select(null);WM.setFilter(s=>co(s)===o);WM.fit();const list=P.filter(s=>co(s)===o).sort((a,b)=>(b.mw||0)-(a.mw||0));
    side.innerHTML=`<div class="detail"><button class="back" id="back">← Back</button><h2>${esc(o)}</h2><div class="sub">${list.length} project${list.length===1?'':'s'} in Texas · ${fmtMW(Math.round(list.reduce((t,s)=>t+(s.mw||0),0)))} announced</div></div><div class="blk"><h3>Sites <small>largest first</small></h3>${list.map(s=>WM.siteRow(s)).join('')}</div>`;
    $('back').onclick=()=>{WM.setFilter(null);if(cfg.onBackground)cfg.onBackground();};}
  q.addEventListener('input',()=>{const v=q.value.trim();if(v.length<2){sg.style.display='none';return;}build(v);});
  sg.addEventListener('mousedown',e=>{const d=e.target.closest('[data-i]');if(d){e.preventDefault();pick(items[+d.dataset.i]);}});
  q.addEventListener('keydown',e=>{if(e.key==='Enter'&&items.length)pick(items[0]);if(e.key==='Escape')sg.style.display='none';});
  q.addEventListener('blur',()=>setTimeout(()=>sg.style.display='none',150));}
function initWelcome(){let seen=false;try{seen=localStorage.getItem('txwater_welcome')==='1';}catch(e){}if(seen||cfg.noWelcome)return;
  const tips=cfg.welcomeTips||['Every dot is a data center project. Bigger dots are bigger projects, and a red ring means local opposition.','Hover a dot or a county for details; click for the full water story.','Use <b>Map overlays</b> (top right) to color the map by aquifers, rainfall or wells.'];
  if(window.innerWidth<=800)tips.push('Tap <b>List</b> for search and the rankings.');
  const w=document.createElement('div');w.className='welcome';w.setAttribute('role','dialog');w.innerHTML=`<h2>${cfg.welcomeTitle||'Texas data centers and water'}</h2><ol>${tips.map(t=>`<li>${t}</li>`).join('')}</ol><button type="button">Explore the map</button>`;
  svg.parentElement.appendChild(w);w.querySelector('button').onclick=()=>{w.remove();try{localStorage.setItem('txwater_welcome','1');}catch(e){}};}
function initAbout(){const here=(location.pathname.split('/').pop()||'');const panel=document.createElement('div');panel.className='about';panel.innerHTML=`<div class="aboutbox"><button class="close" aria-label="Close">×</button><h2>About this map</h2>${cfg.about||''}
    <h3>Where the data comes from</h3><ul><li><b>Data center sites</b>: Texas Data Center Watch, which tracks every announced project. A dot sits at the reported site when it is known, otherwise at the city or county center; each site card says which.</li>
    <li><b>Aquifers, rivers, lakes, river basins and well records</b>: the Texas Water Development Board, the state's water agency. Well records are refreshed nightly.</li>
    <li><b>Rainfall</b>: the PRISM Climate Group at Oregon State University, the standard source for U.S. rainfall averages (1991–2020) and recent months.</li></ul>
    <h3>Things to keep in mind</h3><ul><li>A well count is the number of wells on record, not how much water is pumped. "Drilled since 2020" counts only wells whose driller filed a report.</li><li>Rainfall for the most recent months is provisional and can shift slightly as more station data arrive.</li><li>Aquifer and river outlines are simplified for a statewide map; where two aquifers stack, a site counts toward both.</li><li>A site's water values are read at its dot; for a dot placed at a city or county center they describe that spot, not the parcel.</li></ul>
    <h3>See also</h3><p>${PAGES.filter(([f])=>f!==here).map(([f,l])=>`<a href="${f}">${l}</a>`).join(' · ')} · <a href="index.html">All maps</a></p>
    <p class="fine">Full technical notes and download links are in the repository's WATER_MAPS.md.</p></div>`;
  document.body.appendChild(panel);const close=()=>panel.classList.remove('open');panel.querySelector('.close').onclick=close;panel.addEventListener('click',e=>{if(e.target===panel)close();});document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  WM.openAbout=()=>panel.classList.add('open');document.addEventListener('click',e=>{if(e.target.closest('.aboutlink')){e.preventDefault();WM.openAbout();}});}
WM.glance=facts=>`<div class="blk glance"><h3>At a glance</h3><ul class="facts">${facts.map(f=>`<li>${f}</li>`).join('')}</ul></div>`;
WM.note=text=>`<div class="note">${text} <a href="#" class="aboutlink">About this map and its data</a></div>`;
WM.closeAside=()=>{if(window.innerWidth<=800)document.querySelector('aside').classList.remove('open');};
function click(e,t){
  if(t.classList.contains('pin')){if(cfg.onSite)cfg.onSite(byId[t.dataset.id]);return;}
  const [lon,lat]=cursorLonLat(e);
  if(cfg.onAquifer&&(state.major||state.minor)){const w=waterAt(lon,lat);const a=(state.major&&w.ma[0])||(state.minor&&w.mi[0]);if(a){cfg.onAquifer(a.n,a.kind);return;}}
  if(t.classList.contains('county')){if(cfg.onCounty)cfg.onCounty(t.dataset.fips);return;}
  if(cfg.onBackground)cfg.onBackground();
}
function siteTip(s){const p=[];if(state.major||state.aqlines)p.push(s.aqMs.length?s.aqMs.map(esc).join(' + ')+' aquifer':'no major aquifer');if(state.rivers&&s.river)p.push(esc(s.river.n)+' '+mi(s.river.km)+' mi');if(state.basins&&s.basin)p.push(esc(s.basin)+' basin');if(WATER){p.push(state.base==='recent'?(s.recent?s.recent+'% of usual rain, last 12 mo':''):(s.rain?s.rain+' in/yr rain':''));p.push(state.base==='newwells'?num(s.newwells10)+' wells drilled since 2020 within 6 mi':num(s.wells10)+' wells within 6 mi');}
  return `<b>${esc(s.name)}</b><small>${esc(s.operator||'')} · ${LBL[s.status]}${s.mw?' · '+fmtMW(s.mw):''}</small><small>${esc(s.city||'')}, ${esc(s.county)} County</small><small>${p.filter(Boolean).join(' · ')}</small>`;}
function countyTip(f,e){const c=CW.counties[f]||{};const n=SITES.filter(s=>s.fips===f&&visible(s)).length;const [lon,lat]=cursorLonLat(e);const w=waterAt(lon,lat);const p=[];
  if(state.major||state.aqlines)p.push(w.ma.length?w.ma.map(a=>esc(a.n)).join(' + ')+' aquifer':'no major aquifer here');
  if(state.rivers&&SW){const [X,Y]=px(lon,lat);const rs=nearestReservoir(X,Y,lon,lat,0.01);if(rs&&rs.km===0)p.push(esc(rs.n)+' · '+Math.round(rs.r.a*0.3861)+' sq mi'+(rs.r.t==='supply'?' · water supply':''));const rv=nearestRiver(X,Y,8/sc);if(rv)p.push(esc(rv.n));}
  if(state.basins&&SW){const b=basinOf(lon,lat);if(b)p.push(esc(b.n)+' River Basin');}
  if(state.base==='precip'&&w.rain)p.push(w.rain+' in/yr here');if(state.base==='recent'&&w.recent)p.push(w.recent+'% of usual rain here, last 12 mo');if(state.base==='wells')p.push(w.wells+' well'+(w.wells===1?'':'s')+' in this cell');if(state.base==='newwells')p.push(w.newwells+' well'+(w.newwells===1?'':'s')+' drilled since 2020 in this cell');
  return `<b>${esc(cname[f])} County</b><small>${c.r?'avg. rainfall '+c.r+' in/yr · ':''}${c.p?'last 12 mo '+c.p+'% of usual · ':''}${num(c.w)} TWDB wells${c.nw?' · '+num(c.nw)+' drilled since 2020':''} · ${n} data center site${n===1?'':'s'} shown</small>${p.length?`<small>${p.join(' · ')}</small>`:''}`;}
function showTip(e){const t=e.target;const r=svg.getBoundingClientRect();
  if(t.classList.contains('pin'))tip.innerHTML=siteTip(byId[t.dataset.id]);
  else if(t.classList.contains('county'))tip.innerHTML=countyTip(t.dataset.fips,e);
  else{tip.style.display='none';return;}
  tip.style.display='block';const x=e.clientX-r.left+14,y=e.clientY-r.top+14;tip.style.left=Math.min(x,r.width-300)+'px';tip.style.top=Math.min(y,r.height-90)+'px';}
function buildControls(){const L=$('layers');if(!L)return;const parts=[];
  if(cfg.controls.includes('pins'))parts.push(`<label><input type="checkbox" id="c-pins"${state.pins?' checked':''}> Data center sites</label>`);
  if(cfg.controls.includes('colo'))parts.push(`<label><input type="checkbox" id="c-colo"${state.colo?' checked':''}> Small colocation sites</label>`);
    if(cfg.controls.includes('minor'))parts.push(`<label><input type="checkbox" id="c-minor"${state.minor?' checked':''}> Minor aquifers</label>`);
  if(cfg.controls.includes('aqlines')&&AQ.major.length)parts.push(`<label id="l-aqlines"><input type="checkbox" id="c-aqlines"${state.aqlines?' checked':''}> Aquifer outlines</label>`);
  if(cfg.controls.includes('rivers')&&SW)parts.push(`<label><input type="checkbox" id="c-rivers"${state.rivers?' checked':''}> Rivers &amp; lakes</label>`);
  if(cfg.controls.includes('basins')&&SW)parts.push(`<label><input type="checkbox" id="c-basins"${state.basins?' checked':''}> River basins</label>`);
  if(cfg.controls.includes('base')){const groups=[...new Set(cfg.baseChoices.filter(hasBase).map(k=>BASEGROUP[k]))];
    parts.push(`<label class="lsel" for="c-base">Color the map by</label><select id="c-base" aria-label="Shade the map by"><option value="">Nothing (plain map)</option>${groups.map(gname=>`<optgroup label="${gname}">${cfg.baseChoices.filter(k=>hasBase(k)&&BASEGROUP[k]===gname).map(k=>`<option value="${k}"${state.base===k?' selected':''}>${BASEOPT[k]}</option>`).join('')}</optgroup>`).join('')}</select><div class="lcap" id="c-cap">${baseCaption(state.base)}</div>`);}
  L.innerHTML=parts.join('');
  const on=(id,fn)=>{const el=$(id);if(el)el.onchange=e=>{fn(e.target);WM.update();};};
  on('c-pins',el=>state.pins=el.checked);on('c-colo',el=>state.colo=el.checked);on('c-major',el=>state.major=el.checked);on('c-minor',el=>state.minor=el.checked);on('c-aqlines',el=>state.aqlines=el.checked);on('c-rivers',el=>state.rivers=el.checked);on('c-basins',el=>state.basins=el.checked);on('c-base',el=>{state.base=el.value;const cap=$('c-cap');if(cap)cap.textContent=baseCaption(state.base);});}
WM.update=function(){
  state.major=state.base==='aquifers';const lines=state.aqlines&&!state.major;
  gAqMa.style.display=state.major?'':'none';gAqLn.style.display=lines?'':'none';gAqMi.style.display=state.minor?'':'none';
  const la=$('l-aqlines');if(la)la.style.display=state.major?'none':'';
  gAqL.querySelectorAll('text').forEach(t=>t.style.display=(t.dataset.k==='major'?(state.major||lines):state.minor)?'':'none');
  gBas.style.display=state.basins?'':'none';gRes.style.display=state.rivers?'':'none';gRiv.style.display=state.rivers?'':'none';gSWL.querySelectorAll('text').forEach(t=>t.style.display=(t.dataset.k==='basin'?state.basins:state.rivers)?'':'none');
  if(state.base&&WATER&&WATER[state.base]){const g=WATER[state.base];const [ix,iy]=px(g.west,g.north);gWR.setAttribute('x',ix);gWR.setAttribute('y',iy);gWR.setAttribute('width',g.cols*g.res*K*100);gWR.setAttribute('height',g.rows*g.res*100);gWR.setAttribute('href',rasterURL(state.base));gWR.style.display='';svg.classList.add('base-on');}
  else{gWR.style.display='none';svg.classList.remove('base-on');}
  document.body.classList.toggle('shaded',!!state.base);
  SITES.forEach(s=>s.el.classList.toggle('dim',!visible(s)));
  gAqMa.classList.toggle('has-hl',!!state.hlAq&&AQ.major.some(a=>a.n===state.hlAq));gAqMi.classList.toggle('has-hl',!!state.hlAq&&AQ.minor.some(a=>a.n===state.hlAq));
  AQ.major.concat(AQ.minor).forEach(a=>a.el.classList.toggle('hl',a.n===state.hlAq));
  gC.querySelectorAll('.county').forEach(p=>p.classList.toggle('hl',p.dataset.fips===state.hlCounty));
  gP.querySelectorAll('.pin').forEach(p=>p.classList.toggle('sel',p.dataset.id===state.selId));
  if(state.selId&&byId[state.selId])gP.appendChild(byId[state.selId].el);
  legend();renderRows();if(cfg.onUpdate)cfg.onUpdate();
};
WM.setFilter=fn=>{state.filter=fn;WM.update();};
WM.highlightAquifer=n=>{state.hlAq=n;WM.update();};
WM.highlightCounty=f=>{state.hlCounty=f;WM.update();};
WM.select=id=>{state.selId=id;WM.update();};
WM.setLayers=o=>{if(o.major!==undefined){o.base=o.major?'aquifers':(state.base==='aquifers'?'':state.base);delete o.major;}Object.assign(state,o);buildControls();WM.update();};
WM.collapseAfter=n=>{const sideEl=$('side');if(!sideEl)return;const blks=[...sideEl.querySelectorAll('.blk')];blks.forEach((b,i)=>{if(i>=n)b.classList.add('closed');});
  if(blks.length>n){const bar=document.createElement('div');bar.className='secbar';const btn=document.createElement('button');btn.type='button';const sync=()=>{const anyClosed=blks.some(b=>b.classList.contains('closed'));btn.textContent=anyClosed?`Show all ${blks.length} sections ▾`:'Collapse sections ▴';};
    btn.onclick=()=>{const anyClosed=blks.some(b=>b.classList.contains('closed'));blks.forEach((b,i)=>b.classList.toggle('closed',anyClosed?false:i>=n));sync();};bar.appendChild(btn);blks[0].parentElement.insertBefore(bar,blks[0]);sideEl.addEventListener('click',e=>{if(e.target.closest('.blk>h3'))setTimeout(sync,0);});sync();}};
function legend(){const L=$('legend');if(!L)return;let h='';
  if(state.pins)h+='<b>Data center sites</b>'+['operating','under_construction','proposed'].map(k=>`<div class="r"><i style="background:${COL[k]}"></i>${LBL[k]}</div>`).join('')+'<div class="r"><i class="ring"></i>Red ring: local opposition or a lawsuit</div><div class="foot">Bigger dots are bigger projects (announced power).</div>';
  if(state.major)h+='<b>Major aquifers (TWDB)</b>'+AQ.major.map(a=>`<div class="r"><i class="aqsw${a.n==='Seymour'?' hsw':''}" style="--c:var(${AQVAR[a.n]})"></i>${esc(a.n)}</div>`).join('');
  else if(state.aqlines)h+='<b>Aquifer outlines</b>'+AQ.major.map(a=>`<div class="r"><i class="aqsw ol" style="--c:var(${AQVAR[a.n]})"></i>${esc(a.n)}</div>`).join('');
  if(state.minor)h+='<b>Minor aquifers (TWDB)</b><div class="r"><i class="misw"></i>22 minor aquifers — hover or zoom in for names</div>';
  if(state.rivers&&SW)h+='<b>Rivers &amp; lakes</b><div class="r"><i class="rivsw"></i>Major river (hover for its name)</div><div class="r"><i class="ressw"></i>Major lake (names appear as you zoom in)</div>';
  if(state.basins&&SW)h+='<b>River basins</b><div class="r"><i class="bassw"></i>Basin boundary: all the land that drains to that river</div>';
  if(state.base&&WATER&&WATER[state.base]){const rg=ramp(state.base);h+=`<b>${binTitle(state.base)}</b>`+BINLBL[state.base].map((l,i)=>`<div class="r"><i class="ramp" style="background:${rg[i]}"></i>${l}</div>`).join('');}
  if(cfg.legendNote)h+=`<div class="foot">${cfg.legendNote}</div>`;
  L.innerHTML=`<button class="lgt" type="button" aria-label="Show or hide the legend">Legend ▾</button><div class="lgbody">${h}</div>`;
  L.querySelector('.lgt').onclick=()=>L.classList.toggle('open');}

// ---------- shared HTML fragments ----------
WM.siteHTML=function(s,extra=''){const prec=s.precision==='site'?'the reported site':s.precision==='city'?'the city-center pin (exact parcel not published)':'the county-center pin (only the county is known)';
  return `<div class="detail"><span class="status"><i style="background:${COL[s.status]}"></i>${LBL[s.status]}${s.kind==='facility'?' · colocation':''}</span>${s.hot?'<span class="hotflag">Contested</span>':''}<h2>${esc(s.name)}</h2><div class="sub">${esc(s.operator||'')}${s.operator?' · ':''}${esc(s.city||'')}, ${esc(s.county)} County</div>
  <dl class="kv">${s.mw?`<dt>Capacity</dt><dd>${fmtMW(s.mw)}</dd>`:''}<dt>Major aquifer${s.aqMs.length>1?'s':''}</dt><dd>${s.aqMs.length?esc(s.aqMs.join(' + '))+(s.aqMs.length>1?' <span class="empty" style="padding:0">(stacked)</span>':''):'<span class="empty" style="padding:0">none mapped at this point</span>'}</dd>${WATER?`<dt>Rainfall</dt><dd>${s.rain?s.rain+' in/yr average ('+esc(WATER.precip.label||'normal')+')':'—'}</dd>${WATER.recent?`<dt>Last 12 months</dt><dd>${s.recent?s.recent+'% of the usual rain ('+esc(WATER.recent.label||'')+')':'—'}</dd>`:''}<dt>Wells nearby</dt><dd>${num(s.wells10)} TWDB-recorded wells within ~6 mi${WATER.newwells?'<br>'+num(s.newwells10)+' water wells drilled since 2020 within ~6 mi':''}</dd>`:''}${SW?`<dt>Surface water</dt><dd>${s.river?'Nearest major river: '+esc(s.river.n)+', '+mi(s.river.km)+' mi':'No major river within 50 mi'}${s.res?'<br>Nearest major reservoir: '+esc(s.res.n)+', '+mi(s.res.km)+' mi':''}${s.basin?'<br>'+esc(s.basin)+' River Basin':''}</dd>`:''}</dl>${extra}
  <div class="actions"><a class="primary" href="texas_data_center_map.html" title="Opens the Data Center Watch map; search the site name there">Data Center Watch ↗</a><a href="https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lon}" target="_blank" rel="noopener">Map ↗</a></div>
  <div class="note" style="padding:8px 0 0">Read at ${prec}. TWDB aquifers, rivers, reservoirs, basins and well records; rainfall from PRISM (Oregon State University). Distances are straight-line; a well count says nothing about volumes pumped.</div></div>`;};
WM.siteRow=function(s,val){return `<div class="row" data-site="${esc(s.id)}" tabindex="0"><span class="sw dot${s.hot?' hot':''}" style="background:${COL[s.status]}"></span><div><div class="n">${esc(s.name)}</div><div class="m">${esc(s.operator||'')}${s.operator?' · ':''}${esc(s.city||'')}, ${esc(s.county)}</div></div><span class="v">${val??(s.mw?fmtMW(s.mw):'')}</span></div>`;};
WM.useBars=function(u,total){const order=['Irrigation','Domestic','Livestock','Public supply','Industrial','Unused','Other','Unknown'];const t=total||Object.values(u).reduce((a,b)=>a+b,0);if(!t)return '<div class="empty">No TWDB wells recorded.</div>';
  return order.filter(k=>u[k]).map(k=>`<div class="row" style="cursor:default;grid-template-columns:1fr auto"><div><div class="m" style="color:var(--ink)">${k}</div><div class="bar"><i style="width:${(100*u[k]/t).toFixed(1)}%"></i></div></div><span class="v"><b>${num(u[k])}</b><br>${(100*u[k]/t).toFixed(0)}%</span></div>`).join('');};
})();
