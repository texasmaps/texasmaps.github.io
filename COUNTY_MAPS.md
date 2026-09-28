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

## What is on the branch (for reviewers)

Everything below is new; no pre-existing file on `main` is touched. Start with `texas_county_deep_dive.html` (the command center) or
`texas_county_maps.html` (one topic at a time, `?topic=`). Deep links on the command center: `#county=48303&tab=money&compare=48375,48029&color=turnout_2024&lines=PLANC2333`.

| File | What it is | Used by |
|---|---|---|
| `texas_county_deep_dive.html`, `tx_deep_dive.js`, `tx_deep_dive.css` | **the county command center**, laid out like a desktop GIS application: a **ribbon** (the eight question tabs; under the active tab, the measures that can color the counties, that tab's own choices such as which two elections to compare, Add to compare / Prepare roundtable, and a lock that keeps the coloring when tabs change), a **Contents pane** on the left (every layer with its symbology: counties, district lines for five maps, aquifers, rivers, basins, data-center projects), the **map** with a status bar (county and coordinates under the cursor, scale bar, statewide figures), the **county pane** on the right (What to know, then the tab's content, each tab headed by its question), and a **docked comparison table** at the bottom. Opens on a Texas page; searching or clicking a county opens its page. Switching a tab recolors the map to that tab's default measure unless the coloring is locked. | the team's main entry point |
| `tx_places.js` | 1,855 Texas cities, towns and CDPs with their county (Census 2024 Gazetteer) | the command center's search box |
| `tx_county_aquifers.js` | which TWDB major and minor aquifers lie under each county, with the share of county area | Water tab, briefs |
| `texas_county_maps.html` | the topic app (header, sidebar, county / district / pin cards, deep links) | the single-topic maps |
| `tx_county_map.js`, `tx_county_map.css` | the county-map engine and styles (shading, pins, rivers/basins and aquifer overlays, districts, legend, search, About) | all pages |
| `tx_topics.js` | the topic registry: data-centers, rainfall, wells, regions, demographics, elections, turnout, districts, deep-dive | the app page |
| `tx_districts.js`, `tx_district_crosswalk.js` | district outlines for 5 TLC plans; county x district residents and shares | every topic (District lines menu), districts, deep-dive |
| `tx_district_results.js` | Red-206 results by district 2012-2024 | districts, deep-dive |
| `tx_county_elections.js` | county results 2006-2024 (shares, margins, changes, vote counts), registration, turnout, 2014-2018 primaries | elections, turnout, deep-dive |
| `tx_county_demographics.js` | TDC 2025 population + ACS 2020-24 (39 fields) + the State of Texas row | demographics, deep-dive |
| `tx_county_ballot.js` | certified 2026 ballot by county, Democratic county chairs, TEC and FEC fundraising | deep-dive |
| `tx_county_contribs.js` | itemized contributions to every 2026 state candidate (and linked committees) by the donor's county: dollars and gifts, 2026 YTD and since 2025 (TEC bulk export) | command center: Money and Ballot tabs, three Fundraising colorings, tray, brief |
| `tx_county_downballot.js` | county results for the down-ballot statewide races 2006-2024 (Lieutenant Governor, Attorney General, Comptroller, Land and Agriculture Commissioner, Railroad Commissioner, Chief Justice, Presiding Judge): Republican and Democratic votes and all votes per race-year, with the candidates' names | command center: Elections tab, Election-change colorings, brief |
| `tx_county_registration.js` | registered and suspense-list voters for every SOS registration page 2008-2026 (44 pages) | command center: Elections tab, suspense coloring |
| `tx_county_proptax.js` | county government and average school-district property tax rates 2021-2025 and every taxing unit's latest rate (Comptroller rates and levies) | command center: Overview tab, Property-tax colorings, brief |
| `tx_county_incentives.js` | local incentive deals (Ch.380/381/312/313/JETI) by county with the largest twelve per county, ERCOT queue and subsidized-power figures, and data-center projects linked to Abbott donors (audited file) | command center: Data Centers tab and colorings, Texas page |
| `tx_county_orgs.js` | community organizations / brokers by county (1,821 rows) | deep-dive |
| `tx_regions.js` | campaign regions | regions, deep-dive |
| `county_map_template.html` | standalone-page example on the same engine | reviewers copying the pattern |
| `tools/csv_to_js.py` | CSV to `tx_*.js` converter | adding a topic |
| `COUNTY_MAPS.md` | this document | reviewers |
| `HOW_TO_MAKE_A_MAP.md` | the recipe for a new map or topic and the full `CM.init` config reference (metrics, pins, callbacks, layers, helpers, deep links) | anyone adding a map |
| `DATA_SOURCES.md` | where every number comes from: each dataset with its publisher link, what was taken, the file it feeds, definitions, known gaps, and the dataset-to-file map | reviewers checking a figure |

