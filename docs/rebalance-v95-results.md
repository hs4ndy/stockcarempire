# VERSION95 competitiveness and championship rivals

2026-10-30. User report: Pro Premier is slightly easy in the pack but could not recover after dropping well behind. Goal: challenging and enjoyable, with a practical return to racing rather than free wins. User also requested a few consistent Career championship rivals.

## Changes

- Human recovery activates at80 units and remains active until18 units or no active car ahead. It matches next-car speed plus closing speed clamp(gap/8,12,30), tapering only closing speed over18-50 units. No interpolation from weak base pace outside the wake. Normal target ceiling270; shared hard recovery/contact ceiling290. Leaders receive no rejoin assistance. Both humans retain a shared pre-step traffic snapshot.
- Semi-Pro/Pro/All-Out positional help reduced to75%/65%/50% of previous amounts; hard-mode leader-gap16-unit additive bonus removed. Pro last-place1.26 retained. AI clean-air curve210*(.845+.215*power)*aiSpeed; player curve and Quick.75 unchanged. Pro raw multiplier remains1.05; All-Out1.055 ->1.065. Other difficulty multipliers unchanged.
- AI group pursuit now continues after the60-unit group merge until18-unit close tow; post-merge reference capped at normal270, so recovery cannot recursively inflate the whole field. Existing margins4/6/8 retained. AI waits until a pass is achievable: reach clamp(8+positiveClosing*(carry+1.2),12,28), instead of leaving a tow at44. Safe lanes/committed moves retained.
- Developing Career cars receive up to25% more effective tow, fading out by power.85 (band.28). Shared by humans and all AI; no clean-air boost. Tests verify increasing equipment power never reduces combined base/tow pace. Quick Race remains unchanged by this Career-specific rule.
- Three Career contenders derived from highest fixed rival ratings, ties by fixed competition number then stable ID. Same identities through points, condition and save/load; new seasons naturally select from their new roster. Effective power+.035 with developed-equipment floors.92/.95/.99 by series before prepared condition, capped.99; nerve1.12. Simulated score noise3 instead of6, qualifying4 instead of8, phase5 instead of10. Normal retirement risk and actual running-order classification remain.
- Career rival teams now prepare cars between events: regular condition floor90, contender96. Applied on entry for exhausted legacy saves and after events. Existing player condition wear, repair prices, wages, loans and money unchanged. Previously rivals only lost5-15 condition/event and had no routine service, undermining late-season competition.
- Contenders remain entered when teammates occupy field slots. Career AI grid is rated qualifying with scatter, removing automatic front slots from teammate entry order; player qualifying/analysts/formation order unchanged. No new save fields, no points reset, no rendering changes. Footer95.

## Verification approach

Final231-case engine matrix:75 rear-start Quick races (all5 modes,3 series,5 seeds),30 VERSION94 paired references (same active passing policy,2 seeds/series/mode),54 strong-team policies on actual Career rosters,36 rear-start and18 midfield-start stock/installed-parts Career races,18 paired brake-created Premier dropout cases. Seeds3/17/41/73/101; narrower groups use first2/3 seeds. Synthetic diagnostics disable wrecks. Quick paired/dropout cases retain the v1 active policy; Career follow-ups use v2, which also exits a bumper push with sufficient earned momentum. The v1 policy can keep pushing a backmarker until late; its stock rear-start results are conservative. The old94 report used another conservative policy, so its results are not directly comparable. Actual Career inputs include contenders and rated AI grids; installed-parts fixture uses15 upgrades and extra analyst slots, not economic progression. The108 Career/strong-team cases were rerun after the final contender equipment floors, stable qualifying ties and shared developing-car aero rule. Fresh single-race roster conditions are100; final maintenance change is covered by separate progression tests/seasons.

Development trials were retained locally. A full player-like AI curve with too little assistance overshot difficulty; final curve is intermediate. Further tests exposed outer-wake stalling in both human and AI recovery, and prematurely long AI pullouts. Three-seed Pro pressure regression replaces an over-specific single-seed no-win assertion: one win does not establish an exploit. The original winning seed remains included; tests require at least one loss and bounded lead/nearby rivals across the three actual Premier rosters.

These are driving-policy outcomes, not estimated human win rates. Hardware Chromebook FPS and subjective enjoyment require the user.

## Quick Race paired results

