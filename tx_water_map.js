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
if(WATER){['precip','wells'].forEach(k=>{const g=WATER[k];if(g.a)return;const v=varints(g.d);const a=new Uint16Array(g.cols*g.rows);let p=0;for(let i=0;i<v.length;i+=2){a.fill(v[i],p,p+v[i+1]);p+=v[i+1];}g.a=a;});}
function gval(g,lon,lat){const c=Math.floor((lon-g.west)/g.res),r=Math.floor((g.north-lat)/g.res);return(c<0||r<0||c>=g.cols||r>=g.rows)?0:g.a[r*g.cols+c];}
function wellsNear(lon,lat,km){if(!WATER)return 0;const g=WATER.wells,cl=Math.cos(lat*Math.PI/180);let n=0;const dc=Math.ceil(km/(111.32*cl*g.res)),dr=Math.ceil(km/(110.57*g.res));const c0=Math.floor((lon-g.west)/g.res),r0=Math.floor((g.north-lat)/g.res);
  for(let r=r0-dr;r<=r0+dr;r++)for(let c=c0-dc;c<=c0+dc;c++){if(r<0||c<0||r>=g.rows||c>=g.cols)continue;const dx=(g.west+(c+.5)*g.res-lon)*111.32*cl,dy=(g.north-(r+.5)*g.res-lat)*110.57;if(dx*dx+dy*dy<=km*km)n+=g.a[r*g.cols+c];}return n;}
function waterAt(lon,lat){const o={ma:AQ.major.filter(a=>inRings(a,lon,lat)).sort((a,b)=>(a.n===EBFZ?0:1)-(b.n===EBFZ?0:1)),mi:AQ.minor.filter(a=>inRings(a,lon,lat))};if(WATER){o.rain=gval(WATER.precip,lon,lat);o.wells=gval(WATER.wells,lon,lat);}return o;}
Object.assign(WM,{waterAt,wellsNear,gval,inRings});
SITES.forEach(s=>{const w=waterAt(s.lon,s.lat);s.aqMs=w.ma.map(a=>a.n);s.aqM=s.aqMs[0]||null;s.aqm=w.mi.map(a=>a.n);s.rain=w.rain||0;s.wellsCell=w.wells||0;s.wells10=wellsNear(s.lon,s.lat,10);});
const byId={};SITES.forEach(s=>byId[s.id]=s);WM.byId=byId;
WM.projects=SITES.filter(s=>s.kind!=='facility'&&s.status!=='withdrawn');

// ---------- ramps / bins (same as the Data Center Watch map) ----------
const RAMP={precip:{light:['#cde2fb','#9ec5f4','#6da7ec','#3987e5','#256abf','#184f95'],dark:['#184f95','#256abf','#3987e5','#6da7ec','#9ec5f4','#cde2fb']},
            wells:{light:['#f9d7cb','#efb19b','#e28969','#d45e2f','#af4517','#883008'],dark:['#883008','#af4517','#d45e2f','#e28969','#efb19b','#f9d7cb']}};
