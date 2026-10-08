# Stock Car Empire

<!-- impeccable:product-schema 1 -->

## Platform

web

## Product Purpose

A browser stock-car career game combining team management with playable 3D racing and statistical race simulation. Players make race, garage, staffing, sponsorship, and financial decisions while progressing through three series.

## Capabilities and Constraints

Source-verified: vanilla HTML/CSS/JavaScript with shared globals; Three.js r134; no backend. Five origin-local save slots. New careers start with $50,000 and one car. Playable racing is a keyboard-controlled straight sprint, with auto-throttle, A/D steering and S braking. Existing calendar track types also inform simulation. Offline single-file and ZIP releases must stay synchronized.

The October 8 redesign preserves gameplay, economy, race physics, cameras, content, tutorial flows, save formats, and current save behavior. Changes cover all menus, management screens, dialogs, tutorial, race HUD, and results. Autosave error propagation and destructive New Career behavior are known separate maintenance work.

## Brand Commitments

User-confirmed October 8: retain Stock Car Empire's red accent; use EA SPORTS FC25/26 as the design reference; replace inconsistent proportions and spacing throughout the app, including in-race UI. Build directly in code. User values a polished, complete result over speed.

## Evidence on Hand

`index.html`, `style.css`, `js/`, Blender-authored runtime geometry in `assets/`, Node and Playwright tests in `test/`, offline releases in `releases/`. EA's official FC25 and FC26 career deep dives provide visual reference. Audience demographics beyond players of this game are not established.

## Product Principles

- Put the next meaningful decision before secondary detail.
- Keep recurring actions and costs easy to recognize across screens.
- Preserve game state and working interactions while changing presentation.
- Make long names, full garages, empty states, and narrow screens intentional layouts.
