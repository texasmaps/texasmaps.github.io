/* tx_topics.js — the topic registry for texas_county_maps.html: one page, many county datasets (v 20260927-1).
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
})(window.TX_TOPICS);
