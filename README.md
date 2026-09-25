# Texas County Maps

Interactive maps of Texas county data. Open index.html (the hub) to view all maps.

## Water layers on the Data Center Watch map

`texas_data_center_map.html` can overlay Texas Water Development Board (TWDB) data — toggle them in the sidebar or open a view directly:

- `texas_data_center_map.html#water=aquifers,minor` — major and minor aquifer outlines
- `texas_data_center_map.html#water=precip` — average annual rainfall shading
- `texas_data_center_map.html#water=wells` — groundwater well density shading

Data files (rebuild with `python3 tools/build_water_layers.py`, no dependencies beyond Python 3):

- `tx_aquifers.js` — the 9 major and 22 minor aquifers from the TWDB ArcGIS BaseLayerQueryService (layers 1 and 2), generalized to about 0.008° (~900 m).
- `tx_water_grid.js` — NRCS 1981–2010 average annual precipitation (`Precipitation_Shapefile.zip`) rasterized to 0.025° cells, and TWDB Groundwater Database well locations (`TWDB_Groundwater.zip`, updated nightly by TWDB) counted per 0.05° cell.

Source catalog: https://www.twdb.texas.gov/mapping/gisdata.asp