|Mode|Paired cases|Mean finish94 ->95|95 full cases / wins / last|95 mean finish|Paired spacing change|
|---|---:|---:|---:|---:|---:|
|beginner|6|1.50 -> 1.50|15 / 11 / 0|1.27|36.25%|
|amateur|6|1.50 -> 1.50|15 / 8 / 0|1.53|7.63%|
|semipro|6|2.17 -> 3.50|15 / 1 / 0|7.07|1.54%|
|pro|6|13.83 -> 10.67|15 / 4 / 1|13.00|-0.90%|
|allout|6|15.67 -> 16.50|15 / 2 / 2|15.87|3.42%|

## Premier600-unit brake-created dropout

Brake from10s until nearest-car gap600, release and race normally. Return means tow strength>.15, not merely entering the outer120-unit boundary. Seconds measured after release.

|Mode|Seed|Return94 ->95 seconds|Finish94 ->95|
|---|---:|---:|---:|
|semipro|3|34.25 -> 21.35|36 -> 8|
|semipro|17|38.18 -> 22.40|35 -> 13|
|semipro|41|none -> 23.08|40 -> 25|
|pro|3|none -> 23.98|40 -> 28|
|pro|17|38.48 -> 21.97|40 -> 36|
|pro|41|none -> 23.72|40 -> 39|
|allout|3|none -> 24.45|40 -> 40|
|allout|17|24.63 -> 24.47|40 -> 39|
|allout|41|41.05 -> 24.67|40 -> 29|

## Strong-team policy results

Player power.99, three.95 teammates; actual generated rival roster, contender profiles and AI qualifying. Three seeds per series/mode/policy. Counts are scripted wins/cases.

|Series|Mode|Late pullout|Repeated swap attempts|Active racing|
|---|---|---:|---:|---:|
|grassroots|semipro|2/3|2/3|2/3|
|grassroots|pro|2/3|0/3|0/3|
|grassroots|allout|3/3|0/3|1/3|
|premier|semipro|0/3|2/3|0/3|
|premier|pro|1/3|2/3|0/3|
|premier|allout|1/3|0/3|0/3|

## Career progression and recurring contenders

|Series|Mode|Stock mean finish|Installed-parts mean finish|
|---|---|---:|---:|---:|
|grassroots|semipro|11.50|2.50|
|grassroots|pro|19.00|1.50|
|grassroots|allout|20.00|2.00|
|challenger|semipro|24.00|3.00|
|challenger|pro|23.00|2.00|
|challenger|allout|26.00|7.00|
|premier|semipro|33.50|20.50|
|premier|pro|40.00|22.50|
|premier|allout|40.00|39.50|

## Pro midfield-start Career checks

These check holding/racing midfield, rather than requiring a stock car to climb from last. Three seeds per series/profile; same v2 driving policy and field.

|Series|Stock mean start / finish|Installed-parts mean finish|
|---|---:|---:|
|grassroots|10.00 / 13.33|1.67|
|challenger|13.00 / 21.67|1.67|
|premier|20.00 / 39.67|19.33|

45 simulated seasons (18/26/36 events) include actual applyRaceResults/postRaceUpdate, player skill changes and rival wear/service. Player car is serviced directly in the fixture to isolate performance; this does not model paying for maintenance. Standings cross-check: all matched. Seasons with all3 contenders in championship top5: 45/45. No guaranteed positions were assigned. Existing old-save points are not recalculated.

## Controlled recovery envelope

270 constant-traffic traces:3 series,5 modes,Quick.75/representative stock.57715, gaps300/600/1000, traffic250/260/270 times seriesScale. Useful tow within60s: 270/270; gap25 within60s: 260/270. All finite and under shared290*scale ceiling: true. Very late/large mistakes cannot promise enough remaining distance to regain places; assistance does not teleport or force a finish.

## Checks, limitations and delivery

Verified2026-10-30: npm run check and all85 Node tests pass. Eleven distinct targeted browser scenarios passed across final/scoped reruns, including source/offline contender profiles, legacy preparation, exact Quit rollback, actual Career classification/save, split controls/finish, close-traffic mirrors and complete Pro/All-Out Premier races. Full browser suite and physical Lenovo FPS not rerun. Offline HTML/ZIP bytes match; exact hash and commit/push/separate deployment status are in the dated vault session. Report data: [race CSV](rebalance-v95-races.csv), [season JSON](rebalance-v95-seasons.json), [controlled recovery](rebalance-v95-recovery.json). The three-seed pressure check permits occasional passive wins; do not claim all riding is eliminated. All-Out still has poor scripted outcomes and human acceptance remains pending. This is the next measured playtest release, not a claim of final balance.
