# Post-race news (VERSION 97)

Results now lead to a Race News reading screen through Next. Career then returns to the dashboard; Quick Race returns to the main menu. Split-screen has one report per human, Player 1 first, with a shared finish photo. Practice remains unchanged.

## Copy library

`tools/build_news.cjs` contains the authored, fictional in-game journalism. `node tools/build_news.cjs` regenerates `js/news-data.js`, which ships without network/API calls. There are 270 distinct templates: 64 Grassroots, 82 Challenger, 124 Premier. Each series has seven winning articles and three for every other valid finishing position (20/26/40 cars). Non-winning stories combine position-specific context with three series-specific editorial treatments. The first paragraph differs for every template; editorial paragraphs and quotes recur within each series. This is a finite authored library, not live generative AI.

Reporters supplied by the user: Sophia Calabrese, Gavin Turnage, Michael Williams, Kenzie Wright. Reporters rotate, and a finishing-position variant does not repeat immediately within a page session. Fictional driver quotes are authored as part of the game narrative. No claim is made about undocumented passes, wreck causes, weather, laps led or race margins.

`js/news.js` snapshots the completed result and post-event championship position/points. It reads the next scheduled track after the race index advances. Quick Race makes no championship/economy claims. DNFs use an honest retirement report instead of celebratory position copy. Starting/finishing position and winner details are included when available. Dynamic text is escaped before HTML insertion.

## Finish camera

`Race3DEngine._checkFinish()` triggers one photo when the first car crosses the finish plane, following the same distance-sorted order used by classification. A trackside PerspectiveCamera looks upstream from just beyond the finish. One 1024x576 render-target pass is read back, flipped upright and encoded as JPEG. The temporary target is disposed; renderer target/viewport/scissor/autoclear/shadow state, car transforms and windowed track/grandstand pools are restored. Normal chase/mirror settings and frame budgets are unchanged.

The photo is independent of the player's location and HUD. It follows the existing center-crossing rule, not a new nose-detection or timing system. It records that physics step; it is not a replay or external photograph. The image is retained only in the transient report, then released on continuation. Nothing is added to the save schema or localStorage. Simulation has no rendered race and explicitly shows photo unavailable. Capture failure is also explicit and does not interrupt classification.

## Verification

Node coverage checks the complete template matrix, variant non-repetition, reporters, interpolation/escaping, DNF copy, final-event context, split-player context, and post-race standings snapshots without save mutation. Browser coverage is in `test/e2e/race-news.spec.cjs`: all three series, first-crossing photo retention after teardown, played Career classification/save, offline phone simulated final event, split reports, and injected readback failure. Existing finish/navigation tests now follow Next and news continuation.

October 31: syntax and all 89 Node regressions passed, with four article tests repeated after final copy edits. All 38 selected browser scenarios passed across scoped runs: the initial 38-case batch passed 34; old role-label/hiring fixtures and stale-loaded Quit assertions were corrected, the news/dual 8 cases passed on rerun, and the final two source/offline Career fixtures passed. This is targeted coverage, not a claim that the entire browser suite ran. The one-time photo render/readback measured approximately 218–312 ms in software-rendered Chromium; this is not physical Chromebook timing.

Independent Impeccable finish review: **ship**, no material fixes for this extension, based on desktop/mobile photo and simulated fallback captures plus source/library coverage. The documentation check found no new global tokens or approved system change; incumbent DESIGN.md and its sidecar remain unchanged. Pre-existing HUD opacity wording drift was recorded rather than repaired outside this task.

Human article/style approval and physical Chromebook finish-capture latency are not established by automated tests. Photo capture is a single synchronous readback at the leader's finish, so a brief one-time pause may vary by hardware. There is no per-frame screenshot work.
