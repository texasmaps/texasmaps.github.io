# Texas County Deep Dive: Data Sources

2026-09-28 · Abby Miller

## How to read this

Every number on the maps and in the workbook comes from a public government file or a public organization directory pulled on 2026-09-28, and every raw file is kept on the Edith drive so a figure can be traced back. Each section below names the source, links it, says what was taken from it, and names the file it feeds.

- **Map files** (`tx_*.js`) live in the GitHub branch `county-map-app` of [texasmaps/texasmaps.github.io](https://github.com/texasmaps/texasmaps.github.io) and in `/Volumes/Edith Drive/texas maps/new_maps/`. The command center is `texas_county_deep_dive.html`; the single-topic maps are `texas_county_maps.html`.
- **Workbook**: `Texas_2026_Ballot_County_Chairs_Fundraising_VERIFIED_TEC-populated.xlsx` in `/Volumes/Edith Drive/texasmaps.github.io/` (16 sheets; its *Sources* sheet lists every dataset with URL, pull date and local copy; its *QA - Verification* sheet lists every check).
- **Raw copies**: `/Volumes/Edith Drive/Gina For Texas/Texas Deep Dive Sources/` (elections, registration, districts, Census blocks, places), `Gina For Texas/County Demographics/`, `Gina For Texas/Community Organizations/`, `Gina For Texas/Fundraising Comparison/Raw TEC/` and `Raw FEC/`. `Texas Deep Dive Sources/build_scripts/` holds the scripts that turn raw files into the map files, and `build_scripts/audit/` the scripts that recompute every figure from the raw files (all checks pass as of 2026-09-28, see `AUDIT_2026-09-28.md`).

## Elections, registration and turnout

County results for 2006-2018 come from the Secretary of State's official canvass, 2020-2024 from the Texas Legislative Council's county subtotals, registration from the Secretary of State's monthly figures, and the 2014-2018 primaries from the Secretary of State's county pages.

| Dataset | Publisher and link | What was taken | Feeds |
| --- | --- | --- | --- |
| Official county results, 2006-2018 general elections (84 race pages) | [Texas SOS Historical Election Results](https://elections.sos.state.tx.us/) (`elchist{id}_race{raceId}.htm`; election ids 127, 141, 154, 164, 175, 319, 331) | votes and shares for every candidate in every statewide race (President, Governor, U.S. Senate and the rest), all 254 counties | `tx_county_elections.js`; workbook *Election Results*, *Turnout History*, *County Elections Summary*; `built/county_election_results_2006-2024_long.csv` |
| Red-211 Election Analysis with County Subtotals, 2012-2024 (PLANC2333 bundle, report dated 2025-08-18) | [Texas Legislative Council, data.capitol.texas.gov](https://data.capitol.texas.gov/dataset/planc2333) | county parts ("Bowie (76%)") summed across districts give the county total for every statewide race, 2020, 2022, 2024; 2012-2018 used as a cross-check against the canvass | same files, 2020-2024 rows |
| Voter registration figures by county, every January, March and November 2008-2026 (44 pages) | [Texas SOS registration figures](https://www.sos.state.tx.us/elections/historical/vrfig.shtml) | registered voters at each election (November) and March of each primary year | `registered_<year>`, `registered_march_<year>`; workbook *Turnout History*, *Primary Turnout* |
| March 2026 voter registration figures (as of the March 3, 2026 primary) with suspense-list counts, and November 2025 | [Texas SOS registration figures](https://www.sos.state.tx.us/elections/historical/vrfig.shtml) (`mar2026.shtml`, `nov2025.shtml`) | registered voters, suspense and non-suspense voters for every county; statewide 18,657,918 registered, 1,228,918 on the suspense list; growth since Nov. 2024 | `tx_county_elections.js` (`registered_march_2026`, `suspense_march_2026`, `registered_2025`, `registration_growth_2024_2026`); `built/county_registration_2025-2026.csv`; workbook sheet *Registration 2026* |
| Turnout and registration, 1970-current (statewide) | [Texas SOS turnout page](https://www.sos.state.tx.us/elections/historical/70-92.shtml) | statewide check of every year's registration and top-race votes | audit only |
| County race summaries, 2014, 2016 and 2018 Democratic and Republican primaries (1,524 county pages, 6 state summaries) | [Texas SOS Historical Election Results](https://elections.sos.state.tx.us/) (`elchist{324,325,233,273,170,169}_county{n}.htm`) | votes in every statewide primary race by county; each party's top race gives primary turnout | `primary_*` fields in `tx_county_elections.js`; workbook *Primary Turnout*; `built/county_primary_turnout_2014-2018.csv` |

Every statewide race in the county files sums exactly to the SOS state pages and, for 2006-2018, to the official canvass totals; TLC's 2020-2024 county subtotals run within about 0.3% of the official statewide count. Raw copies: `Texas Deep Dive Sources/SOS/county_results_1992-2019_app/`, `SOS/county_primaries_2014-2018_app/`, `SOS/voter_registration_by_county/`, `TLC_PLANC2333/all_files/PLANC2333_r211_Election*.xls`.

## Redistricting

District lines, county-by-district population shares and results by district all come from the Texas Legislative Council's plan datasets, with the 2020 Census block file supplying the population weights.

| Dataset | Publisher and link | What was taken | Feeds |
| --- | --- | --- | --- |
| PLANC2333, U.S. Congress 2026 map (enacted 2025): shapefile, block-equivalency file, Red-100, Red-206, Red-211 (bundle of 2026-09-11) | [TLC Capitol Data Portal, PLANC2333](https://data.capitol.texas.gov/dataset/planc2333) | outlines (NAD83 Texas Lambert, converted to lon/lat and generalized); block → district; population by district with county subtotals; results by district 2012-2024 re-tabulated to the 2026 lines | `tx_districts.js`, `tx_district_crosswalk.js`, `tx_district_results.js`; workbook *District Crosswalk*, *District Results*, *County Districts* |
| PLANC2193, U.S. Congress 2024 map (used 2022-2024): same files | [PLANC2193](https://data.capitol.texas.gov/dataset/planc2193) | same, on the 2024 lines | same |
| PLANH2316 (Texas House), PLANS2168 (Texas Senate), PLANE2106 (State Board of Education): shapefiles, block files, Red-100, Red-206 | [PLANH2316](https://data.capitol.texas.gov/dataset/planh2316), [PLANS2168](https://data.capitol.texas.gov/dataset/plans2168), [PLANE2106](https://data.capitol.texas.gov/dataset/plane2106) | outlines, county shares, results by district | same |
| 2020 Census PL 94-171 redistricting file, Texas (block total population, P0010001) | [U.S. Census Bureau](https://www2.census.gov/programs-surveys/decennial/2020/data/01-Redistricting_File--PL_94-171/Texas/) | 668,757 block populations, joined to each plan's block file to give each county's residents by district and the share whose district number changed between the 2024 and 2026 maps | `tx_district_crosswalk.js`; `built/district_crosswalk_2020pop.csv`, `built/county_congressional_change_2024_to_2026_map.csv` |

Every county part, district total and percent label in the crosswalk equals TLC's Red-100 report for all five plans, and every district in `tx_district_results.js` equals the 35 Red-206 workbooks, which sum exactly to the state in each file. Raw copies: `Texas Deep Dive Sources/TLC_PLANC2333/`, `TLC_PLANC2193/`, `TLC_Legislative_plans/`, `Census_2020_PL_Texas/`.

## Demographics

Population comes from the Texas Demographic Center's preliminary Vintage 2025 estimates; every other demographic field is the American Community Survey 2020-2024 five-year estimate, computed from the Census Bureau's table-based summary files.

| Dataset | Publisher and link | What was taken | Feeds |
| --- | --- | --- | --- |
| Preliminary Vintage 2025 county population estimates (`2025_txpopest_county.csv` + methodology; final estimates due October 2026) | [Texas Demographic Center](https://demographics.texas.gov/Estimates/2025/) ([download](https://demographics.texas.gov/Resources/TPEPP/Estimates/2025/2025_txpopest_county.zip)) | Census 2020 count, July 1 2025 and January 1 2026 estimates, percent change | `tx_county_demographics.js`; workbook *County Demographics*, *County Summary* |
| ACS 2020-2024 5-year, table-based summary files (released 2026-01-29): B01001 sex by age, B01002 median age, B01003 population, B03002 Hispanic origin by race, B15003 education 25+, B17001 poverty, B19013 median household income, B19301 per-capita income, B23025 employment 16+, B25003 tenure, B25064 median gross rent, B25077 median home value, C24030 industry | [U.S. Census Bureau ACS summary files](https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/5YRData/) ([table shells and geography file](https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/documentation/)) | 39 fields per county and the State of Texas row: median age, sex, race and ethnicity shares, income, poverty, labor force, unemployment, bachelor's or higher, 13 industry shares, homeownership, home value, rent, and adults 18 and over (B01001 total minus under-18) | same; `Gina For Texas/County Demographics/county_demographics_2026-09-28.csv` |

The workbook's *Sources* sheet lists the exact table cell behind each column (for example Hispanic share = B03002_012 / B03002_001; Manufacturing = (C24030_007 + C24030_034) / C24030_001). The Census API now requires a key, which is why the bulk files were used; the statewide row matches the published Texas figures (median household income $78,476, Hispanic 39.7%, poverty 13.8%). Raw copies: `Gina For Texas/County Demographics/ACS_2024_5yr_raw/` and `TDC_Vintage2025_preliminary/`.

## Ballot, county chairs and campaign money

The ballot is the Secretary of State's certified list, county chairs are the Texas Democratic Party's directory, state candidates' money is the Texas Ethics Commission bulk export, and federal candidates' money is the FEC bulk candidate summary.

| Dataset | Publisher and link | What was taken | Feeds |
| --- | --- | --- | --- |
| Final ballot certification, November 2026 general election (PDF, 1,396 pages, certified 2026-08-28) | [Texas Secretary of State](https://www.sos.state.tx.us/elections/forms/2026-ballot-cert.pdf) | every candidate and office on each county's ballot (17,918 county-candidate lines, 3,821 candidates, 710 offices) | `tx_county_ballot.js`; workbook *County Ballot & Chairs*, *Candidate Fundraising* |
| County party chairs directory (Democratic) | [Texas Democratic Party](https://www.texasdemocrats.org/es/county-parties) | chair name, email, phone, listing status for all 254 counties (three counties list co-chairs) | `tx_county_ballot.js`; workbook *County Chairs* |
| Campaign-finance bulk export `TEC_CF_CSV.zip` (cover sheets, filers, committees, contributions, expenditures), reports received through 2026-09-26 | [Texas Ethics Commission bulk download](https://prd.tecprd.ethicsefile.com/public/cf/public/TEC_CF_CSV.zip) ([search and documentation](https://www.ethics.state.tx.us/search/cf/)) | for each state candidate: contributions and expenditures on every 2026 report (Total Raised = 2026 year to date, Total Spent), cash on hand and loans on the latest report, report-through date, 2025 totals, linked support committees (SPACs) | `tx_county_ballot.js`; workbook *Candidate Fundraising* (735 candidates populated) |
| Itemized contributions by donor county, 2025-26 (from the same export: `contribs_##.csv`, `cont_ss.csv`, `cont_t.csv`, Schedule A) with the [Census ZCTA-to-county relationship file](https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt) and the 2024 Gazetteer places | [Texas Ethics Commission](https://www.ethics.state.tx.us/search/cf/) and [U.S. Census Bureau](https://www.census.gov/geographies/reference-files/time-series/geo/relationship-files.html) | every contribution dated 2025-01-01 or later to each ballot candidate's filer account and linked support committees (483,046 rows), placed in the donor's county by ZIP or city: 322,480 in a Texas county, 140,579 outside Texas, 19,987 with no usable address; originals of corrected reports and daily pre-election reports skipped | `tx_county_contribs.js`, `built/contribs_by_candidate_county_2025-26.csv`, workbook sheet *Contributions by County* |
| FEC bulk candidate summary `webl26.zip` and candidate master `cn26.zip`, 2025-2026 cycle, as of 2026-09-28 | [FEC bulk data](https://www.fec.gov/data/browse-data/?tab=bulk-data) ([webl26](https://www.fec.gov/files/bulk-downloads/2026/webl26.zip), [cn26](https://www.fec.gov/files/bulk-downloads/2026/cn26.zip)) | for U.S. House and Senate candidates: cycle receipts, disbursements, cash on hand, debts, coverage date (77 of 87 matched; 9 registered with no summary, 1 not registered) | same (federal rows, marked as cycle totals) |
| Local filing authorities | [TEC local filing guidance](https://ethics.state.tx.us/resources/local/) | county and precinct candidates file with the county clerk, not online; their money fields are blank by design | none |

Corrected reports (CORCOH/CORJCOH) replace the originals, superseded rows are dropped, and every populated figure was recomputed from `cover.csv` and `spacs.csv` in the audit with zero differences. Raw copies: `Gina For Texas/Fundraising Comparison/Raw TEC/TEC_CF_CSV_asof2026-09-26/` and `Raw FEC/`.

## Community organizations / brokers

The organizations table (1,821 rows, 251 counties) was built from public statewide directories, one row per organization and county, each row carrying its source URL, pull date, coverage type and evidence type. Definition used: organizations or local leaders with established, recurring relationships to identifiable constituencies who may provide information about community needs, priorities and participation. An organization does not control or perfectly represent its members.

| Category (rows) | Directory and link | What it gave | Leader names |
| --- | --- | --- | --- |
| Agriculture (285) | [Texas Farm Bureau county locator](https://utilities.txfb.com/countylocator), data file [locations.xml](https://utilities.txfb.com/countylocator/data/locations.xml) | every county Farm Bureau office and branch: address, phone, hours | not published; ask the county office |
| Teachers (65) | [Texas AFT locals](https://www.texasaft.org/locals/) (26, with address, email, phone); [TSTA local associations](https://tsta.org/for_members/local-associations-on-facebook-the-web/) (39, county from the school district in the name) | locals and organizing committees | TSTA presidents via 877-ASK-TSTA |
| Labor (33) | [Texas AFL-CIO central labor councils](https://www.texasaflcio.org/central-labor-councils); each council's about page (`texasaflcio.org/<council>/about-us`); [North Texas Area Labor Federation](https://northtxlabor.org/about/) | 22 councils and federations; presidents and addresses for 11; the federation's 11 counties | from the about pages |
| Business (177) | [Texas Chamber of Commerce Executives directory](https://business.tcce.org/active-member-directory/) (seven regions) | chamber name, address, phone, email, website | 85 presidents, CEOs or executive directors auto-extracted from the chambers' own websites, flagged "verify" |
| Health (406) | [CMS Hospital General Information](https://data.cms.gov/provider-data/dataset/xubh-q36u) | every Texas hospital: county, address, phone, type, ownership (psychiatric and long-term excluded) | not in the file |
| Higher ed (182) | [NCES IPEDS HD2023](https://nces.ed.gov/ipeds/datacenter/data/HD2023.zip) | public and nonprofit colleges and universities: county, chief administrator name and title, phone, website | yes, from IPEDS |
| Industry-specific: Realtors (233) | [Texas REALTORS local associations by county](https://www.texasrealestate.com/api/media/file/Texas_Jurisdiction_by_County_06232026.pdf) (list dated 2026-06-23) | which local association covers each county | officers via the [association roster](https://modules.texasrealestate.com/public/boardRoster/boardRosterAccess.cfm) |
| Veterans (440) | [American Legion Department of Texas post directory](https://txlegion.org/directory/), map layer exported as [KML](https://www.google.com/maps/d/kml?mid=1IojeWKzejrUkCwNspqBhFqyUalDHMKE&forcekml=1) | every post, placed in its county by pin location | not in the map |
| Placement helper | [Census 2020 ZCTA-to-county file](https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt) | ZIP code to county for chambers and AFT locals |  |

Not collectable by script and left for manual work: VFW posts (the locator's data host is not exposed), Texas Veterans Commission county service officers (bot wall), Texas A&M AgriLife extension offices (Cloudflare), DAV, Rotary, Lions, Kiwanis, League of Women Voters, PTA councils, ministerial alliances, hospital and Farm Bureau leaders. Raw copies and `SOURCES.txt`: `Gina For Texas/Community Organizations/raw_2026-09-28/`; the table: `community_organizations_2026-09-28.csv`; map file `tx_county_orgs.js`; workbook *Community Organizations*.

## Water, aquifers and data centers

Water figures are the water maps' county data (PRISM rainfall, TWDB wells and aquifer outlines) reused as they are; data-center projects are the repository's Texas Data Center Watch list.

| Dataset | Publisher and link | What was taken | Feeds |
| --- | --- | --- | --- |
| Rainfall: 1991-2020 normals (800 m grid) and monthly grids for the last twelve months (Sep 2025 to Aug 2026) | [PRISM Climate Group, Oregon State University](https://prism.oregonstate.edu/) | each county's usual rainfall (inches a year) and the last twelve months as a share of usual; county means built by `tools/build_county_water.py` on 2026-09-25 | `tx_county_water.js` (repository); Water tab, rainfall map |
| Wells on record | [TWDB Groundwater Database](https://www.twdb.texas.gov/groundwater/data/gwdbrpt.asp) (copy of 2026-09-25) | wells per county by use | same; wells map |
| Wells drilled since 2020 | [TWDB Submitted Driller's Reports](https://www.twdb.texas.gov/groundwater/data/drillersdb.asp) (new and replacement water-supply wells, January 2020 to September 2026) | new wells per county by use | same |
| Major and minor aquifer outlines | [TWDB GIS data](https://www.twdb.texas.gov/mapping/gisdata.asp) (BaseLayerQueryService, fetched 2026-09-25, generalized) | which aquifers lie under each county and the share of county area, by grid sampling of the outlines | `tx_county_aquifers.js` (built by `build_scripts/build_county_aquifers.py`); Water tab, briefs |
| Rivers, lakes and river basins | TWDB surface-water layers (as in the water maps) | the rivers and basins overlay | `tx_surface_water.js` (repository) |
| Data center projects (601 records: name, operator, city, county, status, announced MW, site) | Texas Data Center Watch, as compiled in the repository's [data center map](https://texasmaps.github.io/texas_data_center_map.html) | projects per county, status counts, announced power; withdrawn projects excluded | `tx_dc_sites.js` (repository); Data Centers tab, pins |

Incentives, local decisions and timelines are not in the Data Center Watch extract; each project's news links are on the data center map.

## Places and regions

| Dataset | Publisher and link | What was taken | Feeds |
| --- | --- | --- | --- |
| 2024 Gazetteer, Texas places (1,863 cities, towns, villages and census-designated places with center-point coordinates) | [U.S. Census Bureau Gazetteer files](https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer/2024_gaz_place_48.txt) | each place's county, from its center point inside the county outline (eight coastal places whose center point is in water take the nearest county) | `tx_places.js` (search box); raw copy `Texas Deep Dive Sources/Census_places_2024/` |
| County outlines (254) | repository file `tx_counties.js` (GeoJSON with FIPS ids), reused unchanged | the map itself and every point-in-county test | all pages |
| Campaign regions | repository file [tx_counties_by_region.csv](https://github.com/texasmaps/texasmaps.github.io/blob/main/tx_counties_by_region.csv) (6 regions, converted by `tools/csv_to_js.py`) | each county's region | `tx_regions.js`; Regions block, county subtitles |

## Definitions and conventions

- **Turnout** = votes in the top statewide race that year (the race with the most votes statewide, applied to every county) divided by registered voters at that election. This is the Secretary of State's convention and matches its statewide figures exactly for 2006-2018. Counting every ballot would put turnout about half a point higher; the workbook keeps that TLC count in `total_ballots_tlc`.
- **Primary turnout** = each party's top statewide primary race (2014 Governor, 2016 President, 2018 U.S. Senator), Democratic plus Republican, divided by registration as of March. The SOS statewide primary figure counts all ballots, so it runs slightly higher.
- **Margin** = Republican share minus Democratic share of all votes in the race, in points; shares include third parties, so they do not sum to 100%. On the pages a margin is shown with the winner's name and the points, for example "Trump +13.7" (2024 President, statewide) or "Abbott +10.9" (2022 Governor).
- **Change** = the later election minus the earlier one, in points, always like for like (presidential with presidential, midterm with midterm).
- **District lean of a county** = the margins of its congressional district(s), weighted by the share of the county's 2020 residents in each; "residents with a new district number" compares each Census block's district under PLANC2193 and PLANC2333.
- **Results on the 2026 lines** are the Texas Legislative Council's re-tabulations of actual precinct votes onto those lines, not elections held under them.
- **Money**: TEC figures are 2026 year to date through each candidate's latest report (with corrected reports replacing originals); FEC figures are 2025-2026 cycle totals; "down-ballot money on the ballot" counts a district race in full for every county the district touches; a race is called higher-funded when its total is in the top quarter of State House, Senate and SBOE race totals statewide.
- **From county donors** = itemized contributions (TEC Schedule A) whose contributor address falls in the county: ZIP to county by the Census ZCTA relationship (largest land area), city as fallback; addresses outside Texas are "out of state"; rows with no address cannot be placed. Republican and Democratic dollars sum the county's gifts to candidates of each party for state office. Two windows: 2026 year to date (matches the raised totals) and since 2025-01-01. Linked support committees (for example Texans for Greg Abbott) are counted with their candidate.
- **Coverage type** (county, multicounty, regional, statewide) and **evidence type** (membership, chapter leadership, formal constituency, unknown) are observable indicators recorded for each organization; no strength score is assigned.
- **Plan ids** are always spelled out: PLANC2333 is the 2026 congressional map, PLANC2193 the 2024 map.

## Known gaps

- Official SOS county results and primaries for 2020, 2022 and 2024 sit in [results.texas-election.com](https://results.texas-election.com/), which blocks scripted access; TLC's county subtotals cover the general elections and the primary series stops at 2018.
- County and precinct candidates' fundraising is filed with county clerks and is not online; those rows are blank by design.
- The Texas Demographic Center has not published age, sex and race detail for the preliminary 2025 vintage; race and ethnicity are from ACS 2020-24.
- Leader names are missing where directories do not publish them (hospitals, Farm Bureaus, TSTA locals); 85 chamber executives were auto-extracted from chamber websites and are flagged to verify.
- Organizations not yet collected: VFW, Texas Veterans Commission county service officers, DAV, Rotary, Lions, Kiwanis, League of Women Voters, PTA councils, ministerial alliances; three counties (Borden, Garza, King) have no rows.
- Unitemized contributions (under the itemization threshold) carry no address, so a county's dollars are the itemized part only; federal candidates' donors (FEC) are not placed by county.
- Data-center incentives, local decisions and timelines are not in the Data Center Watch extract.
- Aquifer shares are approximate: grid sampling of generalized outlines, shares under 2% dropped.

## Dataset-to-file map

| Map file | Built from | Workbook sheet | Build script (`Texas Deep Dive Sources/build_scripts/`) |
| --- | --- | --- | --- |
| `tx_county_elections.js` | SOS race pages 2006-2018, TLC Red-211 2020-2024, SOS registration pages, SOS primary pages 2014-2018 | *Election Results*, *Turnout History*, *County Elections Summary*, *Primary Turnout* | `build_elections.py`, `assemble_elections.py`, `write_elections.py`, `augment_elections_votes.py`, `parse_primaries.py`, `build_primaries.py` |
| `tx_county_demographics.js` | TDC Vintage 2025 preliminary; ACS 2020-24 tables (13) | *County Demographics*, *County Summary* | `build_demographics.py`, `write_demographics.py`, `augment_demographics_vap.py`, `add_vap_xlsx.py` |
| `tx_districts.js` | TLC shapefiles for the five plans | (none) | `build_districts_geo.py` |
| `tx_district_crosswalk.js` | TLC block-equivalency files x Census 2020 PL blocks; checked against Red-100 | *District Crosswalk*, *County Districts* | `build_crosswalk.py`, `build_xw_change.py`, `validate_crosswalk.py`, `write_district_js.py`, `write_districts_xlsx.py` |
| `tx_district_results.js` | TLC Red-206 workbooks, 35 files | *District Results* | `build_district_results_all.py`, `r206lib.py`, `write_district_js.py` |
| `tx_county_ballot.js` | SOS ballot certification, TDP chair directory, TEC bulk export, FEC bulk files | *County Ballot & Chairs*, *County Chairs*, *Candidate Fundraising* | `write_ballot_js.py`, `match_fec.py`, `populate_fec_xlsx.py` (TEC population scripts from the earlier workbook build) |
| `tx_county_contribs.js` | TEC export contributions x ZCTA-to-county and Gazetteer places; candidate filer ids from the workbook | *Contributions by County* | `build_contribs_by_county.py` |
| `tx_county_orgs.js` | IPEDS, CMS, TCCE, Texas AFT, TSTA, Texas AFL-CIO, Texas REALTORS, Texas Farm Bureau, American Legion, ZCTA file | *Community Organizations* | `build_orgs.py`, `parse_legion.py`, `write_orgs_js.py`, `write_orgs_xlsx.py` |
| `tx_county_aquifers.js` | TWDB aquifer outlines (`tx_aquifers.js`) x county outlines | (none) | `build_county_aquifers.py` |
| `tx_places.js` | Census 2024 Gazetteer, Texas places | (none) | `build_places.py` |
| `tx_regions.js` | `tx_counties_by_region.csv` | *County Summary* (region column) | `tools/csv_to_js.py` |
| `tx_county_water.js`, `tx_dc_sites.js`, `tx_surface_water.js`, `tx_aquifers.js`, `tx_counties.js` | repository files reused unchanged (PRISM, TWDB, Data Center Watch, county outlines) | (none) | repository `tools/build_county_water.py`, `build_surface_water.py`, `build_water_layers.py` |

All audit scripts (`build_scripts/audit/`) recompute the figures in these files from the raw sources; the report is `Texas Deep Dive Sources/AUDIT_2026-09-28.md` and the complete file inventory is `FILE_STRUCTURE_2026-09-28.md`.
