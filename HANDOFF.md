# Stock Car Empire: Codex handoff

Updated 2026-10-08. This session replaces the phase 0.90 interface with a full FC25/26-inspired redesign; parent baseline is `5af567fb24a904655aee9b236d85de1aeb97defd`. Actual repository files are authoritative; user requirements describe intent, not necessarily implemented behavior.

## Status and working rules

- Repository: https://github.com/hs4ndy/stockcarempire. Workspace: `C:\Users\harri\OneDrive\Desktop\stockcarempire`.
- Active/pushed branch: `claude/stock-car-empire-game-JjCMm`. Keep it unless instructed otherwise; do not assume `main` or `origin/HEAD`.
- User prefers a professional personal-agent tone, addressed as sir. State uncertainty and distinguish verified facts from inference. Reproduce reported bugs before fixing them. Work at the pace needed for quality; accelerate only when specifically requested.
- Standing request: immediately push finished, verified work **as Codex**. Use `git -c user.name=Codex -c user.email=noreply@openai.com commit -m "..."`, then `git push origin claude/stock-car-empire-game-JjCMm`. Check the remote tip first; never force-push by default. Recent commits use this identity and the latest application commit passed Vercel.
- Preserve user-owned local changes: modified `assets/cars/empire-sc01.blend`, untracked `assets/cars/empire-sc01.blend1`, and untracked `releases/Stock-Car-Empire-local - Copy.zip`. Do not overwrite or stage these casually. Stage explicit task files, not everything.
- Current task: full app redesign, including in-race UI, retaining the red brand accent. User confirmed direct implementation in code and no excluded screens. Preserve gameplay and save behavior. After this task is finished, wait for feedback.

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

### Follow-up after the approved redesign

Quick Race now requires a series selection followed by explicit confirmation. Confirm Race uses the shared red primary large button and spans the modal footer's content width, staying visible while the setup body scrolls. Selected series use the same off-white surface and dark text as difficulty selections; the previous dark-text-on-dark-card defect is fixed. Difficulty keeps its existing default and only one option per group is selected. Intro footer labels were removed. Source desktop/mobile/landscape interaction checks passed; the rebuilt offline release passed those three checks plus a real playable race launch. JavaScript syntax checks and all 45 Node regressions passed. `test/e2e/quick-race.spec.cjs` covers confirmation gating, exclusive selection, chosen launch settings, keyboard confirmation, responsive sizing, readability, and reset on reopen. Existing browser race-start helpers no longer click the same series twice. Local HTTP access timed out in this session, so browser verification used local HTML files (`STOCKCAR_TEST_FILE`) with bundled Three.js.

User requested removal of the header's team, cash, series, race, and season fields, plus all track type/length labels. Header now contains only branding and actions. Dashboard, Schedule, and Race Weekend no longer show fictional track type, mileage, or lap counts. Simulation speed/handling weights remain available as car setup information because they affect simulated results; gameplay/data are unchanged.

Team Management now has Drivers/Support Staff view controls, a roster beside a single recruitment list, aligned signing fees/salaries/actions, responsive stacking, and a contextual available-cash value. The player's assigned car appears in the roster. Hired-driver development is disclosed on demand. All hiring/release functions are retained; unavailable car seats, the driver cap, staff caps, and insufficient funds have disabled controls. View switching changes UI state only, never saves or career state.

Career follows the user's annotated image: one Championship Finish value replaces Finish plus YES/Title (explicitly confirmed); the redundant Seasons metric is removed from Last Season; Purse and Prize Money are labeled Cash Earned; Season Purses Won is labeled Total Cash Earned. **Amounts/calculations are unchanged:** Last Season and All Time use recorded season-award payouts; This Season uses recorded player race earnings. Existing history does not store all past race earnings, so the All Time value is not a reconstructed total of every historic cash inflow.