const BINS={precip:[12,20,28,36,48],wells:[3,6,11,21,41]};
const BINLBL={precip:['under 12','12–20','20–28','28–36','36–48','48 and up'],wells:['1–2','3–5','6–10','11–20','21–40','41 and up']};
const BINTITLE={precip:'Avg. annual rainfall, inches/yr (NRCS 1981–2010)',wells:'TWDB-recorded wells per ~10 sq mi cell'};
function binOf(v,b){let i=0;while(i<b.length&&v>=b[i])i++;return i;}
function isDark(){const t=document.documentElement.dataset.theme;return t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);}
function ramp(kind){return RAMP[kind][isDark()?'dark':'light'];}
Object.assign(WM,{RAMP,BINS,BINLBL,BINTITLE,binOf,isDark,ramp});
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
let svg,view,gC,gL,gWR,gAqMi,gAqMa,gAqL,gP,tip,cfg,tx=0,ty=0,sc=1,drag=null;
const state={major:false,minor:false,base:'',pins:true,colo:false,filter:null,hlAq:null,hlCounty:null,selId:null};WM.state=state;
const rad=s=>s.kind==='facility'?2.6:(s.mw?Math.max(4,Math.min(13,2.5+Math.sqrt(s.mw)/6)):4.5);
function visible(s){return state.pins&&(state.colo||s.kind!=='facility')&&s.status!=='withdrawn'&&(!state.filter||state.filter(s));}
WM.visible=visible;
function apply(){view.setAttribute('transform',`translate(${tx} ${ty}) scale(${sc})`);const k=1/sc;
  gP.querySelectorAll('.pin').forEach(p=>p.setAttribute('r',rad(byId[p.dataset.id])*Math.sqrt(k)));
  gL.style.display=sc>2.2?'':'none';gL.querySelectorAll('text').forEach(t=>t.setAttribute('font-size',9*k*1.3));
  gAqL.querySelectorAll('text').forEach(t=>{t.setAttribute('font-size',(t.dataset.k==='major'?11:8.5)*k*1.25);t.setAttribute('stroke-width',3*k);if(t.dataset.k==='minor')t.style.opacity=sc>1.6?1:0;});
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
  cfg=Object.assign({major:false,minor:false,base:'',pins:true,colo:false,controls:['pins','colo','major','minor','base'],onSite:null,onCounty:null,onAquifer:null,onBackground:null,legendNote:''},c);
  Object.assign(state,{major:cfg.major,minor:cfg.minor,base:WATER?cfg.base:'',pins:cfg.pins,colo:cfg.colo});
  svg=$('map');tip=$('tip');
  svg.innerHTML='<defs><pattern id="hatch-mi" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5"/></pattern><pattern id="hatch-aq" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5"/></pattern></defs><g id="view"><image id="wraster" preserveAspectRatio="none" style="display:none"></image><g id="counties"></g><g id="aq-minor"></g><g id="aq-major"></g><g id="clabels"></g><g id="aq-labels"></g><g id="pins"></g></g>';
  view=$('view');gC=$('counties');gL=$('clabels');gWR=$('wraster');gAqMi=$('aq-minor');gAqMa=$('aq-major');gAqL=$('aq-labels');gP=$('pins');
  COUNTIES.features.forEach(f=>{const p=svgEl('path');p.setAttribute('d',cpath[f.id]);p.setAttribute('class','county');p.dataset.fips=f.id;gC.appendChild(p);
    const t=svgEl('text');t.setAttribute('class','clabel');t.setAttribute('x',ccent[f.id][0]);t.setAttribute('y',ccent[f.id][1]+3);t.textContent=f.properties.name;gL.appendChild(t);});
  [['major',gAqMa],['minor',gAqMi]].forEach(([k,g])=>AQ[k].forEach(a=>{const p=svgEl('path');p.setAttribute('d',ringsPath(a.rings));p.setAttribute('class','aq '+k);p.dataset.n=a.n;
    if(k==='major'){p.style.fill=a.n==='Seymour'?'url(#hatch-aq)':`var(${AQVAR[a.n]})`;p.style.stroke=`var(${AQVAR[a.n]})`;}
    a.el=p;g.appendChild(p);
    const t=svgEl('text');t.setAttribute('class','aqlabel '+(k==='major'?'ma':'mi'));const [lx,ly]=px(a.c[0],a.c[1]);t.setAttribute('x',lx);t.setAttribute('y',ly);t.textContent=a.n;t.dataset.k=k;a.label=t;gAqL.appendChild(t);}));
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
  buildControls();WM.update();fit();
};
WM.closeAside=()=>{if(window.innerWidth<=800)document.querySelector('aside').classList.remove('open');};
function click(e,t){
  if(t.classList.contains('pin')){if(cfg.onSite)cfg.onSite(byId[t.dataset.id]);return;}
  const [lon,lat]=cursorLonLat(e);
  if(cfg.onAquifer&&(state.major||state.minor)){const w=waterAt(lon,lat);const a=(state.major&&w.ma[0])||(state.minor&&w.mi[0]);if(a){cfg.onAquifer(a.n,a.kind);return;}}
  if(t.classList.contains('county')){if(cfg.onCounty)cfg.onCounty(t.dataset.fips);return;}
  if(cfg.onBackground)cfg.onBackground();
}
function siteTip(s){const p=[];if(state.major)p.push(s.aqMs.length?s.aqMs.map(esc).join(' + ')+' aquifer':'no major aquifer');if(state.minor&&s.aqm.length)p.push(s.aqm.map(esc).join(', ')+' (minor)');if(WATER){p.push(s.rain?s.rain+' in/yr rain':'');p.push(num(s.wells10)+' wells within 6 mi');}
  return `<b>${esc(s.name)}</b><small>${esc(s.operator||'')} · ${LBL[s.status]}${s.mw?' · '+fmtMW(s.mw):''}</small><small>${esc(s.city||'')}, ${esc(s.county)} County</small><small>${p.filter(Boolean).join(' · ')}</small>`;}
