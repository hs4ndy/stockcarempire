# Empire Gen-7

Original generic Gen-7/P3-inspired stock car for all three Stock Car Empire series. This is a fictional, independently modeled asset, not an official NASCAR or manufacturer model.

## Deliverables

- `empire-gen7.blend`: editable model and graphite, cobalt and ivory studio lineup.
- `empire-gen7.glb`: graphite car, wheels and presentation number 27, without the studio.
- `gen7-lineup.png`, `gen7-front.png`, `gen7-side.png`, `gen7-rear.png`: Blender reference renders.
- `stock-car-model.js`: indexed geometry used by the existing Three.js r134 race engine.

The previous `empire-sc01.blend`, `empire-sc01.glb` and `sc01-lineup.png` remain as legacy assets. The rebuild does not overwrite them or any currently open Blender scene.

## Design and references

The supplied five prototype photographs informed the low nose, coupe roof, triangular quarter windows, thin wraparound front graphics, hood extractors, split-Y center-lock wheels, side exhaust, safety net, internal cage, deck spoiler and rear diffuser. No supplied photograph, watermark, third-party model, texture or logo is embedded or redistributed.

Primary research:

- [NASCAR Next Gen specification sheet](https://media.ndms.nascar.com/nascar/2021/NextGen/NextGen-SpecSheet.pdf): published dimensions, 18-inch wheels, composite body, split-side exhaust and aero components.
- [NASCAR Next Gen overview](https://media.ndms.nascar.com/nascar/2021/NextGen/NextGen-Overview.pdf): lower greenhouse, shorter rear deck and symmetrical body.
- [NASCAR's March 2020 P3 test report](https://www.nascar.com/news-media/2020/03/03/william-byron-details-learning-experience-after-next-gen-test-at-auto-club/): identifies the third prototype and center-lock wheel development.

The P3 prototype and the eventual production Next Gen car are not identical. The supplied prototype is the visual target; production specifications are proportion and component references, not a claim of an exact replica.

The game model is deliberately fitted inside the existing 4.6-unit longitudinal and 2.15-unit lateral contact envelope. Tire radius remains 0.40; visual axle spacing is 2.60. This replaces the old body that extended beyond its longitudinal collision envelope without changing handling, speeds or result logic.

## Runtime budget

- 9,808 triangles for body and four wheels.
- 10,068 including three number decals; 10,324 with the teammate roof marking.
- Six static material meshes, four shared rotating wheel instances and three number meshes: 13 meshes per car, 14 for teammates.
- Approximately 560 KB geometry script, approximately 87.5 KB with gzip.
- Geometry and wheel GPU buffers are shared by the entire field. No runtime GLB loader or new dependency.
- Paint-only reflectance preserves team-color identity while avoiding clipped highlights under the game's bright track lighting.
- Roof numbers and teammate markings conform to the roof surface. Driver numbers and team colors remain dynamic.

The Blender and GLB files are authoring deliverables, not loaded by the game.

## Rebuild

From the repository root with Blender 5.2:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python tools/build_stock_car.py
```

The script starts a separate empty scene, exports the model and browser geometry, saves the editable studio, and renders the lineup and three inspection views. Display lettering uses locally installed Windows Arial Bold Italic; the GLB contains baked lettering, not the font file.

Authoring helpers use game coordinates (X across, Y up, +Z forward), converted to Blender Z-up and back for the browser export.

## Camera regression

The virtual rear-view camera sits ahead of the player to frame close followers. At bumper contact that eye could fall inside the leading car. The mirror pass now excludes cars more than half a car length ahead, as well as the player; overlapping adjacent and following cars remain eligible. All original visibility flags and shadow state are restored even if rendering throws. Main-camera position, mirror FOV, dimensions and UV flip are unchanged.

The browser regression reproduces the original failure using differently colored real car meshes, compares rear-view pixels with and without a leader at several gaps, and checks a rear bumper car, adjacent traffic, visibility restoration and chase-camera clearance.

## Verification

```powershell
npm run check
npm test
npm run test:browser
node node_modules/playwright/cli.js test test/e2e/bumper-camera.spec.cjs --repeat-each=5
```

Browser tests use real Chromium/WebGL and the identical pinned Three.js r134 build from the local dev dependency, not a THREE stub. They cover all 20/26/36-car series, finite geometry and valid indices, shared buffers, contact envelopes, dynamic colors/numbers, wheel animation, DPR 1/2 mirrors, responsive launches, real keyboard bumper departure and repeated complete career-race classification. Screenshots and failure traces are written under `test-results`.

Timing in an automated browser is machine-dependent and is not a guarantee for every device.

Optional like-for-like renderer diagnostic (with the static server running):

```powershell
node tools/benchmark_stock_car.cjs 687d839
```

The September 9 comparison used Chromium's SwiftShader software renderer and an identical staged 36-car pack. The previous model measured 2.3 ms median / 3.8 ms p95 synchronized render calls; the remodel measured 2.2 ms / 3.0 ms, with 99 geometry buffers versus 100 previously. These are narrow render-call diagnostics, not gameplay FPS claims. Whole-frame RAF sampling in this automated environment was substantially slower, so real hardware/browser pacing still varies.
