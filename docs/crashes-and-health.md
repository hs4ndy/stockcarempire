# Crashes, race health and lifetime wear: VERSION102

User-confirmed rules: enabled by default on Semi-Pro, Pro and All-Out; unavailable on Beginner/Amateur. Independent crash/damage preferences exist in Quick Race and Career Settings. One damage preference controls both race health and Career lifetime wear. Preferences persist across difficulty changes. With crashes off, zero health slows the car without a spinout. The final lifespan target is approximately40 starts in every series, superseding the initially suggested three seasons.

## On-track behavior

`raceFeatureRules` in data.js masks preferences by difficulty. launch3DRace passes those choices to an engine-local cached rule set; practice always disables these features. Both split humans receive the same rules and their own health indicator. Race health starts at the owned car's current repairable condition; Quick Race cars start100. Side-contact damage and actual wall impacts/scraping reduce race health. Bumper trains do not enter the side-strain path.

Repeated side force accumulates strain, decaying between contacts. Humans have a much higher threshold62; AI thresholds10/4/7 by series reflect the different contact environments. Nearby AI can make short bounded shoulder moves against each other, using existing inertia and wall constraints. This supplements existing passing/blocking decisions; no teammate privilege. These are arcade tuning values, not real-world crash physics.

A crash veers toward a wall, then spins and recovers automatically. Zero-health blowout flattens one tire visually and triggers the same recovery only if crashes are enabled. A crashed car can collect traffic when broadside; at most two collected cars per race and no collection beyond three simultaneously spinning cars. Five-second recovery grace prevents immediate loops. No new crash marks a car DNF. Health/crash counts lower subsequent pace, including assisted recovery targets. Actual position still governs classification. Pause freezes simulation timers; Quit restores the pre-entry Career JSON.

The old random wreck timer is removed. Its compatibility hook is inert; old permanent debris/DNF spawning is not invoked by this system. No scheduled or guaranteed crash is used to hit the target rate.

## Condition, bills and lifetime

Garage condition remains repairable through the existing repair pricing and mechanic discount. Played results carry actual race health/crash counts by stable entrant identity into postRaceUpdate. New impact loss is `max(0, entryCondition - finalRaceHealth)`, added to the existing maintenance wear. Thus more damage increases the repair bill. Normal garage maintenance continues even when the new damage feature is disabled.

Permanent `lifetimeHealth` starts100 and is never restored by repairs, promotion or off-season condition servicing. Entered owned cars lose `2.5 * (.9 + impactLoss/100 + min(crashes,3)*.15)` per enabled start. No-impact care gives about45 starts; a representative10-point loss gives40; rougher treatment shortens this. Forty is a calibrated expectation, not a guaranteed replacement deadline. Idle cars incur no new lifetime wear. Easy modes/damage-off pause lifetime wear.

At zero, the owned car is removed from active inventory and copied into `game.retiredCars` with its full fields, final stats, last driver and retirement year/event. Hired contracts remain, unassigned; Team offers reassignment. A prompt directs the player to Garage or a replacement purchase. Graveyard is always accessible from Garage, including after switching difficulty, so historical records remain available. Empty garages can buy an automatically player-assigned replacement and resume entry. Existing finance/loan limits remain; retirement does not grant a free replacement.

Legacy saves normalize missing rules/archive/lifetime fields on load. Existing cars receive100 lifetime health without retroactive deductions based on prior race count; explicit health and all existing stats remain. Retired-car totals remain included in save metadata and Career race totals. Save images are not added; race photos remain transient.

## Simulation and verification

The abstract race simulator replaces its independent per-car crash/DNF lottery with recoverable contact events: a40% AI-event opportunity and1% player opportunity on eligible crash-enabled events. There is no on-track collision geometry in simulation. Damage summaries feed the same garage wear/retirement code. These probability settings are separate from measured played-engine behavior.

Measured final engine diagnostics:45 seeded rear-start scenarios (5 seeds x3 difficulties x3 series),16 races with an AI wreck,0 player wrecks,45 finishes. Per-series event counts: Grassroots5/15, Challenger7/15, Premier4/15. Premier falls below the33% nominal lower bound in this small sample; no universal frequency guarantee or human balance acceptance is claimed. The aggregate35.6% falls within the requested roughly one race in two or three. CSV: incidents-v102.csv. Reproduce with `node tools/measure_incidents.cjs`, then `node tools/summarize_incidents.cjs`. These use synthetic rosters/driver policy and the headless fallback contact envelope, not rendered car hulls or actual human win probabilities. Real rendered hulls/recovery are covered separately by browser tests. Earlier23-point AI tolerance produced only2/45, prompting the contact-threshold tuning.

Checks actually run: full101 Node regressions; nine focused damage cases (the ninth added after the full run);24 selected browser scenarios plus final focused reruns and five final offline damage scenarios. Coverage includes gating, zero-health behavior, bumper protection, collection cap, migration, wear/repair separation,40-start fixture, preserved archive stats, source/offline retirement/replacement, split-screen health, Quit and five-slot behavior, mirrors and actual Career classification. Physical Lenovo FPS, subjective crashes and long-term human economy still require playtests. UI finish review returned ship with no material fixes at the extension scope; existing design tokens unchanged. A pre-existing HUD-opacity documentation discrepancy was left untouched.

## VERSION103 sensitivity adjustment

User playtest found race health far too sensitive. All played-engine damage inputs (side force, wall impacts/scrapes, crash/collection impacts) now apply at20% of VERSION102 loss: an80% reduction, shared by humans and AI in every series and split-screen. Crash strain/thresholds, recovery and lifetime formula remain unchanged. Lower actual race damage also reduces its existing repair/lifetime contribution. Abstract simulation remains unchanged. Zero health still triggers the existing configured behavior; reaching it takes five times the equivalent impact input. Human feel awaits playtest.
