# Quick Race setup (VERSION118)

Horizontal, wide setup modal preserves shared Barlow fonts, charcoal surfaces, red confirmation and off-white selections. Three desktop columns: Difficulty; Series and Race Rules; Players and Cars. At601–960px, two columns plus full-width car section; at600px and below, vertically stacked sections. No horizontal scrolling. Modal header/footer remain visible with body scrolling. Explicit full-width Confirm Race remains mandatory. All existing data attributes, controls, appearance editor IDs, player key mappings, rules and launch handlers retained. No gameplay/save changes.

Source: js/ui.js renderQuickRaceModal and scoped style.css Quick Race styles. Existing Career customizers remain unaffected. Responsive browser tests in test/e2e/quick-layout.spec.cjs; actual race and confirmation checks in quick-race.spec.cjs. Corrected that test's historical36-car expectation to current40; not a game roster change. Offline HTML/ZIP require regeneration with source.

VERSION119 supersedes layout dimensions: maximum1680px width/820px height, four equal-width desktop columns with separate Settings. Two columns601–1200px, stacked phone. Difficulty grid uses equal fractional row sizing, as does Series. No clipped text/fixed text-height. Five viewport layout cases plus four confirmation/launch cases passed.
