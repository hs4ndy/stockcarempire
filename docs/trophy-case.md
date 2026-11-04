# Career Trophy Case

One persistent award per player Career race win and season championship. The Trophy Case tab sits between Career and Settings. Each award shows a shared model thumbnail, its year/race and a More disclosure. Selecting its image opens an orbitable, above-floor 3D view. Awards remain in the Hall of Fame when a career retires.

## Ownership and loading

- `js/trophies.js`: award ledger, identifiers and legacy recovery; load after data and before game.
- `js/game.js`: initializes/loads the ledger, awards wins during post-race processing and titles before season promotion, copies awards into retirement archives. Normal save-slot JSON persists the ledger.
- `js/main.js` / `launch3DRace` in `js/race3d.js`: pass the actual starting grid position into the completed Career result. The optional fifth completion argument contains race facts; existing arguments and physics are unchanged. Simulated wins are identified as simulated and have no invented start position.
- `assets/trophies/trophy-models.js` and `trophy-thumbnails.js`: generated embedded assets, before `js/trophy-case.js` and UI.
- `js/trophy-case.js`: bounded gallery, disclosures, archive gallery and disposable 3D inspection.
- `tools/build_trophies.py`: authoritative original Blender geometry. See the asset README for regeneration.

## Award facts

Race IDs are `win:year:series:race`; title IDs are `title:year:series`. Repeated processing does not duplicate awards. New Career race trophies are saved as pending, then offered in the 3D viewer after Race News. The compact claim window closes only through Claim Trophy. The award is applied immediately, and a saved career attempts to persist it. An interrupted claim reopens on loading the career. Existing awards and championship trophies are already in the case. Only a non-DNF player first-place finish earns a race trophy; teammate wins, Quick Race and practice do not. Winning simulated Career races also count. Every repeated victory is a separate record even though each series uses one winner model.

Awards snapshot series/year, race/track, actual start when recorded, earned points/prize, race type, difficulty and car identity. Championships snapshot season wins, points, starts, top fives/tens before promotion. Later car changes do not rewrite old trophies.

An old active save without the ledger recovers wins/titles from saved season history and completed current-season results. Aggregate historic wins receive separate trophies but **Race not recorded** and **Not recorded** details: the old save did not retain their dates/grid positions. Existing retired archives without trophy records are not assigned invented collections. Recovery runs once; subsequent loads retain the saved ledger.

## Rendering and interaction budgets

Six shared static thumbnails decode from embedded PNG bytes and draw onto 2D canvases without image URLs. The gallery appends 24 awards at a time as the player scrolls and has a keyboard-accessible Load more fallback. Award and series filters combine. There are no WebGL renderers in the grid. One inspection renderer, DPR at most1.25, 512px shadow map and six64px local reflection faces. Rendering occurs only on open, resize or manipulation. Closing disposes meshes/materials/textures/shadow targets, renderer/context, pending frame and resize observer. No trophy work occurs inside the racing frame loop. Meshes have at most5 material parts and15,852 triangles. Physical Chromebook performance remains unverified.

Drag/wheel and keyboard controls have button alternatives. Dialogs trap focus, shield the background, close on Escape and restore focus/scroll locking, including nested archive inspection. Without WebGL, a thumbnail and event record remain available.

## Verification

`test/trophies136.test.js` verifies idempotence, legacy recovery, actual Career/save/promotion/retirement flow and six bounded mesh/thumbnail assets. `test/e2e/trophies136.spec.cjs` checks desktop source and phone standalone gallery, all six render/disposal paths, orbit/focus, archive nesting, filters, infinite scroll, escaping and WebGL failure. Its controlled Career finish checks start-position propagation; it does not claim a human-played victory. Existing Quit/DNF browser scenarios preserve cancellation and last-place behavior. See the dated vault session for exact runs and limitations.
