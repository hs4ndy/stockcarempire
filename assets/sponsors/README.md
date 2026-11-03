# Primary hood logos

All22 supplied primary-sponsor PNGs are preserved in grassroots/, challenger/,
and premier/ using catalog brand filenames. manifest.json maps sponsor IDs,
series, repo paths and supplied original filenames. The extra clipboard image
was byte-identical to TitanGrid Energy; it is not a23rd brand.

Repack with PLAYWRIGHT_BROWSERS_PATH set to an installed Chromium directory:
node tools/pack_sponsor_logos.cjs

This preserves source art/transparency and fits it, without distortion, into
512x284 transparent canvases. hood-logos.js embeds those PNGs as data URLs in a
classic script. Original PNGs are authoring assets; the game never requests them.
Both website and offline HTML load the packed script before race startup.
js/hood-logos.js preloads decoded images; only requested brand textures allocate
GPU state, cached/shared across cars and races (maximum22). Texture bound is
512x284, approximately568KiB RGBA per brand before mipmaps. No external image
hosts or image URL requests; this removes that dependency, but cannot guarantee
any school/device filtering policy permits the game or canvas graphics.

Hood meshes are generated from both shipped paint surfaces using
node tools/build_hood_logos.cjs. They conform to the hood, preserve alpha and
use the same surface placement in Car Studio/races.80/162 triangles for
Grassroots/Gen-7; one additional mesh per sponsored car. No contact-hull change.

Only the active Career primary sponsor is shown, on player and owned teammate
hoods. No secondary/tertiary/menu/gallery branding, invented AI sponsors or
Quick Race logos. Contracts determine the logo automatically; fleet copy does
not copy sponsorship data. Existing supplied edge details are preserved.
