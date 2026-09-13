# Speedway environment

Muted, finely textured turf outside the walls; continuous concrete pads under
both grandstands, sized separately for Grassroots, Challenger and Premier.
Concrete includes subtle six-unit expansion joints. Grass uses a ten-unit
repeat with low-contrast mowing variation. Both are original seeded artwork.
No imported images, cloud textures or external asset requests are required.

The old light-post meshes and block-shaped treelines are removed, not remodeled.
The authored track, finish, fencing, stands, cars, physics and cameras remain.
Existing scene illumination is retained; removing visible poles does not remove
daylight. A direction-only sky shader blends clear blue overhead into the same
pale horizon color as the distance fog, in both chase and mirror views.

## Blender source and rebuild

`speedway-environment.blend` contains three named ground-study scenes, packed
grass/concrete images, cameras and inspection daylight. Stand meshes are
read-only reference copies without crowds; edit the original stand builder
for actual stand changes. Ground mesh positions/UVs are shared with the runtime.
Each `*-ground.png` is a Blender inspection render, not a gameplay screenshot.

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python-exit-code 1 --python tools/build_environment.py
```

Rebuilding starts a separate empty Blender process and writes only this folder.
It reads the current grandstand bundle to derive footprint bounds, so rebuild
the environment after changing stand footprints. It never opens or saves the
user's existing Blender document or the car/track/grandstand source files.

## Runtime and verification

`environment-model.js` embeds both PNGs and three series-specific ground meshes.
Only the selected ground is instantiated. Each 60-unit module has 12 triangles
in two material meshes. Ground runs from Z -4,200 through 19,200 and to X +/-6,000,
past the cameras' far planes. Concrete and grass occupy adjacent, non-overlapping
bands below the pavement, preserving X +/-11.2 wall contact planes.
Textures use mipmaps and the existing anisotropy setting. Culling is disabled
on the ground instances for Three r134's aggregate-bounds limitation.

```powershell
node --test test/environment-assets.test.js test/grandstand-assets.test.js
node node_modules/playwright/cli.js test grandstands.spec.cjs track-model.spec.cjs
```

Asset tests check finite geometry, upward normals, footprint clearance, texture
identity, row preservation and integral UV repeats. Browser tests check loaded
textures, raycast coverage at seams/endpoints, absence of legacy scenery,
fog/sky agreement and actual chase/mirror screenshots across all series,
mobile DPR 2 and file loading. Software-renderer tests do not establish real-device FPS.

Initial verification: 35 Node checks passed, plus all eight combined stand/ground
and track browser cases (clean exit, 2.4 minutes). Blender and gameplay captures
were visually reviewed. The user's legacy car Blender file and backup hashes
remained unchanged. Removed scenery remains recoverable through Git history.
