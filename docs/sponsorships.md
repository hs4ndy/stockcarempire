# Sponsorship offers (VERSION121)

Ownership/loading: sponsor-data.js defines60 fictional brands, tiers, gates and logo briefs. sponsors.js owns private RNG, migration, offers, contracts, payouts and seasons. sponsor-ui.js owns the Career panel, notices and acceptance dialogs. Load data.js then sponsor-data.js/sponsors.js before game.js; sponsor-ui.js before ui.js. Test loader reads support order from index.html including historical revisions. Offline builder embeds same order.

Persisted sponsorship.version1 stores explicit pay/bonus/endYear contracts and offers, processed event IDs, independent RNG, milestones, recent player finishes, unread state and lifetime sponsorship earnings. No old freely-signable API, extra-slot Director benefit, per-car income multiplier or skipped-race payments. News-close notification display does not write a save itself; reading/signing offers persists status. No changes to racing RNG, physics or classification. Hall of Fame includes a compact partner/earnings summary for new retirements.

Tier caps: Grassroots1+1+0; Challenger1+2+1; Premier1+3+3. Terms1–5 seasons including signing year. Signing is free and payments begin next completed event; replacement is free but explicit, targeting one existing same-tier deal. Primary win bonus50%, Secondary top5/Tertiary top10 bonus25%. Director income is baked into offers; later staff changes do not reprice them. Best Director approach bonus5/8/11/14/18 points; additive income bonuses2/4/6/8/10%. Milestones max2 offers; ordinary20%+Director chance1 offer. Three-weekend offer expiry counts skips; Quit restores prior state. Championship/primary renewal handled on season rollover; promotion/relegation resets contracts and sends new-series starters.

Migration replaces old deals with starters, maps Director role to new effects without salary/identity changes, preserves other state and persists once. Failure restores durable original bytes and previous live career. No fabricated podium/history claims. Podium/consistency gates before the update use newly observed recent finishes, since old saves lack sufficient reliable detail. Catalog and reusable logo prompts: sponsor-catalog.md. Styled text identities now; no 3D room or generated logo installation.

## Initial economy measurements — approved values unchanged

Script: node tools/measure_sponsor_economy.cjs.18 scripted first-season profiles using generated full AI rosters and deterministic costs; automatically accept best available pay, repair after each event, one mechanic/crew chief and optional hired second car. Starts with$1m for accounting solvency. Excludes initial capital/hiring costs and teammate prize earnings; no race damage beyond ordinary wear, upgrades, loans or season awards. These are accounting examples, not human balance or complete-career forecasts. Detailed evidence in sponsor-economy-initial.json.

| Series | Profile | Cars | Sponsor income | Expenses | Cash growth |
|---|---|---:|---:|---:|---:|
| Grassroots | backmarker | 1 | $41,500 | $69,750 | $-21,050 |
| Grassroots | backmarker | 2 | $41,500 | $109,818 | $-61,118 |
| Grassroots | midfield | 1 | $58,200 | $69,750 | $42,450 |
| Grassroots | midfield | 2 | $58,200 | $109,818 | $2,382 |
| Grassroots | winning | 1 | $158,063 | $69,750 | $358,313 |
| Grassroots | winning | 2 | $158,063 | $109,818 | $318,245 |
| Challenger | backmarker | 1 | $257,800 | $274,490 | $-12,790 |
| Challenger | backmarker | 2 | $257,800 | $384,741 | $-123,041 |
| Challenger | midfield | 1 | $257,800 | $274,490 | $74,310 |
| Challenger | midfield | 2 | $257,800 | $384,741 | $-35,941 |
| Challenger | winning | 1 | $1,038,563 | $274,490 | $1,414,073 |
| Challenger | winning | 2 | $1,038,563 | $384,741 | $1,303,822 |
| Premier | backmarker | 1 | $2,169,000 | $1,280,371 | $892,229 |
| Premier | backmarker | 2 | $2,169,000 | $1,830,731 | $341,869 |
| Premier | midfield | 1 | $2,169,000 | $1,280,371 | $1,392,629 |
| Premier | midfield | 2 | $2,169,000 | $1,830,731 | $842,269 |
| Premier | winning | 1 | $9,133,469 | $1,280,371 | $15,053,098 |
| Premier | winning | 2 | $9,133,469 | $1,830,731 | $14,502,738 |

Measured concern: winning Premier income remains very generous (~$9.13m sponsors/$15.05m one-car cash growth before capital purchases), while lower-series backmarker/two-car profiles can lose money. Reported to user before delivery; no unauthorized payout tuning. Actual human economy and fresh-start liquidity require playtesting. Do not claim these initial values are balanced.

## Verification
Full configured Node suite136/137: only pre-existing AI-passing-in-every-third assertion failed, matching documented baseline debt. After the additional podium-window correction,28 focused sponsorship/staff/news tests passed. Eight Playwright source/offline scenarios passed including actual3D Career photo/results/news, Quick Race absence of news (single/dual), sponsor UI desktop1440/1024/phone390, migration/replacement/Hall recap. JS syntax and diff checks passed. Not a full browser-suite pass or Chromebook device test. Old economic tests were replaced with offer-based assertions; direct test loaders now include sponsor scripts. Existing race-source fingerprints/seeded traces remain unchanged.
