# Version93 difficulty review

User feedback: Pro is close to the sweet spot, slightly easy. Human feedback takes precedence over the fixed driving-policy rankings.

Pro player draft1.02 ->1.00; Beginner/Amateur/Semi-Pro difficulty records unchanged. All-Out AI pace1.065 ->1.055, AI aero1.10 ->1.08, player draft1.00 ->1.06, comeback.55 ->.68. Aggression/racecraft/partnership limits unchanged. All modes receive corrected natural-pace recovery references and equal owned-teammate clean-air pace. AI recovery can target at most six units above natural front pace (or its own natural pace), retaining shared270 cap.

Sustained-push momentum transfer starts at50%, rises after6sec and reaches100% at10sec; recipients of10sec pushes retain an earned run for3.2sec instead of1.6. Short pushes/ordinary passing retain existing carry. No forced results, teleports or leader braking. Reference pace cached once per AI update.

## Checks and limitations

68 Node tests passed. Initial all-five-difficulty review: two seeded26-car runs per mode, plus additional All-Out/stock/upgraded/front-train fixtures. Beginner/Amateur remained relaxed; no evidence justified changing their records. Semi-Pro retained its parameters. Initial stock-vs-upgraded synthetic fixture still finished20th vs3rd: new-career midfield balance remains unconfirmed, and these synthetic rivals do not reproduce the complete career roster. Final focused cases below use exact final engine; scripted overtakes include repeated passes. Not human win rates.

Final passive Pro rides finished3rd/2nd, managed racing5th/1st. All-Out final26th/9th in26cars,13th in20cars,35th in40cars; all made overtakes and retained nearby opening traffic. It remains severe and needs human acceptance; no claim that every setup is balanced.

| Profile | Seed | Field | Mode | Policy | Finish | Nearby at10s | Overtakes | Draft seconds |
|---|---:|---:|---|---|---:|---:|---:|---:|
|quick|3|26|allout|managed|26|23|26|57|
|front-teammates|3|40|pro|ride|3|21|21|23|
|front-teammates|3|40|pro|managed|5|17|10|11|
|quick|17|26|allout|managed|9|25|33|59|
|front-teammates|17|40|pro|ride|2|21|14|42|
|front-teammates|17|40|pro|managed|1|19|9|9|
|quick|17|20|allout|managed|13|19|64|49|
|quick|17|40|allout|managed|35|11|44|59|

Menu button saves an already-bound slot before returning home; a failed save keeps the career open. Unsaved careers remain in memory without touching a slot. Continue Career returns to that same state. Browser checks cover both and sale/storage state is unaffected.
