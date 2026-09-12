# Empire straight speedway

Original Kansas Speedway-inspired pavement, walls and catch fencing for Stock Car Empire's existing straight sprint. This is a visual interpretation, not a surveyed replica or an engineering specification for a real safety barrier.

## Scope and references

NASCAR's [2024 Kansas spring race gallery](https://www.nascar.com/gallery/at-track-photos-2024-kansas-speedway-spring-race-weekend/) provided the visual references:

- [Track-level view](https://www.nascar.com/wp-content/uploads/sites/7/2024/05/05/GettyImages-2151621301-922x489.jpg), Sean Gardner / Getty Images: weathered gray-brown pavement, paving joints, white barrier and dark catch-fence posts curving inward overhead.
- [Barrier close view](https://www.nascar.com/wp-content/uploads/sites/7/2024/05/04/22552791_Brittney_Wilbur_20240504_213113-922x489.jpg), Brittney Wilbur / NASCAR.com: horizontal white barrier rails and narrow asphalt seams.
- [Finish-line pavement](https://www.nascar.com/wp-content/uploads/sites/7/2024/05/06/PJV_4499-922x520.jpg), Alejandro Alvarez / NASCAR.com: asphalt aggregate, rubber wear and surface markings.

Photographs are references only; no third-party images, logos or model data are included. All texture images are seeded procedural artwork from the build script. Fence dimensions, rail proportions and weathering are authoring choices fitted to this game, not measurements of Kansas Speedway.

The playable surface remains flat, 22 units wide and 15,000 units long. There is no oval, banking, infield or pit lane. Both sides have walls with their original inside contact plane at X = +/-11.2. The continuous paved surface reaches those walls. Existing external grass, grandstands, treeline and light poles are preserved. Highway lane dashes, raised red/white curbs and old wall advertising are replaced by the authored surface and white barriers. No handling, AI, car or camera code is changed.

The September 12 revision removes wavy rubber grooves, tar repairs and the original yellow starting-grid stripes. Fine asphalt aggregate and straight paving joints remain; starting positions are unchanged. The finish is rebuilt as a compact dark-steel double truss with supports outside both walls, two-sided mesh lettering and flush checkered paint. Its two-unit-deep checker pattern is centered at the actual Z = 15,000 classification plane, with narrow white borders. The overhead assembly clears the racing surface by at least 7.7 units, above the 6.48-unit catch fencing.

## Deliverables

- `empire-straight.blend`: editable 60-unit section with pavement, both barriers/fences and the finish assembly displayed at its midpoint, packed textures and an inspection camera. Opens independently of car authoring files.
- `empire-straight.glb`: the same section and finish study, excluding the inspection camera and lighting.
- `track-model.js`: indexed geometry exported from those Blender meshes, grouped by material for the Three.js r134 runtime. `parts` repeats along the road; `finishParts` uses local Z = 0 and is placed only once at the race finish.
- `track-textures.js`: the three original PNGs packaged as data URLs, so WebGL can load them from both `file://` and HTTP(S).
- `speedway-asphalt.png`, `speedway-wall.png`, `speedway-mesh.png`: shared Blender/browser texture maps.
- `track-overview.png`, `track-detail.png`: Blender inspection renders.

## Build

From the repository root:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python tools/build_track.py
```

The script creates a separate empty Blender scene and writes only `assets/track`. It calls the Node texture packer after generating the images. It does not load or save the user's open Blender document, `empire-sc01.blend`, its backup, or the Gen-7 files. Rebuilding intentionally replaces the generated track assets. Game coordinates are X across, Y up, +Z forward; the exporter converts Blender coordinates back to that convention. To repack existing PNGs without opening or changing a Blender file, run `npm run build:track-textures`.

## Runtime

Seven material meshes, 2,326 triangles per module, 390 instances per material covering Z = -4,200 through 19,200. The finish adds four non-instanced meshes sharing the existing materials, with a test budget below 1,500 triangles. The extra visual runout hides the ends beyond the cameras' far planes; the playable finish remains at 15,000. Exterior grass begins at the wall's inside edge to prevent overlap with the pavement. Three texture files total approximately 3.5 MB. No additional dependency or GLB loader is required.

The catch mesh uses alpha testing, depth writes, mipmaps, renderer anisotropy and alpha-to-coverage instead of blended transparency. Both sides render in the mirrored camera. Three r134 lacks aggregate instance bounds, so frustum culling is explicitly disabled for these seven instanced meshes. Full-length instancing trades extra off-screen triangles for a low draw-call count; device-specific frame rates still vary.

## Verification

```powershell
npm run check
npm test
npm run test:browser
```

`test/e2e/track-model.spec.cjs` uses real Chromium/WebGL with the pinned Three r134 dependency. Desktop and DPR-2 mobile tests check loaded textures, finite geometry/UVs, valid indices, the material/triangle budget, and raycast continuity across module joints and both race endpoints. Both wall faces must remain exactly 11.2 units from the center. Checks also cover removal of the yellow grid material, one finish assembly at the correct plane, and flush finish paint across the track. Screenshots at Z = 120, 7,500, 14,960, 14,990 and 15,020 exercise the start, finish approach/crossing, chase and rear-view cameras. Existing suites cover the three field sizes, bumper mirror clipping, keyboard handling and full career-race classification. Browser artifacts are in `test-results`.

The direct-file regression launches the actual local `index.html` in Chromium and checks all textures and both cameras. It reproduces the original failure with standalone PNG requests: Chrome blocks them from the file page's null origin, leaving asphalt and walls black. The data-URL bundle fixes that without weakening browser security. `test/track-assets.test.js` verifies that every bundled image is byte-identical to its Blender PNG and that the finish mesh is finite, centered, within budget and clear of the racing corridor.

Software-renderer captures can exceed 30 seconds for the full 36-car field, so the browser suite uses a 60-second test deadline without weakening assertions. Set `STOCKCAR_BASE_URL` to a deployed URL to run the HTTP cases against the live site. With the static server running, `node tools/benchmark_stock_car.cjs b7944eb` compares synchronized render calls and geometry buffers against the previous track. These narrow diagnostics are not whole-frame FPS measurements; automated RAF pacing is much slower.
