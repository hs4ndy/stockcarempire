# Stock Car Empire trophies

Six original, simplified geometric models authored for the game; no third-party meshes, branding or photos ship. `empire-trophies.blend` contains six named collections in a lineup and is separate from the user's car project. Runtime reads the exported JS, not the Blender file.

| Model key | Design | Triangles |
|---|---|---:|
| grassroots-win | Basic handled gold cup |5100|
| grassroots-championship | Three gold cups on a wood plinth |10788|
| challenger-win | Silver cup, gold supports, blue base detail |7276|
| challenger-championship | Swept checkered flags and silver center |3832|
| premier-win | Silver cup suspended between tall gold handles |6732|
| premier-championship | Broad silver cup with seven looping rings |15852|

The three-cup, swept-flag and modern chalice silhouettes interpret the user's requested NASCAR-era inspiration. Generic loops replace track silhouettes. Reference research: [NASCAR Bill France Cup](https://careers.nascar.com/news-media/2020/03/02/nascar-cup-series-champion-to-receive-bill-france-cup-beginning-in-2020/), [NASCAR 2016 imagery](https://www.nascar.com/gallery/2016-season-review-kurt-busch/), [Winston Cup history](https://www.autoweek.com/racing/nascar/a42232028/how-rj-reynolds-sponsorship-winston-cup-became-nascar-game-changer-in-1971/).

## Rebuild from the project root

1. Run Blender in a separate background process: `& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python tools/build_trophies.py`. This regenerates this folder's blend and `trophy-models.js`; it does not alter an already open car scene.
2. With Playwright Chromium installed, run `node tools/render_trophy_thumbnails.cjs`. It renders six480x400 PNGs from the exact exported geometry and emits the embedded thumbnail bank. Rendering requires working WebGL. Pixel bytes can vary by GPU/browser.
3. Embed provenance into each PNG with Impeccable `embed-prompt <path> --prompt "Original Stock Car Empire Blender trophy, authored by tools/build_trophies.py; thumbnail rendered from the exported mesh by tools/render_trophy_thumbnails.cjs. No stock imagery or AI raster generation."` and verify `embed-prompt --scan assets/trophies` reports zero missing.
4. Run `node tools/render_trophy_thumbnails.cjs --pack-only` to embed the metadata-bearing PNGs without rerendering. This mode needs no browser.
5. Run trophy tests, rebuild standalone HTML and its ZIP. Do not ship Blender's `.blend1` regeneration backup.

PNG provenance describes original 3D renders, not AI-generated raster art. Assets load with the application; there are no trophy image-host or model-download requests.
