# Texas County Maps

Interactive maps of Texas county data. Open index.html (the hub) to view all maps.

## Water maps (TWDB data)

Three standalone maps put the data center sites on Texas Water Development Board (TWDB) data. Each has its own sidebar and deep links, and links back to the full site record in Data Center Watch (`texas_data_center_map.html#site=<id>`):

- `texas_aquifers_map.html` — major and minor aquifers ranked by data center projects; `#aq=<name>`, `#county=<fips>`, `#site=<id>`
- `texas_rainfall_map.html` — NRCS 1981–2010 average annual rainfall; `#zone=<0-5>`, `#county=<fips>`, `#site=<id>`
- `texas_wells_map.html` — TWDB Groundwater Database well density and wells by use; `#county=<fips>`, `#site=<id>`

The Data Center Watch map (`texas_data_center_map.html`) also has the same layers as toggles: `#water=aquifers,minor`, `#water=precip`, `#water=wells`.

Shared files: `tx_water_map.js` / `tx_water_map.css` (map engine and styles), `tx_counties.js` and `tx_dc_sites.js` (county outlines and a slim site list copied from the Data Center Watch page), `tx_aquifers.js`, `tx_water_grid.js`, `tx_county_water.js` (the TWDB data).

Rebuild the data (pure Python 3, no packages):

1. `python3 tools/build_water_layers.py` — downloads TWDB aquifers, the precipitation shapefile and the well shapefile; writes `tx_aquifers.js` (aquifers generalized to ~0.008°, about 900 m) and `tx_water_grid.js` (rainfall rasterized to 0.025° cells, wells counted per 0.05° cell).
2. `python3 tools/build_county_water.py` — copies counties and sites out of `texas_data_center_map.html` and writes `tx_counties.js`, `tx_dc_sites.js` and `tx_county_water.js` (county mean rainfall, wells by primary use). Run it again whenever the site list in Data Center Watch changes.

Sources: https://www.twdb.texas.gov/mapping/gisdata.asp — Major Aquifers and Minor Aquifers (ArcGIS BaseLayerQueryService layers 1–2), `Precipitation_Shapefile.zip` (NRCS 1981–2010), `well/TWDB_Groundwater.zip` (updated nightly by TWDB).
