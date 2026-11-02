# Garage and season rivalries (VERSION123)

Garage titles occupy a fixed40px row, long names ellipsize with full title text, destructive Sell/Retire actions share a6px-gap footer. Card customization remains independent. Names no longer compete for header width with buttons.

Standings driver names are keyboard-operable buttons opening season stats (rank/points/starts/wins/top5/top10). Opposing AI profiles allow Declare/End Rivalry; multiple IDs persist in game.rivalries. Player and hired-teammate profiles cannot declare rivalry. New seasons reset rivalries because entrant identities are regenerated; UI states this scope. Failed contract-style save attempts revert in-memory rivalry list. Older saves without the array work as no rivalries.

Playable Career AI entries carry isRival by entrant ID. Existing _makeCar builds red accent/banner using shared geometry; teammate yellow is preserved. Single/dual leaderboard names get is-rival red style. _raceAggression gains.04 (same existing.9 ceiling) only when a live human is within90 longitudinal/5 lateral units. No extra power, speed, recovery, contact damage or simulated finishing bonus. Driver aggression balance remains for human review; no guaranteed crashes or passes. Quick Race does not assign rivalries.

Tests: three new Node cases (multiple persistent IDs, invalid IDs, near-human bounded aggression/no power change, season reset); three source desktop/offline phone/live3D browser cases (equal headers/no overflow/footer buttons, profile/declare/end/reload, actual rival flag/red banner/red leaderboard). Existing race/career/damage regressions run at delivery. Updated only approved rival-related method fingerprints. No device FPS claim. Source/offline release parity verified at delivery.
