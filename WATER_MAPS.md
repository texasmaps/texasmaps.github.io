# Texas water maps (TWDB data) — Data Center Watch companions

Three standalone maps that put the data center sites on Texas Water Development Board (TWDB) data. They are self-contained additions: nothing in the pre-existing pages was changed.

| Page | Shows | Sidebar | Deep links |
|---|---|---|---|
| `texas_aquifers_map.html` | 9 major and 22 minor aquifers | aquifers ranked by projects, announced MW, contested sites; click one to isolate it | `#aq=<name>`, `#aq=none`, `#county=<fips>`, `#site=<id>` |
| `texas_rainfall_map.html` | PRISM 1991–2020 average annual rainfall, or the last 12 months as a percent of that normal | projects by rainfall zone, driest sites (normal and last 12 months), driest counties with projects | `#zone=<0-5>`, `#county=<fips>`, `#site=<id>` |
| `texas_wells_map.html` | TWDB Groundwater Database well density, or water-supply wells drilled since 2020 (driller's reports) | wells by use (all recorded, and drilled since 2020), counties by well count, projects with the most wells within ~6 mi | `#county=<fips>`, `#site=<id>` |

On every page the same layer controls are available: checkboxes for data center sites, colocation facilities, major aquifers and minor aquifers, and a shading menu with rainfall (average annual, or last 12 months vs. normal) and wells (all recorded, or drilled since 2020). So any page can show any combination; the pages differ in what their sidebar ranks and explains. Hover or click a county or a site for its water context. Pins use the Data Center Watch status colors.

Links work the same everywhere: `#shade=precip|recent|wells|newwells|none` picks the shading and `#layers=major,minor` turns aquifer outlines on, combinable with the page's own links (e.g. `texas_wells_map.html#shade=recent&layers=major`).

## Files

- Pages: the three HTML files above
- Shared engine and styles: `tx_water_map.js`, `tx_water_map.css`
- Data: `tx_aquifers.js` (aquifer outlines), `tx_water_grid.js` (four rasters: rainfall normal, last 12 months vs. normal, recorded wells, wells drilled since 2020), `tx_county_water.js` (county rainfall means, percent of normal, wells by use, new wells by use), `tx_counties.js` and `tx_dc_sites.js` (county outlines and a slim site list, copied out of `texas_data_center_map.html` without modifying it)
- Build scripts: `tools/build_water_layers.py`, `tools/build_county_water.py`

All files must stay together in the repository root; the pages load them by relative path.

## Rebuilding the data

Pure Python 3, no packages. Downloads (about 300 MB: PRISM grids, the TWDB well shapefile and the full driller's-reports database) are cached in the system temp directory, so nothing lands in the repository except the output files.

1. `python3 tools/build_water_layers.py` — fetches TWDB aquifers, the PRISM 1991–2020 normals, the latest 12 PRISM monthly grids, the TWDB well shapefile and the driller's-reports database; writes `tx_aquifers.js` and `tx_water_grid.js`. By default the 12-month window ends at the newest month PRISM has published (usually the month before last); `--months YYYYMM-YYYYMM` pins it.
2. `python3 tools/build_county_water.py` — copies counties and sites out of `texas_data_center_map.html` and writes `tx_counties.js`, `tx_dc_sites.js`, `tx_county_water.js`. Run it whenever the site list in Data Center Watch changes, so the water maps keep the same sites.

## Optional hooks (not applied, to leave existing pages untouched)

- To list the maps on the hub, add to the `MAPS` array in `index.html`:
  `{label:'Aquifers & Data Centers', file:'texas_aquifers_map.html', color:'#1c5cab'}`,
  `{label:'Rainfall & Data Centers', file:'texas_rainfall_map.html', color:'#2a78d6'}`,
  `{label:'Wells & Data Centers', file:'texas_wells_map.html', color:'#c54e1c'}`
- The site card's "Data Center Watch" button opens that map; searching the site name there finds the record.

## Sources

- TWDB, https://www.twdb.texas.gov/mapping/gisdata.asp — Major Aquifers and Minor Aquifers (ArcGIS BaseLayerQueryService layers 1–2); `well/TWDB_Groundwater.zip` (Groundwater Database well locations, updated nightly).
- TWDB Submitted Driller's Reports, https://www.twdb.texas.gov/groundwater/data/drillersdb.asp — `SDRDownload.zip` (full database, updated nightly). "Wells drilled since 2020" = new and replacement wells with a water-supply proposed use (domestic, irrigation, stock, public supply, industrial, rig supply, fracking supply, commercial, other).
- PRISM Climate Group, Oregon State University, https://prism.oregonstate.edu — 1991–2020 30-year normals (800 m annual) and monthly grids (4 km). Free to use with attribution.

Caveats: values are read at the pin, and pins placed at a city or county center say so on the card. A well count is records, not pumping volume; the driller's-reports count includes only wells whose reports were filed. Aquifer outlines are generalized to about 900 m. The 12-month window is whatever PRISM had published when the build ran (see the header of `tx_water_grid.js`).
