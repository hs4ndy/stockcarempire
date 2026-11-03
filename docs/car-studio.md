# Car Studio

VERSION127 replaces the Career inline appearance disclosure with a full-screen
editor. Quick Race's player editors also open it; their compact paint/number
controls remain available. Existing game fonts, colors and button styles apply.

- `js/car-appearance.js` normalizes optional `stripes`, `stripeColor`, and
  `numberColor` fields. Missing fields keep stripes enabled and use off-white.
- `js/car-studio.js` owns staged edits, the modal focus/inert boundary, one
  Three.js renderer, camera orbit, lighting, resize observation and cleanup.
  Career also retains renaming; paint and number retain their existing fields.
- `js/race3d/cars.js` builds the exact preview/race model, applies appearance,
  and shares stripe buffers across the field. Preview construction does not
  consume the gameplay RNG. It never initializes racing/AI or starts a race loop.
- `js/main.js` passes appearance for the Career player, hired teammates, and
  both Quick Race humans. No car strength, tuning or classification changes.

Classic-script order: appearance helper before game/main handlers; both car
model assets plus stripe asset before the engine; Car Studio after all engine
extensions and before UI/main. The offline builder embeds this same order.
Node source snapshots include the helper from that revision's index, retaining
historical bundle isolation.

## Interaction and persistence

Drag to orbit, scroll to zoom, or focus the canvas and use arrows/+/-.
Elevation is clamped to .08–1.25 radians and distance to 4.5–10 game units.
The camera remains above the floor. On phones the preview sits above controls;
Save Appearance stays visible while the fields scroll.

Save validates an integer number1–99 and uniqueness among owned cars or active
Quick Race humans. Career uses its bound slot, if any; failed writes restore
the original object and leave the editor open. Unsaved careers stay unsaved.
Cancel/Escape discards edits and restores prior focus/interactivity. Appearance
fields naturally survive existing JSON saves, retirement snapshots and reloads;
no schema migration is required.

## Rendering and asset boundary

The room uses the actual legacy/Gen-7 geometry, a dark floor and spotlight.
It renders on interaction/resize only, with capped1.25 DPR and a1024 shadow map.
Closing cancels pending frames, disconnects observation, disposes geometry,
materials, shadow target and renderer, and releases the WebGL context.
Number textures remain in the existing shared cache, now keyed by number/color
and capped128 entries. Track rendering settings and mirror cameras are unchanged.
Gen-7 stripes add one mesh/292 triangles per car; this is a measured asset cost,
not a claim of physical Chromebook performance.

The primary sponsor is identified in the editor. **Hood logo remains blank** as
the user allowed: no actual logo file was attached, no invented logo is shipped,
and there is no upload/apply-logo flow yet. Connect supplied transparent logos
in a later explicitly requested step.

## Verification ownership

`test/car-appearance.test.js` checks legacy defaults, persistence/equipment parity
and valid bounded overlay geometry. `test/e2e/car-studio.spec.cjs` exercises
all three series, source/offline phone, both humans, cancel, duplicate numbers,
failed save rollback, unavailable WebGL, orbit limits and renderer lifecycle.
Existing career appearance/mirror tests now use the new editor. Physics method
fingerprints are changed only for requested cosmetic construction/number texture
handling; opening/dual seeded racing fixtures are retained.

Verified 2026-11-02: all source syntax checks; full configured Node run148/149
passed, with only the documented pre-existing AI-passing-every-third assertion
failing. The final292-triangle geometry/default/save tests separately passed3/3;
stripe regeneration was byte-identical. Final clean Chromium/WebGL run11/11
passed (all8 studio cases and3 appearance/mirror cases). Across scoped runs,
20 distinct relevant browser cases passed, including existing Quick confirmation,
dual race/finish/Quit and all-series wall/spark checks. Four broader old UI cases
still fail at documented removed loan/role selectors; assertions were retained.
No full browser-suite or physical Chromebook FPS claim.

1440x900,768x900,390x900 offline and844x390 captures were inspected. Finish
review scored framing, FORM route, self-shadow ripples and adaptive fog fixes
resolved; disposition ship at that fix-list scope. System comparison found no
material documentation gap and preserved incumbent DESIGN.md/sidecar. Existing
sidecar drift remains outside this feature. Offline HTML and ZIP bytes match.
