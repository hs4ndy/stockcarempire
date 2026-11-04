# VERSION135: Career withdrawal with DNF

Career pause now offers QUIT RACE WITH DNF. It opens the existing in-game confirmation with the exact warning: Are you sure you want to quit this race? It will result in a last-place finish. Yes commits the withdrawal; No or Escape returns to the paused race without changing Career state. Quick Race single/dual and tutorial practice retain their existing cancellation behavior.

## Processing

`js/race3d.js` gates Career behavior with `config.quitWithDNF`. Confirmation is asynchronous and guarded against duplicate requests; a per-launch completion guard prevents duplicate rewards/results. Accepted withdrawal tears down the engine through the normal completion path, discards any finish photograph, and passes a transient quit flag to `js/main.js`. The ordinary Results > Next > Race News > Career sequence stays intact.

`classifyQuitDNF` in `js/race.js` places the player after all other entries, including other DNFs, retains others' relative order and recalculates the existing position-based points/payouts. This means zero championship points and the existing40% last-place DNF purse; entry fees are retained. Race starts, normal wear, actual vehicle condition/crashes, staff pay, standings, sponsorship processing and saving use the standard post-race pipeline. No artificial crash is added. Vehicle totalPoints now uses official result points, correcting the old fallback that awarded positional points even to a DNF.

For withdrawals, the backing simulation includes the complete entered field through the optional `fullField` flag; this avoids classifying a43-car Premier withdrawal40th because of the old advertised-field cap. The default instant-simulation/ordinary-completion behavior is unchanged. Other cars use the on-track order at withdrawal; this feature does not run the rest of the live3D race after the player leaves. No new persistent save fields or migration; the quit-news flag/report/photo remain transient.

## News ownership

Five original satirical withdrawal articles are authored in `tools/build_news.cjs` and generated into `js/news-data/quit.js`, loaded before `js/news.js`. They use the real driver, track and series context, vary without immediate repeats, and rotate the three current reporters. No player interview/quote, photo, photographer credit or unavailable-photo placeholder appears. These are specific to voluntary quitting; ordinary finish/DNF reporting keeps its existing behavior.

The original270 series/position articles and deterministic ordinary reports retain their fingerprints. The generator reproduces all six article banks plus registry exactly. No article copy was changed in the original banks.

## Verification

All configured syntax checks passed. Complete Node suite165/166: only the known AI-passing-in-every-third failure remains. Four withdrawal regressions cover last-place scoring behind other DNFs, immutable source order, five story variants/escaping/no image or quote, zero vehicle points, save snapshot invariance and complete23/29/43-car backing fields. Existing generated-news fingerprints/regeneration and shared physics traces pass.

Eight browser cases passed cleanly: three Career series (including43-car offline Premier with three teammates), confirmation No/Escape pause preservation, Yes classification/scoring/save/news, double-completion guard; Quick single/dual cancellation unchanged; ordinary played Career/photo news and offline simulated final-event news; Quick single/dual normal completion without news. Desktop/phone captures in ignored .impeccable/review/quit135-* were inspected. Tests freeze rendering after real engine initialization for pause-dialog inspection; they do not establish physical Chromebook performance.

The normal-news save fixture now permits only existing sponsor-offer `announced` metadata after returning to Career; all other saved values still compare exactly. Only the approved launch3DRace helper fingerprint changed in the engine fixture; all physics methods, other helpers, tuning and seeded traces remain gated. Earlier Career rollback assertions were updated for the explicitly requested new DNF behavior.
