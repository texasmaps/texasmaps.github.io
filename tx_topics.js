/* tx_topics.js — the topic registry for texas_county_maps.html: one page, many county datasets (v 20260928-1).
   A topic = {label, title:[before, accent, after], intro, data:[files to load], build()}. build() runs once its data files
   have loaded and returns what the page shows: metrics (the "Color the map by" choices), base, optional pins, stats (header),
   facts (At a glance), lists (ranked county lists, or {html,title,sub} blocks), note, about, sources, caveats, countyExtra(fips).
   Adding a topic = one data file (tools/csv_to_js.py turns a CSV into one) + one entry here. Nothing else changes. See COUNTY_MAPS.md. */
window.TX_TOPICS={};
(function(T){
const num=n=>Number(n||0).toLocaleString(), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=(a,b)=>b?Math.round(100*a/b):0;
const USE_ORDER=['Irrigation','Domestic','Livestock','Public supply','Industrial','Unused','Other','Unknown'];
const bars=(u,order)=>{u=u||{};const t=Object.values(u).reduce((a,b)=>a+b,0);if(!t)return '<div class="empty">No wells recorded.</div>';
  return (order||Object.keys(u)).filter(k=>u[k]).map(k=>`<div class="row" style="cursor:default;grid-template-columns:1fr auto"><div><div class="m" style="color:var(--ink)">${esc(k)}</div><div class="bar"><i style="width:${(100*u[k]/t).toFixed(1)}%"></i></div></div><span class="v"><b>${num(u[k])}</b><br>${pct(u[k],t)}%</span></div>`).join('');};
const subhead=t=>`<h3 style="font:700 11px Archivo,sans-serif;font-stretch:85%;letter-spacing:.12em;text-transform:uppercase;color:var(--maroon);margin:12px 0 2px">${t}</h3>`;

// ---------------------------------------------------------------- data centers (pins + two county numbers)
T['data-centers']={label:'Data centers',title:['Texas','Data Centers','by County'],
 intro:'Where the data center boom lands, county by county. Hover a county for its count, click it for the list of projects there.',
 data:['tx_dc_sites.js'],
 build(){const {cname}=CM;const P=(window.TX_DC_SITES||[]).filter(s=>s.kind==='project'&&s.status!=='withdrawn');
  const count={},mw={};P.forEach(s=>{count[s.fips]=(count[s.fips]||0)+1;if(s.mw)mw[s.fips]=(mw[s.fips]||0)+s.mw;});
  const fmtMW=m=>m>=1000?(m/1000).toFixed(m%1000?1:0)+' GW':Math.round(m)+' MW';
  const pins=P.map(s=>({id:s.id,name:s.name,lon:s.lon,lat:s.lat,fips:s.fips,county:s.county,city:s.city,status:s.status,size:s.mw,hot:s.hot,sub:s.operator,
    details:{'Capacity':s.mw?fmtMW(s.mw):'not announced','Operator':esc(s.operator||'—'),'Pin placed at':s.precision==='site'?'the reported site':s.precision==='city'?'the city center (exact parcel not published)':'the county center (only the county is known)'},
    url:'texas_data_center_map.html',urlLabel:'Data Center Watch'}));
  const top=Object.keys(count).sort((a,b)=>count[b]-count[a])[0],topMW=Object.keys(mw).sort((a,b)=>mw[b]-mw[a])[0],n1=Object.keys(count).length,totalMW=Math.round(P.reduce((t,s)=>t+(s.mw||0),0)),hot=P.filter(s=>s.hot).length;
  return {
   metrics:[{key:'count',label:'Data center projects',values:count,unit:'projects',ramp:'orange',bins:[2,3,5,10,20],legendTitle:'Data center projects per county',caption:'Announced, under construction and operating projects per county. Darker = more.',noneLabel:'No projects'},
            {key:'mw',label:'Announced power',values:mw,ramp:'blue',fmt:fmtMW,bins:[100,300,1000,3000,10000],binLabels:['under 100 MW','100–300 MW','300 MW–1 GW','1–3 GW','3–10 GW','10 GW and up'],legendTitle:'Announced power per county',caption:'Total announced electric load of the projects in each county. Many projects have not announced a figure.',noneLabel:'No figure announced'}],
   base:'count',
   pins,pinLabel:'Data center sites',pinSingular:'data center project',pinPlural:'data center projects',
   pinStatuses:{operating:{label:'Operating',color:'#3B5B8C'},under_construction:{label:'Under construction',color:'#C8842A'},proposed:{label:'Proposed',color:'#A3262A'}},
   hotLabel:'Red ring: local opposition or a lawsuit',hotChip:'Contested only',hotFlag:'Contested',pinSizeNote:'Bigger dots are bigger projects (announced power).',sizeLabel:'largest (MW)',
   listMetric:p=>({html:`<b>${num(count[p.fips]||0)}</b> in county`,key:count[p.fips]||0}),listSortLabel:'county count',pinValue:p=>p.size?fmtMW(p.size):'',
   stats:[[num(P.length),'data center projects'],[n1,'counties with at least one'],[fmtMW(totalMW),'announced power']],
   facts:[`<b>${esc(cname[top])} County</b> has the most projects: ${num(count[top])} of the ${num(P.length)} statewide.`,
          `<b>${esc(cname[topMW])} County</b> leads on announced power, with ${fmtMW(mw[topMW])}.`,
          `<b>${n1} of 254 counties</b> have at least one data center project; ${254-n1} have none.`,
          `<b>${hot} projects</b> face local opposition or a lawsuit (the red rings).`],
   lists:[{metric:'count',n:15,title:'Counties with the most projects',sub:'click one to zoom'},{metric:'mw',n:15,title:'Counties by announced power',sub:'MW announced',fmt:v=>fmtMW(v)}],
   note:'Counts leave out small colocation sites and withdrawn projects; a county with no color has none.',
   welcomeTitle:'Texas data centers, county by county',
   about:'<p>This map colors every Texas county by the number of data center projects announced, under construction or operating there, with each project as a dot. Switch the coloring to announced power in <b>Map overlays</b> to see where the biggest electric loads are planned.</p>',
   sources:'<ul><li><b>Data center projects</b>: Texas Data Center Watch, which tracks announced projects across the state. A dot sits at the reported site when it is known, otherwise at the city or county center; each project card says which.</li></ul>',
   caveats:'<ul><li>Announced power is what a developer has said publicly; many projects give no figure, so county totals understate the real load.</li><li>Small colocation facilities and withdrawn projects are not counted.</li></ul>',
   legendNote:'Counts leave out small colocation sites and withdrawn projects.'};}};

// ---------------------------------------------------------------- rainfall (two county numbers, no pins)
T['rainfall']={label:'Rainfall',title:['Texas','Rainfall','by County'],
 intro:'How much rain each county usually gets, and how the last twelve months compared. Hover a county for its numbers.',
 data:['tx_county_water.js'],
 build(){const {cname}=CM;const C=(window.TX_COUNTY_WATER||{}).counties||{};const r={},p={};Object.keys(C).forEach(f=>{r[f]=C[f].r;p[f]=C[f].p;});
  const WIN='Sep 2025 – Aug 2026',NORM='1991–2020';
  const fs=Object.keys(C);const by=(o,d)=>fs.slice().sort((a,b)=>d?o[b]-o[a]:o[a]-o[b]);
  const wet=by(r,1)[0],dry=by(r,0)[0],wetR=by(p,1)[0],dryR=by(p,0)[0];const n70=fs.filter(f=>p[f]<70).length,n90=fs.filter(f=>p[f]<90).length,nWet=fs.filter(f=>p[f]>110).length;
  const med=v=>{const s=v.slice().sort((a,b)=>a-b);return s[Math.floor(s.length/2)];};const medR=med(fs.map(f=>r[f])),medP=med(fs.map(f=>p[f]));
  return {
   metrics:[{key:'recent',label:'Last 12 months vs. average',values:p,fmt:v=>v+'% of usual',ramp:'diverging',bins:[50,70,90,110,130,150],
             binLabels:['under half the usual rain (below 50%)','much drier: 50–70% of usual','drier: 70–90%','about usual: 90–110%','wetter: 110–130%','much wetter: 130–150%','over 1.5× the usual rain'],
             legendTitle:`Rain, ${WIN}, compared with the ${NORM} average`,caption:`Rain in the twelve months ${WIN} as a share of the county's usual year (${NORM} average). Orange = drier than usual, blue = wetter.`},
            {key:'rain',label:'Average yearly rainfall',values:r,unit:'in/yr',ramp:'blue',bins:[16,22,28,36,46],legendTitle:`Average rainfall, inches per year (${NORM})`,caption:`The county's usual rain per year, averaged over ${NORM} (PRISM). Darker blue = wetter.`}],
   base:'recent',
   stats:[[n70,'counties got under 70% of usual rain'],[medP+'%','of usual rain, typical county'],[medR+' in/yr','typical county, long-run average']],
   facts:[`<b>${n90} of 254 counties</b> got less rain than usual in the twelve months ${WIN}; ${n70} of them got less than 70% of their usual.`,
          `<b>${esc(cname[dryR])} County</b> had the driest year relative to normal, at ${p[dryR]}% of its usual rain; <b>${esc(cname[wetR])} County</b> the wettest, at ${p[wetR]}%.`,
          `<b>${nWet} counties</b> came out wetter than usual (over 110%).`,
          `Over the long run, <b>${esc(cname[wet])} County</b> gets the most rain (${r[wet]} in/yr) and <b>${esc(cname[dry])} County</b> the least (${r[dry]} in/yr).`],
   lists:[{metric:'recent',n:15,title:'Driest year compared with normal',sub:'lowest share of usual rain',desc:false},{metric:'recent',n:15,title:'Wettest year compared with normal',sub:'highest share of usual rain'},
          {metric:'rain',n:15,title:'Wettest counties on average',sub:'inches per year'},{metric:'rain',n:15,title:'Driest counties on average',sub:'inches per year',desc:false}],
   note:'A county value is the average of the rainfall grid cells inside it. The most recent months are provisional and can shift slightly.',
   welcomeTitle:'Texas rainfall, county by county',
   about:`<p>This map opens on the last twelve months (${WIN}) compared with what each county usually gets, so the driest and wettest parts of the state stand out at once. Switch to <b>Average yearly rainfall</b> in <b>Map overlays</b> for the long-run picture.</p>`,
   sources:`<ul><li><b>Rainfall</b>: the PRISM Climate Group at Oregon State University, the standard source for U.S. rainfall averages (${NORM} normals, 800 m grid) and recent months (4 km grid). County values were built by tools/build_county_water.py for the water maps on 2026-09-25.</li></ul>`,
   caveats:'<ul><li>Recent months are provisional; PRISM revises them as more station data arrive.</li><li>A county average hides the variation inside big counties.</li></ul>'};}};

// ---------------------------------------------------------------- water wells (two county numbers, use breakdowns)
T['wells']={label:'Water wells',title:['Texas','Water Wells','by County'],
 intro:'Where Texans drill for groundwater: the wells drilled since 2020, and every well on record. Hover a county for its counts.',
 data:['tx_county_water.js'],
 build(){const {cname}=CM;const CW=window.TX_COUNTY_WATER||{};const C=CW.counties||{};const w={},nw={};Object.keys(C).forEach(f=>{w[f]=C[f].w;nw[f]=C[f].nw;});
  const fs=Object.keys(C);const by=o=>fs.slice().sort((a,b)=>o[b]-o[a]);const topW=by(w)[0],topN=by(nw)[0];
  const total=CW.total||fs.reduce((t,f)=>t+(w[f]||0),0),ntotal=CW.nw_total||fs.reduce((t,f)=>t+(nw[f]||0),0);
  const nwu={};fs.forEach(f=>{const u=C[f].nwu||{};Object.keys(u).forEach(k=>nwu[k]=(nwu[k]||0)+u[k]);});
  const use=CW.use||{};const topUse=Object.keys(use).sort((a,b)=>use[b]-use[a])[0]||'';const topNew=Object.keys(nwu).sort((a,b)=>nwu[b]-nwu[a])[0]||'';
  return {
   metrics:[{key:'newwells',label:'Wells drilled since 2020',values:nw,unit:'wells',ramp:'teal',bins:[100,200,300,500,1000],legendTitle:'Water-supply wells drilled since 2020, per county',caption:'New and replacement water-supply wells reported by drillers, January 2020 through September 2026. Darker = more.',noneLabel:'None reported'},
            {key:'wells',label:'All wells on record',values:w,unit:'wells',ramp:'orange',bins:[200,400,600,1000,2000],legendTitle:'Wells in the TWDB Groundwater Database, per county',caption:'Every well in the TWDB Groundwater Database, all years. Darker = more.',noneLabel:'None recorded'}],
   base:'newwells',
   stats:[[num(ntotal),'wells drilled since 2020'],[num(total),'wells on record, all years'],[esc(cname[topN])+' County','most new wells']],
   facts:[`<b>${esc(cname[topN])} County</b> has had the most wells drilled since 2020: ${num(nw[topN])}.`,
          `<b>${esc(cname[topW])} County</b> has the most wells on record: ${num(w[topW])}.`,
          `Statewide, <b>${num(ntotal)} water-supply wells</b> have been drilled since 2020; ${esc(topNew.toLowerCase())} wells are the largest group (${pct(nwu[topNew],ntotal)}%).`,
          `Of the <b>${num(total)} wells on record</b>, the largest use is ${esc(topUse.toLowerCase())} (${pct(use[topUse],total)}%).`],
   lists:[{metric:'newwells',n:15,title:'Most wells drilled since 2020',sub:"driller's reports"},{metric:'wells',n:15,title:'Most wells on record',sub:'all years'},
          {html:bars(nwu,USE_ORDER),title:'Wells drilled since 2020, by use',sub:'statewide'},{html:bars(use,USE_ORDER),title:'All wells on record, by use',sub:'statewide'}],
   countyExtra:f=>subhead('Wells drilled since 2020, by use')+bars(C[f]&&C[f].nwu,USE_ORDER),
   note:'A well count is the number of wells on record, not how much water is pumped.',
   welcomeTitle:'Texas water wells, county by county',
   about:'<p>This map opens on the wells drilled since 2020, the clearest sign of where new demand for groundwater is. Switch to <b>All wells on record</b> in <b>Map overlays</b> for the full history.</p>',
   sources:"<ul><li><b>Wells on record</b>: the Texas Water Development Board Groundwater Database (well locations, updated nightly; this copy from 2026-09-25).</li><li><b>Wells drilled since 2020</b>: TWDB Submitted Driller's Reports; new and replacement wells with a water-supply use (domestic, irrigation, livestock, public supply, industrial and similar), January 2020 through September 2026.</li></ul>",
   caveats:"<ul><li>A count is wells, not water: one irrigation well can pump far more than a hundred household wells.</li><li>The driller's-reports count includes only wells whose reports were filed.</li></ul>"};}};

// ---------------------------------------------------------------- campaign regions (a categorical map from a CSV)
T['regions']={label:'Campaign regions',title:['Texas','Campaign Regions','by County'],
 intro:'The six regions the campaign uses to organize the state, and which counties belong to each. Click a region to zoom to it.',
 data:['tx_regions.js'],
 build(){const R=window.TX_REGIONS||{};const val={},cats={},counts={};
  Object.keys(R).forEach(f=>{const x=R[f];if(x['Region ID']==null)return;const id=String(x['Region ID']);val[f]=id;cats[id]=cats[id]||{label:x['Region'],color:x['Region Color (hex)']};counts[id]=(counts[id]||0)+1;});
  const order=Object.keys(cats).sort((a,b)=>+a-+b);const CATS={};order.forEach(id=>CATS[id]=cats[id]);
  const big=order.slice().sort((a,b)=>counts[b]-counts[a])[0],small=order.slice().sort((a,b)=>counts[a]-counts[b])[0];
  const rows=order.map(id=>`<div class="row" data-cat="${id}" data-metric="region" tabindex="0"><span class="sw" style="background:${CATS[id].color};opacity:1;box-shadow:0 0 0 1px var(--county-line)"></span><div><div class="n">${esc(CATS[id].label)}</div><div class="m">${counts[id]} counties</div></div><span class="v"><b>${counts[id]}</b></span></div>`).join('');
  return {
   metrics:[{key:'region',label:'Campaign region',values:val,categories:CATS,legendTitle:'Campaign regions',caption:'Each county belongs to one of six campaign regions.',noneLabel:'Not assigned'}],
   base:'region',
   stats:[[order.length,'regions'],[esc(cats[big].label),`largest: ${counts[big]} counties`],[esc(cats[small].label),`smallest: ${counts[small]} counties`]],
   facts:[`The campaign splits Texas into <b>${order.length} regions</b>. Every one of the 254 counties is in exactly one.`,
          `<b>${esc(cats[big].label)}</b> is the biggest by county count with ${counts[big]}; <b>${esc(cats[small].label)}</b> the smallest with ${counts[small]}.`],
   lists:[{html:rows,title:'The regions',sub:'click one to zoom'}],
   note:"Region assignments come from the campaign's own county list (tx_counties_by_region.csv in this repository).",
   welcomeTitle:'The campaign regions, county by county',
   about:'<p>This map shows which campaign region each county belongs to. Click a region in the list to zoom to it and see its counties; click a county for its region.</p>',
   sources:"<ul><li><b>Regions</b>: the campaign's county-to-region list, tx_counties_by_region.csv in this repository (254 counties, 6 regions, with the region colors used on the other maps), converted with tools/csv_to_js.py.</li></ul>",
   caveats:'<ul><li>Regions are an organizing convenience, not an official boundary.</li></ul>'};}};
// ---------------------------------------------------------------- demographics (TDC 2025 population + ACS 2020-24), 14 county numbers, no pins
T['demographics']={label:'Demographics',title:['Texas','Demographics','by County'],
 intro:'Who lives in each county: population and growth, race and ethnicity, income, education, work and housing. Choose what colors the map in Map overlays.',
 data:['tx_county_demographics.js'],
 build(){const {cname}=CM;const D=window.TX_COUNTY_DEMOGRAPHICS||{};const F=Object.keys(D);
  const col=(k)=>{const o={};F.forEach(f=>{const v=D[f][k];if(v!=null)o[f]=v;});return o;};
  const pop=col('Population, July 1 2025 (TDC prelim.)'),growth=col('Pop. change 2020-2025 (%)'),age=col('Median age'),inc=col('Median household income ($)'),pov=col('Poverty rate (%)'),unemp=col('Unemployment rate (%)'),bach=col("Bachelor's degree or higher, 25+ (%)"),
        hisp=col('Hispanic (%)'),white=col('Non-Hispanic White (%)'),black=col('Non-Hispanic Black (%)'),asian=col('Non-Hispanic Asian (%)'),own=col('Homeownership rate (%)'),rent=col('Median gross rent ($)'),hv=col('Median home value ($)');
  const P=v=>(v*100).toFixed(1)+'%',P0=v=>Math.round(v*100)+'%',USD=v=>'$'+num(Math.round(v));
  const by=(o,d)=>F.filter(f=>o[f]!=null).sort((a,b)=>d?o[b]-o[a]:o[a]-o[b]);
  const fastest=by(growth,1)[0],shrinking=F.filter(f=>growth[f]<0).length,gain={};F.forEach(f=>gain[f]=pop[f]-(D[f]['Census 2020 count']||0));const biggest=by(gain,1)[0];
  const richest=by(inc,1)[0],poorest=by(inc,0)[0],mostHisp=by(hisp,1)[0],mostBlack=by(black,1)[0],mostPov=by(pov,1)[0];
  const total=F.reduce((t,f)=>t+(pop[f]||0),0),total20=F.reduce((t,f)=>t+(D[f]['Census 2020 count']||0),0);
  return {
   metrics:[
    {key:'growth',group:'Population',label:'Population change 2020-2025',values:growth,fmt:P,skipZero:false,ramp:'diverging',bins:[-0.05,-0.02,0,0.05,0.10,0.20],binLabels:['lost more than 5%','lost 2-5%','lost up to 2%','grew up to 5%','grew 5-10%','grew 10-20%','grew more than 20%'],legendTitle:'Population change, 2020 Census to July 1, 2025',caption:'Texas Demographic Center preliminary 2025 estimate vs. the 2020 Census. Orange = lost people, blue = gained.',noneLabel:'No estimate'},
    {key:'pop',group:'Population',label:'Population (July 2025)',values:pop,ramp:'purple',bins:[10000,25000,50000,100000,500000],legendTitle:'Population, July 1, 2025 (TDC preliminary)',caption:'Texas Demographic Center preliminary Vintage 2025 estimate.'},
    {key:'age',group:'Population',label:'Median age',values:age,fmt:v=>v.toFixed(1),unit:'years',ramp:'orange',bins:[32,36,40,44,48],legendTitle:'Median age (ACS 2020-24)',caption:'Half the county is older, half younger. Darker = older.'},
    {key:'hisp',group:'Race & ethnicity',label:'Hispanic or Latino',values:hisp,fmt:P,ramp:'purple',bins:[0.15,0.30,0.45,0.60,0.80],legendTitle:'Hispanic or Latino share (ACS 2020-24)',caption:'Share of residents who are Hispanic or Latino of any race.'},
    {key:'white',group:'Race & ethnicity',label:'Non-Hispanic White',values:white,fmt:P,ramp:'teal',bins:[0.20,0.40,0.55,0.70,0.85],legendTitle:'Non-Hispanic White share (ACS 2020-24)',caption:'Share of residents who are White alone and not Hispanic.'},
    {key:'black',group:'Race & ethnicity',label:'Non-Hispanic Black',values:black,fmt:P,ramp:'maroon',bins:[0.02,0.05,0.10,0.15,0.25],legendTitle:'Non-Hispanic Black share (ACS 2020-24)',caption:'Share of residents who are Black alone and not Hispanic.'},
    {key:'asian',group:'Race & ethnicity',label:'Non-Hispanic Asian',values:asian,fmt:P,ramp:'green',bins:[0.005,0.01,0.02,0.05,0.10],legendTitle:'Non-Hispanic Asian share (ACS 2020-24)',caption:'Share of residents who are Asian alone and not Hispanic.'},
    {key:'income',group:'Income & work',label:'Median household income',values:inc,fmt:USD,ramp:'blue',bins:[45000,55000,65000,80000,100000],legendTitle:'Median household income (ACS 2020-24, 2024 dollars)',caption:'Half of households earn more, half less. Darker blue = higher.'},
    {key:'poverty',group:'Income & work',label:'Poverty rate',values:pov,fmt:P,ramp:'orange',bins:[0.08,0.12,0.16,0.20,0.25],legendTitle:'Share of people below the poverty line (ACS 2020-24)',caption:'People whose income in the past 12 months was below the federal poverty level.'},
    {key:'unemp',group:'Income & work',label:'Unemployment rate',values:unemp,fmt:P,ramp:'orange',bins:[0.03,0.04,0.05,0.065,0.08],legendTitle:'Unemployment rate (ACS 2020-24)',caption:'Unemployed as a share of the civilian labor force, averaged over 2020-2024.'},
    {key:'bach',group:'Income & work',label:"Bachelor's degree or higher",values:bach,fmt:P,ramp:'teal',bins:[0.12,0.16,0.20,0.28,0.40],legendTitle:"Adults 25+ with a bachelor's degree or higher (ACS 2020-24)",caption:'Share of adults 25 and over with at least a four-year degree.'},
    {key:'own',group:'Housing',label:'Homeownership rate',values:own,fmt:P,ramp:'green',bins:[0.55,0.65,0.72,0.78,0.85],legendTitle:'Owner-occupied share of homes (ACS 2020-24)',caption:'Occupied homes that are owned rather than rented.'},
    {key:'homeval',group:'Housing',label:'Median home value',values:hv,fmt:USD,ramp:'blue',bins:[100000,150000,200000,300000,400000],legendTitle:'Median value of owner-occupied homes (ACS 2020-24)',caption:'What owners say their home is worth; the middle value in the county.'},
    {key:'rent',group:'Housing',label:'Median gross rent',values:rent,fmt:USD,ramp:'blue',bins:[700,850,1000,1200,1500],legendTitle:'Median gross rent, monthly (ACS 2020-24)',caption:'Rent plus utilities for the typical renting household.'}],
   base:'growth',
   stats:[[num(Math.round(total/1e6*10)/10)+'M','Texans, July 1 2025 (TDC)'],[P(total/total20-1),'growth since the 2020 Census'],[shrinking,'counties lost population']],
   facts:[`<b>${esc(cname[fastest])} County</b> grew fastest since 2020: ${P(growth[fastest])}. <b>${esc(cname[biggest])} County</b> added the most people, ${num(gain[biggest])}.`,
          `<b>${shrinking} of 254 counties</b> have fewer people than in 2020.`,
          `<b>${esc(cname[richest])} County</b> has the highest median household income (${USD(inc[richest])}); <b>${esc(cname[poorest])} County</b> the lowest (${USD(inc[poorest])}).`,
          `<b>${esc(cname[mostHisp])} County</b> is ${P0(hisp[mostHisp])} Hispanic; <b>${esc(cname[mostBlack])} County</b> has the largest Black share, ${P0(black[mostBlack])}; <b>${esc(cname[mostPov])} County</b> has the highest poverty rate, ${P0(pov[mostPov])}.`],
   lists:[{metric:'growth',n:15,title:'Fastest-growing counties',sub:'2020 to 2025'},{metric:'growth',n:15,title:'Counties losing people',sub:'2020 to 2025',desc:false},{metric:'pop',n:15,title:'Most populous counties'},
          {metric:'income',n:15,title:'Highest median household income'},{metric:'income',n:15,title:'Lowest median household income',desc:false},{metric:'poverty',n:15,title:'Highest poverty rates'},{metric:'hisp',n:15,title:'Largest Hispanic share'},{metric:'black',n:15,title:'Largest Black share'},{metric:'bach',n:15,title:'Most college graduates'}],
   note:'Population and growth are the Texas Demographic Center\'s preliminary 2025 estimates; everything else is the 2020-2024 American Community Survey, which is noisy in the smallest counties.',
   welcomeTitle:'Texas demographics, county by county',
   about:'<p>This map opens on population change since the 2020 Census, using the Texas Demographic Center\'s preliminary July 1, 2025 estimates. The <b>Color the map by</b> menu switches to any of 14 measures: population, age, race and ethnicity, income, poverty, unemployment, education and housing.</p>',
   sources:'<ul><li><b>Population, July 1 2025, and change since 2020</b>: Texas Demographic Center, preliminary Vintage 2025 county estimates (final due October 2026), <a href="https://demographics.texas.gov/Estimates/2025/" target="_blank" rel="noopener">demographics.texas.gov/Estimates/2025</a>.</li><li><b>All other measures</b>: U.S. Census Bureau, American Community Survey 2020-2024 5-year estimates, tables B01001, B01002, B03002, B15003, B17001, B19013, B23025, B25003, B25064, B25077 (<a href="https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/5YRData/" target="_blank" rel="noopener">bulk summary files</a>).</li></ul>',
   caveats:'<ul><li>ACS 5-year figures are averages over 2020-2024 and carry wide margins of error in counties with a few thousand people; treat single small-county values with care.</li><li>The Texas Demographic Center advises against mixing its estimates with Census counts across years; the growth figure here compares its 2025 estimate with the 2020 Census as the TDC itself does.</li><li>Race shares are single-race non-Hispanic groups plus Hispanic of any race; the remainder (multiracial and other) is not shown.</li></ul>'};}};
// ---------------------------------------------------------------- shared helpers for the election topics
const POL=['#1b4fa6','#5b8fd9','#b9cff0','#eceae4','#f3b3a6','#e05a4e','#a91b1b'];   // Democratic blue -> neutral -> Republican red
const PTS=v=>(v>0?'+':'')+(v*100).toFixed(1)+' pts',PCT=v=>(v*100).toFixed(1)+'%',PCT0=v=>Math.round(v*100)+'%';
const CHG_BINS=[-0.05,-0.02,-0.005,0.005,0.02,0.05],CHG_LBL=['5+ pts more Democratic','2-5 pts more Democratic','0.5-2 pts more Democratic','about the same (within 0.5 pt)','0.5-2 pts more Republican','2-5 pts more Republican','5+ pts more Republican'];
const MARG_BINS=[-0.3,-0.1,-0.02,0.02,0.1,0.3],MARG_LBL=['Democratic by 30+ pts','Democratic by 10-30 pts','Democratic by 2-10 pts','within 2 pts','Republican by 2-10 pts','Republican by 10-30 pts','Republican by 30+ pts'];
const TCHG_BINS=[-0.10,-0.05,-0.02,0.02,0.05,0.10],TCHG_LBL=['fell 10+ pts','fell 5-10 pts','fell 2-5 pts','about the same (within 2 pts)','rose 2-5 pts','rose 5-10 pts','rose 10+ pts'];
const TURN_RAMP=['#fde7c8','#f7c27f','#eea04a','#dd7a1f','#b85a0a','#7a3a03'];
const table=(rows,head)=>`<table style="width:100%;border-collapse:collapse;font-size:12px;margin:8px 0 4px"><tr>${head.map((h,i)=>`<th style="text-align:${i?'right':'left'};font-weight:600;color:var(--ink3);font-size:10px;letter-spacing:.06em;text-transform:uppercase;padding:2px 4px;border-bottom:1px solid var(--rule)">${h}</th>`).join('')}</tr>${rows.map(r=>`<tr>${r.map((c,i)=>`<td style="text-align:${i?'right':'left'};padding:3px 4px;border-bottom:1px dashed var(--rule);font-variant-numeric:tabular-nums">${c}</td>`).join('')}</tr>`).join('')}</table>`;
const col=(E,k)=>{const o={};Object.keys(E.counties).forEach(f=>{const v=E.counties[f][k];if(v!=null)o[f]=v;});return o;};

// ---------------------------------------------------------------- election movement (President, Governor, U.S. Senate)
T['elections']={label:'Election movement',title:['Texas','Election Movement','by County'],
 intro:'How each county voted for President, Governor and U.S. Senate since 2006, and how far it has moved. Opens on the shift from Trump 2020 to Trump 2024.',
 data:['tx_county_elections.js'],
 build(){const {cname}=CM;const E=window.TX_COUNTY_ELECTIONS||{state:{},counties:{}};const S=E.state;const F=Object.keys(E.counties);
  const g=k=>col(E,k);const by=(k,d)=>F.slice().sort((a,b)=>d?E.counties[b][k]-E.counties[a][k]:E.counties[a][k]-E.counties[b][k]);
  const upR=by('pres_R_change_2020_2024',1)[0],upD=by('pres_R_change_2020_2024',0)[0];
  const flipR=F.filter(f=>E.counties[f].pres_margin_2020<0&&E.counties[f].pres_margin_2024>0),flipD=F.filter(f=>E.counties[f].pres_margin_2020>0&&E.counties[f].pres_margin_2024<0);
  const movedR=F.filter(f=>E.counties[f].pres_R_change_2020_2024>0).length;
  const M=(key,label,group,extra)=>Object.assign({key,label,group,values:g(key),skipZero:false,ramp:POL},extra);
  const chg=(key,label,group,legend,cap)=>M(key,label,group,{fmt:PTS,bins:CHG_BINS,binLabels:CHG_LBL,legendTitle:legend,caption:cap});
  const marg=(key,label,group,legend,cap)=>M(key,label,group,{fmt:PTS,bins:MARG_BINS,binLabels:MARG_LBL,legendTitle:legend,caption:cap});
  return {
   metrics:[
    chg('pres_R_change_2020_2024','Trump 2020 to 2024','Presidential shift',"Change in Trump's share, 2020 to 2024 (points)",'Trump 2024 share minus Trump 2020 share. Red = moved toward Republicans, blue = toward Democrats.'),
    chg('pres_R_change_2016_2020','Trump 2016 to 2020','Presidential shift',"Change in Trump's share, 2016 to 2020 (points)",'Trump 2020 share minus Trump 2016 share.'),
    chg('pres_R_change_2016_2024','Trump 2016 to 2024','Presidential shift',"Change in Trump's share, 2016 to 2024 (points)",'Trump 2024 share minus Trump 2016 share.'),
    chg('pres_R_change_2012_2016','Romney 2012 to Trump 2016','Presidential shift','Change in the Republican share, 2012 to 2016 (points)','Trump 2016 share minus Romney 2012 share.'),
    marg('pres_margin_2024','President 2024 margin','Presidential results','President 2024: Republican minus Democratic share (points)','Trump share minus Harris share in the county.'),
    marg('pres_margin_2020','President 2020 margin','Presidential results','President 2020: Republican minus Democratic share (points)','Trump share minus Biden share.'),
    marg('pres_margin_2016','President 2016 margin','Presidential results','President 2016: Republican minus Democratic share (points)','Trump share minus Clinton share.'),
    marg('pres_margin_2012','President 2012 margin','Presidential results','President 2012: Republican minus Democratic share (points)','Romney share minus Obama share.'),
    marg('pres_margin_2008','President 2008 margin','Presidential results','President 2008: Republican minus Democratic share (points)','McCain share minus Obama share.'),
    marg('gov_margin_2022','Governor 2022 margin','Governor','Governor 2022: Republican minus Democratic share (points)','Abbott share minus O\'Rourke share.'),
    marg('gov_margin_2018','Governor 2018 margin','Governor','Governor 2018: Republican minus Democratic share (points)','Abbott share minus Valdez share.'),
    marg('gov_margin_2014','Governor 2014 margin','Governor','Governor 2014: Republican minus Democratic share (points)','Abbott share minus Davis share.'),
    chg('gov_margin_change_2018_2022','Governor swing 2018 to 2022','Governor','Change in the governor margin, 2018 to 2022 (points)','2022 margin minus 2018 margin: the midterm swing, separate from turnout.'),
    chg('gov_margin_change_2014_2018','Governor swing 2014 to 2018','Governor','Change in the governor margin, 2014 to 2018 (points)','2018 margin minus 2014 margin.'),
    marg('sen_margin_2024','U.S. Senate 2024 margin','U.S. Senate','U.S. Senate 2024: Republican minus Democratic share (points)','Cruz share minus Allred share.'),
    marg('sen_margin_2020','U.S. Senate 2020 margin','U.S. Senate','U.S. Senate 2020: Republican minus Democratic share (points)','Cornyn share minus Hegar share.'),
    marg('sen_margin_2018','U.S. Senate 2018 margin','U.S. Senate','U.S. Senate 2018: Republican minus Democratic share (points)','Cruz share minus O\'Rourke share.')],
   base:'pres_R_change_2020_2024',
   stats:[[PCT(S.pres_R_2024),'Trump 2024, statewide'],[PTS(S.pres_R_change_2020_2024),'Trump shift 2020 to 2024, statewide'],[movedR,'counties moved toward Trump']],
   facts:[`Statewide, Trump went from <b>${PCT(S.pres_R_2020)}</b> in 2020 to <b>${PCT(S.pres_R_2024)}</b> in 2024 (${PTS(S.pres_R_change_2020_2024)}); ${movedR} of 254 counties moved his way.`,
          `<b>${esc(cname[upR])} County</b> moved furthest toward Trump (${PTS(E.counties[upR].pres_R_change_2020_2024)}); <b>${esc(cname[upD])} County</b> furthest away (${PTS(E.counties[upD].pres_R_change_2020_2024)}).`,
          `${flipR.length} count${flipR.length===1?'y':'ies'} flipped from Biden 2020 to Trump 2024${flipR.length?': '+flipR.map(f=>esc(cname[f])).join(', '):''}; ${flipD.length} went the other way${flipD.length?': '+flipD.map(f=>esc(cname[f])).join(', '):''}.`,
          `Governor: Abbott's statewide margin was <b>${PTS(S.gov_margin_2018)}</b> in 2018 and <b>${PTS(S.gov_margin_2022)}</b> in 2022 (${PTS(S.gov_margin_change_2018_2022)} swing).`],
   lists:[{metric:'pres_R_change_2020_2024',n:15,title:'Biggest shifts toward Trump, 2020 to 2024',sub:'points'},{metric:'pres_R_change_2020_2024',n:15,title:'Biggest shifts toward Democrats, 2020 to 2024',sub:'points',desc:false},
          {metric:'pres_margin_2024',n:15,title:'Strongest Democratic counties, 2024',sub:'President',desc:false},{metric:'pres_margin_2024',n:15,title:'Strongest Republican counties, 2024',sub:'President'},
          {metric:'gov_margin_change_2018_2022',n:15,title:'Governor: biggest swing toward Republicans, 2018 to 2022'},{metric:'gov_margin_change_2018_2022',n:15,title:'Governor: biggest swing toward Democrats, 2018 to 2022',desc:false}],
   countyExtra:f=>{const c=E.counties[f];const yrs=[2008,2012,2016,2020,2024];
     return `<h3 style="font:700 11px Archivo,sans-serif;font-stretch:85%;letter-spacing:.12em;text-transform:uppercase;color:var(--maroon);margin:10px 0 0">President, this county vs. Texas</h3>`+
       table(yrs.map(y=>[y,PCT(c['pres_R_'+y]),PCT(c['pres_D_'+y]),PTS(c['pres_margin_'+y]),PTS(c['pres_margin_'+y]-S['pres_margin_'+y])]),['Year','Rep.','Dem.','Margin','vs. Texas'])+
       `<h3 style="font:700 11px Archivo,sans-serif;font-stretch:85%;letter-spacing:.12em;text-transform:uppercase;color:var(--maroon);margin:10px 0 0">Governor and U.S. Senate margins</h3>`+
       table([[2022,'Governor',PTS(c.gov_margin_2022),PTS(c.gov_margin_2022-S.gov_margin_2022)],[2018,'Governor',PTS(c.gov_margin_2018),PTS(c.gov_margin_2018-S.gov_margin_2018)],[2014,'Governor',PTS(c.gov_margin_2014),PTS(c.gov_margin_2014-S.gov_margin_2014)],[2024,'U.S. Senate',PTS(c.sen_margin_2024),PTS(c.sen_margin_2024-S.sen_margin_2024)],[2020,'U.S. Senate',PTS(c.sen_margin_2020),PTS(c.sen_margin_2020-S.sen_margin_2020)],[2018,'U.S. Senate',PTS(c.sen_margin_2018),PTS(c.sen_margin_2018-S.sen_margin_2018)]],['Year','Race','Margin','vs. Texas']);},
   note:'Margins are Republican minus Democratic share, in points; changes are later minus earlier, in points. 2006-2018 from the official SOS canvass, 2020-2024 from the Texas Legislative Council\'s county subtotals.',
   welcomeTitle:'How Texas counties moved',
   about:'<p>This map opens on how much each county shifted between Trump\'s 2020 and 2024 results. The <b>Color the map by</b> menu switches to margins and shifts for every presidential, governor and U.S. Senate race since 2008. Click a county for its full history next to the statewide figure.</p>',
   sources:'<ul><li><b>2006-2018</b>: Texas Secretary of State official canvass, county results for every statewide race (<a href="https://elections.sos.state.tx.us/" target="_blank" rel="noopener">elections.sos.state.tx.us</a>).</li><li><b>2020-2024</b>: Texas Legislative Council, Red-211 Election Analysis with County Subtotals for PLANC2333, county parts summed (<a href="https://data.capitol.texas.gov/dataset/planc2333" target="_blank" rel="noopener">data.capitol.texas.gov</a>). TLC notes small technical variances from the official canvass.</li></ul>',
   caveats:'<ul><li>Shares are of all votes in that race, including third parties and write-ins, so Republican and Democratic shares do not sum to 100%.</li><li>Small counties can swing many points on a few hundred votes.</li><li>Only statewide races are compared (President, Governor, U.S. Senate), like for like, so redistricting never enters these figures; congressional and legislative districts are a separate layer.</li><li>Statewide, the 2006-2018 totals equal the official canvass to the vote; TLC\'s 2020 presidential totals run about 1,500 votes under the official count for each major candidate.</li></ul>'};}};

// ---------------------------------------------------------------- turnout and registration
T['turnout']={label:'Turnout',title:['Texas','Turnout','by County'],
 intro:'Who shows up: registered voters, votes cast and turnout in every general election since 2006, and how it changed. Opens on 2024 turnout.',
 data:['tx_county_elections.js'],
 build(){const {cname}=CM;const E=window.TX_COUNTY_ELECTIONS||{state:{},counties:{}};const S=E.state;const F=Object.keys(E.counties);
  const g=k=>col(E,k);const by=(k,d)=>F.slice().sort((a,b)=>d?E.counties[b][k]-E.counties[a][k]:E.counties[a][k]-E.counties[b][k]);
  const hi=by('turnout_2024',1)[0],lo=by('turnout_2024',0)[0],drop=by('turnout_change_2020_2024',0)[0],gain=by('registration_growth_2016_2024',1)[0];
  const tm=(y,extra)=>Object.assign({key:'turnout_'+y,label:'Turnout '+y,group:'Turnout',values:g('turnout_'+y),fmt:PCT,ramp:TURN_RAMP,bins:[0.45,0.52,0.58,0.63,0.68],legendTitle:'Turnout, '+y+' general election (votes in the top race / registered voters)',caption:'Votes cast in the top statewide race as a share of registered voters, the Secretary of State\'s convention. Darker = higher turnout.'},extra||{});
  const tc=(a,b)=>({key:`turnout_change_${a}_${b}`,label:`Turnout change ${a} to ${b}`,group:'Turnout change',values:g(`turnout_change_${a}_${b}`),fmt:PTS,skipZero:false,ramp:'diverging',bins:TCHG_BINS,binLabels:TCHG_LBL,legendTitle:`Turnout ${b} minus turnout ${a} (points)`,caption:`Orange = turnout fell, blue = rose. ${a} and ${b} are compared like for like (${a%4===0?'presidential':'midterm'} years).`});
  return {
   metrics:[tm(2024),tm(2022,{bins:[0.35,0.42,0.48,0.54,0.60]}),tm(2020),tm(2018,{bins:[0.35,0.42,0.48,0.54,0.60]}),tm(2016),tm(2014,{bins:[0.22,0.28,0.33,0.38,0.45]}),tm(2012),tm(2010,{bins:[0.22,0.28,0.33,0.38,0.45]}),tm(2008),
    tc(2020,2024),tc(2018,2022),tc(2016,2020),tc(2014,2018),
    {key:'registered_2024',label:'Registered voters, Nov. 2024',group:'Registration',values:g('registered_2024'),ramp:'purple',bins:[5000,15000,40000,100000,500000],legendTitle:'Registered voters, November 2024',caption:'Texas Secretary of State registration figures for the 2024 general election.'},
    {key:'registration_growth_2020_2024',label:'Registration growth 2020 to 2024',group:'Registration',values:g('registration_growth_2020_2024'),fmt:v=>(v>0?'+':'')+PCT(v),skipZero:false,ramp:'diverging',bins:[-0.05,-0.02,0,0.05,0.10,0.20],binLabels:['fell 5%+','fell 2-5%','fell up to 2%','grew up to 5%','grew 5-10%','grew 10-20%','grew 20%+'],legendTitle:'Change in registered voters, Nov. 2020 to Nov. 2024',caption:'Percent change in the number of registered voters.'},
    {key:'registration_growth_2016_2024',label:'Registration growth 2016 to 2024',group:'Registration',values:g('registration_growth_2016_2024'),fmt:v=>(v>0?'+':'')+PCT(v),skipZero:false,ramp:'diverging',bins:[-0.05,0,0.10,0.20,0.35,0.50],binLabels:['fell 5%+','fell up to 5%','grew up to 10%','grew 10-20%','grew 20-35%','grew 35-50%','grew 50%+'],legendTitle:'Change in registered voters, Nov. 2016 to Nov. 2024',caption:'Percent change in the number of registered voters over two presidential cycles.'}],
   base:'turnout_2024',
   stats:[[PCT(S.turnout_2024),'turnout 2024, statewide'],[PCT(S.turnout_2020),'turnout 2020'],[num(Math.round(S.registered_2024/1e6*10)/10)+'M','registered, Nov. 2024']],
   facts:[`Statewide turnout was <b>${PCT(S.turnout_2024)}</b> in 2024, down from <b>${PCT(S.turnout_2020)}</b> in 2020 (${PTS(S.turnout_change_2020_2024)}); the 2022 midterm drew ${PCT(S.turnout_2022)} against ${PCT(S.turnout_2018)} in 2018.`,
          `<b>${esc(cname[hi])} County</b> had the highest 2024 turnout (${PCT(E.counties[hi].turnout_2024)}); <b>${esc(cname[lo])} County</b> the lowest (${PCT(E.counties[lo].turnout_2024)}).`,
          `<b>${esc(cname[drop])} County</b> saw the biggest turnout drop from 2020 to 2024 (${PTS(E.counties[drop].turnout_change_2020_2024)}).`,
          `Texas had <b>${num(S.registered_2024)}</b> registered voters in November 2024, ${(S.registration_growth_2016_2024*100).toFixed(0)}% more than in 2016; <b>${esc(cname[gain])} County</b> grew fastest (${(E.counties[gain].registration_growth_2016_2024*100).toFixed(0)}%).`],
   lists:[{metric:'turnout_2024',n:15,title:'Highest turnout, 2024'},{metric:'turnout_2024',n:15,title:'Lowest turnout, 2024',desc:false},{metric:'turnout_change_2020_2024',n:15,title:'Biggest turnout drops, 2020 to 2024',desc:false},{metric:'turnout_change_2020_2024',n:15,title:'Turnout gains, 2020 to 2024'},
          {metric:'turnout_change_2018_2022',n:15,title:'Midterm turnout change, 2018 to 2022: biggest drops',desc:false},{metric:'registration_growth_2016_2024',n:15,title:'Fastest registration growth, 2016 to 2024'}],
   countyExtra:f=>{const c=E.counties[f];const yrs=[2024,2022,2020,2018,2016,2014,2012,2010,2008,2006];
     return `<h3 style="font:700 11px Archivo,sans-serif;font-stretch:85%;letter-spacing:.12em;text-transform:uppercase;color:var(--maroon);margin:10px 0 0">Turnout history, this county vs. Texas</h3>`+
       table(yrs.filter(y=>c['turnout_'+y]!=null).map(y=>[y,num(c['registered_'+y]),num(c['ballots_'+y]),PCT(c['turnout_'+y]),PTS(c['turnout_'+y]-S['turnout_'+y])]),['Year','Registered','Ballots','Turnout','vs. Texas'])+'<div class="note" style="padding:4px 0 0">Ballots = votes in the top statewide race that year (the SOS convention).</div>';},
   note:'Turnout = votes in the top statewide race divided by registered voters at that election, the Secretary of State\'s convention; statewide it matches the SOS official turnout figures exactly for 2006-2018. Registered voters are the SOS November figures.',
   welcomeTitle:'Texas turnout, county by county',
   about:'<p>This map opens on 2024 turnout. <b>Color the map by</b> switches to any general election since 2008, to the change between like-for-like elections (presidential to presidential, midterm to midterm), and to registration counts and growth. Click a county for its whole history against the statewide rate.</p>',
   sources:'<ul><li><b>Registered voters</b>: Texas Secretary of State, voter registration figures by county for November of each election year (<a href="https://www.sos.state.tx.us/elections/historical/vrfig.shtml" target="_blank" rel="noopener">sos.state.tx.us</a>); 2006 from the canvass.</li><li><b>Votes in the top race</b>: SOS official canvass 2006-2018 (<a href="https://elections.sos.state.tx.us/" target="_blank" rel="noopener">elections.sos.state.tx.us</a>); Texas Legislative Council Red-211 county subtotals for PLANC2333, 2020-2024 (<a href="https://data.capitol.texas.gov/dataset/planc2333" target="_blank" rel="noopener">data.capitol.texas.gov</a>).</li></ul>',
   caveats:'<ul><li>Registration counts include voters on the suspense list, so turnout among active voters is a little higher than shown.</li><li>Compare presidential years with presidential years and midterms with midterms.</li><li>Counting every ballot (including those blank in the top race) would put turnout about half a point higher; the workbook keeps that TLC count separately for 2012-2024.</li><li>County figures never depend on district lines: only statewide races are used, so redistricting does not affect any number here.</li></ul>'};}};
// ---------------------------------------------------------------- redistricting: the 2026 congressional map against the 2024 map, plus House, Senate and SBOE districts
T['districts']={label:'Redistricting',title:['Texas','Redistricting','by County'],
 intro:'The 2026 congressional map (PLANC2333) against the 2024 map (PLANC2193): which counties got a new district, how each county\'s district leans, and how every district voted. Texas House, Senate and State Board of Education lines too.',
 data:['tx_district_results.js'],   // district outlines + crosswalk (tx_districts.js, tx_district_crosswalk.js) are loaded by the page for every topic
 build(){const {cname}=CM;const X=window.TX_DISTRICT_XW||{counties:{},plans:{},changed:{},county_pop:{}};const R=window.TX_DISTRICT_RESULTS||{};const F=Object.keys(X.counties);
  const NEW='PLANC2333',OLD='PLANC2193',NEWL='2026 map (PLANC2333)',OLDL='2024 map (PLANC2193)';
  const dres=(plan,y,n)=>R[plan]&&R[plan].years[y]&&R[plan].years[y].d[n];
  const marg=(plan,y,race,n)=>{const d=dres(plan,y,n);return d&&d[race]?d[race][0]-d[race][1]:null;};
  const names=(plan,y,race)=>(R[plan]&&R[plan].years[y]&&R[plan].years[y].names[race])||['Rep.','Dem.'];
  const dids=plan=>R[plan]?Object.keys(R[plan].years[2024].d):[];
  // county figures: the population-weighted lean of the county's district(s), and how many residents got a new district number
  const lean=(plan,y,race)=>{const o={};F.forEach(f=>{let s=0,w=0;(X.counties[f][plan]||[]).forEach(([n,p,sh])=>{const m=marg(plan,y,race,n);if(m!=null){s+=m*sh;w+=sh;}});if(w>0)o[f]=s/w;});return o;};
  const leanNew=lean(NEW,2024,'pres'),leanOld=lean(OLD,2024,'pres'),leanChg={};F.forEach(f=>{if(leanNew[f]!=null&&leanOld[f]!=null)leanChg[f]=leanNew[f]-leanOld[f];});
  const changed={},chgCat={};F.forEach(f=>{const v=X.changed[f]||0;changed[f]=v;chgCat[f]=v<=0?'same':v>=0.999?'all':'part';});
  const splitN=F.filter(f=>(X.counties[f][NEW]||[]).length>1),splitO=F.filter(f=>(X.counties[f][OLD]||[]).length>1);
  const pop=X.county_pop,stPop=F.reduce((a,f)=>a+(pop[f]||0),0),chgPop=F.reduce((a,f)=>a+changed[f]*(pop[f]||0),0);
  const nChg=F.filter(f=>changed[f]>0).length,nAll=F.filter(f=>changed[f]>=0.999).length;
  const comp=plan=>dids(plan).filter(n=>Math.abs(marg(plan,2024,'pres',n))<0.10),rWon=plan=>dids(plan).filter(n=>marg(plan,2024,'pres',n)>0).length;
  const byChg=F.filter(f=>leanChg[f]!=null).sort((a,b)=>leanChg[b]-leanChg[a]);const upR=byChg[0],upD=byChg[byChg.length-1];
  // district metrics: one per plan, race and year; values keyed by district number
  const dm=(plan,y,race,label,group,extra)=>{const vals={};dids(plan).forEach(n=>{const m=marg(plan,y,race,n);if(m!=null)vals[n]=m;});const nm=names(plan,y,race);
    return Object.assign({key:`${plan}_${race}_margin_${y}`,plan,label,group,values:vals,fmt:PTS,skipZero:false,ramp:POL,bins:MARG_BINS,binLabels:MARG_LBL,legendTitle:`${label}: Republican minus Democratic share (points), by district`,caption:`${nm[0]} share minus ${nm[1]} share in each district of the ${X.plans[plan]?X.plans[plan].label:plan}.`},extra||{});};
  const RACE={pres:'President',gov:'Governor',sen:'U.S. Senate'};
  const hist=(plan,n)=>{const rows=[];Object.keys(R[plan]?R[plan].years:{}).map(Number).sort((a,b)=>b-a).forEach(y=>{const d=dres(plan,y,n);if(!d)return;['pres','gov','sen'].forEach(r=>{if(!d[r])return;const nm=names(plan,y,r);rows.push([y,RACE[r],`${esc(nm[0])} ${PCT(d[r][0])}`,`${esc(nm[1])} ${PCT(d[r][1])}`,PTS(d[r][0]-d[r][1])]);});});return rows;};
  const partsTable=(f,plan)=>(X.counties[f][plan]||[]).map(([n,p,sh])=>[CM.districtName(plan,n),PCT0(sh),PTS(marg(plan,2024,'pres',n)),PTS(marg(plan,2022,'gov',n))]);
  const distList=(plan,title,sub,filter,sort,n)=>{const l=dids(plan).filter(filter||(()=>true)).sort(sort);return {title,sub,html:l.slice(0,n||l.length).map(d=>{const m=marg(plan,2024,'pres',d),cs=CM.districtCounties(plan,d);return CM.districtRow(plan,d,PTS(m),cs.slice(0,3).map(c=>esc(cname[c[0]])).join(', ')+(cs.length>3?' +'+(cs.length-3)+' more':''));}).join('')};};
  return {
   plan:NEW,
   metrics:[
    {key:'cd_changed',label:'Residents with a new district number',group:'2026 congressional map vs. 2024 map',values:changed,fmt:PCT0,skipZero:false,ramp:'purple',bins:[0.0001,0.25,0.5,0.75,0.9999],binLabels:['no one: same district number','under 25% of residents','25-50%','50-75%','75-99%','the whole county'],legendTitle:'Share of the county\'s residents whose congressional district number changed, 2024 map to 2026 map',caption:'2020 Census residents whose congressional district has a different number under PLANC2333 than under PLANC2193. A district can keep its number and still change shape, so this is a floor on how much moved.'},
    {key:'cd_change_cat',label:'Did the county\'s district change?',group:'2026 congressional map vs. 2024 map',values:chgCat,categories:{same:{label:'No one: same district number',color:'#d9d5cc'},part:{label:'Part of the county',color:'#c9a2e0'},all:{label:'The whole county',color:'#5e2a84'}},legendTitle:'Who has a new congressional district number under the 2026 map',caption:'Whether any residents of the county sit in a differently numbered district under PLANC2333 than under PLANC2193.'},
    {key:'lean_new',label:'District lean, 2026 map (President 2024)',group:'How the county\'s congressional district leans',values:leanNew,fmt:PTS,skipZero:false,ramp:POL,bins:MARG_BINS,binLabels:MARG_LBL,legendTitle:'Trump minus Harris 2024 in the county\'s district(s), 2026 map (points)',caption:'How the congressional district each county sits in voted for President in 2024, using the 2026 lines (PLANC2333). Split counties are weighted by residents.'},
    {key:'lean_old',label:'District lean, 2024 map (President 2024)',group:'How the county\'s congressional district leans',values:leanOld,fmt:PTS,skipZero:false,ramp:POL,bins:MARG_BINS,binLabels:MARG_LBL,legendTitle:'Trump minus Harris 2024 in the county\'s district(s), 2024 map (points)',caption:'The same figure under the 2024 lines (PLANC2193), the districts actually used in November 2024.'},
    {key:'lean_chg',label:'Change in district lean, 2024 map to 2026 map',group:'How the county\'s congressional district leans',values:leanChg,fmt:PTS,skipZero:false,ramp:POL,bins:[-0.2,-0.1,-0.02,0.02,0.1,0.2],binLabels:['district 20+ pts more Democratic','10-20 pts more Democratic','2-10 pts more Democratic','about the same (within 2 pts)','2-10 pts more Republican','10-20 pts more Republican','district 20+ pts more Republican'],legendTitle:'Change in the county\'s district lean, 2026 map minus 2024 map (points, President 2024)',caption:'Red = the county now sits in a more Republican district than before, blue = a more Democratic one. Both maps use the same 2024 presidential votes, so this is purely the effect of moving the lines.'},
    dm(NEW,2024,'pres','President 2024 by district, 2026 map','Congressional districts, 2026 map (PLANC2333)'),dm(NEW,2020,'pres','President 2020 by district, 2026 map','Congressional districts, 2026 map (PLANC2333)'),dm(NEW,2024,'sen','U.S. Senate 2024 by district, 2026 map','Congressional districts, 2026 map (PLANC2333)'),dm(NEW,2022,'gov','Governor 2022 by district, 2026 map','Congressional districts, 2026 map (PLANC2333)'),
    dm(OLD,2024,'pres','President 2024 by district, 2024 map','Congressional districts, 2024 map (PLANC2193)'),dm(OLD,2020,'pres','President 2020 by district, 2024 map','Congressional districts, 2024 map (PLANC2193)'),dm(OLD,2024,'sen','U.S. Senate 2024 by district, 2024 map','Congressional districts, 2024 map (PLANC2193)'),dm(OLD,2022,'gov','Governor 2022 by district, 2024 map','Congressional districts, 2024 map (PLANC2193)'),
    dm('PLANH2316',2024,'pres','President 2024 by Texas House district','Texas House (PLANH2316)'),dm('PLANH2316',2022,'gov','Governor 2022 by Texas House district','Texas House (PLANH2316)'),
    dm('PLANS2168',2024,'pres','President 2024 by Texas Senate district','Texas Senate (PLANS2168)'),dm('PLANS2168',2022,'gov','Governor 2022 by Texas Senate district','Texas Senate (PLANS2168)'),
    dm('PLANE2106',2024,'pres','President 2024 by SBOE district','State Board of Education (PLANE2106)')],
   base:'cd_changed',
   stats:[[nChg+' of 254','counties with residents in a new congressional district number'],[PCT0(chgPop/stPop),'of Texans have a new district number'],[rWon(NEW)+' vs '+rWon(OLD),'of 38 districts Trump carried, 2026 vs 2024 lines']],
   facts:[`Under the 2026 map, <b>${PCT0(chgPop/stPop)}</b> of Texans (${num(Math.round(chgPop/1e5)/10)} million) live in a congressional district with a different number than under the 2024 map. ${nChg} counties are affected, ${nAll} of them entirely.`,
          `Districts Trump carried in 2024: <b>${rWon(NEW)} of 38</b> on the 2026 lines against <b>${rWon(OLD)} of 38</b> on the 2024 lines. Districts within 10 points: ${comp(NEW).length} on the 2026 map (${comp(NEW).map(n=>'CD '+n).join(', ')||'none'}) and ${comp(OLD).length} on the 2024 map (${comp(OLD).map(n=>'CD '+n).join(', ')||'none'}).`,
          `The 2026 map splits <b>${splitN.length}</b> counties between congressional districts; the 2024 map split ${splitO.length}.`,
          upR?`<b>${esc(cname[upR])} County</b> moved into the most Republican-leaning district relative to before (${PTS(leanChg[upR])}: from ${PTS(leanOld[upR])} to ${PTS(leanNew[upR])}); <b>${esc(cname[upD])} County</b> moved the other way (${PTS(leanChg[upD])}: from ${PTS(leanOld[upD])} to ${PTS(leanNew[upD])}).`:''].filter(Boolean),
   lists:[distList(NEW,'Closest congressional districts, 2026 map','President 2024 margin',null,(a,b)=>Math.abs(marg(NEW,2024,'pres',a))-Math.abs(marg(NEW,2024,'pres',b)),12),
          distList(OLD,'Closest congressional districts, 2024 map','President 2024 margin',null,(a,b)=>Math.abs(marg(OLD,2024,'pres',a))-Math.abs(marg(OLD,2024,'pres',b)),12),
          {metric:'lean_chg',n:15,title:'Counties now in a more Republican district',sub:'2026 map minus 2024 map, President 2024'},{metric:'lean_chg',n:15,title:'Counties now in a more Democratic district',sub:'2026 map minus 2024 map, President 2024',desc:false},
          {metric:'cd_changed',n:20,title:'Counties with the most residents in a new district number',sub:'share of 2020 residents'},
          distList(NEW,'All 38 congressional districts, 2026 map','President 2024 margin, most Democratic first',null,(a,b)=>marg(NEW,2024,'pres',a)-marg(NEW,2024,'pres',b)),
          distList(OLD,'All 38 congressional districts, 2024 map','President 2024 margin, most Democratic first',null,(a,b)=>marg(OLD,2024,'pres',a)-marg(OLD,2024,'pres',b))],
   countyExtra:f=>{const c=X.counties[f]||{};const leg=(plan,lab)=>{const ps=c[plan]||[];return ps.length?`<div class="row" style="cursor:default"><div><div class="n">${lab}</div><div class="m">${ps.map(([n,p,sh])=>CM.districtName(plan,n)+(ps.length>1?' ('+PCT0(sh)+')':'')).join(', ')}</div></div></div>`:'';};
     return subhead('Congressional district, 2026 map (PLANC2333)')+table(partsTable(f,NEW),['District','Share of county','Trump 2024','Abbott 2022'])+(c[NEW]||[]).map(([n])=>CM.districtRow(NEW,n,PTS(marg(NEW,2024,'pres',n)),'open this district')).join('')
       +subhead('Congressional district, 2024 map (PLANC2193)')+table(partsTable(f,OLD),['District','Share of county','Trump 2024','Abbott 2022'])+(c[OLD]||[]).map(([n])=>CM.districtRow(OLD,n,PTS(marg(OLD,2024,'pres',n)),'open this district')).join('')
       +`<div class="note" style="padding:4px 0 0">${changed[f]>=0.999?'Everyone in this county has a different congressional district number under the 2026 map.':changed[f]>0?PCT0(changed[f])+' of residents have a different district number under the 2026 map.':'District numbers are unchanged here (the lines around the district may still have moved).'}</div>`
       +subhead('Legislative districts')+leg('PLANH2316','Texas House')+leg('PLANS2168','Texas Senate')+leg('PLANE2106','State Board of Education');},
   districtExtra:(plan,n)=>{const rows=hist(plan,n);const other=plan===NEW?OLD:plan===OLD?NEW:null;const om=other?marg(other,2024,'pres',n):null;
     return subhead('How this district voted')+(rows.length?table(rows,['Year','Race','Rep.','Dem.','Margin']):'<div class="empty">No results loaded.</div>')
       +`<div class="note" style="padding:4px 0 0">${esc((R[plan]||{}).basis||'')}. Turnout ${(dres(plan,2024,n)||{}).bal?num(dres(plan,2024,n).bal)+' ballots of '+num(dres(plan,2024,n).vr)+' registered in 2024':''}.</div>`
       +(om!=null?`<div class="note" style="padding:4px 0 0">District ${n} on the ${other===OLD?OLDL:NEWL} (different lines) voted ${PTS(om)} for President in 2024. ${CM.districtRow(other,n,PTS(om),'open the same number on the other map')}</div>`:'');},
   note:'PLANC2333 is the congressional map enacted in 2025 for the 2026 elections; PLANC2193 was used in 2022 and 2024. District results are the Texas Legislative Council\'s tabulations of actual precinct votes onto each plan\'s lines, so a 2026-map figure shows how that district would have voted. County shares are 2020 Census residents.',
   welcomeTitle:'Texas redistricting, county by county',
   about:'<p>This map opens on the share of each county\'s residents who got a different congressional district number under the 2026 map, with the new district lines drawn on top. <b>Color the map by</b> switches to how each county\'s district leans, how much that changed when the lines moved, and to results by district for the 2026 and 2024 congressional maps, the Texas House, the Texas Senate and the State Board of Education. <b>District lines</b> in the overlays panel draws any plan over any coloring. Click a district for its voting history and counties; click a county for its districts under every plan.</p>',
   sources:'<ul><li><b>District lines and block assignments</b>: Texas Legislative Council plan files on the Capitol Data Portal: <a href="https://data.capitol.texas.gov/dataset/planc2333" target="_blank" rel="noopener">PLANC2333</a> (Congress, 2026), <a href="https://data.capitol.texas.gov/dataset/planc2193" target="_blank" rel="noopener">PLANC2193</a> (Congress, 2022-2024), <a href="https://data.capitol.texas.gov/dataset/planh2316" target="_blank" rel="noopener">PLANH2316</a> (House), <a href="https://data.capitol.texas.gov/dataset/plans2168" target="_blank" rel="noopener">PLANS2168</a> (Senate) and <a href="https://data.capitol.texas.gov/dataset/plane2106" target="_blank" rel="noopener">PLANE2106</a> (SBOE); shapefiles generalized for the web.</li><li><b>County shares</b>: each plan\'s block-equivalency file joined to the 2020 Census PL 94-171 block counts; every county part and district total matches TLC\'s Red-100 population report.</li><li><b>District results</b>: TLC Red-206 election reports for each plan, 2012-2024 general elections; districts sum exactly to the state in every report.</li></ul>',
   caveats:'<ul><li>Results on the 2026 lines are re-tabulations of past votes, not elections held under those lines; turnout and candidates would differ in a real contest.</li><li>A district can keep its number and still change shape, so "same district number" does not mean nothing moved; the crosswalk tables on each county show the actual shares.</li><li>County shares are residents (2020 Census), not voters.</li><li>Shares are of all votes in the race, including third parties.</li></ul>'};}};
})(window.TX_TOPICS);
