# Stock Car Empire: Codex handoff

Updated 2026-10-07. Application baseline: `6eb9b656cdc7382853ca02b5912e52bca580d815`, before this documentation update. Verified against source, recent history, the remote branch tip, and GitHub commit status. Actual repository files are authoritative; user requirements describe intent, not necessarily implemented behavior.

## Status and working rules

- Repository: https://github.com/hs4ndy/stockcarempire. Workspace: `C:\Users\harri\OneDrive\Desktop\stockcarempire`.
- Active/pushed branch: `claude/stock-car-empire-game-JjCMm`. Keep it unless instructed otherwise; do not assume `main` or `origin/HEAD`.
- User prefers a professional personal-agent tone, addressed as sir. State uncertainty and distinguish verified facts from inference. Reproduce reported bugs before fixing them.
- Standing request: immediately push finished, verified work **as Codex**. Use `git -c user.name=Codex -c user.email=noreply@openai.com commit -m "..."`, then `git push origin claude/stock-car-empire-game-JjCMm`. Check the remote tip first; never force-push by default. Recent commits use this identity and the latest application commit passed Vercel.
- Preserve user-owned local changes: modified `assets/cars/empire-sc01.blend`, untracked `assets/cars/empire-sc01.blend1`, and untracked `releases/Stock-Car-Empire-local - Copy.zip`. Do not overwrite or stage these casually. Stage explicit task files, not everything.
- No implementation task is active after this handoff. Wait for the user's next selection.

## Architecture and source map

Browser-only stock-car management game with playable 3D racing, across Grassroots Cup, Challenger Series, and Premier Cup Series. New careers start with $50,000 and one car. Features include upgrades, hired staff/drivers, sponsors, loans, reputation, standings, and promotion/relegation.

Vanilla HTML/CSS/JavaScript, shared globals, and string-rendered UI. No React, bundler, backend, account system, or cloud saves. Three.js r134 is pinned; do not casually upgrade its rendering/color/viewport behavior.

- `index.html`: screens, shell, and load order. Three.js CDN, then `data.js`, `game.js`, `race.js`, runtime asset scripts, `race3d.js`, `ui.js`, `tutorial.js`, and finally `main.js`. Preserve dependency order.
- `js/data.js`: series/tracks/difficulty/economy data. `js/game.js`: state, saves, economy, standings, career progression.
- `js/race.js`: statistical simulation and on-track result reconciliation. `js/race3d.js`: renderer, fixed-step physics, drafting, AI, finish logic, HUD, cameras.
- `js/ui.js`: management views; `js/main.js`: handlers/flow; `js/tutorial.js`: career tour and isolated practice; `style.css`: shared visual system.
- `assets/`: Blender sources, GLBs, renders, generated JS geometry/textures. Runtime loads the JS, not Blender/GLBs. Read asset READMEs and authoring scripts in `tools/` before rebuilding.
- Persistence: five browser/origin-local slots `sce_slot_0` through `sce_slot_4`, plus `sce_meta`. No automatic load. Runtime requires no environment variables; `STOCKCAR_BASE_URL` is only an optional test override.
- References: `docs/interface-terms.md`, `docs/racing-tuning.md`, `test/RACE_BALANCE.md`. Current code supersedes older tuning numbers.

## Completed work this session

| Commit | Delivered |
| --- | --- |
| `cdb4afe` | Optional new-career tutorial and disposable practice sprint. |
| `2ede569` | Clear action labels and native expandable supporting details across career menus. |
| `465f08f` | Contrast, keyboard difficulty choices, retained focus, mobile targets, long-name/save layouts. |
| `f92a0c7` | Four focused dashboard cards; results/history disclosed on demand; redundant metrics/nav numbers removed. |
| `532c0ef` | Clear signing costs, sponsor conditions, per-car fees, save/load/delete warnings; explicit failed saves no longer claim success. |
| `f38c089` | Completed and legacy skipped events deduct `weeklyExpenses()`: staff plus all hired drivers, once per event. Signing fees/rates unchanged; nine payroll regressions added. |
| `6eb9b65` | Aligned dashboard row edges/heights, common footers, simplified larger race title, paired fee/prize figures near entry action, separate driver/team lines, coherent tablet metrics and mobile layout. |

