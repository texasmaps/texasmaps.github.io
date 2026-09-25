# Texas water maps (TWDB data) — Data Center Watch companions

Three standalone maps that put the data center sites on Texas Water Development Board (TWDB) data. They are self-contained additions: nothing in the pre-existing pages was changed.

| Page | Shows | Sidebar | Deep links |
|---|---|---|---|
| `texas_aquifers_map.html` | the 9 major aquifers | aquifers ranked by projects, announced MW, contested sites; click one to isolate it | `#aq=<name>`, `#aq=none`, `#county=<fips>`, `#site=<id>` |
| `texas_rainfall_map.html` | PRISM 1991–2020 average annual rainfall, or the last 12 months as a percent of that normal | projects by rainfall zone, driest sites (normal and last 12 months), driest counties with projects | `#zone=<0-5>`, `#county=<fips>`, `#site=<id>` |
| `texas_wells_map.html` | TWDB Groundwater Database well density, or water-supply wells drilled since 2020 (driller's reports) | wells by use (all recorded, and drilled since 2020), counties by well count, projects with the most wells within ~6 mi | `#county=<fips>`, `#site=<id>` |

On every page a **Map overlays** panel on the map (top right; collapsed by default on phones) holds the same controls: checkboxes for data center sites, colocation facilities, aquifer outlines (boundaries only, so they can sit over any fill), rivers & reservoirs and river basins, and one **Shade the map by** menu that holds every colored fill (major aquifers, rainfall average, last 12 months vs. average, all recorded wells, wells drilled since 2020). Only one fill can be on at a time, so aquifers never stack on rainfall; rivers and basins are line overlays that read on any fill, and pins switch to white / yellow / pink whenever a fill is on. The menu with rainfall (average annual, or last 12 months vs. normal) and wells (all recorded, or drilled since 2020). So any page can show any combination; the pages differ in what their sidebar ranks and explains. Each page opens with a short welcome card (three tips and an *Explore the map* button; dismissed once, it stays dismissed in that browser via `localStorage` key `txwater_welcome`), a search box at the top of the sidebar (city, county, company or site; a company search lists all its sites), an *At a glance* section with the headline facts computed live from the data, an *All data center projects* list in the Data Center Watch style (status chips, a *Contested only* chip, sorting, and this map's water figure on every row), and an *About this map* button in the header that opens a plain-language explanation of the data and its caveats. The header also links between the three maps and Data Center Watch. Sidebar sections open and close when you click their titles; the first one or two are open by default and a *Show all sections* pill opens the rest. Hover or click a county or a site for its water context. Pins use the Data Center Watch status colors, switching to white / yellow / pink whenever a shading is on so they stay visible on any shade. The rainfall map opens on the last-12-months view.

Links work the same everywhere: `#shade=aquifers|precip|recent|wells|newwells|none` picks the fill and `#layers=outlines,rivers,basins` turns the line overlays on, combinable with the page's own links (e.g. `texas_wells_map.html#shade=recent&layers=major`).

## Files

- Pages: the three HTML files above
- Shared engine and styles: `tx_water_map.js`, `tx_water_map.css`
- Data: `tx_surface_water.js` (major rivers, major reservoirs, river basins), `tx_aquifers.js` (aquifer outlines), `tx_water_grid.js` (four rasters: rainfall normal, last 12 months vs. normal, recorded wells, wells drilled since 2020), `tx_county_water.js` (county rainfall means, percent of normal, wells by use, new wells by use), `tx_counties.js` and `tx_dc_sites.js` (county outlines and a slim site list, copied out of `texas_data_center_map.html` without modifying it)
- Build scripts: `tools/build_water_layers.py`, `tools/build_county_water.py`

All files must stay together in the repository root; the pages load them by relative path.

**Cache note.** GitHub Pages tells browsers to keep files for 10 minutes, so a plain reload can pick up a new page while still using an old copy of `tx_water_map.js`, which breaks the map until the cache expires. Every local script and stylesheet reference in the three pages therefore carries a version query (`?v=YYYYMMDD-n`, currently `20260925-3`). Bump it in all three pages whenever `tx_water_map.js`, `tx_water_map.css` or a data file changes.

## Rebuilding the data

Pure Python 3, no packages. Downloads (about 300 MB: PRISM grids, the TWDB well shapefile and the full driller's-reports database) are cached in the system temp directory, so nothing lands in the repository except the output files.

1. `python3 tools/build_water_layers.py` — fetches TWDB aquifers, the PRISM 1991–2020 normals, the latest 12 PRISM monthly grids, the TWDB well shapefile and the driller's-reports database; writes `tx_aquifers.js` and `tx_water_grid.js`. By default the 12-month window ends at the newest month PRISM has published (usually the month before last); `--months YYYYMM-YYYYMM` pins it.
2. `python3 tools/build_surface_water.py` — fetches TWDB Major Rivers, Existing Reservoirs (converted from the file's Lambert Conformal Conic projection) and Major River Basins; writes `tx_surface_water.js`.
3. `python3 tools/build_county_water.py` — copies counties and sites out of `texas_data_center_map.html` and writes `tx_counties.js`, `tx_dc_sites.js`, `tx_county_water.js`. Run it whenever the site list in Data Center Watch changes, so the water maps keep the same sites.

## Optional hooks (not applied, to leave existing pages untouched)

- To list the maps on the hub, add to the `MAPS` array in `index.html`:
  `{label:'Aquifers & Data Centers', file:'texas_aquifers_map.html', color:'#1c5cab'}`,
  `{label:'Rainfall & Data Centers', file:'texas_rainfall_map.html', color:'#2a78d6'}`,
  `{label:'Wells & Data Centers', file:'texas_wells_map.html', color:'#c54e1c'}`
- The site card's "Data Center Watch" button opens that map; searching the site name there finds the record.

## Sources

- TWDB, https://www.twdb.texas.gov/mapping/gisdata.asp — Major Aquifers (ArcGIS BaseLayerQueryService layer 1; the minor-aquifer layer 2 is still in `tx_aquifers.js` but not shown); `Major_Rivers_dd83.zip` (NHD 1:100k, 2009); `Existing_Reservoirs.zip` (2012 State Water Plan, Nov 2014); `Major_River_Basins_Shapefile.zip` (2014); `well/TWDB_Groundwater.zip` (Groundwater Database well locations, updated nightly).

  **Rivers vs. basins vs. reservoirs:** *major rivers* are the channels themselves, the 21 named rivers (Rio Grande, Brazos, Colorado, Trinity, …). *Major river basins* are the 23 drainage areas: every point in Texas drains to one of them, and the boundaries follow ridgelines, not water; they are the units of water planning and water rights. *Existing reservoirs* are the man-made lakes behind dams (Lake Travis, Toledo Bend, Lake Livingston, …) that store surface water; 188 of the 211 are classed as water supply. The maps show rivers and reservoirs together as one overlay and basins as another.
- TWDB Submitted Driller's Reports, https://www.twdb.texas.gov/groundwater/data/drillersdb.asp — `SDRDownload.zip` (full database, updated nightly). "Wells drilled since 2020" = new and replacement wells with a water-supply proposed use (domestic, irrigation, stock, public supply, industrial, rig supply, fracking supply, commercial, other).
- PRISM Climate Group, Oregon State University, https://prism.oregonstate.edu — 1991–2020 30-year normals (800 m annual) and monthly grids (4 km). Free to use with attribution.

Caveats: values are read at the pin, and pins placed at a city or county center say so on the card. Well points within 0.01° outside the state-line grid box (coordinate noise, one well in Dallam County) are counted in the edge cell; anything farther out is excluded. Reservoir areas are measured on TWDB's original outlines. A well count is records, not pumping volume; the driller's-reports count includes only wells whose reports were filed. Aquifer outlines are generalized to about 900 m. The 12-month window is whatever PRISM had published when the build ran (see the header of `tx_water_grid.js`).
