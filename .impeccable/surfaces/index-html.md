# Application redesign

Target: `index.html`; related: `style.css`, `js/ui.js`, `js/tutorial.js`, `js/race3d.js`.
Mode: Operate. Scope: whole app, including in-race presentation.

## Direction contract

THESIS: A sports career hub whose next event leads and whose supporting screens share one precise layout grammar. Replace the repeated red-topped card grid and scattered miniature labels.

OWN-WORLD: User-pinned FC25/26 sports presentation translated to Stock Car Empire: charcoal and graphite, off-white active selections, red primary actions, Barlow body and Barlow Condensed display, compact data rows and clear names. Flat surfaces, restrained rounding, no decorative gradients or emoji.

STORY: Identify the career and series, assess the upcoming race and budget, enter the event or prepare the team. Secondary details remain native disclosures. In-race, read position/speed/draft at a glance without crowding the road or mirror.

FIRST VIEWPORT: Bounded header and horizontal navigation, a clear Dashboard title with season context, a compact three-part status strip, then a dominant event area beside standings. Finances and garage share the second row. At narrow widths the same reading order becomes one column, with a visible team identity and scrollable navigation.

FORM: FC25/26 is explicitly pinned and overrides seed 4ce636be. Seven grounded references considered: FC career hub; sports broadcast scorebug; race programme; motorsport annual; starting-grid sheet; teamwear graphics; ticket typography. Challenger systems are declined for audience identification; keep wayfinding's decisive primary action, cassette's aligned trailing figures, timetable's density discipline, folio's consistent scale, console's isolated destructive controls, and zone sheets' limited tone ramp. No borrowed costumes. Code-first confirmed by user.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Reference evidence

- EA FC25 official career hub: https://www.ea.com/games/ea-sports-fc/fc-25/news/pitch-notes-fc-25-career-mode-deep-dive
- EA FC26 career reference: https://www.ea.com/games/ea-sports-fc/fc-26/news/pitch-notes-fc26-career-mode-deep-dive
- User confirmed red, complete screen coverage, and direct implementation October 8, 2026.

## Finish record

The full finish review returned seven material fixes. Final verdict: all seven resolved, disposition ship at that fix-list scope. The final evidence spans five career widths plus desktop/mobile/landscape HUD, populated management and career history, dialog/result variants, all tutorial steps and practice completion. Shared tokens are documented from the final code in DESIGN.md and .impeccable/design.json. The intro PNG carries its source provenance; pixels are unchanged.