UI passes applied the user's image references: essential decisions first, supporting information on demand, meaningful spacing, and human-readable actions. Impeccable and UI/UX Pro Max guided refinement, with existing styling taking precedence over generic recommendations. The user approved the cleaned-up dashboard. No gameplay changes were included in its layout cleanup.

### UI decisions

FC26-inspired, not a replica: dark flat neutral panels, Barlow/Barlow Condensed, red accent rails, white type, restrained semantic green/gold/red. Retain approved diagonal main-menu lines. No gradients, decorative icons/emoji, em dashes, or excessive animation.

Rollout began with phases 0.5 and 0.75; committed CSS now identifies **phase 0.90**. Full phases 1-3 remain future scope without settled implementation specifications; do not invent them or claim phase 1 is finished. Preserve current identity, content, and functionality in refinements. `PRODUCT.md` and `DESIGN.md` are absent; Impeccable init was offered, not performed.

Dashboard DOM order: Next Race/Season Complete, Standings, Finances, Garage. Tutorial depends on `.cmd-strip`, `.dashboard-grid .card:first-child`, and `.dashboard-grid .card:nth-child(3)`; preserve these or update tutorial/tests together. Native `<details>` retains budgets, history, car specifications/customization, and other secondary content.

### Tutorial

Offered after a new career completes both setup stages: `#btn-create-team`, then `#btn-begin-career`. Start/Skip exist only at the initial prompt; after starting, Next/Back work but there is no skip. Twelve concise steps cover the career interface, difficulty, drive versus simulate, and practice. No purchases or career-changing actions are required.

Saved per career as offered/in-progress/skipped/completed. Older careers without tutorial state get no offer. Loading in-progress restarts at step zero; completion/skip prevents another offer. Save remains available, but persistence requires selecting a slot.

Practice is a disposable 3,500-unit sprint (`finishDistance`), power 0.60, returning to the tutorial without changing finances, standings, car condition, or schedule. Normal distance stays 15,000 units; optional distance defaults to that existing value. No lap-based geometry was introduced.

### Earlier racing/assets now retained

- Straight auto-throttle sprint, A/D steering, S braking. User wants fast arcade sensation and responsive turning, not arbitrary actual-speed increases. Current base/cap are 210/270, lateral acceleration/max 60/17; series modifiers also apply. HUD always says **Draft**, with a variable live meter.
- Smoothed distance/alignment-based draft and push, carried passing momentum, diminishing train benefit, 120 Hz fixed-step physics, bounded contact separation, AI committed passes, and teammates cooperating in the pack but competing near the front/finish. These are game approximations, not real aero simulation.
- Camera height/angle and mirror were revised earlier. Bumper clipping fix excludes the player and cars more than half a car length ahead during the mirror pass, then restores visibility/shadow state. Do not casually change camera/FOV, UV flip, DPR viewport treatment, or this filter.
- Fictional Gen-7/P3-inspired cars are integrated inside the 4.6 by 2.15 contact envelope. **Actual repo supersedes the original all-series Gen-7 intent:** Grassroots uses scaled legacy SC-01; Challenger/Premier use Gen-7. This later deliberate override is commit `3097c1d`.
- Track surface, walls, catch fence, finish, series grandstands, and exterior environment are already modeled/integrated. Grassroots has a narrower worn straight, plain concrete walls, and a 0.9 player/AI target-speed factor. Other series use the original 22-unit straight. Calendar track types still do not create playable oval/road-course layouts.

## Fragile areas and unresolved limitations

- **Result merging:** `const teamOrder = trackOrder || [];` in `main.js` intentionally carries the full field. Match stable entrant identities; do not filter to team cars or rewrite positional fallback casually. Simulation classification uses phase-derived positions, not qualifying/performance scores. Same-frame 3D finishers are sorted by traveled distance before crediting. Previous changes here corrupted teammate/player positions.
- **Saves:** `saveGame()` intentionally does not write before the user chooses a slot, preventing silent slot-0 overwrite. Explicit `handleSaveToSlot()` now retains the dialog, restores previous binding, and reports an error on failure.
- **Still unresolved, verified in code:** autosave `saveGame()` returns true after calling `saveToSlot()` even when the write fails. Save JSON and metadata are separate writes; a reported failure does not guarantee nothing was written. The explicit-save fix did not solve these limitations.
- **Existing destructive behavior:** header New Career calls `deleteSave()`, deleting the bound slot before reload. Its warning explicitly says so. Reconsider only with user approval. Saving to an occupied slot replaces it.
- `skipRace()` exists and now charges full payroll, but official skipping is intentionally unavailable in the UI. All contracted drivers receive wages even if they do not race. Four-week signing fees are separate upfront charges, not prepaid wages.
- Quick Race is still an exhibition with fixed player power 0.60 and no career/save effects. `game.achievements` is initialized but never written to. Independent career difficulties and interactive life events are unimplemented.
- Racing is keyboard-driven; no touch-driving handlers were found. Real hardware frame pacing and subjective handling need human review; browser tests are not an FPS guarantee.
- No user-reported bug remains open from the payroll/dashboard requests. This does not mean every path has been exhaustively verified.

