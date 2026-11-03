---
version: 1
slug: "js-car-studio-js"
primary_target: "js/car-studio.js"
related_targets: ["js/ui.js","style.css","js/race3d/cars.js","js/car-appearance.js"]
---

# Car Studio

Target: js/car-studio.js; related: js/ui.js, style.css, js/race3d/cars.js, js/car-appearance.js.
Mode: Operate with a 3D car preview. Extends the incumbent interface; no new visual world.

THESIS: Customize one car in a focused, direct-manipulation showroom; preview the same appearance used in racing.
OWN-WORLD: Retain charcoal surfaces, Barlow/Barlow Condensed, restrained grey dividers and red primary actions. No independent identity or decorative UI.
STORY: Open Customize Car, orbit the car, edit its paint/number/stripes, inspect, then explicitly Save Appearance or Cancel.
FIRST VIEWPORT: Desktop controls on the left and a larger, spotlighted car on the right over a dark floor. Cancel in the header. Save stays visible while fields scroll. Phone places the preview above bounded scrolling controls. No view below the floor.
FORM: User supplied this composition and controls directly. Code-led extension; no alternate layout or generated comp. This is the existing appearance editor extended into the precise left-controls/right-car composition explicitly requested by the user, retaining its identity. The new-work "Extend an existing surface" route says to inherit the world and resolve new purpose/states, without a concept tournament; its concept-seed rule also excludes local extensions/precisely specified requests. No roll was run or invented.
FINISH: Inspect desktop/phone, stripe on/off, orbit limits, saved appearance in all three series, split-screen identities, cancel/save failure, cleanup, and close-traffic mirrors. A blank hood is an explicit temporary placeholder pending real logo files; show the active primary sponsor name without inventing branding.

QUALITY BAR: A usable, responsive in-game editor matching shared inputs/buttons, a recognizable actual race car under restrained studio lighting, and a safe reversible save boundary. Cosmetics must not change racing stats, tuning or contact hulls. One-car render-on-interaction, DPR capped 1.25, one 1024 shadow target, explicit resource disposal. Desktop WebGL tests do not establish Chromebook frame rate.
