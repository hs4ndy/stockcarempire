# Racing feel and mirror tuning — September 6, 2026

The implementation in `js/race3d.js` is authoritative. The original Claude
handoff and source snapshot describe an older revision, not this tuning pass.

## Preserved behavior

- Straight-line, auto-throttle race; continuous A/D steering and S braking.
- Existing racing difficulties, teammate cooperation, career saves and Quick Race.
- Entrant identity, finish ordering and career result merging are unchanged.
- Existing UI and car/track assets, apart from the rear-view mirror treatment.

## What changed and why

- Draft and push strength taper with distance and lateral alignment. All cars'
  wakes are sampled before applying incoming pushes, avoiding roster-order bias.
- Tow, push and train benefit share one smoothed, capped momentum value. Pulling
  out carries an earned run that decays; train membership cannot instantly add
  or remove a large speed bonus. Train returns diminish instead of accelerating
  without bound. These are gameplay approximations, not a fluid simulation.
- Steering accelerates into lateral velocity and settles on release. Contact
  pressure scales with simulation time instead of repeatedly adding a fixed
  sideways kick. Gentle rubbing no longer rolls a random player spin.
- Physics uses 120 Hz fixed steps. Body and camera responses use elapsed-time
  smoothing; the chase camera retains roughly the previous race-speed framing
  without a frame-rate-dependent following distance.
- AI evaluates real closing speed, open lanes, nearby traffic and race progress.
  An earned pass takes priority over staying locked to a bumper. Moves commit
  for several seconds unless safety intervenes; later race stages accept smaller
  advantages. A teammate ahead holds its line as the player pulls out.
- Incident scheduling is somewhat more frequent, but a victim must be far enough
  ahead to offer warning and an escape route. There may be no generated incident
  in a tightly packed race. Debris timing now advances with the simulation, so
  pausing or destroying a race cannot leave a delayed debris-spawn callback.
- The mirror uses a fixed 68-degree horizontal field of view, lower virtual eye
  position, rounded output, and multisampling where WebGL2 is available. Its
  render-target viewport is no longer multiplied by device pixel ratio twice.
  Player visibility, shadows and the main viewport are restored after its pass.
- Following player feedback, nominal race pace increased from 175 to 200 for
  both player and AI. Clean-air driving stays faster without increasing the
  draft bonus or changing its smooth release. The top-speed cap is unchanged.
- Steering acceleration increased from 18 to 20 and lateral speed from 6.5 to
  7.1, with a slightly quicker input response and the same release damping.
- The HUD label stays "Draft" in every state; the live meter still rises and
  falls with draft momentum. The approved mirror is unchanged in this follow-up.

## Main tuning controls

| Constants in `R3D` | Purpose |
| --- | --- |
| `LAT_ACC`, `LAT_MAX`, `LAT_DAMP` | Steering response, lateral speed, release settling |
| `DRAFT_Z`, `DRAFT_X`, `PUSH_Z`, `PUSH_X` | Wake geometry and push-alignment precision |
| `DRAFT_BUILD`, `DRAFT_RELEASE` | How quickly aerodynamic benefit builds and decays |
| `DRAFT_BOOST`, `CHAIN_MAX`, `AERO_MAX` | Tow strength, diminishing train bonus, combined cap |
| `CONTACT_IMPULSE`, `SEP_X_RATE`, `SEP_Z_RATE` | Contact pressure and bounded separation |
| `CALM_FRAC`, `ENDGAME_FRAC`, `LANE_COMMIT`, `TOW_APPEAL` | AI timing and passing/tow balance |
| `MIRROR_HFOV` | Horizontal rearward field of view across mirror aspect ratios |

## Verification

Run `pnpm run check` and `pnpm run test:all`.

The regression suite covers wake continuity, order-independent aero, release
momentum, steering, contact at multiple update rates, safe AI passing including
departure from bumper contact, teammate line holding, incident guards, seeded
full races, and the existing finish/identity protections.

Browser tests use actual Three.js r134 and Chromium WebGL, routing the CDN request
to the identical installed build. They cover mirror orientation at DPR 1 and 2,
five viewport launches, close-car framing, live keyboard/RAF bumper departure,
pause behavior, and three complete career races through result display and
localStorage. Full-career simulation is accelerated between render checks; it is
not a frame-pacing benchmark or a substitute for a human driving review.

For manual review, push an aligned car, progressively pull out, then release
steering. The car should carry some lateral movement and forward run, with no
sideways kick. Check a close follower in the mirror and watch whether opponents
commit to passes as the finish approaches. Subjective handling and hardware-
specific rendering performance still require the player's review.