Three browser cases cover Team view-state invariance, actual driver/staff hiring and release, prerequisites/insufficient-cash states, and populated Career at desktop/728px/375px. The full browser suite includes these cases and the updated header/disclosure expectations. Follow-up evidence is `team-refinement-*-<desktop|user|mobile>.png` in the ignored review folder. Follow-up screenshots supersede prior Team and Career evidence.

Follow-up validation: syntax checks and all 45 Node tests passed. The full 52-case browser run passed 51 and exposed one mobile overflow with a 40-character unbroken team name. Page-header context now wraps within its container; the old phone rule hiding branding is removed. Recruitment height adapts to the desktop viewport and uses 500px on stacked layouts. Final confirmation: **11 browser cases passed** (all five career widths, offline file, all three Team fixtures, and both long-name/save/keyboard cases). The desktop recruitment panel is asserted inside the first viewport. Offline ZIP/HTML SHA-256 hashes match. No gameplay, economy, race renderer, or save-format changes.

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

October 8 replaces that earlier visual baseline throughout the app. Research used EA's official FC25/26 career deep dives. The user chose red and direct code implementation. Impeccable's independent full review requested seven material fixes; its final verdict scored all seven **resolved**, disposition **ship** at the scope of those fixes. Evidence includes 177 captures across five career widths (1440, 1024, 768, user's 728, 375) plus portrait/landscape racing, populated fixtures, every tutorial step, practice/finish, and dialog/result variants. Captures and detector output are local ignored evidence under `.impeccable/review/`.

### UI decisions

FC25/26-inspired sports career hub: charcoal/graphite surfaces, locally bundled Barlow/Barlow Condensed, white active selections, red primary actions, restrained semantic colors, rounded 8px surfaces and 6px controls. The old red panel rails and miniature labels were removed. Diagonal main-menu lines remain, with the existing Gen-7 car render alongside the menu. No gradients, decorative icons/emoji, em dashes, or excessive animation.

Earlier phase numbering is historical; the current user authorized a complete visual replacement. `PRODUCT.md` records confirmed product truths and `.impeccable/surfaces/index-html.md` records the chosen direction. The final design system is documented in `DESIGN.md` and `.impeccable/design.json`. Future refinements must preserve that system unless another redesign is requested.

The Team screen now puts owned drivers/staff above two recruitment panels with bounded, keyboard-focusable scrolling lists. All candidates remain available. The desktop Career strip uses five columns, mobile uses two. Settings includes the New Career action because that header action is hidden on small screens. This retains its existing destructive behavior and warning. Navigation now exposes `aria-current`, with a keyboard skip link to main content.

Race HUD colors, typography, rounding, spacing, pause and finish surfaces use the shared system. Mirror render-target sizing, viewport/DPR logic, cameras, physics and race logic were not changed.

Dashboard DOM order: Next Race/Season Complete, Standings, Finances, Garage. Tutorial depends on `.cmd-strip`, `.dashboard-grid .card:first-child`, and `.dashboard-grid .card:nth-child(3)`; preserve these or update tutorial/tests together. Native `<details>` retains budgets, history, car specifications/customization, and other secondary content.

The dashboard now previews the top three standings and links to the full field. Race entry stays near costs, inside the first viewport at all five tested widths. Running-order labels and practice instructions use Barlow body, with condensed display reserved for major HUD numbers/headings. The mirror caption sits below its unchanged renderer wrapper. Draft/progress fills use `scaleX`, avoiding width animations. Recruitment count/cues persist above each scroller, and internal tab changes scroll the selected tab into view.

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
pnpm install --frozen-lockfile
npm run check
npm test
npm run test:browser
# All checks: npm run test:all
node test/static-server.cjs
# App: http://127.0.0.1:4174
```

Playwright automatically starts/reuses the static server, uses one worker, and retains failure traces/screenshots under ignored `test-results/`. Relevant specs include `racing-feel`, `bumper-camera`, `race-balance`, `stock-car-model`, `track-model`, `grassroots`, `grandstands`, `tutorial`, `menu-clarity`, `ui-polish`, `dashboard-layout`, and `standalone`. Repeat race/bumper tests for race changes: prior failures were intermittent.

October 7 completed checks: syntax checks and **45 Node tests passed** after payroll; **11 targeted browser checks passed** after final dashboard cleanup, covering flat/no-icons/no-gradients, 1440/1024/768/375 layouts, panel edges, long names/full garage, disclosures/keyboard, season-end controls, menu actions, mobile tutorial navigation/save-restart, and offline launch. The full browser suite was not rerun in that cleanup. This documentation task verified files/history, not another full test run.

October 8: syntax and **45 Node tests passed** after the final HUD changes. The complete 49-test browser run passed 48 and identified a direct-source `file://` font CORS regression. Fonts now ship as local embedded `assets/fonts/fonts.css`; the failed direct-file grandstand check passed on rerun. After the review fixes, 32 targeted UI/race/tutorial/offline tests passed; a separate mobile tab assertion rejected a harmless 0.47px boundary rounding, so it now allows 1px and tabs also have 16px scroll margins. The final 9-test redesign/offline capture run passed, including all five career widths and all three race sizes. No known test failure remains; the entire 49-test suite was not repeated after the final visual fixes.

Font source TTFs and OFL licenses live in `assets/fonts/`; `node tools/build_fonts.cjs` regenerates the data-URL stylesheet. This keeps HTTP, raw source file launches, and standalone typography consistent. The intro render's PNG pixels are unchanged; only provenance metadata was added. The standalone builder publishes through an atomic rename, preventing interrupted writes from truncating the output.

Keep offline artifacts synchronized after source changes:

```powershell
node tools/build_standalone.cjs
Compress-Archive -LiteralPath 'releases/Stock-Car-Empire.html' -DestinationPath 'releases/Stock-Car-Empire-local.zip' -Force
```

Builder embeds CSS/scripts/Three.js/runtime asset bundles plus local fonts and the intro PNG. Online and offline versions retain the same typography and imagery without font-network requests. Rebuild both release files after source changes; do not overwrite the user's untracked ZIP copy.

Before the October 8 redesign commit, remote tip was verified at `5af567f`. Historical October 7 application baseline `6eb9b65` had a successful Vercel check: https://vercel.com/hs4ndys-projects/stockcarempire/123rCq9bosbz92TpunyQgpL4CGpJ. Do not treat that as deployment evidence for the redesign. Production-domain routing, project settings, and environment configuration were not independently inspected. No `vercel.json` is present. A passing commit check does not alone prove which revision a particular production URL serves.

## Roadmap / next steps

1. Wait for the user's selected task; inspect current source and reproduce before editing. For apparently stale deployments, compare GitHub SHA, Vercel deployment SHA/status, and production alias before repushing.
2. Proposed maintenance: autosave error propagation and partial saves; discuss preserving bound saves when starting a career. Identified follow-ups, not authorized implementations here.
3. User-requested future features: **Normal/Advanced/Hardcore career difficulty**, independent of racing difficulty; random choice-driven career/life events affecting reputation, team availability, morale/driving, and relationships. Specific effects/balance still need planning.
4. Tutorial is delivered. The October 8 full redesign supersedes the old phase 0.90 styling. Product and design documentation are now part of the redesign deliverable. Await user visual feedback after verified delivery.
5. Racing/asset refinements can follow feedback while retaining the straight sprint and speed sensation. Oval/road-course geometry, multiplayer/cloud saves, live fuel/pit strategy, and achievements are gaps, not authorized immediate tasks.

This replaces the obsolete September 5 Claude handoff. `HANDOFF_SOURCE.md` remains the historical `ca0245c` snapshot, not current source. Git preserves the old handoff. Its claims about missing tooling/tests/assets, stub-only rendering, fonts, deployment uncertainty, and tutorial absence are stale.
