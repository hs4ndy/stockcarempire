# Racing balance checks

## September 12 AI and drafting revision

The straight track, car models, camera, contact solver, finish classification,
and career-result merging are unchanged by this revision.

- Connected lines share a diminishing speed benefit, including the lead car.
  The old fourth-car efficiency penalty is gone. Each extra close, aligned car
  contributes, with a bounded total aerodynamic benefit rather than unlimited
  stacking. A distant wake still provides a tow without extending the train.
- Cars chasing more than 65 track units behind the leaders prioritize useful
  partners. They join, push, and receive pushes from rivals or the player.
  Leading cars pursue passes; chasing cooperation ends in the final 13-20%
  depending on difficulty. A committed safe pass is not cancelled to chase a tow.
- Small bumper-alignment offsets no longer block both otherwise-clear exits.
  Occupied destination lanes still prevent AI lane changes.
- A built draft run carries through the first 1.35 seconds outside the wake,
  then decays. Briefly touching a wake cannot create an unearned full boost.
- Detached player and AI cars receive the same gradual recovery component,
  starting 160 units behind the leader and reaching its cap at 600. Existing
  rank-based player assistance remains difficulty-dependent. No teleporting or
  imposed slowdowns on leaders are used.
- Teammate-only support remains limited to the mid-pack before 72% distance;
  its extra pushing bonus is smaller. At the front and near the finish,
  teammates compete normally.

## Difficulty intent

| Setting | Intended experience | AI pace multiplier | Player draft multiplier |
| --- | --- | --- | --- |
| Beginner | Forgiving recovery and accessible wins | 1.00 | 1.12 |
| Amateur | Balanced racing that rewards working the draft | 1.02 | 1.02 |
| Semi-Pro | Faster reactions, stronger opposition, less rank assistance | 1.035 | 1.00 |
| Pro | Most competitive racecraft, without the previous severe pace/draft mismatch | 1.05 | 0.98 |

These are design targets, not measured human difficulty ratings. The old Pro
pace multiplier was 1.105 and its player draft multiplier was 0.76. Simulated
career-race power modifiers were not changed by this revision.

## Reproduce

From the project root:

```powershell
node --test test/race-regression.test.js test/race-dynamics.test.js test/track-assets.test.js
node node_modules/playwright/cli.js test
node tools/check_race_balance.cjs
node tools/check_race_balance.cjs f82ecb0 pro
```

The balance diagnostic runs 26-car rear starts on seeds 3, 17, and 41 for
every difficulty and two repeatable control policies. `novice` means holding
the starting lane, not an actual novice person. `managed` follows nearby tows,
attempts safe passes, and returns after clearing a car. Both use ordinary
steering inputs; neither changes car positions or race results. The baseline
argument loads game code from Git with the same current driving policy.

The Node diagnostic disables incidents to isolate racecraft. It reports finish
position, passing attempts by race third, median field span, nearby traffic,
draft participation, received pushes, and longest chain. Its 36-car regression
also requires a rear-start Beginner win among the fixed seeds.

`test/e2e/race-balance.spec.cjs` runs a complete 36-car Quick Race on each
difficulty through the real browser engine, with incidents enabled. It checks
passing and cooperation, nearby traffic, completion, unique classification,
and JavaScript errors. Screenshots at 25%, 55%, 80%, and the finish are saved
under `test-results/`. The scripted physics steps are accelerated; this is
not a real-time human play session. Existing browser tests additionally cover
real keyboard input, all car-series sizes, saved career results, mirror views,
mobile DPR 2, and local file loading.

Three.js is fulfilled with the project's pinned r134 build in browser tests
to remove CDN variability. Software-rendered test timing does not establish
real-device frame rates. Seeded outcomes and visual inspection help identify
unfair isolation or broken tactics; they cannot establish subjective fun,
human learning time, or a guaranteed win rate.

## Recorded comparison

Final 26-car rear-start diagnostics, seeds 3 / 17 / 41, September 12:

| Difficulty | Holding the starting line: finishes | Scripted passing: finishes |
| --- | --- | --- |
| Beginner | 3 / 2 / 3 | 1 / 1 / 1 |
| Amateur | 2 / 4 / 3 | 4 / 1 / 1 |
| Semi-Pro | 3 / 3 / 1 | 7 / 3 / 6 |
| Pro | 7 / 3 / 4 | 6 / 6 / 12 |

The simple passing policy sometimes loses to holding a useful line, especially
on the harder settings. These are diagnostic outcomes, not a novice-versus-
expert study or proof of a particular learning curve.

With the same policies, prior commit `f82ecb0` finished 26 / 26 / 26 on Pro
holding a lane, and 22 / 22 / 21 with scripted passing. The hold-line runs had
zero nearby cars at the median sample; the revision has 15 / 15 / 10. Nearby
means within 100 longitudinal track units. The six revised Pro runs had median
field spans of 328-716 units, versus 503-791 before, and maximum chains of
6-10 cars rather than four. They still contain gaps and separate racing groups.
