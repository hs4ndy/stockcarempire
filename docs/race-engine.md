# Race engine layout - VERSION110

The engine remains a set of synchronous classic scripts. `js/race3d.js` defines R3D, texture helpers/cache, launch3DRace and Race3DEngine. It owns construction, initialization, formation, pause, the120Hz physics sequence, second-human context switching, animation scheduling and disposal.

Load these extension scripts immediately after the entry point, before UI/main/tutorial can start a race:

1. world.js - surface loading, repeated track/environment and grandstands.
2. cars.js - shared geometry/materials, entrants, cars and wheel animation.
3. driving.js - player movement, natural/aero pace, recovery, drafting and separation.
4. ai.js - opponent motion, lane/partner decisions, passing, defending and shoulder attempts.
5. contact.js - health, crashes, collections, walls, sparks and legacy wreck hooks.
6. cameras.js - chase/mirror targets and split-screen rendering.
7. hud.js - minimap, telemetry, leaderboards, warnings and finish overlay.
8. results.js - crossing order, finish photograph and final classification.

All extension files are under js/race3d/. Each private class contributes unchanged methods to Race3DEngine.prototype by property descriptors. Class-method strictness, names, arity and non-enumerability are retained; no public extension globals or per-call wrappers are added. Constructor/public callbacks and result formats remain unchanged. No timers or async loading are introduced. Existing initialization/update order and resource ownership remain in the coordinator. Runtime tuning and renderer budgets are unchanged.

## Test and measurement loading

`test/helpers/race-sources.cjs` reads the ordered racing script list from index.html. `entries(files, baseline)` expands the race entry into the complete bundle for VM tests; baseline can be a Git ref or a self-contained source map. `snapshot(ref)` captures the complete matching bundle and supporting game scripts. Legacy maps containing one full race3d.js remain supported. Missing historical sources throw rather than being silently supplied from the working tree.

`routeRace(page, ref)` fulfills racing-script requests from the requested revision and returns an empty script for current extension requests absent in the old revision. This prevents mixed historical/current engines in browser model/render comparisons. Node snapshots, recovery measurements and source audits use the same complete bundle.

## Refactor verification

Pre-split fixtures capture VERSION109 method/constructor-body/helper fingerprints, descriptors, tuning, all15 series/difficulty seeded openings, and15 dual-player traces including inputs/pause/contact. Each extraction checks those baselines and existing damage/wall invariants. There is no change to physics, race classification, saves, UI or game rules. Old compatibility hooks remain present. Historical balance-test failures are recorded separately and are not weakened here.


## VERSION110 verification results

- Each of eight extractions passed method/API/tuning fingerprints and15 opening/15 dual trace cases plus existing damage/wall checks.
- Fifteen complete seeded races (three series x five difficulties, actual17,250/18,750 distances, crashes/damage enabled) match VERSION109 exactly in report, trajectories, incidents, health and final order. All finish; three cases contain AI incidents. See race-engine-parity.json.
- Complete Node suite:112/113 pass; the unchanged chasing-groups AI passing assertion remains a separately reproduced baseline failure.
- Complete browser suite:84/102 pass (20.6min). All18 failures replayed against original VERSION109 source/offline builds and fail at the same assertion/timeout target. See race-engine-baseline-failures.json. Failures include old36-car expectations,15000-unit completion assumptions, wall-clearance expectation, removed menu/UI functions, roster text and hard-coded tutorial navigation. No assertions were weakened and no racing/UI fixes were bundled in.
- Staged browser passes cover pavement/finish, cars, close-traffic mirror, three-series HUD, news/photo, damage/recovery, walls/sparks, real keyboard carry, and desktop/phone dual races. Final browser passes include Chromebook budgets, saved classification across three Career races, re-entry and viewport layouts. Physical Chromebook FPS is not measured.
- All syntax checks and standalone HTML/ZIP byte parity pass. No source changes to ui.js, data.js, game.js or news.js.

Equivalence fixtures are versioned refactor guardrails. Future approved engine changes must deliberately review/update the corresponding fingerprints/traces; do not weaken checks to hide accidental refactor differences.
