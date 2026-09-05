# CLAUDE → CODEX PROJECT HANDOFF
## Stock Car Empire (Beta)

**Handoff written:** 2026-09-05
**Repository:** https://github.com/hs4ndy/stockcarempire
**Working branch:** `claude/stock-car-empire-game-JjCMm` (ALL work has been done here; there is no `main`/`master` checked out locally and `origin/HEAD` is not set)
**HEAD at time of handoff:** `ca0245c` — "Show your driver's name in simulated results, not the car's name"
**Working tree:** clean, everything committed and pushed.

> **Accuracy convention used throughout this document**
> - **FACT** — verified by reading the files in the repository at commit `ca0245c`.
> - **ASSUMPTION** — my inference; verify before relying on it.
> - **UNKNOWN** — I do not know this and did not invent it.
>
> Where an earlier decision was later reversed, this document states the **final** decision. Historical context is given only where knowing it prevents someone from "fixing" something back to a broken state.

---

# 1. PROJECT OVERVIEW

## What the project is

**Stock Car Empire** is a browser-based stock car racing **management game with a playable 3D race**. It is a single-page, zero-build, vanilla-JavaScript web app. You open `index.html` and play. There is no server, no bundler, no package manager, and no backend.

It is explicitly branded as a **Beta** (the intro screen renders a `BETA` badge; the `<title>` is `Stock Car Empire Beta`).

## What it is supposed to do

The player runs a race team across multiple seasons:

1. **Create a career** — enter a team name, a driver name, and a name for their first car; then choose a difficulty. Start with **$50,000** and one Stock Car in the Grassroots Cup.
2. **Manage the business between races** — buy and sell cars, fit upgrades (three gated tiers), hire staff (Crew Chief, Race Engineer, Senior Mechanic, Data Analyst, Commercial Director), hire drivers for the team's other cars, sign sponsors, take and repay bank loans, and donate to charity for reputation.
3. **Race** — each round the player either **drives the race in 3D** (a first-person/chase-cam drafting sprint) or **simulates** it instantly. Races cannot be skipped; simulation is the only shortcut.
4. **Progress** — points accumulate into a championship. At season's end there is a payout for every classified driver with a very large purse for the champion, plus promotion/relegation between three series.
5. **Climb the ladder** — Grassroots Cup → Challenger Series → **Premier Cup Series** (the top tier).

## The intended end result

A complete, self-contained career-mode racing management game that runs entirely client-side from static files, with:
- A cohesive, deliberately **flat** visual design (strict palette, one typeface, one animation, no gradients/shadows/glows/emojis/icons in the UI chrome).
- A 3D race that feels like real superspeedway pack racing — drafting, chains/trains, blocking, pushing — with AI that is **smooth and readable**, never twitchy or teleporting.
- Race results that always agree with what the player actually saw happen on track.

## Current state

**FACT — the game is fully playable end-to-end.** All of the feature requests made during the Claude session were implemented, tested, committed and pushed. There is no half-finished feature blocking play.

**FACT — a hard environment constraint exists:** `index.html` loads Three.js from `https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js`. In the sandboxed development container that CDN was **blocked**, so the 3D race could not be exercised against the real Three.js. All 3D testing was done against a **hand-written THREE stub** (see §10, Testing). On a normal machine with internet access the real Three.js loads and the 3D race runs.

**FACT — the automated test harness is NOT in the repository.** All test scripts lived in `/tmp` in an ephemeral container and are **gone**. The repository contains only game source. Rebuilding a harness is the single highest-value piece of unfinished infrastructure work (§8, §12).

---

# 2. TECH STACK

## Languages
- **JavaScript (ES2020+)** — plain browser scripts. No modules (`<script src>` only, no `type="module"`), no `import`/`export`. Everything shares one global scope.
- **HTML5** — one file, `index.html`.
- **CSS3** — one file, `style.css`. Uses custom properties, flexbox, grid, `@media` queries. No preprocessor.

## Frameworks
**None.** No React, Vue, Svelte, or any UI framework. Rendering is done by building HTML strings in JS and assigning `innerHTML`.

## Libraries
- **Three.js r134** — the only third-party runtime dependency. Loaded from CDN as a global `THREE`. Used exclusively by `js/race3d.js`.
  - Pinned URL: `https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js`
  - **Why r134 specifically:** UNKNOWN to me. It was already chosen before this session's work. **Do not casually upgrade it** — `race3d.js` uses APIs whose behavior changed in later versions (notably `WebGLRenderTarget`, `Geometry`-era conventions, and colour-management defaults, which changed materially around r152). See §12.

## APIs / Services / Databases
- **No backend, no REST API, no GraphQL, no WebSocket.**
- **No database.** Persistence is **`localStorage`** only:
  - `sce_slot_0` … `sce_slot_4` — five JSON save slots, each a serialized `game` object.
  - `sce_meta` — a JSON array of 5 slot summary objects (`teamName`, `series`, `year`, `wins`, `savedAt`) or `null`.
- **No analytics, no telemetry, no third-party SDKs.**
- **No authentication, no user accounts, no secrets of any kind.** The app requires **zero environment variables**.

## Hosting / deployment
**FACT — no deployment configuration exists in the repo.** There is no `Dockerfile`, no CI workflow, no `netlify.toml`, no `vercel.json`, no GitHub Pages config, no `.gitignore`.

**ASSUMPTION:** because it is pure static files, it can be deployed by copying `index.html`, `style.css` and `js/` to any static host (GitHub Pages, Netlify, Vercel, S3, nginx). Nothing needs building.