## Verification, releases, deployment

Tests are now committed. The lost historical `/tmp` THREE-stub harness is obsolete as a validation strategy. Browser tests use actual Chromium/WebGL and route the CDN to the identical installed Three.js r134 build. Dependencies: `three` 0.134.0 and Playwright 1.56.1.

```powershell
npm ci
npm run check
npm test
npm run test:browser
# All checks: npm run test:all
node test/static-server.cjs
# App: http://127.0.0.1:4174
```

Playwright automatically starts/reuses the static server, uses one worker, and retains failure traces/screenshots under ignored `test-results/`. Relevant specs include `racing-feel`, `bumper-camera`, `race-balance`, `stock-car-model`, `track-model`, `grassroots`, `grandstands`, `tutorial`, `menu-clarity`, `ui-polish`, `dashboard-layout`, and `standalone`. Repeat race/bumper tests for race changes: prior failures were intermittent.

October 7 completed checks: syntax checks and **45 Node tests passed** after payroll; **11 targeted browser checks passed** after final dashboard cleanup, covering flat/no-icons/no-gradients, 1440/1024/768/375 layouts, panel edges, long names/full garage, disclosures/keyboard, season-end controls, menu actions, mobile tutorial navigation/save-restart, and offline launch. The full browser suite was not rerun in that cleanup. This documentation task verified files/history, not another full test run.

Keep offline artifacts synchronized after source changes:

```powershell
node tools/build_standalone.cjs
Compress-Archive -LiteralPath 'releases/Stock-Car-Empire.html' -DestinationPath 'releases/Stock-Car-Empire-local.zip' -Force
```

Builder embeds CSS/scripts/Three.js/runtime asset bundles, removes remote Google Fonts links, and uses system-font fallbacks offline. Both release files contain the latest payroll/dashboard changes; do not overwrite the user's untracked ZIP copy.

GitHub remote tip was verified at `6eb9b65`. Its **Vercel commit check is success**, verified October 7: https://vercel.com/hs4ndys-projects/stockcarempire/123rCq9bosbz92TpunyQgpL4CGpJ. This supersedes the earlier pending/unconfirmed report. Production-domain routing, project settings, and environment configuration were not independently inspected. No `vercel.json` is present. A passing commit check does not alone prove which revision a particular production URL serves.

## Roadmap / next steps

1. Wait for the user's selected task; inspect current source and reproduce before editing. For apparently stale deployments, compare GitHub SHA, Vercel deployment SHA/status, and production alias before repushing.
2. Proposed maintenance: autosave error propagation and partial saves; discuss preserving bound saves when starting a career. Identified follow-ups, not authorized implementations here.
3. User-requested future features: **Normal/Advanced/Hardcore career difficulty**, independent of racing difficulty; random choice-driven career/life events affecting reputation, team availability, morale/driving, and relationships. Specific effects/balance still need planning.
4. Tutorial is delivered, not an unstarted roadmap item. Later UI phases require fresh scope; current FC26-inspired flat direction is approved. Durable product/design documentation was offered separately.
5. Racing/asset refinements can follow feedback while retaining the straight sprint and speed sensation. Oval/road-course geometry, multiplayer/cloud saves, live fuel/pit strategy, and achievements are gaps, not authorized immediate tasks.

This replaces the obsolete September 5 Claude handoff. `HANDOFF_SOURCE.md` remains the historical `ca0245c` snapshot, not current source. Git preserves the old handoff. Its claims about missing tooling/tests/assets, stub-only rendering, fonts, deployment uncertainty, and tutorial absence are stale.
