# Texas County Maps — one page, many topics

`texas_county_maps.html` is a single map page that shows a different county dataset depending on the topic in its address:

| Address | Shows |
|---|---|
| `texas_county_maps.html?topic=data-centers` | data center projects and announced power per county, with every project as a dot |
| `texas_county_maps.html?topic=rainfall` | the last 12 months vs. normal, and average yearly rainfall (PRISM) |
| `texas_county_maps.html?topic=wells` | water-supply wells drilled since 2020, and all wells on record (TWDB) |
| `texas_county_maps.html?topic=regions` | the six campaign regions (from tx_counties_by_region.csv) |
| `texas_county_maps.html?topic=elections` | election movement: President, Governor and U.S. Senate margins by county since 2008 and point shifts between elections (SOS canvass 2006-2018, TLC county subtotals 2020-2024) |
| `texas_county_maps.html?topic=turnout` | turnout, ballots and registered voters for every general election 2006-2024, changes between like-for-like elections, registration growth |
| `texas_county_maps.html?topic=demographics` | 14 county measures: population and growth (Texas Demographic Center, preliminary 2025), age, race/ethnicity, income, poverty, unemployment, education, housing (ACS 2020-24) |

A **Topic** menu in the header switches between them. Every topic has the same layout as the water maps: a search box, an
*At a glance* section of headline facts computed from the data, ranked county lists ("interesting facts"), a **Map overlays**
panel (top right) with one *Color the map by* menu plus rivers and river-basin outlines, a legend, a once-only welcome card and an
*About this map* panel with sources and caveats. Click a county for its numbers, its rank and whatever sits in it; click a dot for its card.

Deep links work on every topic: `#shade=<metric key>|none`, `#layers=rivers,basins`, `#county=<fips or name>`, `#pin=<id>`,
and `#region=<id>` on the regions topic. Example: `texas_county_maps.html?topic=rainfall#shade=rain&county=Travis`.

## Files (all new; nothing pre-existing was changed)

| File | Role |
|---|---|
| `texas_county_maps.html` | the page: header, sidebar views, loads the topic's data on demand |
| `tx_topics.js` | the topic registry: one entry per topic (label, data files, and a `build()` that returns metrics, facts, lists, words) |
| `tx_county_map.js` | the county-map engine (projection, county outlines, shading, pins, sidebar, search, overlays, legend, welcome, About) |
| `tx_county_map.css` | the styles, copied from `tx_water_map.css` with the aquifer rules removed and county-shading rules added |
| `tx_regions.js` | county → campaign region, built from `tx_counties_by_region.csv` by `tools/csv_to_js.py` |
| `tx_county_elections.js` | 99 fields per county + a `state` block: presidential/governor/Senate shares and margins by year, point changes, turnout, ballots, registered voters (see the file header for sources) |
| `tx_county_demographics.js` | 38 fields per county: TDC preliminary Vintage 2025 population + ACS 2020-24 5-year (see the file header for tables); percent fields are fractions |
| `tx_districts.js` | district outlines for five TLC plans (PLANC2333 = Congress 2026, PLANC2193 = Congress 2024, PLANH2316 House, PLANS2168 Senate, PLANE2106 SBOE), generalized, same ring encoding as `tx_surface_water.js` |
| `tx_district_crosswalk.js` | county × district: 2020 residents and shares for every plan, plus each county's share of residents whose congressional district number changed from the 2024 map to the 2026 map |
| `tx_district_results.js` | TLC Red-206 results by district, 2012-2024 (President, Governor, U.S. Senate: shares, margin, votes; registered voters; ballots) for all five plans |
| `tx_county_ballot.js` | the certified 2026 ballot by county (3,821 candidates, 710 offices), Democratic county chairs and TEC fundraising, exported from the verified workbook |
| `tx_county_orgs.js` | community organizations / brokers by county (1,300+ rows: Farm Bureau offices, teacher locals, labor councils, chambers, hospitals, colleges, Realtor associations), each row with its source URL, pull date, coverage type and evidence type |
| `county_map_template.html` | standalone-page example on the same engine (data center projects per county) |
| `tools/csv_to_js.py` | turns any CSV with a county or FIPS column into a `tx_*.js` data file |

Reused as they are: `tx_counties.js` (county outlines), `tx_surface_water.js` (rivers, lakes, basins), `tx_dc_sites.js` (data center pins),
`tx_county_water.js` (county rainfall and well counts). The version tag on every local script and stylesheet link is `?v=20260928-2`;
bump it in the page whenever the engine, the registry or a data file changes (GitHub Pages caches files for 10 minutes).

## Adding a topic

