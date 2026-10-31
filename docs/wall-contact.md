# Wall contact: VERSION100

Replaces the proximity-triggered WALL BRUSH slowdown and separate AI edge clamp with one post-car-contact wall solver. Shared by Career, Quick Race, split-screen and practice during racing, across all calendar venues/three series. Existing formation-lap limits/order remain unchanged.

Wall planes come from runtime track wallInnerX (10.528 Grassroots,11.2 Challenger/Premier). Each rendered car supplies a scaled model bounding box, including its offsets. The solver projects that box through the current yaw/roll to find each side's wall support. These are conservative model-derived contact volumes, not triangle-level deformable-body physics. Visual wheel rotation does not change the lateral wheel envelope. Both current runtime models are covered; no Blender assets were regenerated.

Normal motion reflects with12% restitution. Initial normal impact removes forward speed proportional to impact velocity; real sliding contact applies time-scaled tangential drag. Steering away has no proximity drag. Small contact-state hysteresis prevents repeated initial-impact impulses without extending the contact/slowdown boundary. A single final projection keeps cars inside the wall after steering and car separation, including spins. Human1/2 and AI/teammates use identical response; AI additionally redirects its target inward after a hit. AI still chooses safe lanes; there are no random wall crashes added.

No wall text warning. Human impact can shake the camera. Sparks are simulation-timed orange/yellow streaks, one lazy shared LineSegments draw,128 reusable particles maximum, no textures/lights/shadows. Emission uses a private RNG so effects cannot consume racing randomness. Pause freezes effects; existing scene teardown disposes geometry/material. Chromebook rendering budgets and mirror pipeline remain unchanged.

No persistent damage, save schema, repair/economy changes or new classification rules. Future in-race car damage was mentioned by the user and explicitly deferred; no implementation commitment added.

Checks: two contact unit cases (human/AI, both walls, proximity/impact/release, asymmetric model box/yaw/roll); browser model/wall geometry and bounded sparks in all series; existing close-traffic mirror test; existing racing regressions. Session/vault records contain final run totals and delivery. Real hardware spark readability and subjective impact/friction feel still need player feedback.
