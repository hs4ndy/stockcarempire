# VERSION125 incidents, victory and in-game dialogs

Played Career crash reports retain last3 eligible played races. A race with2+ crashes, or crashes in2 of last3, incurs .5 reputation per current crash capped2. Clean/simulated/easy-mode events never receive this penalty. Existing finish-related gains remain separate. Bounded reputation0–100; zero no longer resets to50. Quit restores the pre-race snapshot including history. No retroactive crash inference. Results notifications explain applied loss.

Human-involved side contact against AI builds.72 strain multiplier vs.80 on Pro/All-Out only, a10% reduction. Semi-Pro .80, AI/AI .28 and player strain unchanged. Damage, spark emissions, crash thresholds and collection rules unchanged. Actual incident frequency still needs playtesting.

Victory presentation: single-player win gets checkered mark, larger Race Winner headline, gold1st Place, red border and one short entrance. Split-screen human win gets a winner headline; non-winning positions/practice retain simpler treatment. Reduced motion disables entrance; no per-frame particles or extra renders.

js/dialogs.js replaces all9 browser prompt/confirm callsites through Promise-based gamePrompt/gameConfirm. Input/save, confirmation/cancel, Escape, Tab containment, background inertness/focus restoration, escaped content. Caller handlers now async. No native API monkey-patching; browser/OS permission UI outside game remains browser-owned. Existing in-game toasts retained. Ctrl/Cmd-S suppressed while custom dialog active to avoid nested dialogs. Legacy standard-staff lookup now uses pay1 rather than OVR79 so Byron99 still migrates old mechanic contracts with prior salary/effects.

Verification details in dated vault session. No full suite/device FPS claim; focused reputation, strain ratios and existing career/damage tests plus live racing/news and dialog browser checks. Only _sideContact/_showFinish/_checkFinish fingerprints changed intentionally. Old native-dialog test fixtures updated to click explicit in-game controls.