1. Make the data file. From a CSV with a county-name or FIPS column:
   `python3 tools/csv_to_js.py mydata.csv --var TX_MYTOPIC --out tx_mytopic.js`
   (matches "Bexar", "Bexar County", "DeWitt"/"De Witt", or a FIPS code such as 48029 or 029 in either column; lists unmatched rows; sums duplicate counties).
2. Add an entry to `tx_topics.js`:
   ```js
   T['mytopic']={label:'My topic',title:['Texas','My Topic','by County'],intro:'One sentence for the top of the sidebar.',
     data:['tx_mytopic.js'],
     build(){const D=window.TX_MYTOPIC;const v={};Object.keys(D).forEach(f=>v[f]=D[f].some_column);
       return {metrics:[{key:'x',label:'Some number',values:v,unit:'things',ramp:'green',bins:[10,20,50,100,200]}],base:'x',
         stats:[[254,'counties']],facts:['<b>Something</b> worth knowing.'],lists:[{metric:'x',n:15,title:'Top counties'}],
         about:'<p>…</p>',sources:'<ul><li>…</li></ul>',caveats:'<ul><li>…</li></ul>'};}};
   ```
3. Bump the version tag in `texas_county_maps.html`. That is all: the page, the engine and the hub need no changes.

## The County Deep Dive topic (`?topic=deep-dive`)

A statewide county-level political intelligence view: demographics, turnout, political change, the 2026 districts and ballot,
and community organizations in one county card, each figure next to the Texas figure (`window.TX_DEMOGRAPHICS_STATE` in
`tx_county_demographics.js` holds the state row) with a **Compare with** menu that adds any second county. The list view has a
Regions block (click a campaign region to highlight it and get votes-weighted summaries), a sortable table of all 254 counties
(`window.TX_DD.sortBy`), and ranked lists. The topic sets `countyKv:false` (the page skips the generic metric list) and
`countySub(fips)` (the line under the county name); the card is re-rendered in place by `window.TX_DD.render()`.
Community organizations are grouped by broker category (Agriculture, Teachers, Labor, Business, Health, Faith, Veterans, Higher ed,
Civic, Parents/families, Industry-specific) and show leader, public contact, coverage type, evidence type and source; the
definition and caution text come from `tx_county_orgs.js`. Raw pulls and the CSV live in `Gina For Texas/Community Organizations/`
on the Edith drive (`raw_2026-09-28/SOURCES.txt` lists every URL); rebuild with `build_scripts/build_orgs.py` + `write_orgs_js.py`.

## Districts (overlay on every topic, plus the Redistricting topic)

`texas_county_maps.html` loads `tx_districts.js` and `tx_district_crosswalk.js` for every topic, so every map gets a
**District lines** menu in the overlays panel (none, Congress 2026 map, Congress 2024 map, House, Senate, SBOE), district
numbers that appear once a district is wide enough on screen, and a county tooltip line naming the county's district(s)
with the share of residents in each. A topic can open with lines on by returning `plan:'PLANC2333'` from `build()`.

A **district metric** shades districts instead of counties: give the metric `plan:'PLANC2333'` (or any plan id) and key its
`values` by district number. The engine then fills that plan's districts, disables the lines menu (the metric's plan wins),
makes districts hoverable and clickable, and leaves counties plain underneath. Ranked county lists ignore district metrics;
build district lists with `CM.districtRow(plan, n, value, sub)` inside `{html,title,sub}` blocks. The page opens a district
card on click (`onDistrict`): its district metrics, `districtExtra(plan, n)` from the topic, and its counties with shares.

Engine helpers: `CM.plans()`, `CM.plan(id)`, `CM.districtName(plan,n)`, `CM.districtsOf(plan,fips)` → `[[n, residents, share of county]]`,
`CM.districtCounties(plan,n)` → `[[fips, residents, share of district]]`, `CM.setPlan(id)`, `CM.highlightDistrict(plan,n)`,
`CM.zoomDistrict(plan,n)`, `CM.activePlan()`. Deep links: `#districts=<plan id>` (lines on any topic), `#shade=<district metric key>`,
`#district=<plan>:<n>` (open a card). Plan labels are always spelled out with the TLC plan number so the two congressional maps
are never confused: "U.S. Congress, 2026 map (PLANC2333)" and "U.S. Congress, 2024 map (PLANC2193)".

How the district files were built (scripts in `Texas Deep Dive Sources/build_scripts/` on the Edith drive): shapefiles →
Lambert inverse → generalized to 3-5 thousandths of a degree → varint rings (`build_districts_geo.py`); block-equivalency
CSV × 2020 Census PL 94-171 block population → county parts (`build_crosswalk.py`, checked part by part against TLC's
Red-100 reports, 0 mismatches in all five plans); Red-206 workbooks → results (`build_district_results_all.py`, districts sum
exactly to the state in all 35 files); `write_district_js.py` emits the three files.

