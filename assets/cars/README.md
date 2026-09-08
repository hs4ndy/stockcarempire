# Empire SC-01

Original NASCAR-style stock-car design created for Stock Car Empire in Blender.
This is a fictional body and livery, not an official NASCAR or manufacturer asset.

## Deliverables

- `empire-sc01.blend`: editable body parts and a studio lineup in red, cobalt and ivory.
- `empire-sc01.glb`: one red SC-01, including wheels and presentation number 27, without the studio.
- `sc01-lineup.png`: Blender studio render of the three color studies.
- `stock-car-model.js`: generated indexed geometry used by the existing Three.js r134 race engine.

The game uses the same baked Blender geometry with dynamic entrant colors, numbers and gold teammate accents. The browser export merges static parts into seven material meshes and shares one wheel mesh across four rotating instances. Each normal car uses 14 meshes including its three number decals, or 15 with the teammate roof band. The model uses 8,406 triangles before dynamic decals/teammate trim. The shared geometry script is approximately 480 KB before HTTP compression and only loads once per page. Blender and GLB files are development deliverables and are not downloaded by the game.

## Rebuild

From the repository root, using Blender 5.2:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python tools/build_stock_car.py
```

This regenerates the four deliverables. The script starts a separate empty background scene and never modifies another open Blender scene. Display lettering uses the locally installed Windows Arial Bold Italic font; the GLB contains baked lettering geometry, not the font file. No third-party model, texture or font file is redistributed.

Authoring helpers use game coordinates (X across, Y up, +Z forward), converted to Blender Z-up for editing and back for the browser export. Tires retain the existing 0.40 game-unit radius and 2.84 axle spacing. Physics, collision distances, speed, camera and mirror code are unchanged by this asset replacement.

## Reference and review

Visual reference: [NASCAR's published Next Gen specification sheet](https://media.ndms.nascar.com/nascar/2021/NextGen/NextGen-SpecSheet.pdf). The reference informed the coupe silhouette, wheel arches, splitter, deck spoiler, hood louvers and center-lock wheel styling. These are stylized game proportions, not a dimensionally exact race-car replica.

Browser coverage checks a 36-car field, shared geometry, valid indices/normals, player color, dynamic number meshes and wheel animation. Front, rear and race screenshots are written under `test-results` for visual review. Existing mirror/repeated-race and gameplay tests must remain passing.
