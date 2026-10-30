# VERSION 94 initial tuning results

2026-10-30. Exact approved first-pass mechanics implemented. These are controlled scripted diagnostics, not human win rates. No follow-up numerical tuning applied after observing shortfalls.

## Outcome: balance targets not accepted

The initial settings overshoot the intended easing. Across15 paired cases per mode, Pro mean finish12.47 ->2.27 and All-Out18.73 ->5.80. Mean central spacing changes about+78.7% on Pro and+37.9% on All-Out, rather than10�20%; Semi-Pro is approximately unchanged. Strong front-start late-pullout policies won9/9 cases in every mode; do not claim the riding issue is resolved. Career stock recovery fails13/15 controlled targets. No second tuning pass was applied.

Final syntax checks pass. Node regressions:71/73 pass; two existing single-fixture Pro/All-Out passive-riding assertions fail and are retained. Browser:11 distinct targeted cases pass after correcting an obsolete mirror-test assumption (sampling is1.5�2x CSS and framebuffer DPR is budgeted); application rendering was not changed. Offline HTML/ZIP bytes match. Physical Chromebook and human balance playtests were not performed.

## Method

75 paired Quick Race cases: five seeds (3,17,41,73,101), three actual series/field sizes (20/26/40), all five difficulties, rear starts at formation speed, human power .75. VERSION 93 source is frozen at5ebd597. Same inputs/driving policy run against both engines. No wrecks in synthetic fixtures. Each row records completion, finish, opening traffic, tow time, overtakes (including repeat passes), nearest gap, detached seconds, reconnection episodes, and central spacing. Spacing is the median over one-second samples of the10th–90th longitudinal span divided by its interval count; excludes extreme outliers. A rejoin means crossing into the120-unit wake, which can still provide a very weak tow at its outer edge.

Actual Career comparisons use generated season rivals and matching class base stats/condition, player skill60, then install all available upgrade parts with three analysts to open slots. This is a controlled parts comparison, not a simulation of earning those upgrades. Career physics power is calculated by the production helper.

Partner cases: three seeds, every difficulty, zero/one/three teammates, Grassroots20cars, strong player .99 and partner .95 cars; continuous pushing, late pullout, and periodic pullout/rejoin policies. Zero teammates follows rivals. Partner-swap policy attempts a three-second pullout every10seconds, but does not guarantee a completed exchange on every attempt. Identity parity is separately asserted in Node regressions.

## Quick Race comparisons

| Series | Mode | Cases | Mean finish93 ->94 | Spacing change | Mean detached seconds93 ->94 |94 unrecovered episodes at finish |
|---|---|---:|---:|---:|---:|---:|
|grassroots|beginner|5|1.00 -> 1.00|-22.40%|0.00 -> 0.00|0|
|grassroots|amateur|5|1.00 -> 1.20|-1.03%|0.00 -> 0.00|0|
|grassroots|semipro|5|2.80 -> 1.60|3.28%|0.00 -> 0.00|0|
|grassroots|pro|5|7.40 -> 1.60|77.05%|0.00 -> 0.00|0|
|grassroots|allout|5|11.60 -> 4.00|27.27%|0.00 -> 0.00|0|
|challenger|beginner|5|1.00 -> 1.00|-15.88%|0.00 -> 0.00|0|
|challenger|amateur|5|2.60 -> 1.80|-20.31%|0.00 -> 0.00|0|
|challenger|semipro|5|2.60 -> 2.80|-6.48%|0.00 -> 0.00|0|
|challenger|pro|5|7.00 -> 2.20|81.11%|0.00 -> 0.00|0|
|challenger|allout|5|20.80 -> 5.00|43.25%|0.00 -> 0.00|0|
|premier|beginner|5|1.00 -> 1.20|-22.20%|0.00 -> 0.00|0|
|premier|amateur|5|1.40 -> 1.60|-19.47%|0.00 -> 0.00|0|
|premier|semipro|5|11.20 -> 4.60|4.00%|0.00 -> 0.00|0|
|premier|pro|5|23.00 -> 3.00|78.64%|0.00 -> 0.00|0|
|premier|allout|5|23.80 -> 8.40|53.85%|0.00 -> 0.00|0|

## Career stock and installed-parts comparison

|Series|Mode|Stock mean power / finish|Upgraded mean power / finish|Installed parts|
|---|---|---:|---:|---:|
|grassroots|semipro|0.58 / 3.67|0.92 / 1.00|15|
|grassroots|pro|0.58 / 3.00|0.92 / 1.33|15|
|grassroots|allout|0.58 / 9.67|0.92 / 1.00|15|
|challenger|semipro|0.66 / 4.00|0.92 / 1.33|15|
|challenger|pro|0.66 / 18.67|0.92 / 2.33|15|
|challenger|allout|0.66 / 26.00|0.92 / 1.00|15|
|premier|semipro|0.76 / 9.33|0.92 / 2.67|15|
|premier|pro|0.76 / 20.33|0.92 / 3.67|15|
|premier|allout|0.76 / 17.67|0.92 / 11.00|15|

## Partner policy diagnostics

Counts below are scripted wins / cases, not estimated human win probabilities.

|Mode|Continuous push|Late pullout|Repeated swap attempts|
|---|---:|---:|---:|
|beginner|9/9|9/9|9/9|
|amateur|7/9|9/9|9/9|
|semipro|4/9|9/9|7/9|
|pro|3/9|9/9|8/9|
|allout|3/9|9/9|9/9|

## Controlled recovery

A car starts300 units behind traffic maintained at250×seriesScale, with starting speed210×seriesScale. All30 cases finite and capped. Quick power.75: 15/15 reconnect within20s. Representative stock power.57715: 2/15 meet20s. Stock failures can settle just outside the wake; the specified interpolation can equal the rival speed before crossing120. This is an unresolved design shortfall, not an implementation exception.

## Verification and delivery

See final session record for exact regression/browser/build results and delivery SHA. Existing single-fixture Pro/All-Out anti-ride regression failures remain visible; do not remove them merely to make CI green. New functional tests cover recovery tapering, shared human traffic snapshots, equal teammate/rival construction/pace/decisions/aero, group pursuit hysteresis, contact conservation/caps, partnership memory through separation/order swaps and closing-time defense.

Raw race data: [rebalance-v94-races.csv](rebalance-v94-races.csv). Controlled recovery: [rebalance-v94-recovery.json](rebalance-v94-recovery.json).

Completed diagnostics: 339/339; error/incomplete races: 0.

Application delivery:77fea01bbdd827e46a787e6783e607ec5916c53c committed/pushed. Vercel independently reports READY/production for that exact SHA at https://stockcarempire-d7zhaokkl-hs4ndys-projects.vercel.app . Authenticated runtime/alias fetch returned403 due connection scope; actual served-page behavior remains unverified. Subsequent documentation/diagnostic-whitespace closeout does not change game bytes or the VERSION94 release.
