# Texas water maps (TWDB data) — Data Center Watch companions

Three standalone maps that put the data center sites on Texas Water Development Board (TWDB) data. They are self-contained additions: nothing in the pre-existing pages was changed.

| Page | Shows | Sidebar | Deep links |
|---|---|---|---|
| `texas_aquifers_map.html` | 9 major and 22 minor aquifers | aquifers ranked by projects, announced MW, contested sites; click one to isolate it | `#aq=<name>`, `#aq=none`, `#county=<fips>`, `#site=<id>` |
| `texas_rainfall_map.html` | NRCS 1981–2010 average annual rainfall | projects by rainfall zone, driest sites, driest counties with projects | `#zone=<0-5>`, `#county=<fips>`, `#site=<id>` |
| `texas_wells_map.html` | TWDB Groundwater Database well density | wells by primary use, counties by well count, projects with the most wells within ~6 mi | `#county=<fips>`, `#site=<id>` |

On every page: hover or click a county or a site for its water context (aquifers at the pin, rainfall, wells nearby). Pins use the Data Center Watch status colors.

## Files

- Pages: the three HTML files above
- Shared engine and styles: `tx_water_map.js`, `tx_water_map.css`
- Data: `tx_aquifers.js` (aquifer outlines), `tx_water_grid.js` (rainfall and well rasters), `tx_county_water.js` (county rainfall means and wells by use), `tx_counties.js` and `tx_dc_sites.js` (county outlines and a slim site list, copied out of `texas_data_center_map.html` without modifying it)
- Build scripts: `tools/build_water_layers.py`, `tools/build_county_water.py`

All files must stay together in the repository root; the pages load them by relative path.

## Rebuilding the data

Pure Python 3, no packages. Downloads (about 13 MB) are cached in the system temp directory, so nothing lands in the repository except the output files.

1. `python3 tools/build_water_layers.py` — fetches TWDB aquifers, the precipitation shapefile and the well shapefile; writes `tx_aquifers.js` and `tx_water_grid.js`.
2. `python3 tools/build_county_water.py` — copies counties and sites out of `texas_data_center_map.html` and writes `tx_counties.js`, `tx_dc_sites.js`, `tx_county_water.js`. Run it whenever the site list in Data Center Watch changes, so the water maps keep the same sites.

## Optional hooks (not applied, to leave existing pages untouched)

- To list the maps on the hub, add to the `MAPS` array in `index.html`:
  `{label:'Aquifers & Data Centers', file:'texas_aquifers_map.html', color:'#1c5cab'}`,
  `{label:'Rainfall & Data Centers', file:'texas_rainfall_map.html', color:'#2a78d6'}`,
  `{label:'Wells & Data Centers', file:'texas_wells_map.html', color:'#c54e1c'}`
- The site card's "Data Center Watch" button opens that map; searching the site name there finds the record.

## Sources

https://www.twdb.texas.gov/mapping/gisdata.asp — Major Aquifers and Minor Aquifers (ArcGIS BaseLayerQueryService layers 1–2), `Precipitation_Shapefile.zip` (NRCS 1981–2010, 1-inch bands), `well/TWDB_Groundwater.zip` (updated nightly by TWDB; this copy 2026-09-25).

Caveats: values are read at the pin, and pins placed at a city or county center say so on the card. A well count is records, not pumping volume. Aquifer outlines are generalized to about 900 m.
