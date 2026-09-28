# How to make a new county map

**Two ways.** (A) Add a *topic* to the one-page app `texas_county_maps.html`: one data file + one entry in
`tx_topics.js`, documented in `COUNTY_MAPS.md`. This is the default. (B) Make a standalone page from the template,
as described below, when a map deserves its own address.

Every new map is one HTML page plus one data file, built on the county layer from the water maps.
The engine (`tx_county_map.js` + `tx_county_map.css`) draws the 254 counties, colors them
by any number you give it, drops optional pins, and provides the sidebar, search, overlays panel,
legend, welcome card and About panel exactly as on https://texasmaps.github.io/texas_aquifers_map.html.

## Steps

1. **Get the data into a file the page can load.** County numbers go in a `tx_<topic>.js` file:
   `window.TX_TOPIC={"48029":{"beds":1200,"n":3},...}` keyed by 5-digit county FIPS.
   From a CSV with a county-name or FIPS column:
   ```
   cd <the repo folder>
   python3 tools/csv_to_js.py mydata.csv --var TX_TOPIC --out tx_topic.js
   ```
   It matches "Bexar", "Bexar County", "DeWitt"/"De Witt", or FIPS (48029 / 029) in a column named
   fips/geoid or county/county_name, lists any county it could not match, and sums duplicate rows.
   Pins (facilities, sites) can live in the same file as a list with lon/lat, or in their own file.
2. **Copy the template:** `cp county_map_template.html texas_<topic>_map.html`.
3. **Edit section 1 (DATA)** of the page: build `values` objects per county and the `pins` list.
4. **Edit section 3 (INIT):** the `metrics` list (one entry per "Color the map by" choice), the pin
   statuses and labels, and the words (title, intro, facts, About text, sources, caveats).
5. **Preview:** `python3 -m http.server 8765` in the repo folder, open http://localhost:8765/texas_<topic>_map.html.
6. **Move to GitHub:** add the page, its data file(s), `tx_county_map.js`, `tx_county_map.css` and
   `tools/csv_to_js.py` as NEW files in texasmaps/texasmaps.github.io. Never edit files already on main.
   Give every page the same `?v=YYYYMMDD-n` tag on its script/stylesheet links; bump it when the engine changes.

## The config (`CM.init({...})`)

**Metrics** (`metrics: [...]`), one per shading choice:
| field | meaning |
|---|---|
| `key` | short id; also the `#shade=key` deep link |
| `label` | menu label ("Data center projects") |
| `values` | `{fips: number}` |
| `unit` | appended after values ("beds", "%") |
| `fmt` | function formatting a value (default: commas, 1 decimal) |
| `bins` | class breaks, e.g. `[2,3,5,10,20]` (5 breaks = 6 colors). Omit for automatic quantiles. |
| `binLabels` | legend rows, one per class (default: built from bins) |
| `ramp` | `orange` (default), `blue`, `green`, `purple`, `maroon`, `teal`, `diverging`, or your own array of 6 hex colors |
| `caption` | one sentence under the menu explaining the colors |
| `legendTitle` | legend heading (default: label) |
| `skipZero` | default true: zero and missing counties stay white and count as "none" |
| `noneLabel` | legend row for uncolored counties ("No prisons") |
| `group` | optional optgroup name in the menu |

**Pins** (`pins: [...]`), each `{id, name, lon, lat, fips?, county?, city?, status?, size?, hot?, sub?, details?, url?, urlLabel?, note?, tipExtra?}`.
`fips` is filled in from lon/lat if missing. `size` scales the dot (or pass `pinSize: p=>radius`). `hot` draws the red ring.
`details` is `{label: html}` for the pin's card; `sub` is the small line (operator, agency). `pinStatuses: {key:{label,color}}`
defines the status chips and legend (`shaded` overrides the high-contrast color used when the map is colored).
Labels: `pinLabel` ("Prisons"), `pinSingular`, `pinPlural`, `hotLabel`, `hotChip`, `hotFlag`, `pinSizeNote`, `sizeLabel`, `listTitle`.

**Callbacks:** `onCounty(fips)`, `onPin(pin)`, `onDistrict(plan,n)`, `onBackground()`, `countyTip(fips) -> extra tooltip lines`, `districtTip(plan,n) -> lines`, `pinTip(pin) -> html`, `onUpdate()`.
**List:** `listMetric: p => ({html, key})` turns on the "All <pins>" list with chips and sorting; `listSortLabel` names its default sort.
**Words:** `pages: [[file,label],...]` (header links), `countyKv:false` and `countySub(fips)` (app page only: hide the generic metric list on a county card, add a subtitle), `about`, `sources`, `caveats`, `aboutFine`, `legendNote`, `welcomeTitle`, `welcomeTips`, `noWelcome`, `searchPlaceholder`.
**Layers:** `base` (metric shown at load), `rivers`, `basins`, `aquifers` and `minor` (TWDB aquifer overlay; needs `tx_aquifers.js` loaded before the engine), `plan` (district lines shown at load, e.g. `'PLANC2333'`; needs `tx_districts.js` and `tx_district_crosswalk.js` loaded before the engine), `controls: ['pins','rivers','basins','aquifers','districts','base']`.
**District metrics:** a metric with `plan:'PLANC2333'` and `values` keyed by district number shades that plan's districts instead of counties.

**Helpers for the sidebar:** `CM.stat(v,l)`, `CM.glance([facts])`, `CM.note(text)`, `CM.countyList({metric,n,title,sub,fmt,row})`,
`CM.countyRow(fips,val,sub)`, `CM.pinList()`, `CM.pinRow(pin,val)`, `CM.pinHTML(pin)`, `CM.collapseAfter(n)`, `CM.renderRows()`.
**Data helpers:** `CM.rank(key,n)`, `CM.rankOf(key,fips)`, `CM.value(key,fips)`, `CM.fmtValue(key,fips)`, `CM.fipsOf(name)`, `CM.countyAt(lon,lat)`, `CM.cname[fips]`, `CM.fips`.
**Map helpers:** `CM.zoomCounty(f)`, `CM.zoomCounties([f..])`, `CM.zoomPin(p)`, `CM.fit()`, `CM.highlightCounty(f)`, `CM.select(id)`, `CM.setFilter(fn)`, `CM.setBase(key)`, `CM.setHash(h)`, `CM.openHash()`.
**District helpers:** `CM.plans()`, `CM.plan(id)`, `CM.districtName(plan,n)`, `CM.districtsOf(plan,fips)`, `CM.districtCounties(plan,n)`, `CM.districtRow(plan,n,val,sub)`, `CM.setPlan(id)`, `CM.highlightDistrict(plan,n)`, `CM.zoomDistrict(plan,n)`, `CM.activePlan()`.

**Deep links** on every page: `#shade=<key>|none`, `#layers=rivers,basins,aquifers,minor`, `#districts=<plan id>`, `#county=<fips or name>`, `#pin=<id>`; the app page also opens `#district=<plan>:<n>`.

## House rules (from the water maps)
- Plain English everywhere a reader sees it; jargon and method notes go in the About panel.
- One colored fill at a time; only line overlays (rivers, basins) are checkboxes.
- The first one or two sidebar sections open, the rest collapsed, with the "Show all sections" pill.
- Lead with ranked lists ("interesting facts"), never a chart. Pins stay visible on any shading.
- Light theme (`data-theme="light"` on `<html>`), the same fonts and palette as the other maps.