## Development tools
Available in the dev container (**FACT**, verified):
- Node.js **v22.22.2**, npm **10.9.7**
- `http-server` **14.1.1** (global) — used to serve the game locally
- `playwright` **1.56.1** (global), with Chromium pre-installed at `/opt/pw-browsers` (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`, `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`)
- `eslint` 10.1.0, `nodemon` 3.1.14, `chromedriver` 147.0.0, `pnpm` 10.33.0

**None of these are project dependencies** — there is no `package.json`. They are ambient tooling used for manual testing only.

---

# 3. COMPLETE FILE STRUCTURE

```
stockcarempire/
├── index.html          251 lines   Single page: all screens, nav, script tags
├── style.css          1692 lines   Entire design system + all component styles
└── js/
    ├── data.js         444 lines   Static game data & tuning constants
    ├── game.js        1038 lines   Game state, persistence, economy, career logic
    ├── race.js         414 lines   Race *simulation* + merging 3D results into it
    ├── race3d.js      1800 lines   The Three.js 3D race engine
    ├── ui.js          1397 lines   All HTML rendering (returns strings)
    └── main.js         849 lines   Event handlers, flow control, glue
```

**Total: 7,885 lines across 8 files.** There are no other files — no README, no tests, no config, no assets directory, no images (all textures are generated procedurally on `<canvas>`).

## Load order (critical)

`index.html` loads scripts in this exact order, and **the order matters** because everything is global and some files call into others at definition time:

```
three.min.js (CDN)  →  data.js  →  game.js  →  race.js  →  race3d.js  →  ui.js  →  main.js
```

- `data.js` must be first (defines `SERIES`, `TRACKS`, `DIFFICULTIES`, and helper functions the others call).
- `data.js` **calls `clamp()` at runtime** (in `charityRepGain`) but `clamp` is defined in `game.js`. This works only because the call happens after all scripts have loaded. **Do not move that call to module top-level.**
- `main.js` must be last (it wires DOM listeners and calls `showScreen('intro')`).

## File-by-file

### `index.html` — 251 lines
**Purpose:** The entire DOM skeleton. Defines every top-level *screen* as a `<div class="screen">`, toggled by adding/removing `.hidden`.

**What exists:**
- `#screen-intro` — logo, `BETA` badge, tagline mentioning "Premier Cup Series", three buttons (`#btn-start-new`, `#btn-load-game`, `#btn-quick-race`), and a series strip reading `GRASSROOTS CUP · CHALLENGER SERIES · PREMIER CUP SERIES`.
- `#screen-setup` — **two panels**. Panel 1 (`01 START YOUR CAREER`) collects `#inp-team-name`, `#inp-driver-name`, `#inp-car-name`, with `#btn-create-team` labelled **"Continue"**. Panel 2 (`#setup-difficulty`, `02 CHOOSE YOUR DIFFICULTY`) holds `#setup-difficulty-grid` and `#btn-begin-career` labelled **"Begin Career"**, plus a Back button calling `backToSetupDetails()`.
- `#screen-game` — the management shell: header (`#hdr-team`, `#hdr-money`, `#hdr-series`, `#hdr-race`, `#hdr-year`), an 8-tab nav (`data-tab` = `dashboard`, `garage`, `team`, `schedule`, `market`, `standings`, `carstats`, `settings`), and an empty `<main id="main-content">` that JS fills.
- `#screen-race-setup` — wrapper with `#race-setup-content`.
- `#screen-game-race` — wrapper with `#race-3d-container` into which `launch3DRace()` injects the canvas and HUD.
- `#toast-container`.
- Script tags in the order above.

**Note:** the nav tab with `data-tab="carstats"` is **labelled "Career"** in the UI. The internal name `carstats` is a leftover from when that tab was car management. Renaming it would require touching `ui.js` `renderTab()` and the nav button.

**Depends on:** `style.css` for all classes; every `js/` file for behaviour.

---

### `js/data.js` — 444 lines
**Purpose:** Pure static data and tuning knobs. Almost no logic. This is where you change balance.

**What exists:**
- `SERIES` — 3 entries: `grassroots` (Grassroots Cup / GRC, 18 races, 20 cars), `challenger` (Challenger Series / CS, 26 races, 26 cars), `premier` (**Premier Cup Series** / PCS, 36 races, 36 cars). Each has `entryFee`, a `prize` array (per finishing position), a `points` array, `promotionSpots`, `relegationSpots`, `fieldSize`, `color`, `description`.
- `TRACKS` — 20 tracks (`t01`–`t20`) with `type` (`short_oval`, `intermediate`, `road_course`, `superspeedway`), `length`, a `series` array of which levels use it, `speedW`/`handW` weighting, and `laps`.
- **Upgrades:** `MAX_PER_TIER = 3`, `UPGRADE_TIERS` (Foundation / Performance / Elite), `UPGRADE_POOL` (**5 options per tier × 3 tiers = 15**), `buildUpgrades(mult)`, `tierInstalled()`, `tierUnlocked()`. Design intent: only 3 slots per tier but 5 options, so choices are permanent trade-offs; a tier unlocks only when the tier below is full.
- `CAR_CLASSES` — `stock` / `modified` / `premier` with buy cost, sell value, repair cost per point, base stats, and a cost-scaled upgrade list (`×1`, `×3.4`, `×15`).
- `STAFF_TYPES` — 5 roles: `crew_chief`, `engineer`, `mechanic`, **`data_analyst`**, **`commercial_director`**. Each has tiered `weeklyCost` per series level, a `bonus` string, and a `max`.
  - ⚠️ **These objects still carry an `icon` emoji field** (e.g. `'🔧'`). **FACT:** `ui.js` does **not** render them — the no-emoji rule is satisfied. The fields are dead data. Same for `SPONSOR_DEALS`.
- **Commercial Director maths:** `BASE_SPONSOR_SLOTS = 3`, `SLOTS_PER_DIRECTOR = 2`, `MAX_SPONSOR_SLOTS = 7`, `commercialDirectorCount()`, `sponsorSlots()`.
- **Data Analyst maths:** `ANALYST_QUALI_BONUS = 7`, `ANALYST_TIER_SLOTS = 1`, `analystCount()`, `tierCapacity()`.
- `HIREABLE_DRIVERS` — 15 named drivers (`drv01`–`drv15`) with `skill`, `aggression`, `morale`, `weeklyCost`.
- `AI_TEAM_TEMPLATES` — 35 fictional teams with colour, aggression, basePower.
- `AI_DRIVER_NAMES` — 40 **human** names ("Alex Turner", "Ryan Walsh", …). This exists because the user explicitly required AI drivers to have real human names, not words.
- `DIFFICULTIES` — 4 entries, each `{ id, name, blurb, aiSpeed, aiPower, aiAggro, playerDraft, racecraft }`:
  | id | name | aiSpeed | aiPower | aiAggro | playerDraft | racecraft |
  |---|---|---|---|---|---|---|
  | `beginner` | Beginner | 1.00 | 1.00 | 1.00 | 1.00 | 0 |
  | `amateur` | Amateur | 1.035 | 1.06 | 1.12 | 0.94 | 0.30 |
  | `semipro` | Semi-Pro | 1.065 | 1.12 | 1.22 | 0.88 | 0.65 |
  | `pro` | Pro | 1.09 | 1.18 | 1.30 | 0.82 | 1.00 |
  `DEFAULT_DIFFICULTY = 'beginner'`; `difficultyById(id)`.
  **These numbers are deliberately NOT shown in the UI** — the user asked for the percentages to be removed; only `name` and `blurb` are rendered.
- **`MAX_TEAM_CARS = 4`** and **`MAX_HIRED_DRIVERS = 4`** — hard caps the user explicitly requested.
- `CHARITY_CAUSES` (3), `charityCost()`, `charityRepGain()` — reputation gain tapers as reputation rises; one donation per race weekend.
- `LOAN_LATE_RATE = 0.09`, `LOAN_OFFERS` (3), `LOAN_BASE = [40000, 180000, 700000]`.
- `SPONSOR_DEALS` — 9 deals gated by series `level`, each with `weekly`, `bonus`, and a `cond` (`top10`/`top5`/`top3`/`win`).
- `RACE_EVENTS` — flavour-text templates for cautions, lead changes, crashes, pit stops, good/bad player events.

**Depends on:** `clamp()` from `game.js` (runtime only, see load-order note).

---

### `js/game.js` — 1038 lines
**Purpose:** The game state object and every rule that mutates it. This is the "model" layer.

**What exists (by section):**
- **Save system:** `NUM_SLOTS = 5`, `SLOT_PREFIX = 'sce_slot_'`, `META_KEY = 'sce_meta'`, module-level `currentSlot` (starts `null`). Functions `getSaveMeta()`, `saveToSlot()`, `loadFromSlot()`, `deleteSlot()`.
  - ⚠️ **CRITICAL BEHAVIOUR — do not "fix" this:** `saveGame()` **returns `false` and writes nothing while `currentSlot === null`.** This is deliberate. An earlier version auto-saved to slot 0, which silently destroyed a player's existing save the moment they started a new career. The header shows an asterisk / "Not saved yet" until the player picks a slot.
- **Helpers:** `uid()`, `rand()`, `randInt()`, `clamp()`, `pick()`, `fmt$()`.
- **Factories:** `makeCar(name, classId, overrideStats, opts)`, `setCarColor()`, `setCarNumber()`, `makeAITeam()`, `generateCalendar()`, `generateAITeams()`.
- **`newGame(teamName, driverName, firstCarName)`** — builds the whole `game` object (see shape below).
- **Standings:** `rebuildStandings()` (includes the player **and** every car run by a hired driver), `getStandings()`, `getPlayerStandingPos()`, `applyRaceResults(results)` (self-healing: creates a standings row if one is missing).
- **`postRaceUpdate(playerResult, earnings, allResults)`** — money, `playerSkill` growth, **reputation with a big win bonus** (`pos === 1` → `+6 + 14 × headroom`, i.e. ~+20 when unknown, tapering to +6 near the top), per-car condition wear and stat banking, AI condition wear, staff wages, **sponsor pay multiplied by `sponsorCarMultiplier()`**, `developHiredDrivers()`, `tickLoans()`, and `raceIndex += 1`.
- **`skipRace()`** — still exists in code and still works, but **is no longer reachable from the UI** (see `handleSkipRace` in `main.js`, which just shows a warning toast). The user required that races cannot be skipped.
- **`seasonPayout(seriesLevel, pos, total)`** — `PURSE_MULT = [8, 14, 22]` × `series.prize[0]`; champion takes `1.00`, 2nd `0.55`, 3rd `0.40`, then a decaying curve with a `+0.03` floor so **everyone gets paid**.
- **`endSeason()`** — pays the player for their own entry *and* every team car, records history, handles promotion/relegation, rebuilds standings.
- `promoteCarClass()`, `relegateCarClass()`.
- **Car management:** `buyCar(name)` — enforces `MAX_TEAM_CARS`, falls back to a generated name if none given, and assigns the **lowest free car number**. `sellCar()`, `repairCar()`.
- **Charity:** `donationRaceKey()`, `canDonate()` (once per race weekend), `donateToCharity(causeId)`.
- **Bank:** `getLoans()`, `totalDebt()`, `creditLimit()`, `creditAvailable()`, `loanPrincipal()`, `takeLoan()`, `repayLoan()`, `tickLoans()` (compounds at `LOAN_LATE_RATE` only after the term expires).
- `upgradeCar()`, `renameCar()`.
- **Staff:** `hireStaff(typeId)`, `fireStaff(staffId)`.
- **Drivers:** `hireDriver(driverId, carId)` — enforces `MAX_HIRED_DRIVERS`. `hiredDriverSkill(hire)` — returns *live* skill including season development. `hireForCar(carId)`. **`developHiredDrivers(allResults, fieldSize)`** — drivers improve over the season based on results (a feature the user explicitly asked for). `fireDriver()`.
- **Sponsors:** `signSponsor()` (respects `sponsorSlots()`), `dropSponsor()`.
- **Computed:** `currentRace()`, `isSeasonOver()`, `effectiveCarScore()`, `weeklyExpenses()`, **`sponsorCarMultiplier()`** (sponsor pay doubles as you add cars), `weeklySponsorIncome()`, `ordinal(n)`.
- **`chooseCareerPath(path, aiTeamId)`** — ⚠️ **DEAD CODE.** Kept but nothing calls it; the Premier career choice was removed at the user's request.

**The `game` object shape (FACT, from `newGame`):**
```js
{
  version: '1.1',
  teamName, driverName,
  money: 50000,
  playerSkill: 60,          // 0–100
  reputation: 50,           // 0–100
  currentSeries: 0,         // index into SERIES
  driverMode: 'driver',     // 'driver' | 'manager' | 'hired' — now always 'driver'
  hiredTeamId: null,
  cars: [Car],
  hiredDrivers: [],         // { driverId, carId, ... }
  staff: [],
  activeSponsors: [],       // sponsor ids
  loans: [],
  difficulty: 'beginner',
  season: { year, raceIndex, calendar, aiTeams, standings },
  history: [],              // { year, series, finalPos, wins, champion }
  notifications: [],
  achievements: []
}
```

**Depends on:** everything in `data.js`. Called by `main.js`, read by `ui.js`, read by `race.js`.

---

### `js/race.js` — 414 lines
**Purpose:** The **text/statistical race simulation**, and — just as importantly — the code that reconciles a real 3D race result with that simulation. This file is where the most painful bugs of the project lived.

**What exists:**
- **`simulateRace({ playerCarId, trackId, isHiredMode })`** — builds an entry list, scores each entry, draws a qualifying grid (Data Analysts reduce scatter and add `ANALYST_QUALI_BONUS`), runs **5 phases** (`start`, `early`, `mid`, `late`, `finish`), then classifies.
  - ⚠️ **The final sort orders by phase-derived `position`, NOT by `perfScore`.** Sorting on `perfScore` was the "wrong person wins" bug — it threw the whole race away and handed victory to whoever qualified best, so the car reported leading at the flag could still lose. **Do not change this back.**
- **`buildEntryList(playerCarId, trackId, isHiredMode)`** —
  - Player entry `displayName` is **`` `${game.teamName} / ${game.driverName || 'You'}` ``**. It used to be the *car's* name; the user explicitly asked for the driver's name. Hired mode uses `` `${aiTeam.name} / ${game.driverName || 'You'}` ``.
  - Every car with a hired driver becomes a **real entry** named `` `${game.teamName} / ${drv.name}` `` with power derived from the car *and* the driver's live developed skill. (Before this, hired drivers simply never appeared in the standings.)
  - AI team cars, then generic backmarkers padded up to `series.fieldSize`.
- **`reRankWithPlayerAt(results, playerPosition)`** — inserts the player's real finish and shifts everyone else so **every position stays unique** (this fixed duplicate positions in the Top 10). DNFs always classify at the back.
- **`reRankWithTeamOrder(results, playerPosition, trackOrder)`** — ⚠️ **The most important function in the file.** The 3D race's finishing order is treated as authoritative for the **entire field**, not just the player's cars. It walks `trackOrder` and claims a matching simulated result for each slot, matching by `isPlayer`, then `carId`, then driver name (parsed as the text after `' / '`), then any spare rival. It also **honours the on-track DNF flag over the simulation's own reliability roll**, because the sim would otherwise retire a car that plainly took the flag ahead of the player.
  - Historical note worth knowing: an earlier version forced the player's team into a **contiguous block anchored on the player's finish**. That silently moved a team-mate who had actually won back to just ahead of the player whenever a rival finished between them. Do not reintroduce block-anchoring.
- **`calcPerf(entry, track)`** — synthetic entries use `syntheticPower × 100 × difficulty.aiPower` (team-mates are exempt from the difficulty multiplier); the player uses real car stats weighted by the track's `speedW`/`handW`, condition, skill, and staff bonuses including `analysts × 2`.
- **`runPhase(entries, phase, track, currentLeader, cautionCount)`** — adds noise, applies a **grid edge** on the opening phase (`(qualifyScore - perfScore) × 0.8`) so qualifying actually matters, applies **momentum** (`(fieldN - position) / fieldN × 6`) so track position is sticky, rolls DNFs, rolls cautions, and rolls one player-specific good/bad event at 35%.
- `formatRaceResults(results)`.

**Depends on:** `game` (global), `SERIES`, `TRACKS`, `RACE_EVENTS`, `difficultyById`, `analystCount`, `hiredDriverSkill`, `HIREABLE_DRIVERS`, `AI_TEAM_TEMPLATES`, `AI_DRIVER_NAMES`, and helpers from `game.js`.

---

### `js/race3d.js` — 1800 lines
**Purpose:** The playable 3D race. A **straight-line superspeedway drafting sprint** (not an oval — see §6). Chase camera only.

**What exists:**
- **`R3D`** — one big constants object holding *every* tuning value. Grouped as: track/world, speed model, steering, **drafting**, AI/race director, **AI lateral model**, and physical separation. Key values:
  - World: `TRACK_LEN: 15000` (~90-second sprint), `TRACK_W: 22`, `HALF_W: 11`.
  - Speed: `SPEED_BASE: 175`, `SPEED_MAX: 268`, `ACCEL: 1.6`, `BRAKE_FORCE: 140`.
  - Steering: `LAT_ACC: 80`, `LAT_MAX: 13`, `STEER_FALLOFF: 0.35`.
  - **Draft:** `DRAFT_Z: 92` (long tow), `DRAFT_X: 4.6`, `DRAFT_BOOST: 38`, `DRAFT_CURVE: 0.72` (bites from further back), `PUSH_Z: 5.2`, `PUSH_BONUS: 11`.
  - **Chain:** `CHAIN_PER_CAR: 5`, `CHAIN_CURVE: 0.14` (**each extra car is worth MORE than the last** — this is what lets a 3-car chain run down a 2-car link, exactly as the user asked), `CHAIN_MAX: 34`.
  - **Pack:** `PACK_CATCHUP: 22`, `PACK_GAP: 190` — keeps the field together.
  - Team: `TEAM_HELP_Z: 60`, `TEAM_PUSH_BONUS: 4`.
  - Mirror: `MIRROR_HFOV: 88` (a fixed **horizontal** FOV; a 154° value produced a fisheye).
  - Director: `CALM_FRAC: 0.45`, `ENDGAME_FRAC: 0.75` — aggression ramps smoothly from calm early to full attack at the end.
  - **AI lateral model:** `AI_LAT_ACC: 5.0`, `AI_LAT_MAX: 2.6`, `AI_STEER_GAIN: 0.9`, `LANE_STEP: 2.4`, `LANE_COMMIT: 3.2`, `LANE_GAIN_MIN: 0.14`, `LANE_INERTIA: 0.13`, `TOW_APPEAL: 2.1`, `STUCK_Z: 34`, `STUCK_PENALTY: 1.6`, `TACTIC_COMMIT: 2.6`, `BLOCK_Z: 20`, `BLOCK_MAX: 1.6` (deliberately small — no chopping).
  - **Separation:** `SEP_Z_RATE: 34`, `SEP_X_RATE: 6`, `CONTACT_IMPULSE: 0.9`, `CAR_SEP_X: 2.15`, `CAR_SEP_Z: 4.6`.
- **Procedural texture helpers** — `r3dTex()`, `r3dRoundelTex()` (cached per number), `r3dAsphaltTex()`, `r3dGrassTex()`, `r3dCrowdTex()`, `r3dFenceTex()`, `r3dWallAdTex()`, `r3dBannerTex()`. **All textures are drawn on `<canvas>` at runtime — there are no image assets in the project.** Texture dimensions are power-of-two (a 256×48 sponsor texture had to become 256×64 for correct wrapping).
- **`launch3DRace(config, onComplete)`** — injects the canvas and the full HUD markup, then constructs `Race3DEngine`. Also installs `window._r3dFinish(pos)` which **captures `finalOrder()` before destroying the engine** and calls `onComplete(pos, order)`.
- **`class Race3DEngine`** — the whole engine. Notable methods:
  - `_init`, `_initGeometries`, `_buildTrack`, `_buildEnvironment`, `_buildCars`, `_makeCar`, `_buildMinimap`, `_countdown`
  - `_update`, `_updatePaceLap`, `_updatePlayer`, **`_updateAI`**, **`_scoreLane(car, laneX, aggro)`**
  - **`_calcDraft`**, **`_calcChainBonus`**, **`_separateCars`**, `_checkCollisions`, `_bumpPlayer`, `_spinPlayer`, `_animateCars`
  - `_togglePause`, **`_checkFinish`**, **`finalOrder`**, `_triggerWreck`, `_updateCamera`
  - `_initMirrorTarget`, **`_renderMirror`**, `_updateHUD`, `_updateOrder`, `_warn`, `_showFinish`, `_loop`, `destroy`

**Behaviours you must not undo (each fixed a real, user-reported bug):**
1. **`_checkFinish()` collects all cars over the line this frame, sorts them by `z` descending, and only then credits them.** Iterating `this.cars` in array order credited the player (index 0) ahead of a team-mate they had just pushed to the line. At 200+ units/sec a single frame is ~10 units of track, so ties are common.
2. **`_updateHUD()` counts finished cars when computing the player's position:** `active.filter(c => c !== p && (c.finished || c.z > p.z)).length`. Without `c.finished` the HUD read **P1 while running dead last**.
3. **`_separateCars()` clears `_pushLocked` at its own start**, not before `_updateAI`. The lock was previously cleared before `_updateAI` but only *set* afterwards, so it never applied.
4. **`_separateCars()` uses rate-limited impulses**, never position snapping. This is the whole reason the AI stopped "teleporting".
5. **`destroy()` traverses the scene and disposes geometries, materials and textures.** Without it, each race leaked GPU memory.
6. **The rear-view mirror uses a `WebGLRenderTarget` plus a flipped-UV blit quad.** It previously negated the projection matrix, which reversed triangle winding so front faces rendered as back faces — the "iffy textures". Far plane is 4000 (was 1400).
7. **The starting grid is built pole-first with a staggered outside line.** It was previously built with row 0 at `z = 0`, i.e. at the *back*, which is why the player always seemed to start P3.

**HUD elements:** pause button, `#r3d-mirror-wrap` (REAR VIEW), running order list, a FIELD minimap, telemetry (position `#r3d-pos`, speed, and a **`DRAFT`** meter — the user specifically required the word "DRAFT", not "SLIPSTREAM"), a progress bar to FINISH, warnings, countdown, finish card, pause overlay, and a control hint (**A** = left, **D** = right, **S** = brake; throttle is automatic).

**Depends on:** global `THREE`; `R3D`; reads `difficultyById` from `data.js`. It does **not** touch `game` — everything comes in through `config`.

---

### `js/ui.js` — 1397 lines
**Purpose:** All HTML generation. Every function returns an HTML **string**; nothing here mutates game state.

**What exists:**
- **Router:** `showScreen(name)`, `showTab(tabName)`, `renderTab(tabName)` (switch that maps a tab name to a render function and assigns `main.innerHTML`), `attachTabListeners(tabName)`.
- `updateHeader()`, `toast(msg, type, duration)`.
- **Name formatting (important):**
  - `standingName(entry)` — championship tables are **driver** standings, so the driver's name leads and the team is the secondary label. Parses AI entries stored as `"Team Name (Driver Name)"`.
  - `resultName(r)` — race results store `"Team / Driver"`; renders **driver first**, team second.
- `statBar()`, `condBar()`.
- **Tab renderers:** `renderDashboard()`, `renderGarage()`, `renderTeam()`, `renderSchedule()`, `renderMarket()`, `renderStandings()`, `renderCareerStats()`, **`renderSettings()`**.
- **Modals:** `renderUpgradeModal(carId)` (tiered, respects `tierCapacity()` and `tierUnlocked()`), `renderHireDriverModal(driverId)`, `renderRaceResultsModal()`, `renderEndSeasonModal(info)` (with a much bigger championship celebration), `renderSaveModal()`, `renderLoadModal()`, `renderQuickRaceModal()`.
- **`renderPremierChoiceModal()`** — ⚠️ **DEAD CODE**, no longer reachable.
- `renderRaceSetup()`, `renderRaceScreen()`, `renderLeaderboard()`.
- `trackTypeBadge()`, `formatTrackType()`.

**Notable content details:**
- The Dashboard's fifth stat cell is labelled **"Next Race"** (a specific user request).
- `renderSettings()` shows a large **Difficulty** card (`difficulty-grid lg`) with only `name` and `blurb` — **no percentages** — plus an **Auto Save** card. It deliberately offers **no "new career" option**.
- `renderCareerStats()` (the "Career" tab) shows only statistics — previous seasons, all-time wins, wins this season, titles, reputation — under a card headed **"Credentials"**. Car management was moved out of this tab.
- `renderMarket()` contains the car market, the **bank** (loans) and the **charity donation** section.

**Depends on:** `game` and nearly every helper in `game.js` and `data.js`. Called by `main.js`.

---

### `js/main.js` — 849 lines
**Purpose:** Event wiring and flow control. The "controller".

**What exists:**
- `racePlayback` state object; `selectedCareerPath` (**dead**, tied to the removed Premier choice).
- **Startup:** shows the intro screen; `enterGame()`.
- **Two-step career setup:** `pendingCareer`, `setupDifficulty`, `renderSetupDifficultyCards()`, `setSetupDifficulty(id)`, `showSetupDifficulty()`, `backToSetupDetails()`, and the `#btn-begin-career` handler that finally calls `newGame(...)`.
  - ⚠️ **Any automated test that creates a career MUST click `#btn-create-team` and THEN `#btn-begin-career`.** Three regression scripts silently broke when this second step was added.
- `handleSetDifficulty(id)`, `handleSetCarColor()`, `handleSetCarNumber(carId)` (per-car number editing), `activeTab()`.
- **Quick Race:** `showQuickRaceScreen()`, `quickRaceDifficulty`, `setQuickRaceDifficulty(id)`, `handleStartQuickRace(fieldSize)`. The quick-race options are presented as **league names** (Grassroots Cup / Challenger Series / Premier Cup Series), not raw field sizes.
- **Dashboard:** `handleOpenRaceWeekend()`, **`handleSkipRace()`** — now just `toast('Races cannot be skipped. Run the race or use Simulate.', 'warning')`, `handleEndSeason()`, `handleDismissEndSeason()`.
- **Garage:** `showUpgradeModal()`, `closeUpgradeModal()`, `handleRepair()`, `handleUpgrade()`, `handleRenameCar()`, `handleSellCar()`.
- **Team:** `handleHireStaff()`, `handleFireStaff()`, `freeCarsForHire()` (a car that already has a driver is **excluded** from the hire options), `openHireDriverModal()`, `closeHireModal()`, `confirmHireDriver()`, `handleFireDriver()`.
- **Market/Bank/Charity:** `handleBuyCar()`, `handleTakeLoan()`, `handleRepayLoan()`, `handleDonate()`, `handleSignSponsor()`, `handleDropSponsor()`.
- **Race weekend:**
  - **`validateRaceEntry(playerCarId)`** → `{ error, idle }`. Returns an error only when the team genuinely cannot enter (no cars at all, or **every** car is driverless). A driverless spare car is **not** an error — it simply sits out.
  - `enteredCars(playerCarId)`, `noteIdleCars(idle)` (warns which cars stay home).
  - **`handleStartRace()`** — resolves the player's car, validates, charges an entry fee **per entered car**, builds `aiEntries` (team-mates first, carrying `carId` so results can map back; then AI teams; then generic backmarkers), and calls `launch3DRace()`.
  - The `launch3DRace` completion callback is where the 3D result meets the simulation:
    - ⚠️ **`const teamOrder = trackOrder || [];`** — **this line is load-bearing.** It previously read `trackOrder.filter(o => o.carId)`, which reduced the order to only the player's own cars; `reRankWithTeamOrder` then treated those ~4 entries as the whole field and handed them positions 1-2-3-4. That is exactly the "I got 20th but it says I got third and my team-mates got 1, 2, 3, 4" bug. **Never filter this.**
    - Builds a player `stub` result, merges, calls `reRankWithTeamOrder`, applies results, persists, and shows the results modal.
  - **`handleSimulateRace()`** — the instant path. Same validation and fee logic, then `simulateRace()` straight into the results modal.
- `handleRaceSkipToEnd()`, `handleRaceSpeed()` — empty stubs kept for future use.
- `startRacePlayback()` / `scheduleNextEvent()` / `showNextEvent()` / `setPhaseLabel()` / `finishRacePlayback()` — **legacy 2D playback, effectively dead** since the 3D race replaced it.
- **Save reminder:** `checkSaveReminder()`, `showSaveReminder(racesDone)`, `dismissSaveReminder()` — nudges the player in the career lobby when nothing has been saved.
- `reportLoanNotes()`, `handleCloseResults()`.
- `showPremierChoiceModal()`, `selectCareerChoice()`, `confirmCareerChoice()` — ⚠️ **DEAD CODE.**

**Depends on:** everything.

---

### `style.css` — 1692 lines
**Purpose:** The complete design system and every component style.

**What exists:**
- **Design tokens** on `:root` — a single neutral surface scale (`--bg: #0D0D0F`, `--panel: #15151A`, `--panel-2: #1C1C22`, `--panel-3: #232329`), lines (`--line: #2A2A33`, `--line-2: #383843`), text (`--text: #ECECEF`, `--text-dim: #8C8C99`, `--text-mute: #5A5A66`), accent (`--accent: #E4002B`, `--accent-press: #B30021`, `--accent-ink: #FFFFFF`), functional (`--good: #2FBF71`, `--warn: #E0A800`).
  - ⚠️ **`--green`, `--red`, `--gold` are aliases referenced from inline styles in `ui.js`.** The CSS comment says *"do not rename"*. Renaming them breaks colours set from JS.
- `--font: 'Archivo', 'Helvetica Neue', Arial, system-ui, sans-serif` — **one typeface for the entire product.**
- `--maxw: 1160px`, `--t: 150ms`.
- **Tabular numerals** enforced on a long, explicit selector list of every numeric element.
- **Exactly one keyframe animation, `sce-rise`** (8px rise + fade), applied to `.screen:not(.hidden)`, `#main-content > *`, and `.modal`.
  - ⚠️ **This animation is why modals are appended to `document.body`, not to `#main-content`.** The animation leaves a `transform` on `#main-content > *`, which creates a containing block and breaks `position: fixed` — modals rendered at the bottom of the page instead of centred. **If you ever move a modal back under `#main-content`, this bug returns.**
- Component styles for every screen, plus `.difficulty-grid` / `.difficulty-grid.lg` / `.difficulty-card`, and the full `r3d-*` HUD styling.
- Responsive `@media` rules — the layout was explicitly required to fit the window at any size with no horizontal overflow.

---

# 4. CURRENT SOURCE CODE

**FACT:** The complete, exact contents of all 8 project files are in this repository at commit `ca0245c`, and are additionally reproduced verbatim in **`HANDOFF_SOURCE.md`**, generated mechanically (by concatenation, not by transcription) so there is zero risk of paraphrase or omission.

Read `HANDOFF_SOURCE.md` for full source, or simply read the files directly — **the files in the repo are authoritative.** If `HANDOFF_SOURCE.md` and the real files ever disagree, the real files win and the snapshot is stale.

## Files whose exact contents I do NOT have

**Exact file contents unavailable — the automated test harness.**
Every test script lived in `/tmp` inside an ephemeral container and has been destroyed. They were never committed. What I know about them:

- **`/tmp/three-stub.js`** — a hand-written stub implementing just enough of the Three.js API for `race3d.js` to construct and run headlessly: `Scene`, `PerspectiveCamera`, `WebGLRenderer`, `WebGLRenderTarget`, `Mesh`, `Group`, `Object3D`, `Vector2/3`, `Euler`, `Color`, `BoxGeometry`, `PlaneGeometry`, `CylinderGeometry`, `MeshStandardMaterial`/`MeshBasicMaterial`, `CanvasTexture`, `AmbientLight`/`DirectionalLight`, `Fog`, and the `MathUtils` helpers used. It was injected by intercepting the CDN request with Playwright's `page.route()` and serving the stub in place of `three.min.js`, because `cdnjs.cloudflare.com` is blocked in the sandbox.
- Several ad-hoc Node + Playwright scripts (`/tmp/names.js` and others) that drove a full career through the DOM and asserted on real physics/HUD state.

I am **not** reproducing these from memory, because I would be inventing code. §10 describes how to rebuild an equivalent harness.

---

# 5. FEATURES

## 5.1 Fully implemented

**Career creation (two-step)**
Intro → `#screen-setup` panel 1 collects team name, driver name and first car name → panel 2 presents the four difficulty cards → `#btn-begin-career` calls `newGame()`. Difficulty is chosen **during setup**, right after the names, exactly as requested.

**Five-slot save/load**
`localStorage` slots `sce_slot_0..4` plus an `sce_meta` index. Auto-save runs after most actions **but only once a slot is bound**. Until then the UI reports "Not saved yet" and a save reminder appears periodically in the career lobby.

**Difficulty system**
Four levels — Beginner, Amateur, Semi-Pro, Pro. Each scales AI on-track speed (`aiSpeed`), simulated strength (`aiPower`), aggression (`aiAggro`), how much draft the player gets (`playerDraft`), and racecraft (how cleverly the AI blocks and works the tow). Selectable at career setup, before a quick race, and in the **Settings** tab. **No numeric percentages are displayed** — name and blurb only.

**Three-series ladder with promotion/relegation**
Grassroots Cup → Challenger Series → **Premier Cup Series**. Field sizes 20 / 26 / 36; 18 / 26 / 36 races.

**3D race — straight-line drafting sprint**
15,000-unit run, ~90 seconds, chase cam only. Controls: **A** left, **D** right, **S** brake, throttle automatic. Full HUD with rear-view mirror, running order, field minimap, position, speed, **DRAFT** meter, and a progress bar.

**Draft, push and chain physics**
A long tow (`DRAFT_Z: 92`) that "ropes you in" from well back (`DRAFT_CURVE: 0.72`) and then lets you shove the car ahead once you arrive (`PUSH_BONUS: 11`). Chain bonus is **super-linear** (`CHAIN_CURVE: 0.14`), so each extra car in a train is worth more than the last and a 3-car chain genuinely runs down a 2-car link. `CHAIN_MAX: 34` prevents a runaway train. `PACK_CATCHUP` keeps stragglers connected so the field stays packed.

**AI racecraft ("race IQ")**
`_scoreLane()` scores each candidate lane on clear air, tow appeal, whether it is blocked, wall proximity, being stuck behind a slower car, and lane inertia. Cars commit to a line for `LANE_COMMIT` seconds and to a tactic for `TACTIC_COMMIT` seconds, so they do not dither. Drivers falling back will block or push to recover, but `BLOCK_MAX: 1.6` keeps defence to a shade, never a chop. Aggression ramps smoothly from calm (`CALM_FRAC: 0.45`) to full attack (`ENDGAME_FRAC: 0.75`).

**Smooth contact model**
AI steer by accelerating a lateral velocity (`car.lvx`), never by snapping position. Contact resolves through **impulses with rate-limited separation** (`SEP_X_RATE`, `SEP_Z_RATE`, `CONTACT_IMPULSE`). This is the fix for "they teleport around the map and shift around when you hit them" and it was the single most emphasised requirement in the project.

**Race result integrity**
The 3D finishing order is authoritative for the whole field and is merged into the simulation by `reRankWithTeamOrder()`. Every position is unique, DNFs classify at the back, and the on-track DNF state overrides the simulation's reliability roll.

**Race simulation ("Simulate")**
Five-phase model with qualifying, grid edge, momentum, cautions, DNFs and player events. Results name the **driver**, not the car.

**Racing with a spare car**
A car with no driver simply is not entered; the player is warned by toast but not blocked. An error is raised only if there is no car at all, or if every car is driverless.

**Cannot skip races**
`handleSkipRace()` shows a warning. Simulate is the only shortcut.

**Team management with hard caps**
**Maximum 4 cars and maximum 4 hired drivers**, enforced in `buyCar()` and `hireDriver()`. Per-car colour and **per-car number** editing; `buyCar` assigns the lowest free number automatically.

**Hired drivers are real competitors**
They get real entries, race, score points, appear in the standings under their own name, and **develop skill over the season** via `developHiredDrivers()`.

**Staff**
Crew Chief, Race Engineer, Senior Mechanic, **Data Analyst** (sharper qualifying + one extra upgrade slot per tier), **Commercial Director** (+2 sponsor slots each, capped at 7 total).

**Tiered upgrades**
Three tiers × five options, but only three slots per tier (more with Data Analysts). A tier unlocks only when the one below is full.

**Sponsors**
Nine deals gated by series level, with per-result bonuses. **Base pay scales with the number of cars fielded** (`sponsorCarMultiplier()`).

**Bank**
Three loan products with different terms, rates and sizes. Borrowing power scales with series and reputation. Overdue balances compound at `LOAN_LATE_RATE` per race.

**Charity**
Three causes in the Market tab. Cost scales with series, reputation gain tapers as you become well known, one donation per race weekend.

**Reputation**
0–100. Winning gives a **large** boost that tapers with headroom (~+20 when unknown, +6 near the top). Poor finishes cost a little.

**End of season**
A large championship celebration, a purse paid to **every** classified driver, and a champion's payout far bigger than anyone else's. `PURSE_MULT = [8, 14, 22]` scales the purse sharply by series.

**Flat design system**
Strict palette, Archivo throughout, exactly one `sce-rise` animation, no gradients, shadows, glows, emojis or icons in the UI. Fully responsive with no horizontal overflow.

**Career tab**
Statistics only — previous seasons, all-time wins, wins this season, titles, reputation — under a **"Credentials"** card.

**Settings tab**
Large difficulty selector plus auto-save status. No new-career option.

## 5.2 Partially implemented

**Quick Race**
**FACT (verified in `handleStartQuickRace()`):** it is a throwaway exhibition race. It builds a random field of AI entries with shuffled human names, launches the 3D race with a **hardcoded** `playerPower: 0.60`, `playerColor: '#e8001d'` and `playerNumber: 1`, and on completion returns to the intro screen with a toast. **It never touches `game`, never saves, never feeds standings, and does not pass a `playerName`.** Difficulty *is* honoured (`quickRaceDifficulty`).

**`driverMode` (`'driver' | 'manager' | 'hired'`)**
The state field, the `hired` branches in `buildEntryList()`, `validateRaceEntry()` and `handleStartRace()` all still exist and appear functional, but **nothing sets `driverMode` to anything other than `'driver'`** now that the Premier career choice was removed. It is live code on a dead path.

**`skipRace()`**
Fully implemented in `game.js` and correct, but intentionally unreachable from the UI.

**Legacy 2D race playback**
`startRacePlayback()` and friends in `main.js` are stubs/dead paths left from before the 3D race.

**Track variety in 3D**
`data.js` defines 20 tracks across four types (`short_oval`, `intermediate`, `road_course`, `superspeedway`). **FACT (verified — `race3d.js` contains no reference to track type or track id at all):** the 3D race is **always the same straight-line sprint regardless of which track the calendar says you are at.** Track identity affects only the *simulation*, through `speedW`/`handW` in `calcPerf()`. So racing the "Coastal Road Circuit" in 3D looks identical to racing "Eagle Superspeedway". This is a known content gap, not a bug — but it is the most obvious place to add depth.

## 5.3 Planned / not yet implemented

These were **never requested and never started** — listed as the natural gaps, not as commitments:

- Real oval or road-course 3D geometry (the user explicitly chose to keep the straight sprint — see §6).
- Pit stops, tyre wear or fuel strategy as live mechanics during the 3D race.
- Any multiplayer, networking or cloud saves.
- Sound or music.
- A build pipeline, minification or asset bundling.
- Mobile/touch controls for the 3D race (keyboard only today).
- Achievements — **FACT:** `game.achievements` is initialised to `[]` in `newGame()` (`game.js:262`) and **nothing anywhere in the codebase ever writes to it.** It is a placeholder for an unbuilt feature.

---

# 6. IMPORTANT DECISIONS

**Race format: straight-line sprint, not an oval.**
When the in-race rewrite was proposed, the choice was between building a real oval and upgrading the existing straight-line format. The user chose **"Upgraded straight sprint"**. Do not convert this to an oval without being asked.

**Camera: chase cam only.**
Offered alongside other camera options; the user chose **"Chase cam only"**. There is no cockpit or TV camera.

**Design language: flat, strict, one typeface, one animation.**
Explicitly specified: a strict colour palette, flat colours only, **zero gradients and zero glow effects**, no emojis, no generic icons, uniform typography, and a **single global animation**. Archivo was chosen as a professional, human-crafted typeface. This is a product-defining constraint, not a style preference.

**Modals are appended to `document.body`.**
Chosen after discovering that the global `sce-rise` animation leaves a `transform` on `#main-content > *`, creating a containing block that breaks `position: fixed` and pushed modals to the bottom of the page.

**The rear-view mirror is a render target with a flipped-UV blit quad.**
The alternative — negating the projection matrix — was implemented first and rejected because it reverses triangle winding, rendering front faces as back faces.

**The 3D finishing order is authoritative for the entire field.**
Two designs were tried. The first kept the player's team as a contiguous block anchored on the player's own finish; it was rejected because it relocated a team-mate who had genuinely won. The final design walks the full on-track order and claims a matching simulated result for each slot.

**Save-on-demand, not save-always.**
Auto-save to slot 0 was removed after it destroyed real save data. `saveGame()` now no-ops until a slot is explicitly bound.

**Final classification comes from phase results, not pre-race strength.**
`simulateRace()` sorts on the `position` the phases produced. Sorting on `perfScore` was rejected as the cause of "the wrong person wins".

**Difficulty is chosen during career setup, and lives in Settings thereafter.**
It was previously in the Career tab; the user asked for a dedicated Settings tab, and for the Career tab to hold statistics only.

**Difficulty numbers are hidden from players.**
The multipliers exist in `data.js` but the UI shows only a name and a blurb.

**Team size is hard-capped at 4 cars and 4 drivers.**

**The Premier Cup Series three-option career choice was removed.**
The modal, the state and `chooseCareerPath()` remain in the codebase but nothing invokes them.

**Naming decisions (final):**
- "Premier League" → "Premier Series" → **"Premier Cup Series"** (final).
- HUD label "SLIPSTREAM" → **"DRAFT"** (final).
- Dashboard 5th stat → **"Next Race"**.
- Career tab standings label → renamed away from "Standing"; the card is headed **"Credentials"**.
- The sponsor-slot role was deliberately *not* called "Marketing Manager"; it is **"Commercial Director"**.

**AI drivers get human names.**
`AI_DRIVER_NAMES` holds 40 human names because the user rejected word-style names ("like Dave Johnson for example").

**Visual clutter removed.**
The floating banner above cars and the orange/blue selection boxes around cars were both removed on request.

**Testing approach: a hand-written THREE stub.**
Because the CDN is blocked in the sandbox, testing the real physics headlessly required stubbing Three.js rather than mocking `race3d.js`. This exercises the genuine physics, AI and HUD code paths.

**Repeated-run testing for flaky bugs.**
Race logic is stochastic, so single passes are not evidence. A sim-DNF-override bug surfaced only once in five runs. **Run race-related tests 5–8 times.**

---

# 7. USER REQUIREMENTS AND PREFERENCES

## Repeatedly emphasised — treat as hard constraints

**1. AI motion must be smooth. This was raised more than any other topic.**
Direct quotes: *"the AI's moves are very erratic… they shift around a lot, and it's really bumpy"*; *"They have to not teleport around the map and shift around when you hit them"*; *"more of a softer: they don't shift around, and they have higher race IQ. So they know when to push and when to block."*; *"Focus on this feature heavily."* Later: *"make racing smoother"*, *"That's not ideal racing. Just make it a little bit smoother."*
→ Never resolve contact by snapping position. Never let an AI change lanes instantly. Preserve the lateral-velocity model, the commit timers and the rate-limited separation.

**2. Finishing positions must be correct. Raised at least four separate times.**
*"the wrong person gets in the wrong position, usually a teammate"*; *"one time I got second, my teammate got first, and I pushed him to the win. On the leaderboard, he wasn't first"*; *"Position glitch is still happening"*; and finally *"I got 20th, but it says I got third, and it just says my teammates got 1, 2, 3, 4, which is not true."*
→ The result-merge path is the most bug-prone code in the project. Change it only with tests, and re-read the warnings in §3 and §8.

**3. No gradients, no glows, no emojis, no icons. Flat only.**
*"Use a strict color palette, flat colors only, and absolutely zero gradient or glowing effects. There will be no emojis, no generic icons… keep the typography uniform throughout. Use professional human-crafted fonts."*
→ One typeface (Archivo). One animation (`sce-rise`).

**4. The draft must feel strong and long.**
*"make the draft a little bit longer"*; *"it should rope you in then push the car ahead when you get there"*; *"the more cars you have in a chain will go a lot faster"*; *"If you have a three-car chain, you should be able to catch them"*; *"Everyone should want to push to get to the front"*; *"The field should be closer together."*

## Specific instructions, all implemented

- Site must be formed properly for the window size (responsive, no overflow).
- The rear-view mirror must be **longer on its X axis**, and its textures must look right.
- **No floating banner above the cars.** No orange/blue boxes around cars.
- AI drivers must have **human names** like "Dave Johnson", not words.
- Hired/high-end drivers must appear in the standings when they race.
- Starting position must be correct (it used to always say P3).
- The Top-10 results must never contain duplicate positions.
- Car **numbers must be editable per car**.
- The hire modal must appear **centred**, not at the bottom of the page.
- Show an **error if you try to hire with no car**.
- A car that already has a driver must **not** appear as a race-selection option.
- If a car has no driver, that is fine — it just is not entered. Only error if nothing can race.
- Dashboard's 5th stat must read **"Next Race"**.
- **Winning must give a much bigger reputation boost.**
- Your drivers must **improve skill throughout the season**.
- **Sponsor pay doubles as you add cars.**
- Four difficulties: **Beginner, Amateur, Semi-Pro, Pro**, selectable before a quick race and in career.
- **Races cannot be skipped** — simulate only.
- A **save reminder** in the career lobby.
- Add a **Data Analyst** job: boosts qualifying position and brings more upgrades.
- **Bigger championship celebration.**
- **Payouts for all finished drivers**, with a big champion payout.
- Quick-race options should be **league names**.
- AI should be **more sensible on Semi-Pro and Pro** — block or push when falling back, but **not overly aggressive**; team-mates were too aggressive on Pro.
- **Bigger season purse for higher series.**
- **Up to seven sponsors** via a new role with a special name (→ Commercial Director).
- HUD must say **"DRAFT"**, not "SLIPSTREAM".
- Add a **Settings** tab; move difficulty there.
- **Career tab should be statistics only** — previous season, all-time wins, wins this season.
- Difficulty is chosen **during new-career setup, after the names**.
- The Settings difficulty card should be **bigger with less empty space**, with **no new-career option**, but **keep autosave**.
- Rename the Career "Standing" label to a different word.
- Add a **donate-to-charity** option in Market that increases reputation.
- **Remove the percentages** from difficulty.
- **Remove the Premier Cup Series three-option career choice.**
- **Max 4 cars, max 4 drivers.**
- **Simulated results must show your driver's name, not the car's name** — same for team-mates.

## Working-style preferences observed

- The user asks for verification **before** building: *"Before you build, you need to make sure everything's correct."*
- The user reports bugs from real play sessions with concrete detail. Reproduce first, then fix.
- Multiple requests arrive in one message; all parts are expected to be completed.

---

# 8. CURRENT PROBLEMS

## Known bugs
**FACT: no user-reported bug is currently outstanding.** Every reported issue was reproduced, fixed, verified and pushed. The last verification run confirmed: a player finishing 20th on track is classified 20th and the HUD reads 20; the 4-car/4-driver caps hold; the Premier choice is gone; no responsive overflow; zero console errors.

## Environment limitation (not a code bug)
**Three.js cannot load in the sandboxed dev container.** `cdnjs.cloudflare.com` is blocked, so opening the game there leaves `THREE` undefined and the 3D race cannot start. This is a *network policy*, not a defect. On a normal machine it works. **Do not "fix" this by vendoring or changing the CDN without asking** — see §12.

## Technical debt

**Dead code that should be removed deliberately, not accidentally:**
- `showPremierChoiceModal()`, `selectCareerChoice()`, `confirmCareerChoice()`, `selectedCareerPath` in `main.js`
- `renderPremierChoiceModal()` in `ui.js`
- `chooseCareerPath()` in `game.js`
- `startRacePlayback()`, `scheduleNextEvent()`, `showNextEvent()`, `setPhaseLabel()`, `finishRacePlayback()`, `handleRaceSkipToEnd()`, `handleRaceSpeed()` in `main.js`
- `icon` emoji fields on `STAFF_TYPES` and `SPONSOR_DEALS` (unrendered, but they contradict the no-emoji rule if anyone ever prints them)

**Structural debt:**
- **No modules.** Everything is global. Adding a `const` that collides with an existing global will break the app silently at load.
- **`renderTab()` uses `innerHTML` with interpolated game data.** Team names, driver names and car names are user-supplied and are **not escaped**. This is a self-XSS vector only (single-player, local storage, no server), so it is low severity — but if any sharing, import/export or multiplayer feature is added, **this becomes a real vulnerability and must be fixed first.**
- The nav tab id is `carstats` but the tab is called **Career**.
- `race3d.js` is 1800 lines in one class with a very large constants object.
- `data.js` calls `clamp()` from `game.js`, an implicit cross-file dependency that only works because of script order.
- **No `.gitignore`, no `README`, no `package.json`, no linter config, no CI.**

## Unfinished work
- **The automated test harness is gone and was never committed.** This is the biggest gap. Rebuilding it is described in §10.
- Nothing else is mid-flight. The working tree is clean.

## Things I remain uncertain about
- **Why Three.js is pinned to r134.** That decision predates my work and I never learned the reason.
- **Real-browser 3D behaviour.** Every 3D test ran against my stub. The physics, AI, HUD and result-merge logic are genuinely exercised, but **visual fidelity, shader/material behaviour, mirror rendering and actual frame pacing have not been verified against real Three.js r134 in a real browser.** This is the most important thing to check first on a machine with internet access.

---

# 9. MOST RECENT WORK

## What was done last

The final request was: *"Also make it so when you sim a race, the results have your name not car car name. and the same for teamates."*

**FACT — the problem:** in `js/race.js`, `buildEntryList()` built the player's simulated entry from the **car's** name:

```js
displayName: `${game.teamName} / ${car.name}`,     // BEFORE — showed "Thunder Valley / Old Betsy"
```

and the hired-mode entry used a bare literal `'You'`.

**FACT — the fix (both lines changed):**

```js
// player entry
displayName: `${game.teamName} / ${game.driverName || 'You'}`,
// hired mode
displayName: `${aiTeam.name} / ${game.driverName || 'You'}`,
```

Team-mate entries already used `${drv.name}` (the hired driver's real name) and were correctly left alone.

**FACT — verification:** a Playwright script drove a career and read the result objects directly:
- `playerDisplayName: "Thunder Valley / Dave Johnson"` (previously would have been the car name)
- `teammateDisplayNames: ["Thunder Valley / Maria Santos", "Thunder Valley / Jake Rivers", "Thunder Valley / Dave Johnson"]`

One check initially flagged a car name still appearing in results. **It was a false positive** — the string "Rocket" matched the hireable driver `Dave "Rocket" Morrison`, not a car name. `grep -n "car.name" js/race.js` returns nothing, confirming no car names are used in that file.

A full regression pass followed and was clean.

**Committed as `ca0245c`** and pushed to `claude/stock-car-empire-game-JjCMm`.

## Where we left off
Working tree clean. Nothing in progress. No outstanding user request.

## Next logical steps (my recommendation, in order)

1. **Verify the game in a real browser with real Three.js r134.** Everything 3D has only been validated against a stub. This is the highest-value unknown.
2. **Rebuild and commit a test harness** (§10) so future changes to the result-merge and AI code are guarded. Commit it this time.
3. **Remove the dead code** listed in §8 in one clearly-labelled commit.
4. **Add a `README.md` and a `.gitignore`.**
5. Only then consider new features.

---

# 10. SETUP AND RUN INSTRUCTIONS

## Install dependencies
**There are none.** No `package.json`, no `npm install`. The only runtime dependency is Three.js, loaded from a CDN at page load.

## Configure the project
**No configuration required.**

## Environment variables
**The application requires ZERO environment variables and contains no secrets, API keys, tokens or credentials.**

Two variables matter only to the *test tooling*, and only if you use Playwright in a preconfigured container:
- **`PLAYWRIGHT_BROWSERS_PATH`** — where Playwright finds a pre-installed Chromium (set to `/opt/pw-browsers` in the dev container). Prevents re-downloading a browser.
- **`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD`** — set to `1` to stop npm postinstall from fetching browsers.

Also relevant in restricted networks: **`HTTPS_PROXY`** is preconfigured for outbound HTTPS in the dev container. **Never unset it and never disable TLS verification.**

## Run it locally

Simplest:
```bash
cd stockcarempire
npx http-server -p 8080 -c-1
# then open http://localhost:8080
```

Opening `index.html` directly via `file://` **ASSUMPTION:** will mostly work since there are no `fetch` calls or ES modules, but serving over HTTP is safer and is what was used throughout.

**You need working internet access for `cdnjs.cloudflare.com`**, or the 3D race will not start. Everything else (all management screens, Simulate Race, saves) works without it.

## Build it
**There is no build step.** The files as committed are the deployable artifact.

## Test it

**There is currently no committed test suite.** Here is how to rebuild what existed:

**Manual smoke test (5 minutes):**
1. Serve the game, open it, confirm no console errors.
2. New Career → enter names → **Continue** → pick a difficulty → **Begin Career**.
3. Visit all 8 tabs. Confirm no horizontal scrollbar at 1280px, 1024px and 768px widths.
4. Buy cars up to the cap; confirm the **5th purchase is refused**. Same for a 5th hired driver.
5. Race Weekend → **Simulate Race**. Confirm the results table shows your **driver's name**, that positions 1..N are unique with **no duplicates**, and that DNFs sit at the back.
6. Race Weekend → **Race** (needs Three.js). Confirm the countdown, chase cam, rear-view mirror, the **DRAFT** meter, and that the HUD position matches reality. Finish and confirm the results table agrees with what you saw.
7. Save to a slot, reload the page, load the slot, confirm state restores.

**Automated harness (needs rebuilding — commit it this time):**
The approach that worked:
- Use Playwright (`playwright@1.56.1` was available globally) with the pre-installed Chromium.
- **Intercept the Three.js CDN request** with `page.route('**/three.min.js', ...)` and fulfil it with a local **THREE stub** so `race3d.js` constructs and runs headlessly. Stub only what `race3d.js` actually touches (`Scene`, `PerspectiveCamera`, `WebGLRenderer`, `WebGLRenderTarget`, `Mesh`, `Group`, `Object3D`, `Vector2/3`, `Euler`, `Color`, `BoxGeometry`, `PlaneGeometry`, `CylinderGeometry`, the mesh materials, `CanvasTexture`, the lights, `Fog`, `MathUtils`). Grep `race3d.js` for `THREE.` to get the exact list.
- Drive the real DOM: click `#btn-start-new`, fill `#inp-team-name` / `#inp-driver-name` / `#inp-car-name`, click **`#btn-create-team`**, then **`#btn-begin-career`** (⚠️ **both clicks are required** — the second step was added late and silently broke three earlier scripts).
- Reach into `window._r3d` to read engine state, and call `window._r3d.finalOrder()` to assert on the on-track order.
- Assert that the classified result matches the on-track order — e.g. stage a player finishing 20th and assert both `playerTrackPos === 20` and `playerResultPos === 20`.
- ⚠️ **Run race tests 5–8 times.** The simulation is stochastic; one bug appeared in only 1 of 5 runs.
- ⚠️ **Do not stage DNF'd cars into top-3 track slots** in test fixtures — a test failed that way and it was the test that was wrong, not the game.

## Deploy it
**ASSUMPTION** (no deployment config exists to confirm against): copy `index.html`, `style.css` and `js/` to any static host. No build, no server-side runtime, no environment configuration. For GitHub Pages, enable Pages on the branch and serve from the repository root.

---

# 11. EXTERNAL RESOURCES

## URLs and third-party services
- **Repository:** https://github.com/hs4ndy/stockcarempire
- **Three.js r134 (CDN, required at runtime):**
  `https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js`
- **Google Fonts — Archivo (weights 400, 500, 600, 700, 800):**
  `https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&display=swap`
  with `preconnect` hints to `https://fonts.googleapis.com` and `https://fonts.gstatic.com`.

**These three URLs are the project's complete set of external dependencies.**

## Fonts
- **Archivo** (Google Fonts) — the single typeface for the entire product.
- Fallback stack: `'Helvetica Neue', Arial, system-ui, sans-serif`.

## Assets and images
**None.** There are no image, audio, video or model files anywhere in the project. Every texture used in the 3D race — asphalt, grass, crowd, fence, wall advertising, banners, and the numbered door roundels — is **drawn procedurally onto a `<canvas>` at runtime** by the `r3d*Tex()` helpers in `race3d.js`.

## Documentation
No project documentation exists beyond this handoff. For Three.js r134, use the versioned docs — the current docs describe APIs that changed after r134.

## Accounts and integrations
- **GitHub:** `hs4ndy/stockcarempire`, working branch `claude/stock-car-empire-game-JjCMm`.
- No other accounts, no OAuth, no API keys, no billing, no analytics.

**There are no secrets in this project of any kind.**

---

# 12. AGENT HANDOFF — read this first, Codex

## What to understand before editing anything

**1. This is a zero-build, global-scope, vanilla-JS app.** There is no bundler and no module system. Every top-level `const`, `let`, `function` and `class` in `js/*.js` shares one global namespace, and script order in `index.html` is load-bearing. Introducing a name that already exists elsewhere will break the app at load with no warning. Before adding a global, grep for it.

**2. Two areas of this codebase are disproportionately fragile.** Both caused bugs the user reported repeatedly and angrily:

- **The race-result merge path** — `reRankWithTeamOrder()` in `race.js`, `_checkFinish()` and `finalOrder()` in `race3d.js`, and the `launch3DRace` completion callback in `main.js`. Read the inline comments there; each one documents a specific bug and why the current shape is what it is.
- **The AI motion model** — `_updateAI()`, `_scoreLane()` and `_separateCars()` in `race3d.js`. Smoothness was the user's most emphasised requirement across the whole project.

**3. The visual design is a specification, not a preference.** Flat colours, a strict palette, zero gradients, zero glows, zero shadows, no emojis, no icons, one typeface (Archivo), one animation (`sce-rise`). Do not introduce a shadow "for depth" or an icon "for clarity".

## What to inspect first

In this order:

1. **`js/race.js` → `reRankWithTeamOrder()`** — the heart of result correctness.
2. **`js/main.js` → the `launch3DRace` completion callback**, specifically `const teamOrder = trackOrder || [];`. This single line, when it read `trackOrder.filter(o => o.carId)`, produced the worst bug of the project.
3. **`js/race3d.js` → the `R3D` constants object** (lines 1–90) — every tuning value in one place.
4. **`js/race3d.js` → `_updateAI()`, `_scoreLane()`, `_separateCars()`** — the smoothness model.
5. **`js/game.js` → `saveGame()`** — understand why it no-ops without a bound slot before touching persistence.
6. **`style.css` → the `:root` token block and the `sce-rise` animation** — and the note about `--green`/`--red`/`--gold` being referenced from JS.

## What NOT to change without a specific reason

- **Do not upgrade Three.js from r134.** `race3d.js` was written against it, and colour management, render-target semantics and geometry conventions all changed in later releases. If you must upgrade, do it as an isolated change and verify the mirror, the materials and the lighting visually.
- **Do not filter `trackOrder`** in the race-completion callback.
- **Do not re-sort final results by `perfScore`** in `simulateRace()`.
- **Do not resolve car contact by setting positions directly.** Keep the impulse + rate-limited separation model.
- **Do not move modals back under `#main-content`.** They must be appended to `document.body`.
- **Do not restore auto-save to slot 0.**
- **Do not rename the `--green`, `--red`, `--gold` CSS variables.**
- **Do not reintroduce anchoring the player's team as a contiguous block** in the result merge.
- **Do not "fix" the blocked CDN** by vendoring Three.js or switching hosts unless the user asks — it works fine outside the sandbox, and changing it changes the deployment story.
- **Do not remove `_pushLocked` clearing from the start of `_separateCars()`.**

## Highest-priority next task

**Verify the game in a real browser with real Three.js r134.**

Every piece of 3D validation to date ran against a hand-written THREE stub, because the CDN was blocked in the development sandbox. The physics, AI, HUD arithmetic and result-merge logic were genuinely exercised — but **rendering was not**. Specifically, confirm:
- The scene renders and materials/lighting look correct.
- The rear-view mirror renders right-way-round with no reversed winding and no fisheye.
- Frame pacing is acceptable with a full 36-car Premier Cup Series field.
- The HUD position readout matches the visible on-track position for the whole race.
- The results table after a real 3D race matches what you saw.

**Second priority:** rebuild and **commit** an automated test harness (§10), so this class of regression is caught automatically. It was lost once already because it lived in `/tmp`.

## Where to verify my reconstruction rather than trust it

I read every file at commit `ca0245c` before writing this, so the structural claims are grounded. These specific points are where I am **least** confident:

- **Everything still marked ASSUMPTION in §2 and §10** — specifically the deployment story and whether `file://` loading works. No deployment configuration exists in the repository, so I had nothing to check those against, and I did not test them.
- **`HANDOFF_SOURCE.md`** is a mechanical snapshot at `ca0245c`. If the repository has moved on, **the real files are authoritative** and the snapshot is stale. Prefer reading `js/*.js` directly.
- **The deployment section** is inference. No deployment configuration exists in the repository to confirm it against.
- **My line-count and line-number references** are accurate as of `ca0245c` and will drift as soon as anyone edits.
- **The exact contents of the deleted test scripts.** I deliberately did not reconstruct them from memory; §10 describes the approach instead. Treat any harness you build as new work, not as a restoration.

## One last thing

The user reports bugs from real play sessions, with concrete specifics ("I got 20th, but it says I got third"). When that happens, **reproduce the bug before fixing it.** Every position bug in this project was fixed correctly only after it was reproduced first, and at least one earlier "fix" addressed a cause that turned out not to be the real one. The race simulation is stochastic — run any race-related check **5 to 8 times** before concluding it passes.

---

END OF CLAUDE → CODEX PROJECT HANDOFF
