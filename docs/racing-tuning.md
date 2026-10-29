# Racing feel and mirror tuning — September 6, 2026

The implementation in `js/race3d.js` is authoritative. The original Claude
handoff and source snapshot describe an older revision, not this tuning pass.

## October 29 difficulty follow-up

Every difficulty now has 5% stronger AI aero targets/ceilings and 5% more lateral
aggression. This is a parameter adjustment, not a measured 5% change in win rate.
Detached-pack recovery starts earlier and responds to leading pace, most strongly
on Semi-Pro/Pro; positions are never snapped forward and leaders are not slowed.
Teammates have no exclusive push-strength multiplier, stop dedicated support after
six cumulative seconds, and no longer slow themselves to help a following player.
Defensive awareness includes closer runs while retaining swept-lane safety checks.
Economy, prizes, car costs, player pace and on-track result classification are unchanged.

Seed-17, 36-car front-start riding diagnostic with a power-0.95 player and three
power-0.95 teammates: old/new Pro finish 1/4, median nearby opponents 1/35,
median field span 811/93 units; Semi-Pro finish 1/1, nearby 3/25, span 750/211.
These are controlled synthetic examples, not human win-rate estimates or a
guarantee that no future strategy can win. Reproduce with `runRearStart` in
`test/race-dynamics.test.js` using strategy `ride` and options
`{frontTrain:true, teammates:3}`. The former baseline was `893942d`.

### Follow-up after human Pro feedback

Human testing still found the push-and-pullout pattern easy despite closer rivals.
AI now tracks sustained bumper partnerships and commits to a safe breakaway lane
after 8/6/4/3 cumulative seconds on Beginner/Amateur/Semi-Pro/Pro. This precedes
support and receive-line decisions, so those cannot lock the driver into escorting
the pusher. Blocked exits are never forced. Time decays slowly when separated.
The pushed car receives half the pusher's already-earned aero momentum through
contact, within existing aero ceilings. Thus the leading car also retains a run
when the pusher pulls out; brief drafting and earned passing runs remain viable.
Applies equally to teammates, rivals and AI-to-AI partnerships.

Final seed-17 three-teammate ride diagnostic: Pro P10 with 35 median nearby rivals;
Semi-Pro/Amateur/Beginner still P1 in that strong-car fixture. Lower difficulties
remain winnable; these examples do not establish an exploit-proof win rate.

### All-Out

Follow-up after human feedback: the initial tuning below was too punishing at the
start. Current AI speed/power/aggression = 1.09/1.38/1.65, aero = 1.15,
recovery = 1.15, player draft = .95, player comeback assistance = .35.
Racecraft, safe pack-pressure maximum and 1.5-second bumper response remain.
Other difficulties and economy are unchanged. In the same seed-17 strong front
ride scenario, the ten-second leader gap fell from 375 to 35 units and nearby
opponents rose from 0 to 35. Both scripted rides still finished last: this is
evidence of opening competitiveness, not proof of a human winning chance.
An active front-start script stayed among a median 13 nearby rivals, but also
finished last. Human balance confirmation remains necessary.

User-requested fifth difficulty above Pro, intentionally severe. Internal save ID
is `allout`. Existing four modes/default remain unchanged. Initial AI speed/power/aggression
are 1.16/1.50/1.80, AI aero 1.30, racecraft 1.25, pack pressure 1.00 (the bounded
maximum), recovery multiplier 1.50, and bumper partnership limit 1.5 seconds. Player draft multiplier is
0.80 with no positional comeback assistance. Existing physical safety and result
classification still apply; no forced losses or finish-place edits.

Shared difficulty lists expose it in new-career setup, Settings and Quick Race.
The existing simulated-rival difficulty multiplier also uses its AI power value;
teammate simulation power and economy are unchanged. Seed-17 36-car diagnostics:
both managed rear-start and power-.95 three-teammate front-start riding finished
last. These are synthetic examples, not an established human win rate.

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
- Following clarification, simulation pace is 210 with a 270 cap. A typical
  drafted dash reading lands near 220 mph. The fast sensation comes from a
  lower, closer chase camera and a 66–86 degree speed-responsive FOV, rather
  than making every car travel substantially faster.
- Steering acceleration is 60 and lateral speed is 17.0—approximately double
  the prior authority—with less high-speed falloff. A small camera lean reinforces
  the arcade response, while fixed-step integration still prevents position snaps.
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

## October 29 career balance and usability
Premier now advertises 40 entries, with four additional last-place $100 payouts and zero points. Older Premier saves gain missing AI entries while retaining existing entrants and points. Played qualifying draws move back two places (clamped to field end); simulated owned entries lose four qualifying-score points and analyst qualifying benefit caps at 14. Simulation-only owned-car pace multiplier is 0.78, applied before qualifying and phases; actual on-track classification is still reconciled from track order. In a 100-seed strong-car Pro fixture, wins changed 88 -> 22 and mean finish 1.39 -> 4.04; not a human/all-setup win-rate claim.

Jake Rivers starts at skill 88/aggression 75; new contracts require reputation 65, $36,000 signing and $9,000 per week. Existing hire skill/salary records are retained. Career race Quit restores a pre-entry JSON snapshot and saves it to an already-bound slot, with no race result, fees, payroll, condition or loan-term advancement. Quick Race quits to intro; practice quits back to its tutorial step.