**Metric fields:** `key`, `label`, `values` `{fips:number}`, `unit`, `fmt(v)`, `bins` (class breaks; omit for automatic quantiles), `binLabels`,
`ramp` (`orange` `blue` `green` `purple` `maroon` `teal` `diverging`, or an array of 6 hex colors), `caption`, `legendTitle`, `noneLabel`,
`skipZero` (default true: zero and missing stay white), `group`. A categorical metric uses `categories:{value:{label,color}}` instead of bins.
**Pins:** `pins:[{id,name,lon,lat,fips?,county?,city?,status?,size?,hot?,sub?,details?,url?,urlLabel?,note?}]` with `pinStatuses:{key:{label,color}}`,
`pinLabel`, `pinSingular`, `pinPlural`, `hotLabel`, `hotChip`, `hotFlag`, `pinSizeNote`, `sizeLabel`, `listMetric(p)->{html,key}`, `listSortLabel`, `pinValue(p)`.
**Other:** `stats:[[value,label]]`, `facts:[html]`, `lists:[{metric,n,title,sub,desc,fmt}]` or `[{html,title,sub}]`, `note`, `countyExtra(fips)->html`,
`about`, `sources`, `caveats`, `legendNote`, `welcomeTitle`, `welcomeTips`, `openSections`, `plan` (district lines on at open),
`districtExtra(plan,n)->html`, `districtTip(plan,n)->lines`; a metric with `plan` shades districts (see Districts below).

## Optional hub hook (not applied; index.html is a pre-existing file, so this is its own pull request)

To list the app on the "All maps" hub, add to the `MAPS` array in `index.html`:
`{label:'County Maps (many topics)', file:'texas_county_maps.html', color:'#6B8E23'}`
and to `DESC`: `'texas_county_maps.html':'One map, many topics · data centers · rainfall · wells · campaign regions'`.
The hub uses `file` for the tab's iframe and its bookmark hash, so leave the `?topic=` off; the app opens on its first topic.

## Standalone pages

The same engine also runs a page of its own, if a topic deserves its own address: see `county_map_template.html` in the working
folder. Copy it, replace its DATA block and its words, and load `tx_county_map.js`/`.css` next to it.

## Sources
- Data center projects: Texas Data Center Watch (`tx_dc_sites.js`, copied out of `texas_data_center_map.html`).
- Rainfall: PRISM Climate Group, Oregon State University (1991–2020 normals; monthly grids for Sep 2025 – Aug 2026); county means built by `tools/build_county_water.py` on 2026-09-25.
- Wells: Texas Water Development Board Groundwater Database (all wells on record, copy of 2026-09-25) and Submitted Driller's Reports (water-supply wells drilled 2020-01-01 through 2026-09-24).
- Ballot, chairs, fundraising: SOS ballot certification of 2026-08-28, Texas Democratic Party county chair directory, Texas Ethics Commission bulk export as of 2026-09-26 (via the verified workbook).
- Community organizations: NCES IPEDS HD2023; CMS Hospital General Information; Texas Chamber of Commerce Executives directory; Texas AFT locals; TSTA local associations; Texas AFL-CIO central labor councils; Texas REALTORS local associations by county (2026-06-23); Texas Farm Bureau county locator data; Census 2020 ZCTA-county relationship file.
- Districts: Texas Legislative Council plan datasets on data.capitol.texas.gov (PLANC2333, PLANC2193, PLANH2316, PLANS2168, PLANE2106: shapefiles, block-equivalency files, Red-100 and Red-206 reports; bundles dated 2026-09-11) and the 2020 Census PL 94-171 Texas block file.
- Regions: `tx_counties_by_region.csv` in this repository.
- Elections and turnout: Texas Secretary of State official canvass, county pages for 2006-2018 statewide races (https://elections.sos.state.tx.us/); SOS voter registration figures by county, November 2008-2024 (https://www.sos.state.tx.us/elections/historical/vrfig.shtml); Texas Legislative Council Red-211 Election Analysis with County Subtotals for PLANC2333, 2012-2024 (https://data.capitol.texas.gov/dataset/planc2333), used for 2020-2024 results and 2012-2024 ballots cast. Built 2026-09-28; margins = R minus D in points; changes = later minus earlier in points.
- Demographics: Texas Demographic Center preliminary Vintage 2025 county estimates (https://demographics.texas.gov/Resources/TPEPP/Estimates/2025/2025_txpopest_county.zip) and U.S. Census Bureau ACS 2020-2024 5-year table-based summary files (https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/5YRData/), tables B01001 B01002 B01003 B03002 B15003 B17001 B19013 B19301 B23025 B25003 B25064 B25077 C24030; built 2026-09-28.
- County outlines: the COUNTIES layer shared with Data Center Watch (`tx_counties.js`).
