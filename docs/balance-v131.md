# VERSION131 initial tuning

Career season history now reserves gold for finalPos1; all other finish numbers
use the shared white text color. Applies to the season-history list only.

Simulation managed perfScore is centered on rival median plus clamp((prior team
score-50)*.15,-5,5); existing phase randomness/incidents/actual classification
remain authoritative. No assigned finish or automatic win. Upgrades, skill,
condition and staff still influence score within the bounded range.

Paired diagnostic: seed271,100 repeated stock-car simulations for each of three
series x Semi-Pro/Pro/All-Out; same generated roster/events for before/after,
without applying race results/earning progression between samples.900 paired
races. Data: simulation-v131.jsonl. Old means19.29–19.8/25.79–25.8/39.78–39.87;
new11-ish/16-ish/23-ish. New last-place frequency0–2 per100,0 wins observed.
This is a narrow stock-car diagnostic, not calibrated human/economy acceptance.

All-Out aiAggro1.65->1.85, racecraft1.25->1.65; raw speed/draft/recovery
unchanged. Human-caused AI side strain.72->.04 (94.4% less), AI-only.28->.24
(14.3% less). Human side strain/tolerance and other difficulties unchanged.
This preserves contact/damage consequences; no invulnerability or forced DNF.

Syntax and configured Node151/152 pass; only the existing AI-passing-in-every-
third assertion fails. All-Out opening/dual seeded traces refreshed intentionally;
non-All-Out rows verified identical. Only _sideContact engine method fingerprint
changed. Existing incident test updated for intentionally different All-Out
scale, assertion retained for Pro/human parity. Source desktop/offline phone
history checks2/2 pass. Full browser/device playtests not claimed. User All-Out
feedback remains required before calling competitive balance successful.
