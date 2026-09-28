# Texas County Maps — one page, many topics

`texas_county_maps.html` is a single map page that shows a different county dataset depending on the topic in its address:

| Address | Shows |
|---|---|
| `texas_county_maps.html?topic=data-centers` | data center projects and announced power per county, with every project as a dot |
| `texas_county_maps.html?topic=rainfall` | the last 12 months vs. normal, and average yearly rainfall (PRISM) |
| `texas_county_maps.html?topic=wells` | water-supply wells drilled since 2020, and all wells on record (TWDB) |
| `texas_county_maps.html?topic=regions` | the six campaign regions (from tx_counties_by_region.csv) |

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
| `tools/csv_to_js.py` | turns any CSV with a county or FIPS column into a `tx_*.js` data file |

Reused as they are: `tx_counties.js` (county outlines), `tx_surface_water.js` (rivers, lakes, basins), `tx_dc_sites.js` (data center pins),
`tx_county_water.js` (county rainfall and well counts). The version tag on every local script and stylesheet link is `?v=20260927-1`;
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

**Metric fields:** `key`, `label`, `values` `{fips:number}`, `unit`, `fmt(v)`, `bins` (class breaks; omit for automatic quantiles), `binLabels`,
`ramp` (`orange` `blue` `green` `purple` `maroon` `teal` `diverging`, or an array of 6 hex colors), `caption`, `legendTitle`, `noneLabel`,
`skipZero` (default true: zero and missing stay white), `group`. A categorical metric uses `categories:{value:{label,color}}` instead of bins.
**Pins:** `pins:[{id,name,lon,lat,fips?,county?,city?,status?,size?,hot?,sub?,details?,url?,urlLabel?,note?}]` with `pinStatuses:{key:{label,color}}`,
`pinLabel`, `pinSingular`, `pinPlural`, `hotLabel`, `hotChip`, `hotFlag`, `pinSizeNote`, `sizeLabel`, `listMetric(p)->{html,key}`, `listSortLabel`, `pinValue(p)`.
**Other:** `stats:[[value,label]]`, `facts:[html]`, `lists:[{metric,n,title,sub,desc,fmt}]` or `[{html,title,sub}]`, `note`, `countyExtra(fips)->html`,
`about`, `sources`, `caveats`, `legendNote`, `welcomeTitle`, `welcomeTips`, `openSections`.

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
- Regions: `tx_counties_by_region.csv` in this repository.
- County outlines: the COUNTIES layer shared with Data Center Watch (`tx_counties.js`).
