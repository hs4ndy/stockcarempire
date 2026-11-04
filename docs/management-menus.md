# Management menus

VERSION133 reorganizes three existing surfaces within the current charcoal/red sports-career design system. No racing physics, economy rates, save fields or rendering budgets change.

## Quick Race

`renderQuickRaceModal` (`js/ui.js`) has two horizontal steps: race setup (difficulty, series, rules), then players and cars. `setQuickRaceStep` (`js/main.js`) controls visibility; series selection gates Next, and `confirmQuickRace` requires step two. Back preserves selections and cosmetics. Reopening retains the existing difficulty/player/cosmetic preferences but clears the series selection. Explicit Confirm Race remains the only launch action.

Car Studio remains the shared customization editor. Both player cards fit side by side; the duplicate-number warning replaces the keyboard-help line so it cannot push Confirm below a short viewport. Compact CSS covers short landscape and phone layouts. The setup itself has no scrolling at the six tested sizes (1440x900,1366x768,1024x600,844x390,390x844,375x667). The separate Car Studio editor keeps its own existing responsive behavior.

## Team

`HIREABLE_DRIVERS` (`js/data.js`) now contains45 candidates,30 additions. All original15 records/IDs are preserved. OVR is existing driver skill (current developed skill for hires), not a new persisted field. Existing fees (four salaries upfront), per-event payroll, reputation gates, car seats, release and development continue unchanged. Candidate pricing and ratings vary; high-rated additions require reputation.

`renderTeam` separates the owned roster from recruitment. Driver search filters visible rows locally; sort uses highest OVR or lowest signing fee. Support-staff role filtering is retained. The recruitment list has a bounded scroll area, deliberately distinct from the no-scroll Quick Race requirement. Scoped positioning keeps hidden cost labels inside their scroll container.

## Market and tutorial

`renderMarket` has Cars, Financing and Charity views. Purchase/loan/repayment/donation handlers remain unchanged. Cars exposes garage capacity, debt and available credit with a direct loan-options action. Tutorial loan steps select Financing before targeting `#market-loans`; ordinary Market tutorial steps select Cars.

## Ownership and checks

State for menu step, Market view and recruitment sort is ephemeral UI state, not saved career data. Ordered classic script loading remains unchanged. Browser race launch helpers now advance through Next before Confirm. `test/e2e/quick-layout.spec.cjs` covers compact bounds, state retention, duplicate guards, recruitment, and Market flows; `test/recruitment133.test.js` checks candidate integrity and hire constraints. The source and offline release are tested separately. No physical Chromebook FPS claim follows from desktop responsive checks.
## VERSION133 verification

37 source scripts passed syntax checks; final main/ui/tutorial checks also passed after the warning fix. Complete configured Node run:157/158 passed; only the previously documented `AI passing attempts must occur in every third of the race` assertion failed. No racing-engine source changed. Original15 hireable-driver records compare equal to VERSION132.

Six responsive Quick Race cases check both steps, dual selection, equal difficulty tiles, no scroll/overflow, Back retention, launch guards, and duplicate feedback/footer bounds. Source/offline recruitment, Market and tutorial Financing tests passed. Existing Quick Race confirmation tests passed from local HTML after localhost access was denied. Actual dual racing/customization checks include rendering budget, controls, pause, finish and quit; no real Chromebook FPS claim. Detailed scoped-run counts and release identity are in the project vault session record.

Independent Impeccable review scored its one material finding (duplicate warning hiding footer in short viewports) resolved, disposition `ship` at that fix-list scope. Extension documentation preserves incumbent DESIGN files and records older sidecar/layout descriptions without silently rewriting them. Review captures and logs are local ignored evidence in `.impeccable/review/menus133-*`.
Final focused browser verification completed:16/16 menu/confirmation/tutorial-target cases and2/2 actual dual-racing cases passed cleanly (18 distinct scenarios). Full browser-suite success is not claimed.
