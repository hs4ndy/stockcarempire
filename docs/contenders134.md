# VERSION134: recurring championship challengers

Career contender selection now includes Parker Holt and Joshua Enright when present, plus the strongest remaining rival by stored equipment rating (stable number/ID ties). Legacy rosters missing either name use the strongest available cars; no active-season entrant is inserted or replaced. New generated rosters ensure exactly one Parker and Joshua. Existing Premier retention still preserves non-relegated names, IDs and raw ratings.

All three contenders now share a developed-equipment floor of .94/.97/.99 by series **before** the existing .035 setup bonus and prepared-condition adjustment. Previously the floor included that bonus, so the strongest raw car (usually Joshua) retained a large season-long advantage. Existing prepared-condition floors96/90, final power bounds, contender race nerve1.12, grid/scatter behavior, shared physics and actual classification remain. No race wins or points are assigned to a contender. Quick Race, economy, human upgrades, incidents and rendering are unchanged; no save fields/migration.

A rollover check exposed an existing name-pool shortage:39 outgoing rivals leave only two unused names in the41-name pool for three replacement seats. Premier rookie naming now falls back to unused Jr. names instead of leaving a seat empty. Relegated IDs/names are not immediately recycled. The retention regression now chooses the real Parker entry (rather than creating a duplicate name) and explicitly places him outside the relegation zone.

## Measurements

`node tools/benchmark_contenders134.cjs 72659344b4ce456107c3d049218890692b7982f6 .impeccable/review/contenders134-before.json` ran before changes against VERSION133. The working-tree run uses the same five seeds3,17,41,73,101, three series and Semi-Pro/Pro/All-Out:45 full simulated seasons per version, real result application, skill progression and between-event preparation; player condition serviced in the fixture to isolate rival competitiveness. This is not paid career progression or human played-race acceptance.

|Series|Races|Baseline mean most wins by a contender|New mean most wins|Parker mean wins|Joshua mean wins|
|---|---:|---:|---:|---:|---:|
|Grassroots|18|14.80|7.80|6.80|4.40|
|Challenger|26|22.07|11.00|7.40|7.80|
|Premier|36|22.40|14.53|11.87|11.07|

Premier Parker ranged8–18 wins across15 seasons. All three contenders finished championship top5 in all45 new simulated seasons, and accumulated result points matched standings in every season. Ten wins is an approximate competitiveness target, not a quota; shorter seasons have fewer wins to share. Existing-season Parker joins the contender group immediately if present, without changing raw power or past results. Actual played-race win totals depend on racing and player performance.

The benchmark loads current/historical support scripts through the shared test-source loader. The old championship benchmark predates sponsorship dependencies and could not run as-is; its stale output was not used. New measured output comes only from the corrected VERSION134 benchmark.

## Verification and limits

Changed game and benchmark scripts passed syntax checks. Full configured Node suite161/162: the pre-existing AI-passing-in-every-third assertion remains the only failure. Four new regressions cover named/legacy contender selection, unchanged current-season records/save-load, shared preparation and unaffected ordinary-rival power. The corrected Premier retention check passes without duplicating Parker or relegating him in the fixture.

Two source/offline browser cases passed:40 actual entrants, three correctly identified contenders, exact shared calculated power for every rival, a previously weak Parker prepared competitively, and Quit restoring the saved pre-entry career byte-for-byte. Offline HTML/ZIP embedded bytes match. No full played36-race season or physical-device performance is claimed. Season means describe the controlled simulation benchmark; human acceptance remains pending. Data: [135 driver-season rows](contenders134-seasons.csv).
