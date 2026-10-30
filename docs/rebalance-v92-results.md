# Version 92 competitiveness checks

Approved initial tuning implemented; balance goals remain unconfirmed. User explicitly requested commit/push for playtest after reviewing shortfalls.

66 Node tests and four browser cases passed. These regressions do not establish human competitiveness. Scripted Quick Race uses equal-power humans, uniform random rivals, rear formation-speed starts, no wrecks, and a fixed managed-driving policy. Career comparisons use representative stock/maximum powers against identical synthetic fields, not a full career AI roster. Front teammate fixture uses power .99 and three .95 teammates. Two seeds do not establish a win rate.

## Shortfalls

All six All-Out Quick Race fixtures finished last. Pro produced no wins across six fixtures. Passive front teammate riding won both measured seeds at .99; existing .95 fixture still passes. No human playtest performed. Retain these as open balance issues; no additional tuning applied beyond the approved values.

## Measurements

Opening nearby = rivals within100 units at10s; opening gap = leader distance at10s; draft seconds = one-second samples with player tow>.04; overtakes includes repeated passes. Before uses4c241db source and .60 player power.

| Profile | Seed | Field | Difficulty | Policy | Finish | Opening nearby | Opening gap | Draft seconds | Overtakes |
|---|---:|---:|---|---|---:|---:|---:|---:|---:|
| before-quick | 17 | 20 | semipro | managed | 2 | 8 | 171.7 | 56 | 45 |
| quick | 3 | 20 | semipro | managed | 4 | 19 | 53.7 | 32 | 37 |
| quick | 17 | 20 | semipro | managed | 2 | 17 | 41.3 | 38 | 44 |
| before-quick | 17 | 20 | pro | managed | 20 | 3 | 175.2 | 52 | 0 |
| quick | 3 | 20 | pro | managed | 5 | 0 | 159.1 | 63 | 18 |
| quick | 17 | 20 | pro | managed | 11 | 19 | 38.6 | 48 | 55 |
| before-quick | 17 | 20 | allout | managed | 20 | 0 | 262.5 | 4 | 0 |
| quick | 3 | 20 | allout | managed | 20 | 0 | 201.7 | 41 | 0 |
| quick | 17 | 20 | allout | managed | 20 | 2 | 163.7 | 47 | 0 |
| before-quick | 17 | 26 | semipro | managed | 2 | 1 | 245.6 | 41 | 39 |
| quick | 3 | 26 | semipro | managed | 3 | 14 | 151.7 | 48 | 48 |
| quick | 17 | 26 | semipro | managed | 1 | 22 | 122.6 | 26 | 40 |
| before-quick | 17 | 26 | pro | managed | 26 | 1 | 210.8 | 39 | 0 |
| quick | 3 | 26 | pro | managed | 26 | 0 | 200.8 | 46 | 1 |
| quick | 17 | 26 | pro | managed | 4 | 4 | 171.2 | 58 | 31 |
| before-quick | 17 | 26 | allout | managed | 26 | 0 | 346.8 | 3 | 0 |
| quick | 3 | 26 | allout | managed | 26 | 0 | 229.1 | 20 | 0 |
| quick | 17 | 26 | allout | managed | 26 | 1 | 199.7 | 25 | 0 |
| before-quick | 17 | 40 | semipro | managed | 40 | 0 | 322.7 | 54 | 0 |
| quick | 3 | 40 | semipro | managed | 6 | 8 | 238.3 | 45 | 83 |
| quick | 17 | 40 | semipro | managed | 7 | 6 | 247.3 | 48 | 64 |
| before-quick | 17 | 40 | pro | managed | 40 | 0 | 337.8 | 6 | 0 |
| quick | 3 | 40 | pro | managed | 40 | 1 | 348.3 | 36 | 1 |
| quick | 17 | 40 | pro | managed | 36 | 3 | 284.5 | 50 | 11 |
| before-quick | 17 | 40 | allout | managed | 40 | 0 | 494.8 | 2 | 0 |
| quick | 3 | 40 | allout | managed | 40 | 0 | 402.4 | 7 | 0 |
| quick | 17 | 40 | allout | managed | 40 | 0 | 384.9 | 6 | 0 |
| career-stock | 17 | 20 | pro | managed | 20 | 0 | 202.2 | 26 | 0 |
| career-upgraded | 17 | 20 | pro | managed | 1 | 18 | 0.4 | 16 | 38 |
| career-stock | 17 | 26 | pro | managed | 26 | 0 | 202.7 | 36 | 0 |
| career-upgraded | 17 | 26 | pro | managed | 1 | 25 | 43.4 | 39 | 66 |
| career-stock | 17 | 40 | pro | managed | 40 | 1 | 337.5 | 43 | 1 |
| career-upgraded | 17 | 40 | pro | managed | 32 | 8 | 222.3 | 59 | 56 |
| front-teammates | 3 | 40 | pro | ride | 1 | 27 | 44.2 | 44 | 29 |
| front-teammates | 3 | 40 | pro | managed | 1 | 21 | 0.0 | 11 | 13 |
| front-teammates | 17 | 40 | pro | ride | 1 | 25 | 19.5 | 41 | 33 |
| front-teammates | 17 | 40 | pro | managed | 3 | 20 | 0.0 | 15 | 50 |