function countyTip(f,e){const c=CW.counties[f]||{};const n=SITES.filter(s=>s.fips===f&&visible(s)).length;const [lon,lat]=cursorLonLat(e);const w=waterAt(lon,lat);const p=[];
  if(state.major)p.push(w.ma.length?w.ma.map(a=>esc(a.n)).join(' + ')+' aquifer':'no major aquifer here');if(state.minor&&w.mi.length)p.push(w.mi.map(a=>esc(a.n)).join(', ')+' (minor)');
  if(state.base==='precip'&&w.rain)p.push(w.rain+' in/yr here');if(state.base==='wells')p.push(w.wells+' well'+(w.wells===1?'':'s')+' in this cell');
  return `<b>${esc(cname[f])} County</b><small>${c.r?'avg. rainfall '+c.r+' in/yr · ':''}${num(c.w)} TWDB wells · ${n} data center site${n===1?'':'s'} shown</small>${p.length?`<small>${p.join(' · ')}</small>`:''}`;}
function showTip(e){const t=e.target;const r=svg.getBoundingClientRect();
  if(t.classList.contains('pin'))tip.innerHTML=siteTip(byId[t.dataset.id]);
  else if(t.classList.contains('county'))tip.innerHTML=countyTip(t.dataset.fips,e);
  else{tip.style.display='none';return;}
  tip.style.display='block';const x=e.clientX-r.left+14,y=e.clientY-r.top+14;tip.style.left=Math.min(x,r.width-300)+'px';tip.style.top=Math.min(y,r.height-90)+'px';}
function buildControls(){const L=$('layers');if(!L)return;const parts=[];
  if(cfg.controls.includes('pins'))parts.push(`<label><input type="checkbox" id="c-pins"${state.pins?' checked':''}> Data center sites</label>`);
  if(cfg.controls.includes('colo'))parts.push(`<label><input type="checkbox" id="c-colo"${state.colo?' checked':''}> Colocation facilities</label>`);
  if(cfg.controls.includes('major'))parts.push(`<label><input type="checkbox" id="c-major"${state.major?' checked':''}> Major aquifers</label>`);
  if(cfg.controls.includes('minor'))parts.push(`<label><input type="checkbox" id="c-minor"${state.minor?' checked':''}> Minor aquifers</label>`);
  if(cfg.controls.includes('base')&&WATER)parts.push(`<select id="c-base" aria-label="Base shading"><option value="">No base shading</option><option value="precip"${state.base==='precip'?' selected':''}>Shade: avg. annual rainfall</option><option value="wells"${state.base==='wells'?' selected':''}>Shade: groundwater well density</option></select>`);
  L.innerHTML=parts.join('');
  const on=(id,fn)=>{const el=$(id);if(el)el.onchange=e=>{fn(e.target);WM.update();};};
  on('c-pins',el=>state.pins=el.checked);on('c-colo',el=>state.colo=el.checked);on('c-major',el=>state.major=el.checked);on('c-minor',el=>state.minor=el.checked);on('c-base',el=>state.base=el.value);}
WM.update=function(){
  gAqMa.style.display=state.major?'':'none';gAqMi.style.display=state.minor?'':'none';
  gAqL.querySelectorAll('text').forEach(t=>t.style.display=(t.dataset.k==='major'?state.major:state.minor)?'':'none');
  if(state.base&&WATER){const g=WATER[state.base];const [ix,iy]=px(g.west,g.north);gWR.setAttribute('x',ix);gWR.setAttribute('y',iy);gWR.setAttribute('width',g.cols*g.res*K*100);gWR.setAttribute('height',g.rows*g.res*100);gWR.setAttribute('href',rasterURL(state.base));gWR.style.display='';svg.classList.add('base-on');}
  else{gWR.style.display='none';svg.classList.remove('base-on');}
  SITES.forEach(s=>s.el.classList.toggle('dim',!visible(s)));
  gAqMa.classList.toggle('has-hl',!!state.hlAq&&AQ.major.some(a=>a.n===state.hlAq));gAqMi.classList.toggle('has-hl',!!state.hlAq&&AQ.minor.some(a=>a.n===state.hlAq));
  AQ.major.concat(AQ.minor).forEach(a=>a.el.classList.toggle('hl',a.n===state.hlAq));
  gC.querySelectorAll('.county').forEach(p=>p.classList.toggle('hl',p.dataset.fips===state.hlCounty));
  gP.querySelectorAll('.pin').forEach(p=>p.classList.toggle('sel',p.dataset.id===state.selId));
  if(state.selId&&byId[state.selId])gP.appendChild(byId[state.selId].el);
  legend();if(cfg.onUpdate)cfg.onUpdate();
};
WM.setFilter=fn=>{state.filter=fn;WM.update();};
WM.highlightAquifer=n=>{state.hlAq=n;WM.update();};
WM.highlightCounty=f=>{state.hlCounty=f;WM.update();};
WM.select=id=>{state.selId=id;WM.update();};
WM.setLayers=o=>{Object.assign(state,o);buildControls();WM.update();};
function legend(){const L=$('legend');if(!L)return;let h='';
  if(state.pins)h+='<b>Data center sites</b>'+['operating','under_construction','proposed'].map(k=>`<div class="r"><i style="background:${COL[k]}"></i>${LBL[k]}</div>`).join('')+'<div class="r"><i class="ring"></i>Contested (opposition, lawsuit, water/air fight)</div>';
  if(state.major)h+='<b>Major aquifers (TWDB)</b>'+AQ.major.map(a=>`<div class="r"><i class="aqsw${a.n==='Seymour'?' hsw':''}" style="--c:var(${AQVAR[a.n]})"></i>${esc(a.n)}</div>`).join('');
  if(state.minor)h+='<b>Minor aquifers (TWDB)</b><div class="r"><i class="misw"></i>22 minor aquifers — hover or zoom in for names</div>';
  if(state.base&&WATER){const rg=ramp(state.base);h+=`<b>${BINTITLE[state.base]}</b>`+BINLBL[state.base].map((l,i)=>`<div class="r"><i class="ramp" style="background:${rg[i]}"></i>${l}</div>`).join('');}
  if(cfg.legendNote)h+=`<div class="foot">${cfg.legendNote}</div>`;
  L.innerHTML=`<button class="lgt" type="button" aria-label="Show or hide the legend">Legend ▾</button><div class="lgbody">${h}</div>`;
  L.querySelector('.lgt').onclick=()=>L.classList.toggle('open');}