Reused as they are from `main`: `tx_counties.js`, `tx_surface_water.js`, `tx_dc_sites.js`, `tx_county_water.js`. Deep links to try:
`?topic=deep-dive#county=48303`, `?topic=districts#shade=PLANC2333_pres_margin_2024`, `?topic=elections#districts=PLANC2333`,
`?topic=districts#district=PLANC2333:15`. The workbook and the raw source folders stay on the Edith drive (not in the repo).

## Files (all new; nothing pre-existing was changed)

| File | Role |
|---|---|
| `texas_county_maps.html` | the page: header, sidebar views, loads the topic's data on demand |
| `tx_topics.js` | the topic registry: one entry per topic (label, data files, and a `build()` that returns metrics, facts, lists, words) |
| `tx_county_map.js` | the county-map engine (projection, county outlines, shading, pins, sidebar, search, overlays, legend, welcome, About) |
| `tx_county_map.css` | the styles, copied from `tx_water_map.css` with the aquifer rules removed and county-shading rules added |
| `tx_regions.js` | county → campaign region, built from `tx_counties_by_region.csv` by `tools/csv_to_js.py` |
| `tx_county_elections.js` | 99 fields per county + vote counts (`<office>_R_votes_<year>`, `_D_votes_`, `_total_votes_`) + March 2026 registration (`registered_march_2026`, `suspense_march_2026`, `registered_2025`, `registration_growth_2024_2026`) + 2014-2018 primaries (`primary_D_votes_<y>`, `primary_R_votes_<y>`, `registered_march_<y>`, `primary_turnout_<y>`, `primary_D_share_<y>`) + a `state` block: presidential/governor/Senate shares and margins by year, point changes, turnout, ballots, registered voters (see the file header for sources) |
| `tx_county_demographics.js` | 39 fields per county (incl. adults 18+ from ACS B01001) + the State of Texas row `TX_DEMOGRAPHICS_STATE`: TDC preliminary Vintage 2025 population + ACS 2020-24 5-year (see the file header for tables); percent fields are fractions |
| `tx_districts.js` | district outlines for five TLC plans (PLANC2333 = Congress 2026, PLANC2193 = Congress 2024, PLANH2316 House, PLANS2168 Senate, PLANE2106 SBOE), generalized, same ring encoding as `tx_surface_water.js` |
| `tx_district_crosswalk.js` | county × district: 2020 residents and shares for every plan, plus each county's share of residents whose congressional district number changed from the 2024 map to the 2026 map |
| `tx_district_results.js` | TLC Red-206 results by district, 2012-2024 (President, Governor, U.S. Senate: shares, margin, votes; registered voters; ballots) for all five plans |
| `tx_county_ballot.js` | the certified 2026 ballot by county (3,821 candidates, 710 offices), Democratic county chairs, TEC fundraising for state candidates and FEC 2025-26 cycle totals for U.S. House and Senate candidates (77 of 87), exported from the verified workbook |
| `tx_county_contribs.js` | `cands[candidate index][county FIPS or OUT or UNK] = [dollars 2026 YTD, gifts, dollars since 2025-01-01, gifts]` for 741 candidate accounts, plus `spacs` for the 10 candidates with linked support committees; donor placed by ZIP (Census ZCTA to county) or city; 483,046 itemized rows since 2025 from the TEC export as of 2026-09-26 |
| `tx_county_downballot.js` | `races[key] = {label, years:{year:[R surname, D surname]}}`; `counties[fips][key][year] = [R votes, D votes, all votes]`; `state` the same statewide; built by `build_scripts/build_downballot.py` from `built/county_election_results_2006-2024_long.csv` |
| `tx_county_registration.js` | `pages[i] = [label, page id, year, month]`, `counties[fips][i] = [registered, suspense]`, `state[i]` sums; built by `build_scripts/build_registration_history.py` |
| `tx_county_proptax.js` | `counties[fips] = {county:{year:rate}, isd:{year:avg}, n:{year:units}, units:[[name,type,rate,split]], flagged:{2025:value}}` per $100 (2025 county rates that moved more than half from 2024 are blank and kept in `flagged`; the Comptroller's 2025 file misfiles some county rows); `state` = unweighted averages; built by `build_scripts/build_proptax.py` from the Comptroller workbooks in `Projected Property Tax/` |
| `tx_county_incentives.js` | `counties[fips] = {zone, burden, deals_n, by_program, value_total, deals:[top 12], links:[donor-linked data centers]}`; built by `build_scripts/build_incentives.py` from the ERCOT/incentives project tables and the audited donor-link file |
| `tx_county_orgs.js` | community organizations / brokers by county (1,800+ rows: Farm Bureau offices, teacher locals, labor councils with officers, chambers with 85 auto-extracted executives, hospitals, colleges, Realtor associations, American Legion posts), each row with its source URL, pull date, coverage type and evidence type |
| `county_map_template.html` | standalone-page example on the same engine (data center projects per county) |
| `tools/csv_to_js.py` | turns any CSV with a county or FIPS column into a `tx_*.js` data file |

Reused as they are: `tx_counties.js` (county outlines), `tx_surface_water.js` (rivers, lakes, basins), `tx_dc_sites.js` (data center pins),
`tx_county_water.js` (county rainfall and well counts). The version tag on every local script and stylesheet link is `?v=20260928-3`;
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

A county political capacity and electoral change dashboard built around five questions (who can vote here, who turns out,
how they vote, where campaign money is flowing, how redistricting changed the political geography). The county card opens with
five plain-English findings ("What to know"), then Voter base (adults 18+, registered voters, growth since the 2022 midterm,
ballots, turnout and its changes, 2014-2018 primary turnout and Democratic share of primary votes), How the county voted (2024 presidential vote counts and shares, Trump and Democratic shares
2016-2024, governor and Senate margins), Campaign money (state-district races on the ballot with raised, cash, spent, filing date,
associated committees and rank within the race; a race in the top quarter of statewide totals is flagged as higher-funded),
Redistricting (2024 vs 2026 districts, the split statement, the 2024 presidential result under the old and the re-tabulated
new district), Who lives here, Community organizations and the 2026 ballot, each figure next to the Texas figure (`window.TX_DEMOGRAPHICS_STATE` in
`tx_county_demographics.js` holds the state row) with a **Compare with** menu that adds any second county. The list view has a
Regions block (click a campaign region to highlight it and get votes-weighted summaries), a sortable table of all 254 counties
(`window.TX_DD.sortBy`), and ranked lists. The topic sets `countyKv:false` (the page skips the generic metric list) and
`countySub(fips)` (the line under the county name); the card is re-rendered in place by `window.TX_DD.render()`.
Community organizations are grouped by broker category (Agriculture, Teachers, Labor, Business, Health, Faith, Veterans, Higher ed,
Civic, Parents/families, Industry-specific) and show leader, public contact, coverage type, evidence type and source; the
definition and caution text come from `tx_county_orgs.js`. Raw pulls and the CSV live in `Gina For Texas/Community Organizations/`
on the Edith drive (`raw_2026-09-28/SOURCES.txt` lists every URL); rebuild with `build_scripts/build_orgs.py` + `write_orgs_js.py`.

## Aquifers (overlay on the command center)

With `tx_aquifers.js` (the water maps' TWDB outlines, already on main) loaded before the engine, `controls` may include `'aquifers'`: the overlays panel gets **Major aquifers** and **Minor aquifers** checkboxes. The command center draws its own Contents pane instead of the engine's panel and shows the major aquifers only (an Aquifers layer there and a Water-tab button). Major aquifers are translucent fills, one color each (`CM.aqColor(name)`), with labels; minor aquifers a faint dashed fill with labels when zoomed in. The legend lists them, the county tooltip names the aquifers under the cursor, and `#layers=aquifers,minor` deep-links the state. The Water coloring **Main aquifer under the county** (from `tx_county_aquifers.js`) uses the same colors. **Clicking an aquifer's name on the map** (or its row in the Contents pane, or the "what sits on top" button on a county's Water tab) opens an aquifer card: the counties over it with their shares, and every tracked data-center project whose site falls inside the outline (engine callback `onAquifer(name, kind)`; helpers `CM.aquifer`, `CM.pinsInAquifer`, `CM.highlightAquifer`, `CM.zoomAquifer`; deep link `#aquifer=<name>`).

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

- **Itemized contributions by county** (`tx_county_contribs.js`): Texas Ethics Commission bulk export (contribs_##.csv, cont_ss.csv, cont_t.csv) as of 2026-09-26, Schedule A rows dated 2025-01-01 or later for each ballot candidate's filer account and linked SPACs; originals of corrected reports and daily pre-election reports skipped; contributor placed by ZIP (Census 2020 ZCTA-to-county relationship, largest land area) or by city (Census 2024 Gazetteer place). Built by `Texas Deep Dive Sources/build_scripts/build_contribs_by_county.py`; long CSV in `built/contribs_by_candidate_county_2025-26.csv`. Itemized 2026 sums equal the cover-sheet totals for the largest accounts (Hinojosa $7,428,074 vs $7,428,124).
- Data center projects: Texas Data Center Watch (`tx_dc_sites.js`, copied out of `texas_data_center_map.html`).
- Rainfall: PRISM Climate Group, Oregon State University (1991–2020 normals; monthly grids for Sep 2025 – Aug 2026); county means built by `tools/build_county_water.py` on 2026-09-25.
- Wells: Texas Water Development Board Groundwater Database (all wells on record, copy of 2026-09-25) and Submitted Driller's Reports (water-supply wells drilled 2020-01-01 through 2026-09-24).
- Ballot, chairs, fundraising: SOS ballot certification of 2026-08-28, Texas Democratic Party county chair directory, Texas Ethics Commission bulk export as of 2026-09-26, FEC bulk candidate summary and candidate master for the 2025-26 cycle as of 2026-09-28 (via the verified workbook).
- Community organizations: NCES IPEDS HD2023; CMS Hospital General Information; Texas Chamber of Commerce Executives directory; Texas AFT locals; TSTA local associations; Texas AFL-CIO central labor councils; Texas REALTORS local associations by county (2026-06-23); Texas Farm Bureau county locator data; American Legion Department of Texas post map; council and chamber websites for officers; Census 2020 ZCTA-county relationship file.
- Districts: Texas Legislative Council plan datasets on data.capitol.texas.gov (PLANC2333, PLANC2193, PLANH2316, PLANS2168, PLANE2106: shapefiles, block-equivalency files, Red-100 and Red-206 reports; bundles dated 2026-09-11) and the 2020 Census PL 94-171 Texas block file.
- Regions: `tx_counties_by_region.csv` in this repository.
- Elections and turnout: Texas Secretary of State official canvass, county pages for 2006-2018 statewide races (https://elections.sos.state.tx.us/); SOS voter registration figures by county, November 2008-2024 (https://www.sos.state.tx.us/elections/historical/vrfig.shtml); Texas Legislative Council Red-211 Election Analysis with County Subtotals for PLANC2333, 2012-2024 (https://data.capitol.texas.gov/dataset/planc2333), used for 2020-2024 results and 2012-2024 ballots cast. Built 2026-09-28; margins = R minus D in points; changes = later minus earlier in points.
- Demographics: Texas Demographic Center preliminary Vintage 2025 county estimates (https://demographics.texas.gov/Resources/TPEPP/Estimates/2025/2025_txpopest_county.zip) and U.S. Census Bureau ACS 2020-2024 5-year table-based summary files (https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/5YRData/), tables B01001 B01002 B01003 B03002 B15003 B17001 B19013 B19301 B23025 B25003 B25064 B25077 C24030; built 2026-09-28.
- County outlines: the COUNTIES layer shared with Data Center Watch (`tx_counties.js`).
