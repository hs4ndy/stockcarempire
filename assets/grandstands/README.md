# Series grandstands

The later ground/sky update is documented in `assets/environment/README.md`.
It replaces legacy grass, removes treelines/light posts, and adds concrete under
these stands without changing their geometry.

Three original Blender-authored modular grandstands for both sides of the
existing straight. This change replaces the previous identical crowd-textured
boxes, without changing pavement, walls, catch fencing, exterior grass,
lighting, trees, race physics, AI, cars, or finish classification.

| Series | Architecture | Decks / rows | Height | Front setback from track center |
| --- | --- | --- | --- | --- |
| Grassroots | Open aluminum benches, exposed bracing, steps and handrails; separate bleacher sections | 1 / 8 | 5.76 | 20 |
| Challenger | Collegiate-style concrete seating, blue benches, suite band and partial canopy | 2 / 12 + 14 | 25.24 | 24 |
| Premier Cup | Four progressively recessed seating tiers, three glazed suite bands, structural rakers and large cantilever canopy | 4 / 16 + 18 + 20 + 22 | 68.26 | 28 |

Dimensions are game units and artistic choices, not construction specifications.
Challenger has two fewer rows per deck than the original version. Its upper
deck starts at local X = 12, behind the lower seating rake, with the same
tightly fitted 3.4-unit suite band as Premier. Its partial canopy is retained.
Premier is inspired by AT&T Stadium's scale and layered seating, not a replica.
Premier deck fronts sit at local X = 0, 18, 39 and 62: each upper tier is
behind the previous seating rake rather than stacked over its front rows.
Its original canopy follows the recessed fourth deck. Vertical tier gaps are
3.4 units, tightly fitting the existing suite bands with minimal open space.
Row counts, materials, LOD triangle counts and the two other series are unchanged.
There is no roof over the track, oval, football field, or infield. Left stands
are rotated counterparts of the right-hand modules, not negative-scale meshes.

## References

- [Stadium Solutions bleachers](https://stadiumsolutionsinc.com/bleachers/),
  especially the [eight-row aluminum example](https://stadiumsolutionsinc.com/wp-content/uploads/bleacher_8Row-1024x768.jpg):
  bench rows, exposed supports and aisles for the Grassroots design.
- [Stadium Solutions grandstands](https://stadiumsolutionsinc.com/grandstands/):
  permanent stadium seating, structural framing and circulation inspiration.
- [AT&T Stadium field-event reference](https://attstadium.com/specialevents/)
  and its [interior photograph](https://attstadium.com/wp-content/uploads/2025/09/field-events.jpg):
  monumental stacked seating and long horizontal architectural bands.
- [Populous: Kyle Field redevelopment](https://populous.com/showcases/texas-am-kyle-field-redevelopment):
  additional stadium-bowl and canopy reference alongside the user's supplied
  photographs for the Premier setback correction.

Reference photos are not bundled. Geometry and the small seated-spectator
texture are original procedural artwork. No third-party logos or models.

## Source and rebuild

Each `*-grandstand.blend` contains one editable 60-unit study with named deck
components, packed spectator texture, daylight and an inspection camera.
The three `*-overview.png` files are Blender inspection renders.
`grandstand-models.js` is the indexed runtime geometry, metadata, material
palette, both detail levels and embedded crowd PNG. No GLB loader is required.

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python-exit-code 1 --python tools/build_grandstands.py
```

For a Premier-only revision, append `-- --series premier` to the rebuild
command. This preserves the other series' source files, renders and runtime
geometry, and does not rewrite the shared crowd PNG. A targeted build requires
the existing runtime bundle; omit the option for a complete clean rebuild.

The builder starts a separate empty Blender process. It writes only this
directory and never loads or saves the user's open document, legacy car file,
its backup, or existing track/car authoring assets. Rebuilding intentionally
replaces generated grandstand files. Render output uses a temporary generated
filename before replacement to avoid direct image-overwrite failures observed
on Windows. The explicit Python exit code makes build failures detectable.

## Runtime and performance

Quick Race and career races pass an explicit `seriesId`. Older callers fall
back to the series matching their field size, then Grassroots. The browser
loads only the selected model into GPU buffers.

The engine pools modules on both sides within approximately 2,400 units ahead
and behind the player. Instance matrices update only at a module boundary;
geometry is never regenerated while driving. Fine benches and seated spectator
strips are used within 300 units; distant modules preserve decks, suite bands,
canopy, main supports and textured crowds with simpler seating surfaces and
without tiny rail posts or footings. This also covers the mirror
and hides the pool edges in the existing distance fog. Grassroots sections are
60 units long on a 78-unit pitch, leaving local-track gaps. Stadium modules
repeat on a continuous 60-unit pitch.

Near-module triangle counts: 2,044 Grassroots, 7,984 Challenger and 21,116
Premier. The pooled runtime is tested below 900,000 stand triangles and
14 material/detail-level draw calls. The crowd is alpha-tested, double-sided,
mipmapped and embedded as a data URL for Chrome `file://` compatibility.
Three r134 lacks aggregate instance bounds, so these bounded pools disable
automatic frustum culling. No Three.js upgrade or dependency change is needed.

## Verification

```powershell
node --test test/race-regression.test.js test/race-dynamics.test.js test/track-assets.test.js test/grandstand-assets.test.js
node node_modules/playwright/cli.js test
```

Asset tests check deck counts, increasing heights, finite buffers, valid
indices, footprint, LOD budgets and byte-identical embedded PNG data. Browser
tests launch all three series, verify matched left/right instance counts and
positive transforms, check pool placement at the start/middle/finish, inspect
architectural and chase/mirror screenshots, and cover mobile DPR 2 and direct
file loading. The existing suite additionally verifies car geometry, all
four difficulties, contact/steering, mirror clipping and saved career results.
Artifacts are under `test-results/`; software-renderer timing is not a promise
of real-device FPS. `STOCKCAR_BASE_URL` can target the deployed site.

The first 480-unit detail-range version exceeded the 60-second 36-car browser
test deadline on SwiftShader (roughly 889 ms between automated RAF samples).
This prompted the 300-unit detail range and removal of tiny distant hardware.
The narrow `tools/benchmark_stock_car.cjs` render-call diagnostic substantially
understated that whole-frame slowdown, so it is not used as proof of performance.
Before the Premier setback correction, with the reduced LOD and opaque
back-face culling, the 36-car test passed in
55.2 seconds at approximately 692 ms per automated RAF sample. This remains
more expensive than the old rectangular stands. Tests keep the original
60-second deadline; lower-end real devices may still need further tuning.

Premier setback correction verification: 32 Node checks and all three targeted
Premier browser cases (desktop, mobile DPR 2, file loading) passed with clean
process exits. Blender, architectural, chase and mirror images were inspected.
Hashes confirmed the Grassroots/Challenger models, source files, renders and
shared crowd PNG were unchanged. This geometric revision adds no triangles;
real-device frame rate remains unverified.