// ---------- shared HTML fragments ----------
WM.siteHTML=function(s,extra=''){const prec=s.precision==='site'?'the reported site':s.precision==='city'?'the city-center pin (exact parcel not published)':'the county-center pin (only the county is known)';
  return `<div class="detail"><span class="status"><i style="background:${COL[s.status]}"></i>${LBL[s.status]}${s.kind==='facility'?' · colocation':''}</span>${s.hot?'<span class="hotflag">Contested</span>':''}<h2>${esc(s.name)}</h2><div class="sub">${esc(s.operator||'')}${s.operator?' · ':''}${esc(s.city||'')}, ${esc(s.county)} County</div>
  <dl class="kv">${s.mw?`<dt>Capacity</dt><dd>${fmtMW(s.mw)}</dd>`:''}<dt>Major aquifer${s.aqMs.length>1?'s':''}</dt><dd>${s.aqMs.length?esc(s.aqMs.join(' + '))+(s.aqMs.length>1?' <span class="empty" style="padding:0">(stacked)</span>':''):'<span class="empty" style="padding:0">none mapped at this point</span>'}</dd><dt>Minor aquifer</dt><dd>${s.aqm.length?esc(s.aqm.join(', ')):'<span class="empty" style="padding:0">none</span>'}</dd>${WATER?`<dt>Rainfall</dt><dd>${s.rain?s.rain+' in/yr average (1981–2010)':'—'}</dd><dt>Wells nearby</dt><dd>${num(s.wells10)} TWDB-recorded wells within ~6 mi</dd>`:''}</dl>${extra}
  <div class="actions"><a class="primary" href="texas_data_center_map.html" title="Opens the Data Center Watch map; search the site name there">Data Center Watch ↗</a><a href="https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lon}" target="_blank" rel="noopener">Map ↗</a></div>
  <div class="note" style="padding:8px 0 0">Read at ${prec}. TWDB aquifer outlines, NRCS rainfall and TWDB well records; a well count says nothing about volumes pumped.</div></div>`;};
WM.siteRow=function(s,val){return `<div class="row" data-site="${esc(s.id)}" tabindex="0"><span class="sw dot${s.hot?' hot':''}" style="background:${COL[s.status]}"></span><div><div class="n">${esc(s.name)}</div><div class="m">${esc(s.operator||'')}${s.operator?' · ':''}${esc(s.city||'')}, ${esc(s.county)}</div></div><span class="v">${val??(s.mw?fmtMW(s.mw):'')}</span></div>`;};
WM.useBars=function(u,total){const order=['Irrigation','Domestic','Livestock','Public supply','Industrial','Unused','Other','Unknown'];const t=total||Object.values(u).reduce((a,b)=>a+b,0);if(!t)return '<div class="empty">No TWDB wells recorded.</div>';
  return order.filter(k=>u[k]).map(k=>`<div class="row" style="cursor:default;grid-template-columns:1fr auto"><div><div class="m" style="color:var(--ink)">${k}</div><div class="bar"><i style="width:${(100*u[k]/t).toFixed(1)}%"></i></div></div><span class="v"><b>${num(u[k])}</b><br>${(100*u[k]/t).toFixed(0)}%</span></div>`).join('');};
})();
