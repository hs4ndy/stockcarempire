# Stock Car Empire — Complete Source Snapshot

**Companion to `HANDOFF.md` (Section 4: Current Source Code).**

This file is generated **mechanically by concatenation** — it is a byte-for-byte copy of
every project file, not a transcription. Nothing is abbreviated, summarised or elided.

- **Snapshot of commit:** `ca0245c`
- **Generated:** 2026-09-05T23:05:01Z
- **Files:** 8 (index.html, style.css, js/data.js, js/game.js, js/race.js, js/race3d.js, js/ui.js, js/main.js)

> **The files in the repository are authoritative.** If this snapshot and the real files
> ever disagree, the real files are correct and this snapshot is stale. Prefer reading
> `js/*.js`, `index.html` and `style.css` directly.

## Contents

1. [index.html](#1-indexhtml)
2. [style.css](#2-stylecss)
3. [js/data.js](#3-jsdatajs)
4. [js/game.js](#4-jsgamejs)
5. [js/race.js](#5-jsracejs)
6. [js/race3d.js](#6-jsrace3djs)
7. [js/ui.js](#7-jsuijs)
8. [js/main.js](#8-jsmainjs)

---

## 1. `index.html`

*251 lines, 10649 bytes.*

`````html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Stock Car Empire Beta</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
</head>
<body>

<!-- ═══════════════════════════════════════════════════════ -->
<!--  INTRO SCREEN                                          -->
<!-- ═══════════════════════════════════════════════════════ -->
<div id="screen-intro" class="screen">
  <div class="intro-checker-strip top"></div>
  <div class="intro-bg-lines"></div>

  <div class="intro-layout">
    <div class="intro-center">
      <div class="intro-logo">
        <div class="logo-main-wrap">
          <span class="logo-main">Stock Car</span>
          <span class="logo-empire">Empire</span>
        </div>
        <div class="logo-beta">BETA</div>
        <div class="logo-stripe"></div>
      </div>

      <p class="intro-tagline">
        Start with one car and a dream &mdash; build a dynasty &amp; conquer the Premier Cup Series.
      </p>

      <div class="intro-buttons">
        <button class="btn-game btn-game-primary" id="btn-start-new">
          <span>New Career</span>
        </button>
        <button class="btn-game btn-game-ghost" id="btn-load-game">
          <span>Load a Game</span>
        </button>
        <button class="btn-game btn-game-ghost" id="btn-quick-race">
          <span>Quick Race</span>
        </button>
      </div>

      <div class="intro-series-strip">
        <span>GRASSROOTS CUP</span>
        <span class="intro-series-dot"></span>
        <span>CHALLENGER SERIES</span>
        <span class="intro-series-dot"></span>
        <span>PREMIER CUP SERIES</span>
      </div>
    </div>
  </div>

  <div class="intro-checker-strip bottom"></div>
</div>

<!-- ═══════════════════════════════════════════════════════ -->
<!--  SETUP SCREEN                                          -->
<!-- ═══════════════════════════════════════════════════════ -->
<div id="screen-setup" class="screen hidden">
  <div class="setup-bg-lines"></div>
  <div class="setup-panel">
    <div class="setup-panel-header">
      <div class="setup-panel-title-row">
        <span class="setup-panel-number">01</span>
        <div>
          <div class="setup-panel-title">START YOUR CAREER</div>
          <div class="setup-panel-sub">Grassroots Cup · Season 1 · $50,000 starting budget</div>
        </div>
      </div>
    </div>

    <div class="setup-panel-body">
      <div class="form-group">
        <label class="form-label" for="inp-team-name">Team Name</label>
        <input type="text" id="inp-team-name" placeholder="e.g. Thunder Valley Racing" maxlength="40" autocomplete="off">
        <span class="form-hint">How your team appears in standings and race results.</span>
      </div>

      <div class="form-group">
        <label class="form-label" for="inp-driver-name">Driver Name</label>
        <input type="text" id="inp-driver-name" placeholder="e.g. Bobby Racer, J. Smith" maxlength="30" autocomplete="off">
        <span class="form-hint">Your name behind the wheel — shown on screen during races.</span>
      </div>

      <div class="form-group">
        <label class="form-label" for="inp-car-name">First Car's Name</label>
        <input type="text" id="inp-car-name" placeholder="e.g. Old Betsy, The Rocket, #7" maxlength="30" autocomplete="off">
        <span class="form-hint">Name your ride — you'll remember it when you win your first race.</span>
      </div>
    </div>

    <div class="setup-panel-footer">
      <button class="btn-game btn-game-ghost" onclick="showScreen('intro')">Back</button>
      <button class="btn-game btn-game-primary" id="btn-create-team">
        <span>Continue</span>
      </button>
    </div>
  </div>

  <!-- Step 2 — choose difficulty before the career begins -->
  <div class="setup-panel hidden" id="setup-difficulty">
    <div class="setup-panel-header">
      <div class="setup-panel-title-row">
        <span class="setup-panel-number">02</span>
        <div>
          <div class="setup-panel-title">CHOOSE YOUR DIFFICULTY</div>
          <div class="setup-panel-sub">How hard the field races you. You can change this later in Settings.</div>
        </div>
      </div>
    </div>
    <div class="setup-panel-body">
      <div class="difficulty-grid lg" id="setup-difficulty-grid"></div>
    </div>
    <div class="setup-panel-footer">
      <button class="btn-game btn-game-ghost" onclick="backToSetupDetails()">Back</button>
      <button class="btn-game btn-game-primary" id="btn-begin-career">
        <span>Begin Career</span>
      </button>
    </div>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════ -->
<!--  MAIN GAME SCREEN                                      -->
<!-- ═══════════════════════════════════════════════════════ -->
<div id="screen-game" class="screen hidden">

  <!-- Header bar — pit wall command center -->
  <header class="game-header">
    <div class="header-brand">
      <span class="header-brand-flag"></span>
      <div class="header-brand-text">
        <span class="header-brand-main">Stock Car</span>
        <span class="header-brand-sub">Empire</span>
      </div>
    </div>

    <div class="header-telemetry">
      <div class="telem-cell">
        <span class="telem-label">TEAM</span>
        <span class="telem-value" id="hdr-team">—</span>
      </div>
      <div class="telem-cell telem-money">
        <span class="telem-label">CASH</span>
        <span class="telem-value" id="hdr-money">$0</span>
      </div>
      <div class="telem-cell">
        <span class="telem-label">SERIES</span>
        <span class="telem-value" id="hdr-series">GRC</span>
      </div>
      <div class="telem-cell">
        <span class="telem-label">RACE</span>
        <span class="telem-value" id="hdr-race">—</span>
      </div>
      <div class="telem-cell">
        <span class="telem-label">SEASON</span>
        <span class="telem-value" id="hdr-year">1</span>
      </div>
    </div>

    <div class="header-actions">
      <button class="btn btn-sm btn-ghost" id="btn-hdr-save" onclick="handleSaveGame()" title="Save (Ctrl+S)">Save</button>
      <button class="btn btn-sm btn-ghost" onclick="handleNewGamePrompt()" title="New Game">New</button>
    </div>
  </header>

  <!-- Navigation — race program tab strip -->
  <nav class="game-nav">
    <div class="nav-flag-accent"></div>
    <button class="nav-btn active" data-tab="dashboard">
      <span class="nav-idx">01</span>
      <span class="nav-label">Dashboard</span>
    </button>
    <button class="nav-btn" data-tab="garage">
      <span class="nav-idx">02</span>
      <span class="nav-label">Garage</span>
    </button>
    <button class="nav-btn" data-tab="team">
      <span class="nav-idx">03</span>
      <span class="nav-label">Team</span>
    </button>
    <button class="nav-btn" data-tab="schedule">
      <span class="nav-idx">04</span>
      <span class="nav-label">Schedule</span>
    </button>
    <button class="nav-btn" data-tab="market">
      <span class="nav-idx">05</span>
      <span class="nav-label">Market</span>
    </button>
    <button class="nav-btn" data-tab="standings">
      <span class="nav-idx">06</span>
      <span class="nav-label">Standings</span>
    </button>
    <button class="nav-btn" data-tab="carstats">
      <span class="nav-idx">07</span>
      <span class="nav-label">Career</span>
    </button>
    <button class="nav-btn" data-tab="settings">
      <span class="nav-idx">08</span>
      <span class="nav-label">Settings</span>
    </button>
    <div class="nav-end-cap"></div>
  </nav>

  <!-- Dynamic main content -->
  <main id="main-content">
    <!-- Rendered by JS -->
  </main>

</div>

<!-- ═══════════════════════════════════════════════════════ -->
<!--  RACE SETUP SCREEN                                     -->
<!-- ═══════════════════════════════════════════════════════ -->
<div id="screen-race-setup" class="screen hidden">
  <div id="race-setup-content">
    <!-- Rendered by JS -->
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════ -->
<!--  RACE SETUP SCREEN (replaced by race-setup-content)   -->
<!--  RACE 3D SCREEN                                       -->
<!-- ═══════════════════════════════════════════════════════ -->
<div id="screen-game-race" class="screen hidden">
  <div id="race-3d-container">
    <!-- Race3D injects canvas + HUD here -->
  </div>
</div>

<!-- Toast container (always present) -->
<div id="toast-container"></div>

<!-- ═══════════════════════════════════════════════════════ -->
<!--  Scripts                                               -->
<!-- ═══════════════════════════════════════════════════════ -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js"></script>
<script src="js/data.js"></script>
<script src="js/game.js"></script>
<script src="js/race.js"></script>
<script src="js/race3d.js"></script>
<script src="js/ui.js"></script>
<script src="js/main.js"></script>

</body>
</html>
`````

---

## 2. `style.css`

*1692 lines, 52017 bytes.*

`````css
/* ============================================================
   STOCK CAR EMPIRE — UI System
   Flat. Strict palette. One typeface (Archivo). One animation.
   No gradients, no shadows, no glows, no emojis, no icons.
   ============================================================ */

/* ---- Design tokens ---------------------------------------- */
:root {
  /* Surfaces — single neutral scale */
  --bg:        #0D0D0F;
  --panel:     #15151A;
  --panel-2:   #1C1C22;
  --panel-3:   #232329;

  /* Lines */
  --line:      #2A2A33;
  --line-2:    #383843;

  /* Text */
  --text:      #ECECEF;
  --text-dim:  #8C8C99;
  --text-mute: #5A5A66;

  /* Accent + functional (flat) */
  --accent:        #E4002B;
  --accent-press:  #B30021;
  --accent-ink:    #FFFFFF;
  --good:          #2FBF71;
  --warn:          #E0A800;

  /* JS inline-style aliases (do not rename — referenced from ui.js) */
  --green: var(--good);
  --red:   var(--accent);
  --gold:  var(--warn);

  --font: 'Archivo', 'Helvetica Neue', Arial, system-ui, sans-serif;

  --maxw: 1160px;
  --t:    150ms;
}

/* ---- Reset ------------------------------------------------- */
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font);
  font-size: 15px;
  line-height: 1.45;
  font-weight: 400;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
button, input, select { font-family: inherit; color: inherit; }
button { cursor: pointer; border: none; background: none; }
a { color: inherit; text-decoration: none; }
h1, h2, h3, h4, p { margin: 0; }
.hidden { display: none !important; }

/* Numerals: consistent tabular figures wherever they matter */
.telem-value, .cmd-value, .cmd-sub, .stat-value, .pts-val, .st-pts,
.st-pos, .st-races, .st-wins, .st-top5, .res-pos, .res-pts, .res-prize,
.ss-num, .big-pos, .big-prize, .r3d-chip, .pos-num, .race-num,
.car-mini-score, .nav-idx, .setup-panel-number {
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}

/* ---- The one global animation ----------------------------- */
@keyframes sce-rise {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.screen:not(.hidden) { animation: sce-rise var(--t) ease-out both; }
#main-content > * { animation: sce-rise var(--t) ease-out both; }
.modal { animation: sce-rise var(--t) ease-out both; }

/* ============================================================
   TYPOGRAPHY PRIMITIVES
   ============================================================ */
.cmd-label, .telem-label, .stat-label, .form-label,
.card-header, .nav-label {
  text-transform: uppercase;
  letter-spacing: 0.13em;
  font-weight: 600;
  font-size: 11px;
  color: var(--text-dim);
}

.muted-text { color: var(--text-dim); }
.small { font-size: 12px; }
.green { color: var(--good); }
.red { color: var(--accent); }
.gold { color: var(--warn); }
.highlight { color: var(--text); font-weight: 700; }
.link { color: var(--text); border-bottom: 1px solid var(--accent); cursor: pointer; padding-bottom: 1px; }
.link:hover { color: var(--accent); }

.mt { margin-top: 1rem; }
.mb { margin-bottom: 1rem; }

/* ============================================================
   BUTTONS
   ============================================================ */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: .4em;
  padding: 9px 16px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text);
  background: var(--panel-2);
  border: 1px solid var(--line-2);
  transition: background-color var(--t) linear,
              border-color var(--t) linear,
              color var(--t) linear;
}
.btn:hover { background: var(--panel-3); border-color: var(--text-mute); }

.btn-primary { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
.btn-primary:hover { background: var(--accent-press); border-color: var(--accent-press); }

.btn-ghost { background: transparent; border-color: var(--line-2); color: var(--text-dim); }
.btn-ghost:hover { background: transparent; border-color: var(--text-dim); color: var(--text); }

.btn-danger { background: transparent; border-color: var(--accent); color: var(--accent); }
.btn-danger:hover { background: var(--accent); color: var(--accent-ink); }

.btn-warning { background: transparent; border-color: var(--warn); color: var(--warn); }
.btn-warning:hover { background: var(--warn); color: #0D0D0F; }

.btn-sm { padding: 6px 11px; font-size: 11px; }
.btn-lg { padding: 13px 24px; font-size: 13px; }

.btn:disabled,
.btn[disabled] { opacity: .35; cursor: not-allowed; }
.btn:disabled:hover { background: var(--panel-2); border-color: var(--line-2); color: var(--text); }

.btn-row { display: flex; flex-wrap: wrap; gap: .55rem; }

/* ============================================================
   INTRO SCREEN
   ============================================================ */
#screen-intro {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
  background: var(--bg);
  padding: 2rem;
}
.intro-checker-strip {
  position: absolute;
  left: 0; right: 0;
  height: 4px;
  background: var(--accent);
}
.intro-checker-strip.top { top: 0; }
.intro-checker-strip.bottom { bottom: 0; }
.intro-bg-lines { display: none; }

.intro-layout { display: flex; justify-content: center; width: 100%; }
.intro-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 520px;
}

.intro-logo { margin-bottom: 1.6rem; }
.logo-main-wrap { display: flex; flex-direction: column; align-items: center; line-height: 1; }
.logo-main {
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: 0.42em;
  text-transform: uppercase;
  color: var(--text-dim);
  padding-left: 0.42em;
}
.logo-empire {
  font-size: 4.4rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--text);
  margin-top: .25rem;
}
.logo-beta {
  display: inline-block;
  margin-top: .7rem;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--accent);
  border: 1px solid var(--accent);
  padding: 3px 10px;
}
.logo-stripe {
  width: 64px;
  height: 4px;
  background: var(--accent);
  margin: 1.1rem auto 0;
}

.intro-tagline {
  color: var(--text-dim);
  font-size: 15px;
  line-height: 1.6;
  max-width: 420px;
  margin-bottom: 2rem;
}

.intro-buttons {
  display: flex;
  flex-direction: column;
  gap: .7rem;
  width: 280px;
  margin-bottom: 2.2rem;
}
.btn-game {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 14px 18px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  border: 1px solid var(--line-2);
  background: var(--panel);
  color: var(--text);
  transition: background-color var(--t) linear,
              border-color var(--t) linear,
              color var(--t) linear;
}
.btn-game:hover { border-color: var(--text-mute); background: var(--panel-2); }
.btn-game-primary { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
.btn-game-primary:hover { background: var(--accent-press); border-color: var(--accent-press); }
.btn-game-chevron { display: none; }

.intro-series-strip {
  display: flex;
  align-items: center;
  gap: .8rem;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-mute);
}
.intro-series-dot {
  display: inline-block;
  width: 5px; height: 5px;
  background: var(--accent);
  font-size: 0;
  color: transparent;
}

/* ============================================================
   SETUP SCREEN
   ============================================================ */
#screen-setup {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  position: relative;
}
.setup-bg-lines { display: none; }
.setup-panel {
  width: 100%;
  max-width: 540px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-top: 4px solid var(--accent);
}
.setup-panel-header {
  padding: 1.5rem 1.75rem;
  border-bottom: 1px solid var(--line);
}
.setup-panel-title-row { display: flex; align-items: center; gap: 1.1rem; }
.setup-panel-number {
  font-size: 2.6rem;
  font-weight: 800;
  line-height: 1;
  color: var(--panel-3);
}
.setup-panel-title {
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.setup-panel-sub { font-size: 12px; color: var(--text-dim); margin-top: .25rem; }
.setup-panel-body { padding: 1.75rem; display: flex; flex-direction: column; gap: 1.35rem; }
.setup-panel-footer {
  padding: 1.25rem 1.75rem;
  border-top: 1px solid var(--line);
  display: flex;
  justify-content: space-between;
  gap: .75rem;
}

.form-group { display: flex; flex-direction: column; gap: .4rem; }
.form-label { display: block; }
.form-hint { font-size: 12px; color: var(--text-mute); }
.form-warning {
  font-size: 12px;
  color: var(--warn);
  border-left: 3px solid var(--warn);
  background: var(--panel-2);
  padding: 8px 10px;
  margin: .5rem 0 .75rem;
}
input[type="text"], .form-select {
  width: 100%;
  padding: 11px 12px;
  background: var(--bg);
  border: 1px solid var(--line-2);
  color: var(--text);
  font-size: 14px;
  transition: border-color var(--t) linear;
}
input[type="text"]:focus, .form-select:focus { outline: none; border-color: var(--accent); }
input[type="text"]::placeholder { color: var(--text-mute); }

/* ============================================================
   GAME SHELL — HEADER
   ============================================================ */
#screen-game { min-height: 100vh; }

.game-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0 1.5rem;
  height: 60px;
  background: var(--panel);
  border-bottom: 1px solid var(--line);
  position: sticky;
  top: 0;
  z-index: 40;
}
.header-brand { display: flex; align-items: center; gap: .7rem; }
.header-brand-flag {
  width: 14px; height: 26px;
  background: var(--accent);
  display: inline-block;
}
.header-brand-text { display: flex; flex-direction: column; line-height: 1; }
.header-brand-main {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--text-dim);
}
.header-brand-sub {
  font-size: 17px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.header-telemetry {
  display: flex;
  align-items: stretch;
  margin-left: auto;
  border-left: 1px solid var(--line);
}
.telem-cell {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  padding: 0 1.1rem;
  border-right: 1px solid var(--line);
}
.telem-label { font-size: 9px; letter-spacing: 0.16em; }
.telem-value { font-size: 14px; font-weight: 700; }
.telem-money .telem-value { color: var(--warn); }

.header-actions { display: flex; gap: .5rem; }
.btn.btn-unsaved { color: var(--warn); border-color: var(--warn); }

/* ============================================================
   GAME SHELL — NAV
   ============================================================ */
.game-nav {
  display: flex;
  align-items: stretch;
  gap: 0;
  padding: 0 1.5rem;
  background: var(--panel);
  border-bottom: 1px solid var(--line);
  position: sticky;
  top: 60px;
  z-index: 39;
  overflow-x: auto;
}
.nav-flag-accent { width: 4px; background: var(--accent); margin-right: 1rem; flex: none; }
.nav-end-cap { flex: 1; }
.nav-btn {
  display: flex;
  align-items: center;
  gap: .55rem;
  padding: 0 1.1rem;
  height: 46px;
  color: var(--text-mute);
  border-bottom: 2px solid transparent;
  white-space: nowrap;
  transition: color var(--t) linear, border-color var(--t) linear;
}
.nav-btn:hover { color: var(--text-dim); }
.nav-btn.active { color: var(--text); border-bottom-color: var(--accent); }
.nav-icon, .nav-idx {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--text-mute);
}
.nav-btn.active .nav-icon, .nav-btn.active .nav-idx { color: var(--accent); }
.nav-label { color: inherit; font-size: 12px; }

/* ============================================================
   MAIN CONTENT LAYOUT
   ============================================================ */
#main-content {
  max-width: var(--maxw);
  margin: 0 auto;
  padding: 1.75rem 1.5rem 3rem;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--line);
}
.page-header h2 {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

/* ============================================================
   CARDS
   ============================================================ */
.card {
  background: var(--panel);
  border: 1px solid var(--line);
  padding: 1.25rem;
}
.card-header {
  display: block;
  padding-bottom: .7rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--line);
}
.card-body { display: block; }

.two-col-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
}

/* ============================================================
   COMMAND STRIP (dashboard top)
   ============================================================ */
.cmd-strip {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  border: 1px solid var(--line);
  background: var(--panel);
  margin-bottom: 1.5rem;
}
.cmd-cell {
  display: flex;
  flex-direction: column;
  gap: .3rem;
  padding: 1.1rem 1.2rem;
  border-right: 1px solid var(--line);
}
.cmd-cell:last-child { border-right: none; }
.cmd-label { font-size: 10px; }
.cmd-value { font-size: 1.7rem; font-weight: 800; line-height: 1; }
.cmd-value.gold { color: var(--warn); }
.cmd-sub { font-size: 11px; color: var(--text-mute); }

/* ============================================================
   STAT ROWS / BARS
   ============================================================ */
.stat-row {
  display: grid;
  grid-template-columns: 92px 1fr 40px;
  align-items: center;
  gap: .7rem;
  margin-bottom: .55rem;
}
.stat-label { font-size: 10px; }
.stat-bar-wrap {
  height: 6px;
  background: var(--panel-3);
  overflow: hidden;
}
.stat-bar {
  height: 100%;
  width: 0;
  transition: width .3s ease-out;
}
.bar-green  { background: var(--good); }
.bar-yellow { background: var(--warn); }
.bar-red    { background: var(--accent); }
.stat-value { font-size: 12px; font-weight: 700; text-align: right; }

.team-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: .45rem 0;
  border-bottom: 1px solid var(--line);
  font-size: 13px;
}
.team-stat:last-child { border-bottom: none; }
.team-stat > span:first-child { color: var(--text-dim); }

/* ============================================================
   RACE SPOTLIGHT (next race card)
   ============================================================ */
.race-spotlight {
  display: flex;
  flex-direction: column;
  gap: .3rem;
  padding: 1rem;
  margin-bottom: 1rem;
  background: var(--panel-2);
  border-left: 3px solid var(--accent);
}
.race-spotlight-name { font-size: 1.15rem; font-weight: 800; }
.race-spotlight-meta { font-size: 12px; color: var(--text-dim); }

/* ============================================================
   STANDINGS (mini + full)
   ============================================================ */
.standings-mini { display: flex; flex-direction: column; }
.standing-row {
  display: grid;
  grid-template-columns: 28px 1fr auto;
  align-items: center;
  gap: .6rem;
  padding: .45rem 0;
  border-bottom: 1px solid var(--line);
  font-size: 13px;
}
.standing-row:last-child { border-bottom: none; }
.standing-row.player-row {
  background: var(--panel-2);
  border-left: 3px solid var(--accent);
  padding-left: .6rem;
  margin-left: -.6rem;
}
.pos-num { font-weight: 700; color: var(--text-dim); text-align: center; }
.entry-name { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.player-row .entry-name { font-weight: 700; }
.pts-val { font-size: 12px; color: var(--text-dim); font-weight: 700; }

.season-progress-bar-wrap {
  height: 6px;
  background: var(--panel-3);
  overflow: hidden;
  margin-bottom: .4rem;
}
.season-progress-bar { height: 100%; background: var(--accent); transition: width .3s ease-out; }

.standings-row {
  display: grid;
  grid-template-columns: 48px 1fr 60px 60px 60px 70px auto;
  align-items: center;
  gap: .5rem;
  padding: .55rem .25rem;
  border-bottom: 1px solid var(--line);
  font-size: 13px;
}
.standings-row:last-child { border-bottom: none; }
.standings-header {
  border-bottom: 1px solid var(--line-2);
  margin-bottom: .25rem;
}
.standings-header span {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-mute);
  font-weight: 600;
}
.standings-row.player-standing {
  background: var(--panel-2);
  border-left: 3px solid var(--accent);
}
/* Your other cars, run by hired drivers */
.standings-row.team-standing { border-left: 3px solid var(--warn); }
.standings-row.team-standing .st-name { color: var(--warn); }
.standing-row.team-row .entry-name { color: var(--warn); }
.car-num { color: var(--text-dim); }
/* Team name shown after the driver name in standings */
.st-team { color: var(--text-mute); font-size: 11px; }
.player-standing .st-team, .player-row .st-team { color: var(--text-dim); }
.st-pos { text-align: center; font-weight: 700; color: var(--text-dim); }
.st-pos.promo-pos { color: var(--good); }
.st-pos.rele-pos { color: var(--accent); }
.st-name { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.player-standing .st-name { font-weight: 700; }
.st-races, .st-wins, .st-top5 { text-align: center; color: var(--text-dim); }
.st-pts { text-align: right; font-weight: 700; }

/* ============================================================
   GARAGE
   ============================================================ */
.car-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.25rem;
}
.car-card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-top: 3px solid var(--accent);
  padding: 1.1rem;
}
.car-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .75rem;
  margin-bottom: 1rem;
}
.car-name { font-size: 1.05rem; font-weight: 800; }
.car-class-badge {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-dim);
  border: 1px solid var(--line-2);
  padding: 3px 8px;
  min-width: 18px;
  text-align: center;
}
.car-stats { margin-bottom: 1rem; }
.car-meta { margin-bottom: 1rem; }
.car-actions { display: flex; flex-wrap: wrap; gap: .5rem; margin-bottom: 1rem; }

.car-color-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: .4rem;
  padding-top: .9rem;
  border-top: 1px solid var(--line);
}
.car-color-row .stat-label { width: 100%; margin-bottom: .2rem; }
.color-swatch {
  width: 20px; height: 20px;
  border: 1px solid var(--line-2);
  padding: 0;
  transition: transform var(--t) ease, border-color var(--t) linear;
}
.color-swatch:hover { transform: scale(1.12); }
.color-swatch.active { border-color: var(--text); border-width: 2px; }

.car-mini-row {
  display: flex;
  align-items: center;
  gap: .7rem;
  padding: .4rem 0;
  border-bottom: 1px solid var(--line);
  font-size: 13px;
}
.car-mini-row:last-of-type { border-bottom: none; }
.car-mini-name { min-width: 90px; font-weight: 600; }
.car-mini-score { font-size: 12px; font-weight: 700; color: var(--text-dim); min-width: 38px; text-align: right; }

/* ============================================================
   BADGES
   ============================================================ */
.badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 3px 8px;
  border: 1px solid var(--line-2);
  color: var(--text-dim);
}
.badge-green  { color: var(--good);  border-color: var(--good); }
.badge-red    { color: var(--accent); border-color: var(--accent); }
.badge-yellow,
.badge-orange { color: var(--warn);  border-color: var(--warn); }
.badge-blue,
.badge-gray   { color: var(--text-dim); border-color: var(--line-2); }

/* ============================================================
   UPGRADES
   ============================================================ */
.upgrade-summary {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  border: 1px solid var(--line);
  background: var(--panel-2);
  margin-bottom: 1.25rem;
}
.upgrade-summary > div {
  display: flex; flex-direction: column; gap: 3px;
  padding: .65rem .75rem;
  border-right: 1px solid var(--line);
}
.upgrade-summary > div:last-child { border-right: none; }
.upgrade-sum-label {
  font-size: 9px; font-weight: 600; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--text-dim);
}
.upgrade-sum-val { font-size: 15px; font-weight: 800; font-variant-numeric: tabular-nums; }

.upgrade-tier { margin-bottom: 1.35rem; }
.upgrade-tier.is-locked { opacity: .5; }
.upgrade-tier-head {
  display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  padding-bottom: .5rem; margin-bottom: .35rem;
  border-bottom: 1px solid var(--line-2);
}
.upgrade-tier-name {
  display: block;
  font-size: 12px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
}
.upgrade-tier-blurb { display: block; font-size: 11px; color: var(--text-mute); margin-top: 2px; }
.upgrade-tier-count {
  flex: none;
  font-size: 12px; font-weight: 800; font-variant-numeric: tabular-nums;
  color: var(--text-dim);
  border: 1px solid var(--line-2); padding: 3px 9px;
}
.upgrade-tier-count.is-full { color: var(--good); border-color: var(--good); }
.upgrade-row.locked { opacity: .75; }

.upgrade-list { display: flex; flex-direction: column; }
.upgrade-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: .85rem 0;
  border-bottom: 1px solid var(--line);
}
.upgrade-row:last-child { border-bottom: none; }
.upgrade-row.installed { opacity: .6; }
.upgrade-info { display: flex; flex-direction: column; gap: .15rem; }
.upgrade-name { font-weight: 700; font-size: 14px; }
.upgrade-effect { font-size: 12px; color: var(--good); }
.upgrade-prereq { font-size: 11px; }

/* ============================================================
   STAFF / DRIVER ROWS
   ============================================================ */
.staff-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: .8rem 0;
  border-bottom: 1px solid var(--line);
}
.staff-row:last-child { border-bottom: none; }
.staff-info { display: flex; flex-direction: column; gap: .2rem; }
.staff-name { font-weight: 700; font-size: 14px; }
.staff-meta { font-size: 12px; color: var(--text-dim); }
/* Hired driver progress toward their personal ceiling */
.driver-growth {
  width: 160px; height: 4px;
  margin-top: 4px;
  background: var(--panel-3);
  overflow: hidden;
}
.driver-growth-fill { height: 100%; background: var(--good); transition: width .3s ease-out; }

/* ============================================================
   BANK / LOANS
   ============================================================ */
.loan-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: .8rem;
  margin-bottom: .6rem;
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-left: 3px solid var(--warn);
}
.loan-row.is-late { border-left-color: var(--accent); }
.loan-info { display: flex; flex-direction: column; gap: .2rem; }
.loan-name { font-weight: 700; font-size: 14px; }
.loan-row.is-late .loan-name { color: var(--accent); }
.loan-actions { display: flex; gap: .4rem; flex: none; }

/* ============================================================
   SCHEDULE
   ============================================================ */
.season-stats-bar {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  border: 1px solid var(--line);
  background: var(--panel);
  margin-bottom: 1.5rem;
}
.season-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: .25rem;
  padding: 1rem;
  border-right: 1px solid var(--line);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-dim);
}
.season-stat:last-child { border-right: none; }
.ss-num { font-size: 1.5rem; font-weight: 800; color: var(--text); letter-spacing: 0; }

.schedule-list { display: flex; flex-direction: column; border: 1px solid var(--line); }
.schedule-row {
  display: grid;
  grid-template-columns: 40px 1fr auto auto;
  align-items: center;
  gap: 1rem;
  padding: .85rem 1.1rem;
  background: var(--panel);
  border-bottom: 1px solid var(--line);
}
.schedule-row:last-child { border-bottom: none; }
.schedule-row.next-race { border-left: 3px solid var(--accent); }
.race-num { font-size: 1.1rem; font-weight: 800; color: var(--text-mute); text-align: center; }
.race-details { display: flex; flex-direction: column; gap: .15rem; }
.race-track { font-weight: 700; font-size: 14px; }
.race-type { font-size: 12px; }
.race-result { font-size: 12px; text-align: right; }

/* ============================================================
   RACE SETUP PAGE
   ============================================================ */
#screen-race-setup { min-height: 100vh; padding: 2.5rem 1.5rem; }
.race-setup-page { max-width: 760px; margin: 0 auto; }
.race-info-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  background: var(--panel-2);
  border-left: 3px solid var(--accent);
  margin-bottom: 1rem;
}
.race-track-name { font-size: 1.4rem; font-weight: 800; }
.race-track-name.big { font-size: 1.6rem; }
.race-details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 1.5rem; }
.radio-row {
  display: flex;
  align-items: center;
  gap: .7rem;
  padding: .7rem 0;
  border-bottom: 1px solid var(--line);
  font-size: 13px;
  cursor: pointer;
}
.radio-row:last-child { border-bottom: none; }
.radio-row input { accent-color: var(--accent); }

/* ============================================================
   LIVE RACE (text) SCREEN
   ============================================================ */
.race-screen { max-width: var(--maxw); margin: 0 auto; padding: 1.5rem; }
.race-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 1rem;
  margin-bottom: 1.25rem;
  border-bottom: 1px solid var(--line);
}
.race-header h2 { font-size: 1.4rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.03em; }
.race-phase {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
  border: 1px solid var(--accent);
  padding: 4px 10px;
}
.race-main { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 1.25rem; }
.race-events-log { max-height: 360px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
.race-event {
  padding: 6px 10px;
  font-size: 13px;
  background: var(--panel-2);
  border-left: 3px solid var(--line-2);
  color: var(--text-dim);
}
.race-event.evt-caution     { border-left-color: var(--warn); color: var(--text); }
.race-event.evt-dnf         { border-left-color: var(--accent); color: var(--text); }
.race-event.evt-lead_change { border-left-color: var(--text); color: var(--text); }
.race-event.evt-finish      { border-left-color: var(--accent); color: var(--text); font-weight: 700; }
.race-event.evt-player      { background: var(--panel-3); color: var(--text); font-weight: 600; }
.race-footer { display: flex; gap: .6rem; }

.lb-row {
  display: flex;
  align-items: center;
  gap: .6rem;
  padding: .4rem 0;
  border-bottom: 1px solid var(--line);
  font-size: 13px;
}
.lb-row:last-child { border-bottom: none; }
.lb-player { background: var(--panel-2); border-left: 3px solid var(--accent); padding-left: .5rem; }
.lb-pos { min-width: 24px; font-weight: 700; color: var(--text-dim); text-align: center; }
.lb-dot { width: 10px; height: 10px; flex: none; }
.lb-name { font-weight: 500; }
.lb-player .lb-name { font-weight: 700; }
.lb-badge { margin-left: auto; }

/* ============================================================
   MODALS
   ============================================================ */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  z-index: 100;
}
.modal {
  width: 100%;
  max-width: 460px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  background: var(--panel);
  border: 1px solid var(--line-2);
  border-top: 4px solid var(--accent);
}
.modal-wide { max-width: 620px; }
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.1rem 1.35rem;
  border-bottom: 1px solid var(--line);
}
.modal-header h3 { font-size: 1.1rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.03em; }
.modal-body { padding: 1.35rem; overflow-y: auto; }
.modal-body p { color: var(--text-dim); margin-bottom: .75rem; }
.modal-body .form-label { margin-top: .5rem; }
.modal-footer {
  padding: 1.1rem 1.35rem;
  border-top: 1px solid var(--line);
  display: flex;
  justify-content: flex-end;
  gap: .6rem;
}
.modal-close {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-dim);
  border: 1px solid var(--line-2);
  padding: 5px 10px;
  transition: color var(--t) linear, border-color var(--t) linear;
}
.modal-close:hover { color: var(--text); border-color: var(--text-dim); }

/* ============================================================
   RACE RESULTS
   ============================================================ */
.results-list { display: flex; flex-direction: column; }
.result-row {
  display: grid;
  grid-template-columns: 40px 1fr auto auto auto;
  align-items: center;
  gap: .7rem;
  padding: .55rem .25rem;
  border-bottom: 1px solid var(--line);
  font-size: 13px;
}
.result-row:last-child { border-bottom: none; }
.result-row.player-result { background: var(--panel-2); border-left: 3px solid var(--accent); }
.res-pos { text-align: center; font-weight: 700; color: var(--text-dim); }
.res-pos.podium { color: var(--warn); }
.res-name { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.player-result .res-name { font-weight: 700; }
.res-pts { font-size: 12px; color: var(--text-dim); }
.res-prize { font-weight: 700; text-align: right; }

.player-result-hero {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.25rem;
  margin-bottom: 1rem;
  background: var(--panel-2);
  border-left: 4px solid var(--accent);
}
.big-pos-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent);
  writing-mode: vertical-rl;
  transform: rotate(180deg);
}
.big-pos { font-size: 2rem; font-weight: 800; line-height: 1; }
.big-prize { font-size: 1.1rem; font-weight: 700; margin-top: .25rem; }

/* ============================================================
   END SEASON / CAREER CHOICE
   ============================================================ */
/* ── Championship celebration ───────────────────────────── */
.champ-modal { border-top-color: var(--warn); }
.champ-banner {
  padding: 1.6rem 1.35rem 1.3rem;
  text-align: center;
  background: var(--panel-2);
  border-bottom: 1px solid var(--line);
}
.champ-checker {
  height: 8px;
  background-image:
    linear-gradient(45deg, var(--text) 25%, transparent 25%, transparent 75%, var(--text) 75%),
    linear-gradient(45deg, var(--text) 25%, transparent 25%, transparent 75%, var(--text) 75%);
  background-size: 16px 16px;
  background-position: 0 0, 8px 8px;
  background-color: var(--bg);
  opacity: .85;
}
.champ-eyebrow {
  margin-top: 1rem;
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.24em; text-transform: uppercase;
  color: var(--text-dim);
}
.champ-title {
  font-size: 3.2rem; font-weight: 800; line-height: 1;
  letter-spacing: 0.1em;
  color: var(--warn);
  margin: .4rem 0 .3rem;
}
.champ-driver {
  font-size: 1.15rem; font-weight: 800;
  letter-spacing: 0.05em; text-transform: uppercase;
  margin-bottom: 1rem;
}
.champ-stats {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  border: 1px solid var(--line);
  background: var(--panel-2);
  margin-bottom: 1rem;
}
.champ-stats > div {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: .75rem .4rem;
  border-right: 1px solid var(--line);
}
.champ-stats > div:last-child { border-right: none; }
.champ-stat-num { font-size: 1.5rem; font-weight: 800; font-variant-numeric: tabular-nums; }
.champ-stat-label {
  font-size: 9px; font-weight: 600;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-dim);
}
.champ-purse {
  display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  padding: .9rem 1rem;
  background: var(--panel-2);
  border-left: 4px solid var(--warn);
  margin-bottom: 1rem;
}
.champ-purse-label {
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.16em; text-transform: uppercase; color: var(--text-dim);
}
.champ-purse-val {
  font-size: 1.5rem; font-weight: 800;
  color: var(--warn); font-variant-numeric: tabular-nums;
}
@media (max-width: 560px) {
  .champ-stats { grid-template-columns: repeat(3, 1fr); }
  .champ-title { font-size: 2.4rem; }
}

.achievement-badge {
  display: inline-block;
  margin-top: .75rem;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--good);
  border: 1px solid var(--good);
}
.achievement-badge.rele { color: var(--accent); border-color: var(--accent); }

/* Difficulty picker */
.difficulty-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: .6rem;
  margin-top: .5rem;
}
.difficulty-card {
  display: flex;
  flex-direction: column;
  gap: .25rem;
  padding: .8rem .9rem;
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-left: 3px solid var(--line-2);
  cursor: pointer;
  transition: border-color var(--t) linear, background-color var(--t) linear;
}
.difficulty-card:hover { border-left-color: var(--text-dim); }
.difficulty-card.selected { border-left-color: var(--accent); background: var(--panel-3); }
.difficulty-name {
  font-size: 12px; font-weight: 800;
  letter-spacing: 0.08em; text-transform: uppercase;
}
.difficulty-card.selected .difficulty-name { color: var(--accent); }
.difficulty-blurb { font-size: 11px; color: var(--text-dim); line-height: 1.4; }

/* Larger presentation — Settings and new-career setup */
.difficulty-grid.lg { grid-template-columns: repeat(4, 1fr); gap: .8rem; }
.difficulty-grid.lg .difficulty-card {
  padding: 1.15rem 1.1rem;
  border-left-width: 4px;
  min-height: 116px;
}
.difficulty-grid.lg .difficulty-name { font-size: 15px; letter-spacing: 0.1em; }
.difficulty-grid.lg .difficulty-blurb { font-size: 12px; margin-top: .15rem; }
/* The setup panel is narrow — two up reads far better than four */
#setup-difficulty { max-width: 700px; }
#setup-difficulty .difficulty-grid.lg { grid-template-columns: repeat(2, 1fr); }
#setup-difficulty .difficulty-card { min-height: 132px; }

@media (max-width: 1100px) { .difficulty-grid.lg { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) {
  .difficulty-grid { grid-template-columns: 1fr; }
  .difficulty-grid.lg { grid-template-columns: 1fr; }
  .difficulty-grid.lg .difficulty-card { min-height: 0; }
}

/* Quick Race series picker */
.quick-series { display: flex; flex-direction: column; gap: .6rem; margin-top: .5rem; }
.quick-series-btn {
  display: flex; flex-direction: column; gap: .2rem;
  padding: .85rem .9rem;
  text-align: left;
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-left: 3px solid var(--line-2);
  transition: border-color var(--t) linear, background-color var(--t) linear;
}
.quick-series-btn:hover { border-left-color: var(--accent); background: var(--panel-3); }
.quick-series-name {
  font-size: 13px; font-weight: 800;
  letter-spacing: 0.06em; text-transform: uppercase;
}
.quick-series-meta { font-size: 11px; color: var(--text-dim); }

.career-choices { display: flex; flex-direction: column; gap: .75rem; margin-top: 1rem; }
.career-card {
  display: flex;
  flex-direction: column;
  gap: .35rem;
  padding: 1.1rem;
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-left: 3px solid var(--line-2);
  cursor: pointer;
  transition: border-color var(--t) linear, background-color var(--t) linear;
}
.career-card:hover { border-left-color: var(--text-dim); }
.career-card.selected { border-left-color: var(--accent); background: var(--panel-3); }
.career-icon {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--text-mute);
  font-variant-numeric: tabular-nums;
}
.career-title { font-size: 1rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.03em; }
.career-desc { font-size: 13px; color: var(--text-dim); }

/* ============================================================
   SAVE / LOAD SLOTS
   ============================================================ */
.save-slots { display: flex; flex-direction: column; gap: .7rem; }
.save-slot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-left: 3px solid var(--accent);
}
.save-slot-empty { border-left-color: var(--line-2); }
.save-slot-info { font-size: 13px; line-height: 1.5; }
.save-slot-info strong { font-weight: 800; }
.save-slot-actions { display: flex; gap: .5rem; flex: none; }

/* ============================================================
   TOASTS
   ============================================================ */
#toast-container {
  position: fixed;
  right: 1.25rem;
  bottom: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: .6rem;
  z-index: 200;
}
.toast {
  min-width: 240px;
  max-width: 360px;
  padding: 12px 16px;
  background: var(--panel-3);
  border: 1px solid var(--line-2);
  border-left: 4px solid var(--text-dim);
  color: var(--text);
  font-size: 13px;
  opacity: 0;
  transform: translateX(16px);
  transition: opacity var(--t) linear, transform var(--t) ease-out;
}
.toast.show { opacity: 1; transform: translateX(0); }
.toast-success { border-left-color: var(--good); }
.toast-error   { border-left-color: var(--accent); }
.toast-warning { border-left-color: var(--warn); }
.toast-info    { border-left-color: var(--text-dim); }

/* ============================================================
   3D RACE — CONTAINER + HUD
   ============================================================ */
/* 100vw would include the scrollbar and force horizontal overflow — use 100%. */
#screen-game-race { height: 100vh; width: 100%; background: #000; overflow: hidden; }
#race-3d-container { position: relative; width: 100%; height: 100%; overflow: hidden; }

#r3d-hud {
  position: absolute;
  inset: 0;
  pointer-events: none;
  font-family: var(--font);
}
.r3d-pause-btn {
  position: absolute;
  top: 18px;
  right: 18px;
  pointer-events: auto;
  padding: 8px 14px;
  background: rgba(13, 13, 15, 0.82);
  border: 1px solid var(--line-2);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text);
  transition: border-color var(--t) linear, color var(--t) linear;
}
.r3d-pause-btn:hover { border-color: var(--accent); color: var(--accent); }

/* Running-order tower (top-left) */
.r3d-order {
  position: absolute;
  top: 18px;
  left: 18px;
  width: 236px;
  background: rgba(13, 13, 15, 0.82);
  border: 1px solid var(--line-2);
  border-left: 3px solid var(--accent);
}
.r3d-order-row {
  display: grid;
  grid-template-columns: 22px 8px 34px 1fr;
  align-items: center;
  gap: 7px;
  padding: 5px 10px;
  border-bottom: 1px solid rgba(42, 42, 51, 0.7);
  font-size: 12px;
}
.r3d-order-row:last-child { border-bottom: none; }
.r3d-order-row.is-player { background: rgba(228, 0, 43, 0.16); }
.r3d-order-row.is-teammate .r3d-order-name { color: var(--warn); }
.r3d-order-pos { font-weight: 800; color: var(--text-dim); text-align: right; font-variant-numeric: tabular-nums; }
.r3d-order-row.is-player .r3d-order-pos { color: var(--accent); }
.r3d-order-chip { width: 8px; height: 14px; }
.r3d-order-num { font-weight: 700; color: var(--text); font-variant-numeric: tabular-nums; }
.r3d-order-name {
  color: var(--text-dim);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.r3d-order-row.is-player .r3d-order-name { color: var(--text); font-weight: 700; }

/* Field minimap (right edge, vertical) */
.r3d-map {
  position: absolute;
  top: 50%;
  right: 18px;
  transform: translateY(-50%);
  width: 60px;
  background: rgba(13, 13, 15, 0.82);
  border: 1px solid var(--line-2);
  padding: 8px 0;
}
.r3d-map-head {
  text-align: center;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.16em;
  color: var(--text-dim);
  margin-bottom: 6px;
}
.r3d-map-track {
  position: relative;
  width: 26px;
  height: min(320px, 42vh);
  margin: 0 auto;
  background: var(--panel-2);
  border-left: 1px solid var(--line-2);
  border-right: 1px solid var(--line-2);
}
.r3d-map-finish {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: var(--accent);
}
.r3d-map-dot {
  position: absolute;
  width: 6px; height: 6px;
  margin: -3px 0 0 -3px;
  background: var(--text-dim);
  border-radius: 50%;
}
.r3d-map-dot.is-player {
  width: 9px; height: 9px;
  margin: -4.5px 0 0 -4.5px;
  background: var(--accent);
  border: 1px solid #fff;
  z-index: 2;
}

/* Telemetry cluster (bottom-left) */
.r3d-telemetry {
  position: absolute;
  left: 18px;
  bottom: 18px;
  width: 220px;
  background: rgba(13, 13, 15, 0.82);
  border: 1px solid var(--line-2);
  border-left: 3px solid var(--accent);
  padding: 12px 14px;
}
.r3d-tele-pos { display: flex; align-items: baseline; gap: 6px; }
.r3d-tele-pos-num { font-size: 2.4rem; font-weight: 800; line-height: 1; color: var(--text); font-variant-numeric: tabular-nums; }
.r3d-tele-pos-of { font-size: 12px; color: var(--text-dim); font-variant-numeric: tabular-nums; }
.r3d-tele-speed { display: flex; align-items: baseline; gap: 5px; margin: 6px 0 10px; }
.r3d-tele-speed > span:first-child { font-size: 1.6rem; font-weight: 800; color: var(--text); font-variant-numeric: tabular-nums; }
.r3d-tele-unit { font-size: 10px; font-weight: 700; letter-spacing: 0.14em; color: var(--text-dim); }
.r3d-draft-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-mute);
  margin-bottom: 4px;
}
.r3d-draft-meter { height: 6px; background: var(--panel-3); overflow: hidden; }
.r3d-draft-fill { height: 100%; width: 0; background: var(--accent); transition: width 0.12s linear; }

#r3d-pause-overlay {
  position: absolute;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.78);
  pointer-events: auto;
}
#r3d-pause-overlay.active { display: flex; }
.r3d-pause-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  padding: 2.5rem 3rem;
  background: var(--panel);
  border: 1px solid var(--line-2);
  border-top: 4px solid var(--accent);
}
.r3d-pause-title {
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}
.r3d-pause-resume {
  padding: 12px 28px;
  background: var(--accent);
  border: 1px solid var(--accent);
  color: var(--accent-ink);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  transition: background-color var(--t) linear;
}
.r3d-pause-resume:hover { background: var(--accent-press); }

#r3d-mirror-wrap {
  position: absolute;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  width: min(620px, 44vw);
  height: 104px;
  border: 1px solid var(--line-2);
  background: rgba(0,0,0,0.4);
}
.r3d-mirror-label {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  padding: 1px 10px;
  background: var(--bg);
  border: 1px solid var(--line-2);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-dim);
}

.r3d-progress-wrap {
  position: absolute;
  left: 50%;
  bottom: 64px;
  transform: translateX(-50%);
  /* calc keeps the bar clear of the telemetry panel on the left */
  width: min(560px, calc(100vw - 470px));
  height: 6px;
  background: rgba(255,255,255,0.12);
  border: 1px solid var(--line-2);
}
.r3d-progress-fill { height: 100%; width: 0; background: var(--accent); transition: width .2s linear; }
.r3d-progress-label {
  position: absolute;
  right: 0;
  top: -18px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-dim);
}

.r3d-warning {
  position: absolute;
  top: 40%;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 22px;
  background: rgba(13,13,15,0.9);
  border: 1px solid var(--accent);
  color: var(--accent);
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.r3d-countdown {
  position: absolute;
  top: 38%;
  left: 0;
  right: 0;
  text-align: center;
  transform: translateY(-50%);
  white-space: nowrap;          /* "GREEN FLAG" must never wrap */
  font-size: 7rem;
  font-weight: 800;
  color: var(--text);
}
.r3d-countdown.go { color: var(--good); font-size: min(4rem, 8vw); letter-spacing: 0.1em; }

.r3d-finish {
  position: absolute;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.82);
  pointer-events: auto;
}
.r3d-finish-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2.5rem 3rem;
  background: var(--panel);
  border: 1px solid var(--line-2);
  border-top: 4px solid var(--accent);
  text-align: center;
}
.r3d-finish-pos { font-size: 3rem; font-weight: 800; line-height: 1; }
.r3d-finish-msg {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-dim);
}

.r3d-controls-hint {
  position: absolute;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  padding: 7px 16px;
  background: rgba(13, 13, 15, 0.82);
  border: 1px solid var(--line);
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--text-dim);
}
.r3d-controls-hint span {
  display: inline-block;
  min-width: 18px;
  padding: 1px 5px;
  margin: 0 2px;
  background: var(--panel-3);
  border: 1px solid var(--line-2);
  color: var(--text);
  font-weight: 700;
  text-align: center;
}

/* ============================================================
   RESPONSIVE
   ============================================================ */
/* Shell pieces must be allowed to shrink before they overflow */
.game-header, .game-nav { max-width: 100%; }
.header-brand, .header-actions { flex: none; }
.header-telemetry { min-width: 0; overflow: hidden; }
.telem-cell { min-width: 0; }
.telem-value { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ---- Desktop → laptop: shed the least critical telemetry first ---- */
@media (max-width: 1180px) {
  .telem-cell:nth-child(5) { display: none; }   /* SEASON */
  #main-content { padding: 1.5rem 1.15rem 2.5rem; }
}
@media (max-width: 1040px) {
  .telem-cell:nth-child(4) { display: none; }   /* RACE */
}
@media (max-width: 920px) {
  .dashboard-grid { grid-template-columns: repeat(2, 1fr); }
  .cmd-strip { grid-template-columns: repeat(2, 1fr); }
  .cmd-cell:nth-child(2n) { border-right: none; }
  .race-main { grid-template-columns: 1fr; }
  .telem-cell:nth-child(3) { display: none; }   /* SERIES */
  .header-brand-text { display: none; }
  .game-header { gap: .9rem; padding: 0 1rem; }
  .game-nav { padding: 0 1rem; }
  .nav-btn { padding: 0 .8rem; }
}
@media (max-width: 760px) {
  .header-telemetry { display: none; }
  .header-actions { margin-left: auto; }   /* keep actions right-aligned */
  .page-header h2 { font-size: 1.25rem; }
}
@media (max-width: 640px) {
  .dashboard-grid,
  .two-col-grid { grid-template-columns: 1fr; }
  .cmd-strip { grid-template-columns: 1fr; }
  .cmd-cell { border-right: none; border-bottom: 1px solid var(--line); }
  .season-stats-bar { grid-template-columns: repeat(2, 1fr); }
  .standings-row { grid-template-columns: 36px 1fr 56px; }
  .standings-row .st-races,
  .standings-row .st-wins,
  .standings-row .st-top5 { display: none; }
  .car-grid { grid-template-columns: 1fr; }
  .schedule-row { grid-template-columns: 32px 1fr auto; }
  .schedule-row .race-result { display: none; }
  .result-row { grid-template-columns: 34px 1fr auto auto; }
  .result-row .res-pts { display: none; }
  .intro-buttons { width: 100%; max-width: 300px; }
  .logo-empire { font-size: 3rem; }
  .setup-panel-footer { flex-direction: column-reverse; }
  .setup-panel-footer .btn-game { width: 100%; }
  #toast-container { left: 1rem; right: 1rem; }
  .toast { max-width: none; }
}

/* ============================================================
   RESPONSIVE — IN-RACE HUD
   Scales with the viewport so nothing overlaps at any window size.
   ============================================================ */
@media (max-width: 1240px) {
  .r3d-order { width: 208px; }
  .r3d-telemetry { width: 196px; }
}
/* Below here the mirror is width-limited by calc() so it can never grow into
   the running-order tower on the left or the pause button on the right. */
@media (max-width: 1040px) {
  .r3d-map { display: none; }               /* mirror + tower matter more */
  #r3d-mirror-wrap { width: min(460px, calc(100vw - 500px)); height: 92px; }
}
@media (max-width: 860px) {
  .r3d-order { width: 178px; font-size: 11px; }
  .r3d-order-row { grid-template-columns: 18px 6px 30px 1fr; gap: 5px; padding: 4px 8px; }
  .r3d-telemetry { width: 168px; padding: 10px 11px; }
  .r3d-tele-pos-num { font-size: 1.9rem; }
  .r3d-tele-speed > span:first-child { font-size: 1.3rem; }
  #r3d-mirror-wrap { width: min(420px, calc(100vw - 430px)); height: 82px; }
}
@media (max-width: 680px) {
  .r3d-order { display: none; }             /* telemetry carries position */
  #r3d-mirror-wrap { width: 62vw; height: 74px; }
  /* Telemetry becomes a bottom bar; the progress bar sits above it. */
  .r3d-telemetry {
    left: 12px; right: 12px; bottom: 12px; width: auto;
    display: flex; align-items: center; gap: 14px; padding: 9px 12px;
  }
  .r3d-tele-speed { margin: 0; }
  .r3d-draft { flex: 1; min-width: 70px; }
  .r3d-progress-wrap { width: calc(100vw - 24px); bottom: 92px; }
  .r3d-controls-hint { display: none; }
}
@media (max-width: 520px) {
  /* Keep the centered mirror clear of the pause button in the corner */
  #r3d-mirror-wrap { width: min(62vw, calc(100vw - 210px)); height: 64px; }
  .r3d-pause-btn { padding: 6px 10px; font-size: 10px; }
}
/* Short windows: keep the mirror and progress bar clear of each other */
@media (max-height: 620px) {
  #r3d-mirror-wrap { height: 74px; }
  .r3d-map-track { height: 200px; }
  .r3d-order-row:nth-child(n+6) { display: none; }
  .r3d-countdown { font-size: 4.5rem; }
}
`````

---

## 3. `js/data.js`

*444 lines, 23557 bytes.*

`````javascript
// ============================================================
// STOCK CAR EMPIRE - Game Data Constants
// ============================================================

const SERIES = [
  {
    id: 'grassroots',
    name: 'Grassroots Cup',
    shortName: 'GRC',
    level: 0,
    racesPerSeason: 18,
    carClass: 'stock',
    entryFee: 500,
    prize: [5000,3500,2500,2000,1800,1600,1400,1200,1100,1000,900,800,700,600,500,400,300,200,150,100],
    points: [40,35,31,28,25,22,20,18,16,14,12,10,8,6,4,3,2,1,0,0],
    promotionSpots: 3,
    relegationSpots: 0,
    fieldSize: 20,
    color: '#3fb950',
    description: 'Entry-level racing on small ovals and short tracks.'
  },
  {
    id: 'challenger',
    name: 'Challenger Series',
    shortName: 'CS',
    level: 1,
    racesPerSeason: 26,
    carClass: 'modified',
    entryFee: 2500,
    prize: [25000,18000,14000,11000,9000,8000,7000,6000,5500,5000,4500,4000,3500,3000,2500,2000,1500,1000,750,500,400,300,250,200,150,100],
    points: [50,45,41,38,35,32,30,28,26,24,22,20,18,16,14,12,10,8,6,4,3,2,1,0,0,0],
    promotionSpots: 3,
    relegationSpots: 3,
    fieldSize: 26,
    color: '#58a6ff',
    description: 'Mid-level series with bigger tracks and higher stakes.'
  },
  {
    id: 'premier',
    name: 'Premier Cup Series',
    shortName: 'PCS',
    level: 2,
    racesPerSeason: 36,
    carClass: 'premier',
    entryFee: 12000,
    prize: [200000,150000,120000,100000,85000,75000,65000,55000,50000,45000,40000,36000,32000,28000,25000,22000,20000,18000,16000,14000,12000,10000,8000,6000,4000,3000,2000,1500,1000,750,600,500,400,300,200,100],
    points: [60,55,51,48,45,42,40,38,36,34,32,30,28,26,24,22,20,18,16,14,12,10,8,6,4,3,2,1,0,0,0,0,0,0,0,0],
    promotionSpots: 0,
    relegationSpots: 3,
    fieldSize: 36,
    color: '#e3b341',
    description: 'The pinnacle of stock car racing. The biggest stages, biggest money.'
  }
];

const TRACKS = [
  // Entry series tracks
  { id: 't01', name: 'Thunder Creek Speedway',   type: 'short_oval',    length: 0.5,  series: [0,1],   speedW: 0.7, handW: 1.3, laps: 200 },
  { id: 't02', name: 'Pinewood Raceway',          type: 'short_oval',    length: 0.75, series: [0,1],   speedW: 0.8, handW: 1.2, laps: 160 },
  { id: 't03', name: 'Blue Ridge Circuit',        type: 'road_course',   length: 1.8,  series: [0,1,2], speedW: 0.8, handW: 1.2, laps: 65  },
  { id: 't04', name: 'Lakeside Speedway',         type: 'intermediate',  length: 1.5,  series: [0,1,2], speedW: 1.0, handW: 1.0, laps: 200 },
  { id: 't05', name: 'Capital Motor Speedway',    type: 'intermediate',  length: 1.0,  series: [0,1],   speedW: 0.95,handW: 1.05,laps: 250 },
  { id: 't06', name: 'Riverside Short Track',     type: 'short_oval',    length: 0.5,  series: [0],     speedW: 0.7, handW: 1.3, laps: 200 },
  { id: 't07', name: 'Dusty Creek Speedway',      type: 'short_oval',    length: 0.625,series: [0,1],   speedW: 0.75,handW: 1.25,laps: 180 },
  { id: 't08', name: 'Valley Fairgrounds Oval',   type: 'short_oval',    length: 0.4,  series: [0],     speedW: 0.65,handW: 1.35,laps: 250 },
  // Challenger & Premier tracks
  { id: 't09', name: 'Southland Motor Speedway',  type: 'intermediate',  length: 1.5,  series: [1,2],   speedW: 1.0, handW: 1.0, laps: 200 },
  { id: 't10', name: 'Gateway International',     type: 'intermediate',  length: 2.0,  series: [1,2],   speedW: 1.1, handW: 0.95,laps: 160 },
  { id: 't11', name: 'Coastal Road Circuit',      type: 'road_course',   length: 2.4,  series: [1,2],   speedW: 0.85,handW: 1.2, laps: 60  },
  { id: 't12', name: 'Midwest Speedway',          type: 'intermediate',  length: 1.5,  series: [1,2],   speedW: 1.0, handW: 1.0, laps: 200 },
  { id: 't13', name: 'Heritage Raceway',          type: 'intermediate',  length: 1.33, series: [1,2],   speedW: 0.97,handW: 1.03,laps: 220 },
  { id: 't14', name: 'Mountainview Speedway',     type: 'intermediate',  length: 1.5,  series: [1,2],   speedW: 1.0, handW: 1.0, laps: 200 },
  // Premier only
  { id: 't15', name: 'Eagle Superspeedway',       type: 'superspeedway', length: 2.5,  series: [2],     speedW: 1.35,handW: 0.75,laps: 200 },
  { id: 't16', name: 'National Motor Speedway',   type: 'superspeedway', length: 2.66, series: [2],     speedW: 1.4, handW: 0.7, laps: 188 },
  { id: 't17', name: 'Grand Prix Circuit',        type: 'road_course',   length: 3.0,  series: [2],     speedW: 0.8, handW: 1.3, laps: 55  },
  { id: 't18', name: 'Premier Oval Classic',      type: 'intermediate',  length: 1.5,  series: [2],     speedW: 1.0, handW: 1.0, laps: 200 },
  { id: 't19', name: 'Diamond State Speedway',    type: 'intermediate',  length: 1.0,  series: [2],     speedW: 0.95,handW: 1.05,laps: 300 },
  { id: 't20', name: 'Sunset Superspeedway',      type: 'superspeedway', length: 2.5,  series: [2],     speedW: 1.35,handW: 0.75,laps: 200 },
];

// ─── Upgrades ────────────────────────────────────────────────
// Three tiers, and you may fit at most MAX_PER_TIER parts from each one.
// A tier only opens once the tier below it is full, so every purchase is a
// real choice instead of a checklist you eventually buy out.
const MAX_PER_TIER = 3;

const UPGRADE_TIERS = [
  { tier: 1, name: 'Foundation',  blurb: 'Bolt-on basics. Cheap gains to get the car competitive.' },
  { tier: 2, name: 'Performance', blurb: 'Serious hardware. Bigger gains, bigger invoices.' },
  { tier: 3, name: 'Elite',       blurb: 'Factory-level programmes reserved for front-running teams.' },
];

// base = price for the entry-level Stock Car; higher classes scale it up.
// Five options per tier but only three slots (more with a Data Analyst), so
// there is always something left on the table.
const UPGRADE_POOL = [
  // Tier 1
  { id: 'engine_tune', tier: 1, name: 'Engine Tune',         base: 3500, effect: { speed: 8 } },
  { id: 'susp_kit',    tier: 1, name: 'Suspension Kit',       base: 2800, effect: { handling: 9 } },
  { id: 'rel_package', tier: 1, name: 'Reliability Package',  base: 2200, effect: { reliability: 12 } },
  { id: 'race_brakes', tier: 1, name: 'Racing Brakes',        base: 3200, effect: { handling: 7, reliability: 5 } },
  { id: 'ballast_kit', tier: 1, name: 'Ballast Kit',          base: 2600, effect: { handling: 6, speed: 3 } },
  // Tier 2
  { id: 'perf_engine', tier: 2, name: 'Performance Engine',   base: 9500, effect: { speed: 14 } },
  { id: 'aero_pkg',    tier: 2, name: 'Aero Package',         base: 6800, effect: { speed: 5, handling: 6 } },
  { id: 'data_sys',    tier: 2, name: 'Data Analytics',       base: 7400, effect: { speed: 4, handling: 4, reliability: 4 } },
  { id: 'gearbox',     tier: 2, name: 'Close-Ratio Gearbox',  base: 6200, effect: { speed: 7, handling: 3 } },
  { id: 'cooling_pkg', tier: 2, name: 'Cooling Package',      base: 5800, effect: { reliability: 9, speed: 3 } },
  // Tier 3
  { id: 'wind_tunnel', tier: 3, name: 'Wind Tunnel Program',  base: 16000, effect: { speed: 9, handling: 6 } },
  { id: 'chassis_jig', tier: 3, name: 'Chassis Jig',          base: 14000, effect: { handling: 11, reliability: 4 } },
  { id: 'sim_program', tier: 3, name: 'Simulator Program',    base: 15000, effect: { speed: 6, handling: 6, reliability: 5 } },
  { id: 'pit_package', tier: 3, name: 'Pit Crew Package',     base: 12000, effect: { reliability: 14 } },
  { id: 'shaker_rig',  tier: 3, name: 'Seven-Post Rig',       base: 17000, effect: { handling: 8, speed: 5, reliability: 3 } },
];

function buildUpgrades(mult) {
  return UPGRADE_POOL.map(u => ({
    id: u.id, tier: u.tier, name: u.name, effect: u.effect,
    cost: Math.round(u.base * mult / 100) * 100,
  }));
}

// How many parts from a given tier are fitted to this car
function tierInstalled(car, tier, cls) {
  const list = (cls || CAR_CLASSES[car.classId]).upgrades;
  return (car.appliedUpgrades || []).filter(id => {
    const u = list.find(x => x.id === id);
    return u && u.tier === tier;
  }).length;
}

// A tier is available once the one below it has its base three parts fitted.
// Analyst slots are a bonus on top, so hiring one never re-locks a later tier.
function tierUnlocked(car, tier, cls) {
  if (tier <= 1) return true;
  return tierInstalled(car, tier - 1, cls) >= MAX_PER_TIER;
}

const CAR_CLASSES = {
  stock: {
    name: 'Stock Car',
    description: 'Entry-level cars for the Grassroots Cup',
    buyCost: 18000,
    sellValue: 9000,
    repairCostPerPoint: 80,
    baseStats: { speed: 42, handling: 45, reliability: 58 },
    upgrades: buildUpgrades(1)
  },
  modified: {
    name: 'Modified Car',
    description: 'Higher-spec cars for the Challenger Series',
    buyCost: 70000,
    sellValue: 35000,
    repairCostPerPoint: 300,
    baseStats: { speed: 62, handling: 62, reliability: 58 },
    upgrades: buildUpgrades(3.4)
  },
  premier: {
    name: 'Premier Car',
    description: 'Top-of-the-line cars for the Premier Cup Series',
    buyCost: 380000,
    sellValue: 190000,
    repairCostPerPoint: 1500,
    baseStats: { speed: 80, handling: 80, reliability: 65 },
    upgrades: buildUpgrades(15)
  }
};

const STAFF_TYPES = [
  {
    id: 'crew_chief',
    name: 'Crew Chief',
    icon: '🔧',
    description: 'Improves race strategy and pit stop timing. Adds a position bonus on race day.',
    weeklyCost: [1800, 3500, 7000],
    bonus: 'Earns +1 to +3 positions in race results',
    max: 1
  },
  {
    id: 'engineer',
    name: 'Race Engineer',
    icon: '📊',
    description: 'Optimizes car setup between races. Adds flat speed/handling to your best car.',
    weeklyCost: [1400, 2800, 5500],
    bonus: '+4 effective speed/handling on assigned car',
    max: 2
  },
  {
    id: 'mechanic',
    name: 'Senior Mechanic',
    icon: '⚙️',
    description: 'Reduces car repair costs and improves reliability.',
    weeklyCost: [900, 1800, 3600],
    bonus: '25% discount on all repair costs',
    max: 3
  },
  {
    id: 'data_analyst',
    name: 'Data Analyst',
    icon: '📈',
    description: 'Pores over practice data to find the quick way round, and identifies extra parts your crew can fit.',
    weeklyCost: [1600, 3200, 6400],
    bonus: 'Stronger qualifying, plus one extra upgrade slot per tier',
    max: 2
  },
  {
    id: 'commercial_director',
    name: 'Commercial Director',
    icon: '🤝',
    description: 'Works the paddock and the boardroom, opening room on the car for more backers than you could land alone.',
    weeklyCost: [2200, 4400, 8800],
    bonus: '+2 sponsor slots each (up to 7 deals in total)',
    max: 2
  }
];

// ── Commercial Director effects ─────────────────────────────
const BASE_SPONSOR_SLOTS = 3;
const SLOTS_PER_DIRECTOR = 2;
const MAX_SPONSOR_SLOTS  = 7;

function commercialDirectorCount() {
  return (typeof game !== 'undefined' && game && game.staff)
    ? game.staff.filter(s => s.typeId === 'commercial_director').length
    : 0;
}

// How many sponsor deals you may run at once
function sponsorSlots() {
  return Math.min(
    MAX_SPONSOR_SLOTS,
    BASE_SPONSOR_SLOTS + commercialDirectorCount() * SLOTS_PER_DIRECTOR
  );
}

// ── Data Analyst effects ────────────────────────────────────
// Each analyst sharpens qualifying and opens another slot in every upgrade
// tier, so a well-staffed team can fit more parts than a bare-bones one.
const ANALYST_QUALI_BONUS = 7;   // qualifying score per analyst
const ANALYST_TIER_SLOTS  = 1;   // extra parts allowed per tier, per analyst

function analystCount() {
  return (typeof game !== 'undefined' && game && game.staff)
    ? game.staff.filter(s => s.typeId === 'data_analyst').length
    : 0;
}

// Upgrade slots available per tier, including anything the analysts unlock
function tierCapacity() {
  return MAX_PER_TIER + analystCount() * ANALYST_TIER_SLOTS;
}

const HIREABLE_DRIVERS = [
  { id: 'drv01', name: 'Jake Rivers',              skill: 72, aggression: 65, morale: 80, weeklyCost: 3500 },
  { id: 'drv02', name: 'Maria Santos',             skill: 68, aggression: 50, morale: 85, weeklyCost: 2900 },
  { id: 'drv03', name: 'Bobby "Flash" Thompson',   skill: 65, aggression: 82, morale: 70, weeklyCost: 2500 },
  { id: 'drv04', name: 'Tommy Keane',              skill: 54, aggression: 58, morale: 90, weeklyCost: 1600 },
  { id: 'drv05', name: 'Sandra Lee',               skill: 76, aggression: 48, morale: 88, weeklyCost: 4500 },
  { id: 'drv06', name: 'Dave "Rocket" Morrison',   skill: 70, aggression: 78, morale: 72, weeklyCost: 3200 },
  { id: 'drv07', name: 'Cal Johnson',              skill: 61, aggression: 55, morale: 82, weeklyCost: 2100 },
  { id: 'drv08', name: 'Rico Valdez',              skill: 81, aggression: 68, morale: 75, weeklyCost: 5500 },
  { id: 'drv09', name: 'Tina Park',               skill: 56, aggression: 42, morale: 95, weeklyCost: 1500 },
  { id: 'drv10', name: 'Frank "Bull" Dawson',      skill: 64, aggression: 90, morale: 65, weeklyCost: 2600 },
  { id: 'drv11', name: 'Lisa Chen',               skill: 74, aggression: 58, morale: 85, weeklyCost: 4000 },
  { id: 'drv12', name: 'Steve Hartley',            skill: 59, aggression: 62, morale: 78, weeklyCost: 2000 },
  { id: 'drv13', name: 'Anita Ramos',              skill: 78, aggression: 55, morale: 82, weeklyCost: 4800 },
  { id: 'drv14', name: 'Derek "Ice" Simmons',      skill: 83, aggression: 44, morale: 80, weeklyCost: 6000 },
  { id: 'drv15', name: 'Pat O\'Brien',             skill: 63, aggression: 70, morale: 75, weeklyCost: 2400 },
];

const AI_TEAM_TEMPLATES = [
  { name: 'Apex Motorsports',        color: '#e74c3c', aggression: 0.70, basePower: 0.60 },
  { name: 'Blue Thunder Racing',     color: '#3498db', aggression: 0.60, basePower: 0.55 },
  { name: 'Green Machine Racing',    color: '#2ecc71', aggression: 0.50, basePower: 0.48 },
  { name: 'Golden Eagle Motors',     color: '#f39c12', aggression: 0.65, basePower: 0.58 },
  { name: 'Black Diamond Racing',    color: '#9b59b6', aggression: 0.75, basePower: 0.62 },
  { name: 'Ironclad Racing',         color: '#95a5a6', aggression: 0.55, basePower: 0.50 },
  { name: 'Sunrise Motorsports',     color: '#e67e22', aggression: 0.60, basePower: 0.52 },
  { name: 'Coastal Speed Team',      color: '#1abc9c', aggression: 0.50, basePower: 0.46 },
  { name: 'Mountain Peak Racing',    color: '#d35400', aggression: 0.70, basePower: 0.56 },
  { name: 'Valley Speedworks',       color: '#8e44ad', aggression: 0.65, basePower: 0.54 },
  { name: 'Frontier Racing',         color: '#c0392b', aggression: 0.68, basePower: 0.57 },
  { name: 'Liberty Motorsports',     color: '#2980b9', aggression: 0.55, basePower: 0.49 },
  { name: 'Thunder Road Racing',     color: '#27ae60', aggression: 0.72, basePower: 0.61 },
  { name: 'Highline Racing Co.',     color: '#f1c40f', aggression: 0.60, basePower: 0.53 },
  { name: 'Redline Performance',     color: '#e8001d', aggression: 0.78, basePower: 0.63 },
  { name: 'Pacific Speed Lab',       color: '#16a085', aggression: 0.52, basePower: 0.47 },
  { name: 'Heartland Motorsports',   color: '#7f8c8d', aggression: 0.58, basePower: 0.51 },
  { name: 'Summit Racing Group',     color: '#d4ac0d', aggression: 0.62, basePower: 0.55 },
  { name: 'Vortex Speed Co.',        color: '#a569bd', aggression: 0.66, basePower: 0.56 },
  { name: 'Cardinal Racing',         color: '#cb4335', aggression: 0.64, basePower: 0.54 },
  { name: 'Nighthawk Motorsports',   color: '#1f618d', aggression: 0.69, basePower: 0.59 },
  { name: 'Desert Sun Racing',       color: '#d68910', aggression: 0.57, basePower: 0.50 },
  { name: 'Platinum Speed Works',    color: '#839192', aggression: 0.61, basePower: 0.53 },
  { name: 'Crimson Tide Racing',     color: '#922b21', aggression: 0.74, basePower: 0.60 },
  { name: 'Northern Star Racing',    color: '#154360', aggression: 0.53, basePower: 0.48 },
  { name: 'Lone Star Motorsports',   color: '#b7950b', aggression: 0.67, basePower: 0.57 },
  { name: 'Storm Chaser Racing',     color: '#4a235a', aggression: 0.71, basePower: 0.58 },
  { name: 'Pacific Crest Racing',    color: '#0e6655', aggression: 0.56, basePower: 0.49 },
  { name: 'Iron Horse Racing',       color: '#784212', aggression: 0.73, basePower: 0.61 },
  { name: 'Wildfire Motorsports',    color: '#ca6f1e', aggression: 0.76, basePower: 0.62 },
  { name: 'Silver Bullet Racing',    color: '#616a6b', aggression: 0.59, basePower: 0.52 },
  { name: 'Thunderbolt Speed Co.',   color: '#1a5276', aggression: 0.63, basePower: 0.55 },
  { name: 'Gold Rush Racing',        color: '#9a7d0a', aggression: 0.68, basePower: 0.58 },
  { name: 'Dark Horse Motorsports',  color: '#2e4057', aggression: 0.72, basePower: 0.60 },
  { name: 'Eagle Eye Racing',        color: '#1e8449', aggression: 0.55, basePower: 0.50 },
];

const AI_DRIVER_NAMES = [
  'Alex Turner','Ryan Walsh','Chris Morales','Jordan Blake','Casey Quinn',
  'Taylor Frost','Morgan Hill','Drew Saunders','Quinn Barrett','Sam Kowalski',
  'Riley Cross','Austin Ward','Peyton Hayes','Cameron Knox','Jesse Briggs',
  'Avery Stone','Parker Holt','Logan Dean','Spencer Fox','Hunter Nash',
  'Dylan Carr','Reece Manning','Bryce Lawson','Cole Harmon','Tanner Boyd',
  'Wade Price','Grant Murphy','Cody Fisher','Seth Ellis','Trey Shaw',
  'Brady Grant','Evan Pierce','Zack Powell','Nate Gray','Troy Bell',
  'Lance Dunn','Kyle Steele','Dale Sutton','Rex Chambers','Ray Norris',
];

// ─── Difficulty ──────────────────────────────────────────────
// Beginner is the original balance: hook onto a team-mate and the win looks
// after itself. Each step up makes the AI quicker on track, stronger in the
// simulation and less willing to let you cruise in the draft.
const DIFFICULTIES = [
  { id: 'beginner', name: 'Beginner',
    blurb: 'Relaxed. Draft a team-mate and the win takes care of itself.',
    aiSpeed: 1.00, aiPower: 1.00, aiAggro: 1.00, playerDraft: 1.00, racecraft: 0 },
  { id: 'amateur',  name: 'Amateur',
    blurb: 'The field keeps you honest. You have to work the draft.',
    aiSpeed: 1.035, aiPower: 1.06, aiAggro: 1.12, playerDraft: 0.94, racecraft: 0.30 },
  { id: 'semipro',  name: 'Semi-Pro',
    blurb: 'Racers who use the draft to recover and defend their line.',
    aiSpeed: 1.065, aiPower: 1.12, aiAggro: 1.22, playerDraft: 0.88, racecraft: 0.65 },
  { id: 'pro',      name: 'Pro',
    blurb: 'Everyone is fast, works the tow and holds their ground.',
    aiSpeed: 1.09,  aiPower: 1.18, aiAggro: 1.30, playerDraft: 0.82, racecraft: 1.00 },
];

const DEFAULT_DIFFICULTY = 'beginner';

function difficultyById(id) {
  return DIFFICULTIES.find(d => d.id === id) || DIFFICULTIES[0];
}

// ─── Team size limits ────────────────────────────────────────
// A four-car operation is the biggest anyone fields.
const MAX_TEAM_CARS    = 4;
const MAX_HIRED_DRIVERS = 4;

// ─── Charity ─────────────────────────────────────────────────
// Giving back buys goodwill. Cost scales with the series you race in, the
// reputation gained tapers as you become well known, and you can only give
// once per race weekend so it cannot simply be bought to the top.
const CHARITY_CAUSES = [
  { id: 'ch_local',    name: 'Local Youth Racing Fund',
    blurb: 'Karting seats for kids who could never afford one.',
    mult: 0.35, rep: 3 },
  { id: 'ch_safety',   name: 'Driver Safety Foundation',
    blurb: 'Research into barriers, belts and better seats.',
    mult: 0.9,  rep: 6 },
  { id: 'ch_hospital', name: "Children's Hospital Appeal",
    blurb: 'The cause every driver in the garage puts their name to.',
    mult: 2.0,  rep: 11 },
];

function charityCost(cause, seriesLevel) {
  const series = SERIES[seriesLevel] || SERIES[0];
  return Math.round(series.prize[0] * cause.mult / 100) * 100;
}

// Reputation gained tapers hard as you approach the top
function charityRepGain(cause, currentRep) {
  const headroom = clamp((100 - currentRep) / 100, 0, 1);
  return Math.round(cause.rep * (0.25 + 0.75 * headroom) * 10) / 10;
}

// ─── Bank ────────────────────────────────────────────────────
// Borrow now, repay within `term` races. Miss the deadline and the balance
// starts compounding at LATE_RATE every race until it is cleared.
const LOAN_LATE_RATE = 0.09;   // per race, applied only after the term expires

const LOAN_OFFERS = [
  { id: 'ln_short', name: 'Short-Term Note', term: 4,  rate: 0.08, mult: 0.6,
    blurb: 'Small and quick. Cheapest interest, tightest deadline.' },
  { id: 'ln_std',   name: 'Standard Loan',   term: 8,  rate: 0.15, mult: 1.0,
    blurb: 'The usual deal. Reasonable size, reasonable window.' },
  { id: 'ln_long',  name: 'Long-Term Credit',term: 14, rate: 0.26, mult: 1.6,
    blurb: 'Biggest cheque and the most breathing room — you pay for both.' },
];

// Base borrowing power per series; reputation scales it up
const LOAN_BASE = [40000, 180000, 700000];

const SPONSOR_DEALS = [
  { id: 'sp01', name: 'QuickLube Oil',        icon: '🛢️', weekly: 400,   bonus: 150,  cond: 'top10', level: 0 },
  { id: 'sp02', name: "Buster's Auto Parts",  icon: '🔩', weekly: 800,   bonus: 500,  cond: 'top5',  level: 0 },
  { id: 'sp03', name: 'Frontier Fuel Co.',    icon: '⛽', weekly: 650,   bonus: 900,  cond: 'win',   level: 0 },
  { id: 'sp04', name: 'National Tire Co.',    icon: '🏎️', weekly: 2500,  bonus: 1800, cond: 'top5',  level: 1 },
  { id: 'sp05', name: 'Velocity Motors',      icon: '🚗', weekly: 4000,  bonus: 2500, cond: 'top3',  level: 1 },
  { id: 'sp06', name: 'Eagle Energy Drinks',  icon: '⚡', weekly: 3200,  bonus: 4500, cond: 'win',   level: 1 },
  { id: 'sp07', name: 'Premier Auto Insure',  icon: '🛡️', weekly: 14000, bonus: 9000, cond: 'top5',  level: 2 },
  { id: 'sp08', name: 'National Bank Corp.',  icon: '🏦', weekly: 22000, bonus: 13000,cond: 'top3',  level: 2 },
  { id: 'sp09', name: 'Apex Racing Parts',    icon: '🏆', weekly: 18000, bonus: 28000,cond: 'win',   level: 2 },
];

const RACE_EVENTS = {
  caution: [
    'Yellow flag! Debris on the backstretch.',
    'Caution is out! Spin in turn 3.',
    'Yellow flag for a multi-car incident.',
    'Caution period — oil on the track.',
    'Full course yellow for a stalled car.',
  ],
  leadChange: [
    '{car} takes the lead on lap {lap}!',
    '{car} surges to the front!',
    'Position change at the top — {car} leads!',
    '{car} makes a bold move for the lead!',
  ],
  crash: [
    '{car} hits the wall and is done for the day.',
    'Big crash — {car} is out of the race.',
    '{car} gets into the fence and retires.',
  ],
  pitStop: [
    '{car} dives into pit road for tires and fuel.',
    'Strategy call — {car} pits under green.',
    '{car} makes an early pit stop.',
  ],
  good: [
    'Your car is flying today!',
    'Great setup — you\'re gaining ground!',
    'The crew chief nailed the strategy.',
    'Your pit crew executes a lightning-fast stop.',
  ],
  bad: [
    'Loose wheel — you lose several positions!',
    'Tight handling is hurting your lap times.',
    'You brush the wall and fall back.',
    'A slow pit stop drops you behind.',
  ]
};
`````

---

## 4. `js/game.js`

*1038 lines, 37711 bytes.*

`````javascript
// ============================================================
// STOCK CAR EMPIRE - Core Game State & Logic
// ============================================================

// ─── Multi-slot save system ──────────────────────────────────
const NUM_SLOTS   = 5;
const SLOT_PREFIX = 'sce_slot_';
const META_KEY    = 'sce_meta';
let currentSlot   = null;  // which slot is currently loaded

function getSaveMeta() {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? JSON.parse(raw) : Array(NUM_SLOTS).fill(null);
  } catch(e) { return Array(NUM_SLOTS).fill(null); }
}

function saveToSlot(slot) {
  if (slot === null || slot === undefined) slot = 0;
  currentSlot = slot;
  try {
    localStorage.setItem(SLOT_PREFIX + slot, JSON.stringify(game));
    const meta = getSaveMeta();
    meta[slot] = {
      teamName: game.teamName,
      series: SERIES[game.currentSeries]?.name || '—',
      year: game.season.year,
      wins: game.cars.reduce((s, c) => s + (c.wins || 0), 0),
      savedAt: Date.now(),
    };
    localStorage.setItem(META_KEY, JSON.stringify(meta));
    return true;
  } catch(e) { console.warn('Save failed:', e); return false; }
}

function loadFromSlot(slot) {
  try {
    const raw = localStorage.getItem(SLOT_PREFIX + slot);
    if (!raw) return false;
    const loaded = JSON.parse(raw);
    if (!loaded || !loaded.teamName || !loaded.cars || !loaded.season) return false;
    game = loaded;
    currentSlot = slot;
    return true;
  } catch(e) { console.warn('Load failed:', e); return false; }
}

function deleteSlot(slot) {
  localStorage.removeItem(SLOT_PREFIX + slot);
  const meta = getSaveMeta();
  meta[slot] = null;
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

let game = null;   // The live game state object

// ─── Helpers ────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fmt$( n ) {
  return '$' + Math.round(n).toLocaleString();
}

// ─── Car factory ────────────────────────────────────────────
function makeCar(name, classId, overrideStats, opts = {}) {
  const cls = CAR_CLASSES[classId];
  const base = { ...cls.baseStats };
  const stats = { ...base, ...(overrideStats || {}) };
  return {
    id: uid(),
    name,
    classId,
    color:       opts.color  || '#e8001d',
    number:      opts.number !== undefined ? opts.number : 1,
    speed:       stats.speed,
    handling:    stats.handling,
    reliability: stats.reliability,
    condition:   100,       // 0–100; degrades with racing
    appliedUpgrades: [],    // upgrade ids applied
    assignedDriverId: null, // null = player drives
    wins: 0,
    races: 0,
    totalPoints: 0,
  };
}

function setCarColor(carId, color) {
  const car = game.cars.find(c => c.id === carId);
  if (!car) return;
  car.color = color;
  saveGame();
}

function setCarNumber(carId, num) {
  const car = game.cars.find(c => c.id === carId);
  if (!car) return { ok: false, msg: 'Car not found.' };
  const n = parseInt(num, 10);
  if (isNaN(n) || n < 1 || n > 99) return { ok: false, msg: 'Pick a number from 1 to 99.' };
  if (game.cars.some(c => c.id !== carId && (c.number || 1) === n)) {
    return { ok: false, msg: `#${n} is already on another of your cars.` };
  }
  car.number = n;
  saveGame();
  return { ok: true, number: n };
}

// ─── AI Team factory ────────────────────────────────────────
function makeAITeam(template, seriesLevel) {
  // Scale AI power to series level
  const powerBase = template.basePower + seriesLevel * 0.15;
  const power = clamp(powerBase + rand(-0.08, 0.08), 0.3, 0.98);

  // Each AI team has 1–2 cars
  const numCars = seriesLevel >= 1 ? randInt(1, 2) : 1;
  const cars = [];
  for (let i = 0; i < numCars; i++) {
    cars.push({
      id: uid(),
      teamId: null, // filled after team created
      driverName: pick(AI_DRIVER_NAMES),
      power,        // composite 0–1 score used in simulation
      condition: 100,
      number: 0,    // assigned by generateAITeams
      color: template.color,
    });
  }

  const team = {
    id: uid(),
    name: template.name,
    color: template.color,
    aggression: template.aggression,
    cars,
    points: 0,
    wins: 0,
    top5: 0,
    top10: 0,
    racesRun: 0,
  };
  team.cars.forEach(c => (c.teamId = team.id));
  return team;
}

// ─── Generate season calendar ───────────────────────────────
function generateCalendar(seriesLevel) {
  const series = SERIES[seriesLevel];
  const eligibleTracks = TRACKS.filter(t => t.series.includes(seriesLevel));
  const calendar = [];
  const used = new Set();

  // Always start with a short track or intermediate in entry series
  const shuffled = [...eligibleTracks].sort(() => Math.random() - 0.5);

  for (let i = 0; i < series.racesPerSeason; i++) {
    const track = shuffled[i % shuffled.length];
    calendar.push({
      raceNum: i + 1,
      trackId: track.id,
      trackName: track.name,
      trackType: track.type,
      status: 'upcoming',  // upcoming | completed | skipped
      playerResult: null,
      playerPoints: 0,
      earnings: 0,
    });
  }
  return calendar;
}

// ─── Generate AI teams for a season ─────────────────────────
function generateAITeams(seriesLevel) {
  const series = SERIES[seriesLevel];
  const needed = series.fieldSize;

  // Shuffle templates, give varying power
  const templates = [...AI_TEAM_TEMPLATES].sort(() => Math.random() - 0.5);
  const teams = [];
  let carCount = 0;

  for (const tmpl of templates) {
    if (carCount >= needed - 2) break; // leave room for player
    const team = makeAITeam(tmpl, seriesLevel);
    teams.push(team);
    carCount += team.cars.length;
  }

  // Assign unique car numbers (2–99; 1 is reserved for player)
  const usedNums = new Set([1]);
  // ...and unique driver names, so no two entries share a name in the standings
  const usedNames = new Set();
  const freeNames = [...AI_DRIVER_NAMES].sort(() => Math.random() - 0.5);

  for (const team of teams) {
    for (const car of team.cars) {
      let n;
      do { n = randInt(2, 99); } while (usedNums.has(n));
      usedNums.add(n);
      car.number = n;

      if (!car.driverName || usedNames.has(car.driverName)) {
        const next = freeNames.find(nm => !usedNames.has(nm));
        car.driverName = next || `${pick(AI_DRIVER_NAMES).split(' ')[1]} ${usedNames.size}`;
      }
      usedNames.add(car.driverName);
    }
  }

  return teams;
}

// ─── New Game ────────────────────────────────────────────────
function newGame(teamName, driverName, firstCarName) {
  const firstCar = makeCar(firstCarName, 'stock', null, { color: '#e8001d', number: 1 });
  firstCar.assignedDriverId = 'player'; // player drives this car

  game = {
    version: '1.1',
    teamName,
    driverName: driverName || teamName,
    money: 50000,
    playerSkill: 60,     // 0–100, improves slowly
    reputation: 50,      // 0–100; affected by race behavior
    currentSeries: 0,
    driverMode: 'driver', // 'driver' | 'manager' | 'hired' (Premier Cup Series choice)
    hiredTeamId: null,    // if 'hired', which AI team

    cars: [firstCar],
    hiredDrivers: [],    // { driverId, carId }
    staff: [],           // { staffType, name, weeklyCost }
    activeSponsors: [],  // sponsor deal ids
    loans: [],           // bank loans currently outstanding
    difficulty: DEFAULT_DIFFICULTY,

    season: {
      year: 1,
      raceIndex: 0,          // which race in calendar we're on
      calendar: generateCalendar(0),
      aiTeams: generateAITeams(0),
      standings: [],         // computed after races
    },

    history: [],             // { year, series, finalPos, wins }
    notifications: [],
    achievements: [],
  };

  // Init standings with player
  rebuildStandings();
  saveGame();
  return game;
}

// ─── Load / Save (slot wrappers) ─────────────────────────────
// Auto-save (called after most game actions). Only writes once the player has
// actually chosen a slot — otherwise a brand-new career would silently
// overwrite whatever save already lives in slot 0.
function saveGame() {
  if (currentSlot === null || currentSlot === undefined) return false;
  saveToSlot(currentSlot);
  return true;
}

function loadGame() {
  return false; // No auto-load; use loadFromSlot() explicitly
}

function deleteSave() {
  if (currentSlot !== null) deleteSlot(currentSlot);
  game = null;
}

// ─── Standings ───────────────────────────────────────────────
function rebuildStandings() {
  // Collect all entities (player + AI teams)
  const entries = [];

  // Player entry
  entries.push({
    id: 'player',
    name: game.teamName,
    isPlayer: true,
    points: 0,
    wins: 0,
    top5: 0,
    top10: 0,
    races: 0,
  });

  // Your other cars run by hired drivers — they score their own championship
  // points, so they need their own standings entry.
  (game.cars || []).forEach(car => {
    const hire = (game.hiredDrivers || []).find(h => h.carId === car.id);
    if (!hire) return;
    const drv = HIREABLE_DRIVERS.find(d => d.id === hire.driverId);
    entries.push({
      id: car.id,
      name: `${game.teamName} (${drv ? drv.name : 'Driver'})`,
      isPlayer: false,
      isTeamCar: true,
      points: 0, wins: 0, top5: 0, top10: 0, races: 0,
    });
  });

  // AI entries
  game.season.aiTeams.forEach(team => {
    // One standing entry per car
    team.cars.forEach(car => {
      entries.push({
        id: car.id,
        teamId: team.id,
        name: `${team.name} (${car.driverName})`,
        isPlayer: false,
        points: 0,
        wins: 0,
        top5: 0,
        top10: 0,
        races: 0,
      });
    });
  });

  game.season.standings = entries;
}

function getStandings() {
  return [...game.season.standings].sort((a, b) => b.points - a.points);
}

function getPlayerStandingPos() {
  const sorted = getStandings();
  return sorted.findIndex(e => e.id === 'player') + 1;
}

// ─── Apply race results to standings ─────────────────────────
function applyRaceResults(results) {
  const series = SERIES[game.currentSeries];
  results.forEach(r => {
    const pos = r.position;
    const pts = series.points[pos - 1] || 0;

    let entry = game.season.standings.find(e => e.id === r.entrantId);
    // A car hired a driver mid-season — give it a standings entry on the fly
    // so its results are never silently dropped.
    if (!entry && r.carId && game.cars.some(c => c.id === r.carId)) {
      entry = {
        id: r.entrantId,
        name: r.displayName || `${game.teamName} (Driver)`,
        isPlayer: false, isTeamCar: true,
        points: 0, wins: 0, top5: 0, top10: 0, races: 0,
      };
      game.season.standings.push(entry);
    }
    if (!entry) return;
    entry.points += pts;
    entry.races += 1;
    if (pos === 1) entry.wins += 1;
    if (pos <= 5) entry.top5 += 1;
    if (pos <= 10) entry.top10 += 1;
  });
}

// ─── Post-race: update player & cars ─────────────────────────
function postRaceUpdate(playerResult, earnings, allResults) {
  // Money
  game.money += earnings;

  // Skill improvement (small gain based on finish position)
  const series = SERIES[game.currentSeries];
  const field  = series.fieldSize;
  const pos    = playerResult.position;
  const relPerf = 1 - (pos - 1) / field;  // 1.0 = win, 0 = last
  game.playerSkill = clamp(game.playerSkill + relPerf * 0.4 + 0.1, 0, 98);

  // Reputation: improves with good finishes, degrades slightly on bad ones
  // Winning is a big deal — it moves reputation far more than anything else.
  // Gains taper as reputation climbs so it still takes a career to reach Legend.
  if (!game.reputation) game.reputation = 50;
  const headroom = (100 - game.reputation) / 100;   // 1.0 unknown → 0.0 maxed
  let repDelta;
  if      (pos === 1)  repDelta =  6 + 14 * headroom;   // +20 early, +6 at the top
  else if (pos <= 3)   repDelta =  2 +  6 * headroom;
  else if (pos <= 5)   repDelta =  1 +  3 * headroom;
  else if (pos <= 10)  repDelta =  0.5 + 1 * headroom;
  else if (pos <= 20)  repDelta = -0.5;
  else                 repDelta = -1.5;
  game.reputation = clamp(Math.round((game.reputation + repDelta) * 10) / 10, 0, 100);

  // Car condition degrades. Cars run by hired drivers race too, so they take
  // real race wear and bank their own stats.
  const byCar = new Map((allResults || []).filter(r => r.carId).map(r => [r.carId, r]));
  game.cars.forEach(car => {
    const res = car.id === playerResult.carId ? playerResult : byCar.get(car.id);
    if (res) {
      car.condition = clamp(car.condition - randInt(8, 18), 0, 100);
      car.races += 1;
      if (res.position === 1) car.wins += 1;
      car.totalPoints += series.points[res.position - 1] || 0;
    } else {
      // Cars not in this race lose a little condition anyway (idle wear)
      car.condition = clamp(car.condition - randInt(0, 3), 0, 100);
    }
  });

  // AI car condition degrades too
  game.season.aiTeams.forEach(team => {
    team.cars.forEach(c => {
      c.condition = clamp(c.condition - randInt(5, 15), 0, 100);
    });
  });

  // Deduct weekly staff costs
  const weeklyStaff = game.staff.reduce((s, st) => s + st.weeklyCost, 0);
  game.money -= weeklyStaff;

  // Sponsor payouts — base pay scales with how many cars you fielded
  const sponsorMult = sponsorCarMultiplier();
  let sponsorPay = 0;
  game.activeSponsors.forEach(sid => {
    const deal = SPONSOR_DEALS.find(d => d.id === sid);
    if (!deal) return;
    sponsorPay += deal.weekly * sponsorMult;
    // Bonus
    if (deal.cond === 'top10' && pos <= 10) sponsorPay += deal.bonus;
    else if (deal.cond === 'top5' && pos <= 5) sponsorPay += deal.bonus;
    else if (deal.cond === 'top3' && pos <= 3) sponsorPay += deal.bonus;
    else if (deal.cond === 'win' && pos === 1)  sponsorPay += deal.bonus;
  });
  game.money += sponsorPay;

  // Your hired drivers gain experience from the race they just ran
  game.lastDriverNotes = developHiredDrivers(allResults, field);

  // Bank: count down loan terms, charge interest on anything overdue
  game.lastLoanNotes = tickLoans();

  // Advance race index
  game.season.raceIndex += 1;
}

// ─── Skip a race ─────────────────────────────────────────────
function skipRace() {
  const race = currentRace();
  if (!race) return;
  race.status = 'skipped';
  game.lastLoanNotes = tickLoans();
  game.season.raceIndex += 1;
  // Weekly costs still apply
  const weeklyStaff = game.staff.reduce((s, st) => s + st.weeklyCost, 0);
  game.money -= weeklyStaff;
  // Sponsor base pay still comes in
  const skipMult = sponsorCarMultiplier();
  let sponsorPay = 0;
  game.activeSponsors.forEach(sid => {
    const deal = SPONSOR_DEALS.find(d => d.id === sid);
    if (deal) sponsorPay += deal.weekly * skipMult;
  });
  game.money += sponsorPay;
  saveGame();
}

// ─── End of season ───────────────────────────────────────────
// End-of-season prize money. Every driver who ran the season is paid on final
// championship position, and the champion takes a purse far bigger than
// anyone else's — winning the title should be the payday of the year.
function seasonPayout(seriesLevel, pos, total) {
  const series = SERIES[seriesLevel];
  // The purse grows sharply with the series — a Premier Cup Series title is a
  // life-changing payday, a Grassroots title is a good year.
  const PURSE_MULT = [8, 14, 22];
  const purse = series.prize[0] * (PURSE_MULT[seriesLevel] || 8);
  let f;
  if      (pos === 1) f = 1.00;
  else if (pos === 2) f = 0.55;
  else if (pos === 3) f = 0.40;
  else {
    const span = Math.max(1, total - 3);
    const t = clamp((pos - 3) / span, 0, 1);
    f = 0.30 * Math.pow(1 - t, 1.6) + 0.03;    // everyone still collects something
  }
  return Math.round(purse * f / 100) * 100;
}

function endSeason() {
  const series = SERIES[game.currentSeries];
  const sorted = getStandings();
  const playerPos = sorted.findIndex(e => e.id === 'player') + 1;
  const totalEntrants = sorted.length;
  const isChampion = playerPos === 1;

  // ── Season purse ────────────────────────────────────────
  const payouts = sorted.map((e, i) => ({
    pos:      i + 1,
    name:     e.name,
    isPlayer: !!e.isPlayer,
    isTeamCar:!!e.isTeamCar,
    amount:   seasonPayout(game.currentSeries, i + 1, totalEntrants),
  }));
  // You collect for your own entry and for every car your drivers ran
  const playerPayout = payouts.find(p => p.isPlayer)?.amount || 0;
  const teamPayout   = payouts.filter(p => p.isTeamCar).reduce((s, p) => s + p.amount, 0);
  game.money += playerPayout + teamPayout;

  const playerEntry = sorted.find(e => e.id === 'player');

  // Record history
  game.history.push({
    year: game.season.year,
    series: series.name,
    finalPos: playerPos,
    wins: playerEntry?.wins || 0,
    champion: isChampion,
    payout: playerPayout + teamPayout,
  });
  if (isChampion) game.titles = (game.titles || 0) + 1;

  // Promotion / relegation
  let promoted = false;
  let relegated = false;
  let message = '';

  if (game.currentSeries < 2 && playerPos <= series.promotionSpots) {
    game.currentSeries += 1;
    promoted = true;
    const newSeries = SERIES[game.currentSeries];
    message = isChampion
      ? `You are the ${series.name} champion, and you move up to the ${newSeries.name}.`
      : `You finished ${playerPos}${ordinal(playerPos)} and earned promotion to the ${newSeries.name}!`;

    // You reach the Premier Cup Series as what you have always been: the
    // driver who owns the team. No career-path choice is offered.

    // Upgrade cars to new class on promotion
    promoteCarClass();

  } else if (game.currentSeries > 0 && series.relegationSpots > 0 &&
             playerPos > totalEntrants - series.relegationSpots) {
    game.currentSeries -= 1;
    relegated = true;
    const newSeries = SERIES[game.currentSeries];
    message = `You finished ${playerPos}${ordinal(playerPos)} and were relegated to the ${newSeries.name}.`;
    relegateCarClass();
  } else if (isChampion) {
    message = `You are the ${series.name} champion. There is nowhere higher to go — now defend it.`;
  } else {
    message = `You finished ${playerPos}${ordinal(playerPos)} in the ${series.name}. Gearing up for another season!`;
  }

  // Start new season
  const newYear = game.season.year + 1;
  game.season = {
    year: newYear,
    raceIndex: 0,
    calendar: generateCalendar(game.currentSeries),
    aiTeams: generateAITeams(game.currentSeries),
    standings: [],
  };
  rebuildStandings();

  // Reset car conditions (off-season maintenance)
  game.cars.forEach(c => {
    c.condition = clamp(c.condition + 30, 0, 100);
  });

  saveGame();
  return {
    promoted, relegated, playerPos, message,
    champion:   isChampion,
    titles:     game.titles || 0,
    seriesName: series.name,
    year:       game.season.year - 1,
    driver:     game.driverName || game.teamName,
    wins:       playerEntry?.wins || 0,
    top5:       playerEntry?.top5 || 0,
    points:     playerEntry?.points || 0,
    races:      playerEntry?.races || 0,
    playerPayout, teamPayout,
    totalEntrants,
    payouts:    payouts.slice(0, 10),
  };
}

// ─── Promote cars to new class ───────────────────────────────
function promoteCarClass() {
  const newClass = SERIES[game.currentSeries].carClass;
  game.cars.forEach(car => {
    if (car.classId !== newClass) {
      const cls = CAR_CLASSES[newClass];
      car.classId = newClass;
      // Boost stats to new class base (keep any relative advantage)
      const base = cls.baseStats;
      car.speed       = Math.max(base.speed,       car.speed + 15);
      car.handling    = Math.max(base.handling,    car.handling + 15);
      car.reliability = Math.max(base.reliability, car.reliability);
      car.appliedUpgrades = [];
      car.condition = 85;
    }
  });
}

function relegateCarClass() {
  // Cars stay as they are; no need to downgrade
}

// ─── Car management ──────────────────────────────────────────
function buyCar(name) {
  const classId = SERIES[game.currentSeries].carClass;
  const cls = CAR_CLASSES[classId];
  if (game.cars.length >= MAX_TEAM_CARS) {
    return { ok: false, msg: `${MAX_TEAM_CARS} cars is the most any team runs.` };
  }
  if (game.money < cls.buyCost) return { ok: false, msg: 'Not enough money.' };
  game.money -= cls.buyCost;
  const carName = (name && String(name).trim()) || `Car ${game.cars.length + 1}`;
  // Give it the lowest free number so a new car never collides with an
  // existing one (they are painted on the cars and shown in the standings).
  const taken = new Set(game.cars.map(c => c.number || 1));
  let num = 1;
  while (taken.has(num) && num < 99) num++;
  const car = makeCar(carName, classId, null, { number: num });
  game.cars.push(car);
  saveGame();
  return { ok: true, car };
}

function sellCar(carId) {
  const idx = game.cars.findIndex(c => c.id === carId);
  if (idx === -1) return { ok: false, msg: 'Car not found.' };
  if (game.cars.length === 1) return { ok: false, msg: 'You must keep at least one car.' };
  const car = game.cars[idx];
  const cls = CAR_CLASSES[car.classId];
  const value = Math.round(cls.sellValue * (car.condition / 100));
  game.money += value;
  game.cars.splice(idx, 1);
  saveGame();
  return { ok: true, value };
}

function repairCar(carId) {
  const car = game.cars.find(c => c.id === carId);
  if (!car) return { ok: false, msg: 'Car not found.' };
  if (car.condition >= 100) return { ok: false, msg: 'Car is already in perfect condition.' };

  const cls = CAR_CLASSES[car.classId];
  const hasMechanic = game.staff.some(s => s.typeId === 'mechanic');
  const discount = hasMechanic ? 0.75 : 1.0;
  const damage = 100 - car.condition;
  const cost = Math.round(damage * cls.repairCostPerPoint * discount);

  if (game.money < cost) return { ok: false, msg: `Need ${fmt$(cost)} to fully repair.` };
  game.money -= cost;
  car.condition = 100;
  saveGame();
  return { ok: true, cost };
}

// ═══════════════════════════════════════════════════════════
//  CHARITY — give back for goodwill
// ═══════════════════════════════════════════════════════════
// One donation per race weekend, so reputation still has to be earned on
// track — money alone can only ever top it up.
function donationRaceKey() {
  return `${game.season.year}:${game.season.raceIndex}`;
}

function canDonate() {
  return game.lastDonationKey !== donationRaceKey();
}

function donateToCharity(causeId) {
  const cause = CHARITY_CAUSES.find(c => c.id === causeId);
  if (!cause) return { ok: false, msg: 'Unknown cause.' };
  if (!canDonate()) {
    return { ok: false, msg: 'You have already given this race weekend. Come back after the next race.' };
  }
  const cost = charityCost(cause, game.currentSeries);
  if (game.money < cost) return { ok: false, msg: `That pledge is ${fmt$(cost)}.` };

  if (game.reputation == null) game.reputation = 50;
  const gain = charityRepGain(cause, game.reputation);

  game.money -= cost;
  game.reputation = clamp(Math.round((game.reputation + gain) * 10) / 10, 0, 100);
  game.lastDonationKey = donationRaceKey();
  game.charityGiven = (game.charityGiven || 0) + cost;
  saveGame();
  return { ok: true, cost, gain, name: cause.name, reputation: game.reputation };
}

// ═══════════════════════════════════════════════════════════
//  BANK — loans
// ═══════════════════════════════════════════════════════════
function getLoans() {
  if (!game.loans) game.loans = [];
  return game.loans;
}

function totalDebt() {
  return getLoans().reduce((s, l) => s + l.balance, 0);
}

// Reputation buys you credit; existing debt eats into it.
function creditLimit() {
  const base = LOAN_BASE[game.currentSeries] || LOAN_BASE[0];
  const rep  = (game.reputation != null ? game.reputation : 50) / 100;
  return Math.round(base * (0.5 + rep));
}

function creditAvailable() {
  return Math.max(0, creditLimit() - totalDebt());
}

// Principal an offer would advance right now
function loanPrincipal(offer) {
  const raw = Math.round(creditLimit() * offer.mult * 0.5 / 500) * 500;
  return Math.min(raw, creditAvailable());
}

function takeLoan(offerId) {
  const offer = LOAN_OFFERS.find(o => o.id === offerId);
  if (!offer) return { ok: false, msg: 'Unknown loan.' };
  if (getLoans().length >= 3) return { ok: false, msg: 'You already carry three loans.' };

  const principal = loanPrincipal(offer);
  if (principal < 500) {
    return { ok: false, msg: 'No credit available — repay existing debt first.' };
  }

  const loan = {
    id: uid(),
    name: offer.name,
    principal,
    balance: Math.round(principal * (1 + offer.rate)),
    term: offer.term,
    racesLeft: offer.term,
    rate: offer.rate,
    overdue: false,
  };
  getLoans().push(loan);
  game.money += principal;
  saveGame();
  return { ok: true, loan };
}

function repayLoan(loanId, amount) {
  const loan = getLoans().find(l => l.id === loanId);
  if (!loan) return { ok: false, msg: 'Loan not found.' };
  const pay = Math.min(Math.round(amount || loan.balance), loan.balance, game.money);
  if (pay <= 0) return { ok: false, msg: 'Not enough cash to make a payment.' };

  game.money   -= pay;
  loan.balance -= pay;
  let cleared = false;
  if (loan.balance <= 0) {
    game.loans = getLoans().filter(l => l.id !== loan.id);
    cleared = true;
  }
  saveGame();
  return { ok: true, paid: pay, cleared };
}

// Called once per race weekend. Counts down terms and compounds overdue debt.
function tickLoans() {
  const notes = [];
  getLoans().forEach(loan => {
    if (loan.racesLeft > 0) {
      loan.racesLeft -= 1;
      if (loan.racesLeft === 1) notes.push(`${loan.name}: 1 race left to repay ${fmt$(loan.balance)}.`);
    }
    if (loan.racesLeft <= 0) {
      // Term is up — try to settle automatically, then charge interest on the rest
      if (game.money >= loan.balance) {
        game.money  -= loan.balance;
        loan.balance = 0;
        notes.push(`${loan.name} settled in full.`);
      } else {
        if (game.money > 0) { loan.balance -= game.money; game.money = 0; }
        const interest = Math.round(loan.balance * LOAN_LATE_RATE);
        loan.balance += interest;
        loan.overdue  = true;
        notes.push(`${loan.name} is overdue — ${fmt$(interest)} interest added.`);
      }
    }
  });
  game.loans = getLoans().filter(l => l.balance > 0);
  return notes;
}

function upgradeCar(carId, upgradeId) {
  const car = game.cars.find(c => c.id === carId);
  if (!car) return { ok: false, msg: 'Car not found.' };

  const cls = CAR_CLASSES[car.classId];
  const upgrade = cls.upgrades.find(u => u.id === upgradeId);
  if (!upgrade) return { ok: false, msg: 'Upgrade not found.' };
  if (car.appliedUpgrades.includes(upgradeId)) return { ok: false, msg: 'Already installed.' };
  if (!tierUnlocked(car, upgrade.tier, cls)) {
    return { ok: false, msg: `Fit ${MAX_PER_TIER} Tier ${upgrade.tier - 1} parts before Tier ${upgrade.tier} opens.` };
  }
  const cap = tierCapacity();   // 3, plus one per Data Analyst on staff
  if (tierInstalled(car, upgrade.tier, cls) >= cap) {
    const extra = cap > MAX_PER_TIER ? '' : ' Hire a Data Analyst to open another slot.';
    return { ok: false, msg: `Tier ${upgrade.tier} is full — ${cap} parts is the limit.${extra}` };
  }
  if (game.money < upgrade.cost) return { ok: false, msg: 'Not enough money.' };

  game.money -= upgrade.cost;
  car.appliedUpgrades.push(upgradeId);
  if (upgrade.effect.speed)       car.speed       = clamp(car.speed       + upgrade.effect.speed, 0, 99);
  if (upgrade.effect.handling)    car.handling    = clamp(car.handling    + upgrade.effect.handling, 0, 99);
  if (upgrade.effect.reliability) car.reliability = clamp(car.reliability + upgrade.effect.reliability, 0, 99);
  saveGame();
  return { ok: true };
}

function renameCar(carId, newName) {
  const car = game.cars.find(c => c.id === carId);
  if (!car) return;
  car.name = newName.trim() || car.name;
  saveGame();
}

// ─── Staff management ────────────────────────────────────────
function hireStaff(typeId) {
  const type = STAFF_TYPES.find(s => s.id === typeId);
  if (!type) return { ok: false, msg: 'Unknown staff type.' };

  const currentCount = game.staff.filter(s => s.typeId === typeId).length;
  if (currentCount >= type.max) return { ok: false, msg: `You can only hire ${type.max} ${type.name}(s).` };

  const weeklyCost = type.weeklyCost[game.currentSeries];
  const signingFee = weeklyCost * 4;
  if (game.money < signingFee) return { ok: false, msg: `Signing fee is ${fmt$(signingFee)}.` };

  game.money -= signingFee;
  game.staff.push({ id: uid(), typeId, name: type.name, weeklyCost });
  saveGame();
  return { ok: true };
}

function fireStaff(staffId) {
  const idx = game.staff.findIndex(s => s.id === staffId);
  if (idx === -1) return;
  game.staff.splice(idx, 1);
  saveGame();
}

// ─── Driver management ───────────────────────────────────────
function hireDriver(driverId, carId) {
  if (game.hiredDrivers.length >= MAX_HIRED_DRIVERS)
    return { ok: false, msg: `${MAX_HIRED_DRIVERS} drivers is the most you can carry.` };
  if (game.hiredDrivers.find(h => h.driverId === driverId))
    return { ok: false, msg: 'Already hired.' };
  if (game.hiredDrivers.find(h => h.carId === carId))
    return { ok: false, msg: 'That car already has a driver.' };

  const driver = HIREABLE_DRIVERS.find(d => d.id === driverId);
  if (!driver) return { ok: false, msg: 'Driver not found.' };

  const signingFee = driver.weeklyCost * 4;
  if (game.money < signingFee) return { ok: false, msg: `Signing fee is ${fmt$(signingFee)}.` };

  game.money -= signingFee;

  const car = game.cars.find(c => c.id === carId);
  if (car) car.assignedDriverId = driverId;

  // Skill lives on the hire record, not on HIREABLE_DRIVERS — that list is a
  // shared constant, so mutating it would leak between save slots.
  // Each driver has a ceiling, so a cheap rookie can develop but a journeyman
  // will not turn into a superstar.
  game.hiredDrivers.push({
    driverId, carId,
    weeklyCost: driver.weeklyCost,
    skill:      driver.skill,
    startSkill: driver.skill,
    potential:  clamp(driver.skill + randInt(6, 20), 0, 99),
    racesRun:   0,
  });
  saveGame();
  return { ok: true };
}

// Live skill for a hired driver (falls back to the base value on old saves)
function hiredDriverSkill(hire) {
  if (!hire) return 0;
  if (hire.skill != null) return hire.skill;
  return HIREABLE_DRIVERS.find(d => d.id === hire.driverId)?.skill || 0;
}

// Find the hire record driving a given car
function hireForCar(carId) {
  return (game.hiredDrivers || []).find(h => h.carId === carId) || null;
}

// Drivers get better with seat time. Growth is biggest for strong runs and
// tapers as they approach their personal ceiling.
function developHiredDrivers(allResults, fieldSize) {
  const byCar = new Map((allResults || []).filter(r => r.carId).map(r => [r.carId, r]));
  const grown = [];

  (game.hiredDrivers || []).forEach(h => {
    const res = byCar.get(h.carId);
    if (!res) return;                       // that car did not run

    if (h.skill == null) {                  // migrate an older save
      const base = HIREABLE_DRIVERS.find(d => d.id === h.driverId);
      h.skill = h.startSkill = base ? base.skill : 50;
      h.potential = clamp(h.skill + randInt(6, 20), 0, 99);
      h.racesRun = 0;
    }

    h.racesRun = (h.racesRun || 0) + 1;
    const before  = h.skill;
    const relPerf = clamp(1 - (res.position - 1) / Math.max(1, fieldSize), 0, 1);
    // Taper on the remaining GAP, not the ratio: a driver well short of their
    // ceiling develops quickly, and progress slows as they close on it.
    const room    = clamp((h.potential - h.skill) / 20, 0, 1);
    // The floor means even a bad day is still seat time; a strong run is worth
    // roughly six times as much.
    const gain    = (0.15 + relPerf * 0.85) * room;
    h.skill = clamp(Math.round((h.skill + gain) * 10) / 10, 0, h.potential);

    if (Math.floor(h.skill) > Math.floor(before)) {
      const drv = HIREABLE_DRIVERS.find(d => d.id === h.driverId);
      grown.push(`${drv ? drv.name : 'Your driver'} improved to skill ${Math.floor(h.skill)}.`);
    }
  });

  return grown;
}

function fireDriver(driverId) {
  const idx = game.hiredDrivers.findIndex(h => h.driverId === driverId);
  if (idx === -1) return;
  const { carId } = game.hiredDrivers[idx];
  const car = game.cars.find(c => c.id === carId);
  if (car) car.assignedDriverId = null;
  game.hiredDrivers.splice(idx, 1);
  saveGame();
}

// ─── Sponsor management ──────────────────────────────────────
function signSponsor(sponsorId) {
  if (game.activeSponsors.includes(sponsorId)) return { ok: false, msg: 'Already signed.' };
  const slots = sponsorSlots();
  if (game.activeSponsors.length >= slots) {
    const more = slots < MAX_SPONSOR_SLOTS
      ? ' Hire a Commercial Director to open more.' : '';
    return { ok: false, msg: `You can run ${slots} sponsor deals at a time.${more}` };
  }
  const deal = SPONSOR_DEALS.find(d => d.id === sponsorId);
  if (!deal) return { ok: false, msg: 'Deal not found.' };
  if (deal.level > game.currentSeries) return { ok: false, msg: 'Not eligible yet.' };
  game.activeSponsors.push(sponsorId);
  saveGame();
  return { ok: true };
}

function dropSponsor(sponsorId) {
  const idx = game.activeSponsors.indexOf(sponsorId);
  if (idx !== -1) game.activeSponsors.splice(idx, 1);
  saveGame();
}

// ─── Computed helpers ────────────────────────────────────────
function currentRace() {
  if (!game) return null;
  return game.season.calendar[game.season.raceIndex] || null;
}

function isSeasonOver() {
  return game.season.raceIndex >= game.season.calendar.length;
}

function effectiveCarScore(car) {
  // Combined score used for display/comparison
  return Math.round((car.speed + car.handling + car.reliability) / 3 * (car.condition / 100));
}

function weeklyExpenses() {
  const staffCost = game.staff.reduce((s, st) => s + st.weeklyCost, 0);
  const driverCost = game.hiredDrivers.reduce((s, h) => s + h.weeklyCost, 0);
  return staffCost + driverCost;
}

// More cars on track means more branding for your sponsors, so base pay scales
// with the size of the entry: each car you field doubles the money.
function sponsorCarMultiplier() {
  const entered = (game.cars || []).filter(c =>
    c.assignedDriverId === 'player' || (game.hiredDrivers || []).some(h => h.carId === c.id)
  ).length;
  return Math.max(1, entered);
}

function weeklySponsorIncome() {
  const mult = sponsorCarMultiplier();
  return game.activeSponsors.reduce((s, sid) => {
    const deal = SPONSOR_DEALS.find(d => d.id === sid);
    return s + (deal ? deal.weekly * mult : 0);
  }, 0);
}

function ordinal(n) {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return (s[(v-20)%10] || s[v] || s[0]);
}

// ─── Premier Cup Series career choice ───────────────────────────────
function chooseCareerPath(path, aiTeamId) {
  // path: 'driver' | 'manager' | 'hired'
  game.driverMode = path;
  if (path === 'hired') {
    game.hiredTeamId = aiTeamId;
    // Player no longer owns their team; get a salary
    game.hiredSalary = 8000; // weekly salary
  }
  game.premierChoicePending = false;
  saveGame();
}
`````

---

## 5. `js/race.js`

*414 lines, 16052 bytes.*

`````javascript
// ============================================================
// STOCK CAR EMPIRE - Race Simulation Engine
// ============================================================

/**
 * Simulate a full race and return structured results.
 *
 * @param {object} opts
 *   playerCarId   - which of the player's cars is racing (null if manager/hired mode)
 *   trackId       - the track being raced
 *   isHiredMode   - true if player drives for an AI team
 * @returns {object}  { results, events, playerResult }
 */
function simulateRace({ playerCarId, trackId, isHiredMode }) {
  const track = TRACKS.find(t => t.id === trackId);
  const series = SERIES[game.currentSeries];

  // Build the full entry list
  const entries = buildEntryList(playerCarId, trackId, isHiredMode);

  // Calculate initial performance scores
  entries.forEach(e => {
    e.perfScore = calcPerf(e, track);
  });

  // --- Run the simulation in 5 phases ---
  const phases = ['start', 'early', 'mid', 'late', 'finish'];
  const events  = [];

  // Starting grid (sorted by perf with some qualifying randomness).
  // Data Analysts turn practice data into a better lap, so your cars qualify
  // stronger and with less scatter.
  const analystQuali = analystCount() * ANALYST_QUALI_BONUS;
  entries.forEach(e => {
    const ours = e.isPlayer || e.isTeammate;
    const scatter = ours && analystQuali > 0 ? 5 : 8;
    e.qualifyScore = e.perfScore + rand(-scatter, scatter) + (ours ? analystQuali : 0);
  });
  entries.sort((a, b) => b.qualifyScore - a.qualifyScore);
  entries.forEach((e, i) => { e.position = i + 1; });

  // Track lead changes
  let currentLeader = entries[0];
  let cautionCount  = 0;

  for (const phase of phases) {
    const phaseEvents = runPhase(entries, phase, track, currentLeader, cautionCount);
    events.push(...phaseEvents.events);
    if (phaseEvents.caution) cautionCount++;
    // Re-sort after phase
    entries.sort((a, b) => {
      if (a.dnf && !b.dnf) return 1;
      if (!a.dnf && b.dnf) return -1;
      if (a.dnf && b.dnf) return b.dnfLap - a.dnfLap; // later DNF = better
      return a.position - b.position;
    });
    entries.forEach((e, i) => { if (!e.dnf) e.position = i + 1; });

    // Check for new leader
    const leader = entries.find(e => !e.dnf);
    if (leader && leader.id !== currentLeader.id) {
      currentLeader = leader;
      const tmpl = pick(RACE_EVENTS.leadChange);
      events.push({
        phase,
        type: 'lead_change',
        text: tmpl.replace('{car}', leader.displayName).replace('{lap}', randInt(20, track.laps - 20)),
        isPlayer: leader.isPlayer,
      });
    }
  }

  // Final positions.
  // These MUST come from the running order the phases produced — the closing
  // phase decides the race. Re-sorting on the pre-race perfScore here threw
  // the whole race away and handed the win to whoever qualified strongest,
  // so the car reported leading at the flag could still lose.
  entries.sort((a, b) => {
    if (a.dnf && !b.dnf) return 1;
    if (!a.dnf && b.dnf) return -1;
    if (a.dnf && b.dnf) return b.dnfLap - a.dnfLap;
    return a.position - b.position;
  });
  entries.forEach((e, i) => { e.position = i + 1; });

  // Build results array
  const results = entries.map(e => ({
    entrantId:   e.id,
    carId:       e.carId || null,
    displayName: e.displayName,
    teamName:    e.teamName,
    teamColor:   e.teamColor,
    position:    e.position,
    dnf:         e.dnf,
    isPlayer:    e.isPlayer,
    points:      series.points[e.position - 1] || 0,
    prize:       e.dnf ? Math.round(series.prize[Math.min(e.position - 1, series.prize.length - 1)] * 0.4)
                       : (series.prize[e.position - 1] || series.prize[series.prize.length - 1]),
  }));

  const playerResult = results.find(r => r.isPlayer) || null;

  return { results, events, playerResult };
}

// ─── Build entry list ────────────────────────────────────────
function buildEntryList(playerCarId, trackId, isHiredMode) {
  const series  = SERIES[game.currentSeries];
  const entries = [];

  // Player entry
  if (!isHiredMode && playerCarId) {
    const car = game.cars.find(c => c.id === playerCarId);
    if (car) {
      entries.push({
        id:          'player',
        carId:       car.id,
        displayName: `${game.teamName} / ${game.driverName || 'You'}`,
        teamName:    game.teamName,
        teamColor:   '#e8001d',
        isPlayer:    true,
        dnf:         false,
        // Performance inputs
        speed:       car.speed,
        handling:    car.handling,
        reliability: car.reliability,
        condition:   car.condition,
        driverSkill: game.playerSkill,
        hasCrchief:  game.staff.some(s => s.typeId === 'crew_chief'),
        hasEngineer: game.staff.some(s => s.typeId === 'engineer'),
        analysts:    analystCount(),
      });
    }
  }

  if (isHiredMode) {
    // Player is driving for an AI team — treat like a strong entry
    const aiTeam = game.season.aiTeams.find(t => t.id === game.hiredTeamId);
    if (aiTeam) {
      const power = (aiTeam.cars[0]?.power || 0.55) + game.playerSkill / 100 * 0.2;
      entries.push({
        id:          'player',
        displayName: `${aiTeam.name} / ${game.driverName || 'You'}`,
        teamName:    aiTeam.name,
        teamColor:   aiTeam.color,
        isPlayer:    true,
        dnf:         false,
        syntheticPower: clamp(power, 0.3, 0.98),
      });
    }
  }

  // Your other cars, driven by hired drivers. These are real entries: they
  // race, score points and appear in the standings under their driver's name.
  game.cars.forEach(car => {
    if (car.id === playerCarId) return;                 // that's the one you drive
    const hire = (game.hiredDrivers || []).find(h => h.carId === car.id);
    if (!hire) return;                                  // no driver = not entered
    const drv = HIREABLE_DRIVERS.find(d => d.id === hire.driverId);
    if (!drv) return;
    const carScore = (car.speed + car.handling + car.reliability) / 300;
    const skill    = hiredDriverSkill(hire);   // live, improves over the season
    const power    = clamp(carScore * 0.72 + (skill / 100) * 0.28, 0.25, 0.98);
    entries.push({
      id:          car.id,
      carId:       car.id,
      displayName: `${game.teamName} / ${drv.name}`,
      teamName:    game.teamName,
      teamColor:   car.color || '#e8001d',
      isPlayer:    false,
      isTeammate:  true,
      dnf:         false,
      syntheticPower: power * (car.condition / 100),
      aggression:  (drv.aggression || 50) / 100,
    });
  });

  // AI team entries
  game.season.aiTeams.forEach(team => {
    team.cars.forEach(car => {
      if (isHiredMode && team.id === game.hiredTeamId) return; // skip — player fills this slot
      entries.push({
        id:          car.id,
        displayName: `${team.name} / ${car.driverName}`,
        teamName:    team.name,
        teamColor:   team.color,
        isPlayer:    false,
        dnf:         false,
        syntheticPower: car.power * (car.condition / 100),
        aggression:  team.aggression,
      });
    });
  });

  // Pad to field size with generic backmarkers
  while (entries.length < series.fieldSize) {
    const tmpl = pick(AI_TEAM_TEMPLATES);
    entries.push({
      id:          uid(),
      displayName: `${tmpl.name} / ${pick(AI_DRIVER_NAMES)}`,
      teamName:    tmpl.name,
      teamColor:   tmpl.color,
      isPlayer:    false,
      dnf:         false,
      syntheticPower: rand(0.25, 0.45),
      aggression:  tmpl.aggression,
    });
  }

  return entries.slice(0, series.fieldSize);
}

// ─── Merge a real 3D finish into simulated results ───────────
// The player's actual on-track finish replaces their simulated one. Everyone
// else has to shift around them, otherwise two cars share a position and one
// position goes missing (the "duplicate positions in the Top 10" bug).
function reRankWithPlayerAt(results, playerPosition) {
  const series  = SERIES[game.currentSeries];
  const player  = results.find(r => r.isPlayer);
  const others  = results.filter(r => !r.isPlayer)
                         .sort((a, b) => a.position - b.position);

  // Finishers first, DNFs always at the back
  const running = others.filter(r => !r.dnf);
  const retired = others.filter(r => r.dnf);

  const idx = clamp(playerPosition - 1, 0, running.length);
  if (player) running.splice(idx, 0, player);

  const ordered = [...running, ...retired];
  return ordered.map((r, i) => {
    const pos = i + 1;
    const prizeTable = series.prize;
    const basePrize  = prizeTable[pos - 1] !== undefined
      ? prizeTable[pos - 1]
      : prizeTable[prizeTable.length - 1];
    return {
      ...r,
      position: pos,
      points:   r.dnf ? 0 : (series.points[pos - 1] || 0),
      prize:    r.dnf ? Math.round(basePrize * 0.4) : basePrize,
    };
  });
}

// ─── Merge the whole team's real 3D finish into simulated results ────
// Every car of yours that ran on track (you and any team-mates) is placed in
// the order they actually finished, relative to each other. The simulated
// field then fills in around them, keeping every position unique.
//
// Without this only the player's result was real, so a team-mate you shoved to
// the win could still be shown mid-pack.
function reRankWithTeamOrder(results, playerPosition, trackOrder) {
  const series = SERIES[game.currentSeries];
  const order  = trackOrder || [];
  if (!order.length) return reRankWithPlayerAt(results, playerPosition);

  // The 3D race IS the race, so its finishing order is authoritative for the
  // WHOLE field, not just your cars. An earlier version kept your team as one
  // contiguous block anchored on your own finish, which quietly moved a
  // team-mate who had actually won back to just ahead of you whenever a rival
  // finished between the two of you.
  const pool = results.slice();
  const used = new Array(pool.length).fill(false);
  const driverOf = r => String(r.displayName || '').split(' / ').pop().trim();

  const take = pred => {
    for (let i = 0; i < pool.length; i++) {
      if (!used[i] && pred(pool[i])) { used[i] = true; return pool[i]; }
    }
    return null;
  };

  const ordered = [];
  for (const o of order) {
    let r = null;
    if (o.isPlayer)      r = take(x => x.isPlayer);
    else if (o.carId)    r = take(x => x.carId === o.carId);          // your other cars
    if (!r && o.label)   r = take(x => driverOf(x) === String(o.label).trim());
    if (!r)              r = take(x => !x.isPlayer);                  // any spare rival
    // Retirement is decided on track too. The simulation runs its own
    // reliability rolls, and letting those stand would retire a car that
    // plainly took the flag in front of you.
    if (r) ordered.push(r.dnf === !!o.dnf ? r : { ...r, dnf: !!o.dnf });
  }
  // Anything the track order did not cover keeps its simulated order at the back
  for (let i = 0; i < pool.length; i++) if (!used[i]) ordered.push(pool[i]);

  // Retirements always classify behind the runners
  const runners = ordered.filter(r => !r.dnf);
  const retired = ordered.filter(r => r.dnf);

  return [...runners, ...retired].map((r, i) => {
    const pos = i + 1;
    const table = series.prize;
    const base  = table[pos - 1] !== undefined ? table[pos - 1] : table[table.length - 1];
    return {
      ...r,
      position: pos,
      points:   r.dnf ? 0 : (series.points[pos - 1] || 0),
      prize:    r.dnf ? Math.round(base * 0.4) : base,
    };
  });
}

// ─── Calculate performance score ─────────────────────────────
function calcPerf(entry, track) {
  if (entry.syntheticPower !== undefined) {
    // AI / hired entry: use synthetic power directly.
    // Rival teams get a difficulty bump; your own cars do not.
    const diff = difficultyById(game.difficulty || DEFAULT_DIFFICULTY);
    const mult = entry.isTeammate ? 1 : diff.aiPower;
    const base = entry.syntheticPower * 100 * mult;
    return base + rand(-6, 6);
  }

  // Player entry with real stats
  const sw  = track.speedW;
  const hw  = track.handW;
  const wt  = sw + hw;
  const raw = (entry.speed * sw + entry.handling * hw) / wt;
  const condMod   = entry.condition / 100;
  const skillMod  = 0.25 + entry.driverSkill / 100 * 0.35; // 0.25–0.60
  const chiefBonus = entry.hasCrchief ? 2 : 0;
  const engBonus   = entry.hasEngineer ? 2 : 0;
  const analystBonus = (entry.analysts || 0) * 2;   // setup work found in the data
  const base = raw * condMod + entry.driverSkill * 0.1 + chiefBonus + engBonus + analystBonus;
  return clamp(base, 10, 99) + rand(-5, 5);
}

// ─── Run a single race phase ──────────────────────────────────
function runPhase(entries, phase, track, currentLeader, cautionCount) {
  const events  = [];
  let   caution = false;
  const liveEntries = entries.filter(e => !e.dnf);

  // --- Position churn ---
  // Re-evaluate performance with fresh noise.
  // Track position is sticky: where you qualified sets the opening phase, and
  // running up front is worth a little every phase after. Without this the
  // grid was decorative and qualifying could not matter.
  const fieldN = liveEntries.length || 1;
  liveEntries.forEach(e => {
    const gridEdge = phase === 'start' ? (e.qualifyScore - e.perfScore) * 0.8 : 0;
    const momentum = e.position ? (fieldN - e.position) / fieldN * 6 : 0;
    e.phaseScore = e.perfScore + rand(-10, 10) + gridEdge + momentum;
    // Reliability check — DNF risk
    const relRisk = e.reliability !== undefined ? e.reliability : (e.syntheticPower || 0.5) * 80 + 30;
    const dnfChance = clamp((100 - relRisk) / 1000, 0.005, 0.06);
    if (Math.random() < dnfChance) {
      e.dnf    = true;
      e.dnfLap = randInt(track.laps * 0.2, track.laps * 0.9);
      events.push({
        phase,
        type:     'dnf',
        text:     pick(RACE_EVENTS.crash).replace('{car}', e.displayName.split(' / ')[0]),
        isPlayer: e.isPlayer,
      });
    }
  });

  // Sort by phaseScore
  const active = liveEntries.filter(e => !e.dnf).sort((a, b) => b.phaseScore - a.phaseScore);
  active.forEach((e, i) => { e.position = i + 1; });

  // --- Caution flag (random, less likely late) ---
  const cautionChance = phase === 'finish' ? 0.10 : 0.25;
  if (Math.random() < cautionChance && cautionCount < 4) {
    caution = true;
    events.push({
      phase,
      type:     'caution',
      text:     pick(RACE_EVENTS.caution),
      isPlayer: false,
    });
    // Bunch the field up after caution
    active.forEach((e, i) => {
      const bunching = rand(0, 3);
      e.position = clamp(e.position + (Math.random() > 0.5 ? -1 : 1) * Math.floor(bunching), 1, active.length);
    });
    // Re-sort
    active.sort((a, b) => a.position - b.position);
    active.forEach((e, i) => { e.position = i + 1; });
  }

  // --- Player-specific event ---
  const playerEntry = entries.find(e => e.isPlayer && !e.dnf);
  if (playerEntry && Math.random() < 0.35) {
    const isGood = Math.random() < 0.55;
    const eventText = isGood ? pick(RACE_EVENTS.good) : pick(RACE_EVENTS.bad);
    if (!isGood) {
      playerEntry.position = clamp(playerEntry.position + randInt(1, 4), 1, active.length);
    } else {
      playerEntry.position = clamp(playerEntry.position - randInt(1, 3), 1, active.length);
    }
    events.push({
      phase,
      type:     isGood ? 'player_good' : 'player_bad',
      text:     eventText,
      isPlayer: true,
    });
  }

  return { events, caution };
}

// ─── Build the final results for the race modal ───────────────
function formatRaceResults(results) {
  const series = SERIES[game.currentSeries];
  return results.map(r => {
    const pts = series.points[r.position - 1] || 0;
    return { ...r, pts };
  });
}
`````

---

## 6. `js/race3d.js`

*1800 lines, 77463 bytes.*

`````javascript
// ============================================================
// STOCK CAR EMPIRE — 3D Race Engine (Three.js r134)
// Straight-line superspeedway drafting sprint.
// Controls: A = steer left, D = steer right, S = brake (auto-throttle)
// ============================================================

const R3D = {
  // ── Track / world ──────────────────────────────────────────
  TRACK_LEN:      15000,  // long superspeedway — ~90 sec sprint
  TRACK_W:        22,
  HALF_W:         11,
  WHEEL_R:        0.40,

  // ── Gameplay speed model (TUNED — preserved feel) ──────────
  SPEED_BASE:     175,    // units/sec nominal forward speed
  SPEED_MAX:      268,    // absolute max
  ACCEL:          1.6,    // forward accel lerp
  BRAKE_FORCE:    140,    // speed loss when braking (units/sec²)

  // ── Steering ───────────────────────────────────────────────
  LAT_ACC:        80,     // lateral acceleration (units/sec²)
  LAT_MAX:        13,     // max lateral speed (units/sec)
  LAT_DAMP:       0.0005, // damping when key released
  STEER_FALLOFF:  0.35,   // how much steering authority is lost at top speed (0..1)

  // ── Drafting (TUNED — preserved feel) ──────────────────────
  DRAFT_Z:        92,     // draft cone depth — long tow behind each car
  DRAFT_X:        4.6,    // draft cone width
  DRAFT_BOOST:    38,     // max speed bonus at bumper — the tow really pulls
  DRAFT_SLING:    13,     // momentum decay/sec
  DRAFT_CURVE:    0.72,   // <1 = the tow bites from further back
  PUSH_Z:         5.2,    // bumper-to-bumper push distance
  PUSH_X:         1.8,    // lateral tolerance for locked push
  PUSH_BONUS:     11,     // shove you give the car you are hard against
  CHAIN_PER_CAR:  5,      // extra speed per car in a draft chain
  CHAIN_CURVE:    0.14,   // each extra car is worth MORE than the last
  CHAIN_MAX:      34,     // ceiling on chain bonus so a long train can't run away
  PACK_CATCHUP:   22,     // max catch-up speed for cars stranded behind the pack
  PACK_GAP:       190,    // distance behind the leader where catch-up is full
  TEAM_HELP_Z:    60,     // range at which a teammate starts working with you
  TEAM_PUSH_BONUS: 4,     // extra shove when you and a teammate are locked up
  MIRROR_HFOV:    88,     // mirror HORIZONTAL field of view, degrees

  // ── AI / race director ─────────────────────────────────────
  // Aggression ramps smoothly from CALM_FRAC to ENDGAME_FRAC: early laps are
  // a settled pack, the closing stage is a full-attack scramble.
  CALM_FRAC:      0.45,   // fully calm before this point
  ENDGAME_FRAC:   0.75,   // fully aggressive from here to the flag
  RUBBER_BAND:    10,     // max extra speed for last-place player
  WRECK_FIRST:    50,
  WRECK_MIN:      65,
  WRECK_MAX:      120,
  MAX_WRECKS:     2,
  SPIN_CHANCE:    0.003,
  BUMP_DEBOUNCE:  0.9,

  // ── AI lateral model ───────────────────────────────────────
  // Cars steer by accelerating a lateral velocity, never by snapping position.
  AI_LAT_ACC:     5.0,    // lateral acceleration (units/sec²) — low = smooth arcs
  AI_LAT_MAX:     2.6,    // top lateral speed (units/sec)
  AI_LAT_DAMP:    0.02,   // velocity damping base (per second)
  AI_STEER_GAIN:  0.9,    // desired lateral speed per unit of error
  LANE_STEP:      2.4,    // spacing of candidate lanes
  LANE_WIDTH:     2.6,    // how wide a "lane" is when scoring traffic
  LANE_COMMIT:    3.2,    // seconds a car holds a line before reconsidering
  LANE_GAIN_MIN:  0.14,   // a lane must beat the current one by this to move
  LANE_INERTIA:   0.13,
  TOW_APPEAL:     2.1,    // how strongly the AI wants to be in a draft train
  STUCK_Z:        34,     // being this close behind a slower car counts as bottled up
  STUCK_PENALTY:  1.6,    // how badly a driver wants out of that
  TACTIC_COMMIT:  2.6,    // seconds a driver sticks with a tow/block decision
  BLOCK_Z:        20,     // how close behind before a driver starts defending
  BLOCK_MAX:      1.6,    // furthest a defender will shade across — no chopping

  // ── Physical separation ────────────────────────────────────
  // Contact is resolved with impulses and gentle correction, not teleports.
  SEP_Z_RATE:     34,     // max z correction per second (units/sec)
  SEP_X_RATE:     6,      // max x correction per second (units/sec)
  CONTACT_IMPULSE: 0.9,   // lateral velocity change from a rub (units/sec)
  CAR_SEP_X:      2.15,
  CAR_SEP_Z:      4.6,
  GRID_SPACING:   28,
  PACE_SPEED:     65,
};

// ============================================================
//  Canvas-texture helpers (flat, palette-consistent, no glow)
// ============================================================
function r3dTex(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.anisotropy = 4;
  return t;
}
const r3dHex = v => '#' + (v & 0xffffff).toString(16).padStart(6, '0');

// Painted door/roof number roundel — white disc, dark number (reads on any livery).
// Cached per number so a 30-car field doesn't allocate 30 identical canvases.
const _r3dRoundelCache = new Map();
function r3dRoundelTex(num) {
  if (_r3dRoundelCache.has(num)) return _r3dRoundelCache.get(num);
  const tex = r3dTex(128, 128, (ctx) => {
    ctx.clearRect(0, 0, 128, 128);
    ctx.fillStyle = '#f4f4f4';
    ctx.beginPath(); ctx.arc(64, 64, 54, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = '#15151a'; ctx.stroke();
    ctx.fillStyle = '#15151a';
    ctx.font = 'bold 72px Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(num), 64, 70);
  });
  _r3dRoundelCache.set(num, tex);
  return tex;
}

// Asphalt — flat dark base with aggregate speckle
function r3dAsphaltTex() {
  return r3dTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#2c2c31'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2800; i++) {
      const light = Math.random() < 0.5;
      ctx.fillStyle = light ? 'rgba(80,80,86,0.5)' : 'rgba(18,18,20,0.5)';
      ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    ctx.fillRect(0, 96, w, 3); // faint seam
  });
}

// Grass — flat green with subtle mow banding
function r3dGrassTex() {
  return r3dTex(64, 64, (ctx, w, h) => {
    ctx.fillStyle = '#37833f'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let y = 0; y < h; y += 8) ctx.fillRect(0, y, w, 4);
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? 'rgba(20,60,24,0.5)' : 'rgba(70,140,76,0.5)';
      ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
    }
  });
}

// Grandstand crowd — dark base, scattered bright clothing dots
function r3dCrowdTex() {
  return r3dTex(64, 64, (ctx, w, h) => {
    ctx.fillStyle = '#1d1d22'; ctx.fillRect(0, 0, w, h);
    const cols = ['#d9d2c5', '#b54b4b', '#3f6fb0', '#4c9a52', '#d8b34a', '#cfcfd4', '#7a4ea0', '#c98a3a'];
    for (let i = 0; i < 420; i++) {
      ctx.fillStyle = cols[(Math.random() * cols.length) | 0];
      ctx.fillRect((Math.random() * w) | 0, (Math.random() * h) | 0, 2, 2);
    }
  });
}

// Catchfence — transparent grid
function r3dFenceTex() {
  return r3dTex(64, 64, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(190,190,200,0.45)'; ctx.lineWidth = 1;
    for (let i = 0; i <= w; i += 6) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke(); }
    for (let i = 0; i <= h; i += 6) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke(); }
  });
}

// Sponsor wall boards — alternating flat color blocks with faux logos.
// Dimensions must be powers of two: a NPOT texture with RepeatWrapping loses
// mipmaps/tiling and renders as a smeared mess.
function r3dWallAdTex() {
  return r3dTex(256, 64, (ctx, w, h) => {
    const cols = ['#e4002b', '#1f6fc0', '#2f9a52', '#e0a800', '#6a4ea0', '#cfcfd4'];
    const seg = 64;
    for (let x = 0, i = 0; x < w; x += seg, i++) {
      ctx.fillStyle = cols[i % cols.length];
      ctx.fillRect(x + 2, 4, seg - 4, h - 8);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = 'bold 18px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const letters = 'ABCDEFGHJKLMNPRSTVXZ';
      let tag = '';
      for (let k = 0; k < 3; k++) tag += letters[(Math.random() * letters.length) | 0];
      ctx.fillText(tag, x + seg / 2, h / 2);
    }
  });
}

// Start/finish gantry banner
function r3dBannerTex() {
  return r3dTex(512, 64, (ctx, w, h) => {
    ctx.fillStyle = '#15151a'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e4002b'; ctx.fillRect(0, 0, w, 5); ctx.fillRect(0, h - 5, w, 5);
    ctx.fillStyle = '#ececef';
    ctx.font = 'bold 34px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('START  /  FINISH', w / 2, h / 2 + 2);
  });
}

// ─── Public launcher ─────────────────────────────────────────
function launch3DRace(config, onComplete) {
  const container = document.getElementById('race-3d-container');
  if (!container) { console.error('race-3d-container not found'); return; }

  if (window._r3d) { try { window._r3d.destroy(); } catch (_) {} window._r3d = null; }

  container.innerHTML = `
    <canvas id="r3d-canvas" style="display:block;width:100%;height:100%"></canvas>
    <div id="r3d-hud">
      <button class="r3d-pause-btn" id="r3d-pause-btn" title="Pause (Esc)">PAUSE</button>

      <div id="r3d-mirror-wrap"><div class="r3d-mirror-label">REAR VIEW</div></div>

      <div class="r3d-order" id="r3d-order"></div>

      <div class="r3d-map" id="r3d-map">
        <div class="r3d-map-head">FIELD</div>
        <div class="r3d-map-track" id="r3d-map-track">
          <div class="r3d-map-finish"></div>
        </div>
      </div>

      <div class="r3d-telemetry">
        <div class="r3d-tele-pos">
          <span class="r3d-tele-pos-num" id="r3d-pos">1</span>
          <span class="r3d-tele-pos-of" id="r3d-pos-of">/ 20</span>
        </div>
        <div class="r3d-tele-speed">
          <span id="r3d-speed">0</span><span class="r3d-tele-unit">MPH</span>
        </div>
        <div class="r3d-draft">
          <div class="r3d-draft-label" id="r3d-draft">DRAFT</div>
          <div class="r3d-draft-meter"><div class="r3d-draft-fill" id="r3d-draft-fill"></div></div>
        </div>
      </div>

      <div class="r3d-progress-wrap">
        <div class="r3d-progress-fill" id="r3d-prog-fill"></div>
        <div class="r3d-progress-label">FINISH</div>
      </div>

      <div class="r3d-warning hidden" id="r3d-warn"></div>
      <div class="r3d-countdown" id="r3d-countdown"></div>
      <div class="r3d-finish" id="r3d-finish" style="display:none"></div>

      <div id="r3d-pause-overlay">
        <div class="r3d-pause-panel">
          <div class="r3d-pause-title">PAUSED</div>
          <button class="r3d-pause-resume" id="r3d-pause-resume">RESUME</button>
        </div>
      </div>
    </div>
    <div class="r3d-controls-hint" id="r3d-hint">
      <span>A</span> Steer Left &nbsp;|&nbsp; <span>D</span> Steer Right &nbsp;|&nbsp; <span>S</span> Brake
    </div>
  `;

  const canvas = document.getElementById('r3d-canvas');

  requestAnimationFrame(() => {
    const w = container.clientWidth  || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    canvas.width  = w;
    canvas.height = h;
    window._r3d = new Race3DEngine(canvas, config, onComplete);
  });

  window._r3dFinish = (pos) => {
    // Grab the real on-track order before tearing the engine down, so the
    // results table reflects what actually happened — team-mates included.
    let order = [];
    if (window._r3d) {
      try { order = window._r3d.finalOrder(); } catch (_) {}
      try { window._r3d.destroy(); } catch (_) {}
      window._r3d = null;
    }
    onComplete(pos, order);
  };
}

// ─── Race Engine ──────────────────────────────────────────────
class Race3DEngine {
  constructor(canvas, config, onComplete) {
    this.canvas       = canvas;
    this.config       = config;
    this.onComplete   = onComplete;
    this.keys         = { a: false, d: false, s: false };
    this.paused       = false;
    this.cars         = [];
    this.player       = null;
    this.wrecks       = [];
    this.wreckCount   = 0;
    this.wreckCooldown = R3D.WRECK_FIRST;
    this.camShake     = 0;
    this.racing       = false;
    this.paceMode     = false;
    this.done         = false;
    this.finishOrder  = [];
    this._raf         = null;
    this._warnTimeout = null;
    this._orderAcc    = 0;   // throttle accumulator for the order tower
    this._mapAcc      = 0;
    this._dummy       = new THREE.Object3D();
    // Difficulty scales AI pace and aggression, and how much the draft gives you
    this.diff = (typeof difficultyById === 'function')
      ? difficultyById(config.difficulty || DEFAULT_DIFFICULTY)
      : { aiSpeed: 1, aiPower: 1, aiAggro: 1, playerDraft: 1 };

    this._init();
  }

  // ── Scene setup ──────────────────────────────────────────────
  _init() {
    const c = this.canvas;
    const w = c.width  || window.innerWidth;
    const h = c.height || window.innerHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x7fb2dd);
    this.scene.fog = new THREE.FogExp2(0xb7d4e8, 0.00085);

    this.camera = new THREE.PerspectiveCamera(62, w / h, 0.5, 4000);
    this.camera.position.set(0, 5, -12);

    // Far plane matches the main camera so the track doesn't visibly end
    // partway down the mirror.
    this.mirrorCam = new THREE.PerspectiveCamera(72, 3.5, 0.5, 4000);
    this.mirrorCam.position.set(0, 4, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas: c, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    this.scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x4a6a3a, 0.45));

    const sun = new THREE.DirectionalLight(0xfff3df, 1.05);
    sun.position.set(90, 220, 120);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -320; sun.shadow.camera.right = 320;
    sun.shadow.camera.top = 320;   sun.shadow.camera.bottom = -320;
    sun.shadow.camera.far = 2400;
    this.scene.add(sun);

    // Max anisotropy keeps the heavily-tiled asphalt/grass sharp at distance
    // instead of shimmering — most visible in the mirror.
    this._maxAniso = this.renderer.capabilities?.getMaxAnisotropy?.() || 4;

    this._initGeometries();
    this._buildTrack();
    this._buildEnvironment();
    this._buildCars();
    this._buildMinimap();

    // Apply the real anisotropy limit to every texture now in the scene
    this.scene.traverse(o => {
      const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
      for (const m of mats) {
        if (m && m.map) { m.map.anisotropy = this._maxAniso; m.map.needsUpdate = true; }
      }
    });

    // Input
    this._kd = e => {
      const k = e.key.toLowerCase();
      if (k === 'a') this.keys.a = true;
      if (k === 'd') this.keys.d = true;
      if (k === 's') this.keys.s = true;
      if (e.key === 'Escape') this._togglePause();
    };
    this._ku = e => {
      const k = e.key.toLowerCase();
      if (k === 'a') this.keys.a = false;
      if (k === 'd') this.keys.d = false;
      if (k === 's') this.keys.s = false;
    };
    document.addEventListener('keydown', this._kd);
    document.addEventListener('keyup',   this._ku);

    const pauseBtn  = document.getElementById('r3d-pause-btn');
    const resumeBtn = document.getElementById('r3d-pause-resume');
    if (pauseBtn)  pauseBtn.addEventListener('click',  () => this._togglePause());
    if (resumeBtn) resumeBtn.addEventListener('click', () => this._togglePause());

    this._onResize = () => {
      const el = this.canvas.parentElement;
      if (!el) return;
      const nw = el.clientWidth  || window.innerWidth;
      const nh = el.clientHeight || window.innerHeight;
      this.renderer.setSize(nw, nh, false);
      this.camera.aspect = nw / nh;
      this.camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', this._onResize);

    this.clock = new THREE.Clock();
    this._loop();
    this._countdown();
  }

  // Shared geometries (reused across all cars for memory/perf)
  _initGeometries() {
    const tire = new THREE.CylinderGeometry(R3D.WHEEL_R, R3D.WHEEL_R, 0.34, 18);
    tire.rotateZ(Math.PI / 2);   // axle along local X → roll about X
    const rim  = new THREE.CylinderGeometry(0.22, 0.22, 0.36, 14);
    rim.rotateZ(Math.PI / 2);
    const hub  = new THREE.CylinderGeometry(0.07, 0.07, 0.38, 8);
    hub.rotateZ(Math.PI / 2);
    this.G = {
      tire, rim, hub,
      lowerBody: new THREE.BoxGeometry(2.16, 0.5, 4.0),
      hood:      new THREE.BoxGeometry(2.0, 0.26, 1.7),
      nose:      new THREE.BoxGeometry(1.74, 0.34, 0.9),
      tail:      new THREE.BoxGeometry(2.0, 0.30, 0.9),
      cabin:     new THREE.BoxGeometry(1.78, 0.5, 1.95),
      roof:      new THREE.BoxGeometry(1.62, 0.16, 1.7),
      airdam:    new THREE.BoxGeometry(2.2, 0.16, 0.42),
      splitter:  new THREE.BoxGeometry(2.34, 0.06, 0.5),
      wing:      new THREE.BoxGeometry(2.24, 0.08, 0.5),
      wingEnd:   new THREE.BoxGeometry(0.08, 0.4, 0.5),
      strut:     new THREE.BoxGeometry(0.12, 0.42, 0.12),
      mirror:    new THREE.BoxGeometry(0.14, 0.14, 0.3),
      glass:     new THREE.BoxGeometry(1.6, 0.42, 0.1),
      sideglass: new THREE.BoxGeometry(0.08, 0.34, 1.4),
      decalDoor: new THREE.PlaneGeometry(1.0, 1.0),
      decalRoof: new THREE.PlaneGeometry(1.2, 1.2),
      lamp:      new THREE.PlaneGeometry(0.5, 0.28),
    };
    this.M = {
      tire:  new THREE.MeshLambertMaterial({ color: 0x141416 }),
      rim:   new THREE.MeshLambertMaterial({ color: 0xb9bcc4 }),
      hub:   new THREE.MeshLambertMaterial({ color: 0x6a6d75 }),
      trim:  new THREE.MeshLambertMaterial({ color: 0x101012 }),
      glass: new THREE.MeshLambertMaterial({ color: 0x223044, transparent: true, opacity: 0.66 }),
      head:  new THREE.MeshBasicMaterial({ color: 0xfff2c8 }),
      tail:  new THREE.MeshBasicMaterial({ color: 0xd11a1a }),
    };
  }

  // ── Track ────────────────────────────────────────────────────
  _buildTrack() {
    const s  = this.scene;
    const TL = R3D.TRACK_LEN;
    const TW = R3D.TRACK_W;
    const d  = this._dummy;

    // Asphalt (textured). DoubleSide so the flipped mirror projection doesn't cull it.
    const aTex = r3dAsphaltTex();
    aTex.wrapS = aTex.wrapT = THREE.RepeatWrapping;
    aTex.repeat.set(3, TL / 26);
    const asphalt = new THREE.Mesh(
      new THREE.PlaneGeometry(TW, TL + 80),
      new THREE.MeshLambertMaterial({ map: aTex, color: 0xbbbbbb, side: THREE.DoubleSide })
    );
    asphalt.rotation.x = -Math.PI / 2;
    asphalt.position.set(0, 0, TL / 2);
    asphalt.receiveShadow = true;
    s.add(asphalt);

    // Grass aprons (textured)
    const gTex = r3dGrassTex();
    gTex.wrapS = gTex.wrapT = THREE.RepeatWrapping;
    gTex.repeat.set(40, TL / 20);
    const grassMat = new THREE.MeshLambertMaterial({ map: gTex, color: 0xcccccc, side: THREE.DoubleSide });
    [-1, 1].forEach(side => {
      const g = new THREE.Mesh(new THREE.PlaneGeometry(600, TL + 200), grassMat);
      g.rotation.x = -Math.PI / 2;
      g.position.set(side * (TW / 2 + 300), -0.02, TL / 2);
      g.receiveShadow = true;
      s.add(g);
    });

    // Lane dashes (InstancedMesh, 1 draw call)
    const DASH_STEP = 24;
    const DASH_COUNT = Math.floor(TL / DASH_STEP);
    const dashMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.24, 0.02, 6),
      new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }),
      2 * DASH_COUNT
    );
    let di = 0;
    [-TW / 6, TW / 6].forEach(lx => {
      for (let z = 12; z < TL - 12; z += DASH_STEP) {
        d.position.set(lx, 0.015, z); d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1);
        d.updateMatrix(); dashMesh.setMatrixAt(di++, d.matrix);
      }
    });
    dashMesh.count = di;
    dashMesh.instanceMatrix.needsUpdate = true;
    s.add(dashMesh);

    // Solid edge lines + colored rumble strips
    const edgeMat = new THREE.MeshLambertMaterial({ color: 0xf2f2f2 });
    [-(TW / 2 - 0.4), TW / 2 - 0.4].forEach(lx => {
      const el = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, TL), edgeMat);
      el.position.set(lx, 0.014, TL / 2); s.add(el);
    });
    const RUMBLE_STEP = 6;
    const RUMBLE_COUNT = Math.floor(TL / RUMBLE_STEP);
    [-(TW / 2 + 0.45), TW / 2 + 0.45].forEach(rx => {
      const redM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.05, RUMBLE_STEP - 0.4),
        new THREE.MeshLambertMaterial({ color: 0xd0202a }), Math.ceil(RUMBLE_COUNT / 2));
      const whM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.05, RUMBLE_STEP - 0.4),
        new THREE.MeshLambertMaterial({ color: 0xf0f0f0 }), Math.ceil(RUMBLE_COUNT / 2));
      let ri = 0, wi = 0;
      for (let si = 0; si < RUMBLE_COUNT; si++) {
        d.position.set(rx, 0.025, si * RUMBLE_STEP + 3); d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1);
        d.updateMatrix();
        if (si % 2 === 0) redM.setMatrixAt(ri++, d.matrix); else whM.setMatrixAt(wi++, d.matrix);
      }
      redM.count = ri; whM.count = wi;
      redM.instanceMatrix.needsUpdate = true; whM.instanceMatrix.needsUpdate = true;
      s.add(redM); s.add(whM);
    });

    // SAFER walls + sponsor boards + catchfence
    const adTex = r3dWallAdTex();
    adTex.wrapS = adTex.wrapT = THREE.RepeatWrapping;
    adTex.repeat.set(TL / 24, 1);
    const fenceTex = r3dFenceTex();
    fenceTex.wrapS = fenceTex.wrapT = THREE.RepeatWrapping;
    fenceTex.repeat.set(TL / 4, 2.5);

    [-1, 1].forEach(side => {
      const bx = side * (TW / 2 + 0.9);
      const wall = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.15, TL + 20),
        new THREE.MeshLambertMaterial({ color: 0xe7e7ea }));
      wall.position.set(bx, 0.58, TL / 2); wall.receiveShadow = true; s.add(wall);

      // Sponsor board face (just inside wall, toward track)
      const ad = new THREE.Mesh(new THREE.PlaneGeometry(TL, 0.85),
        new THREE.MeshLambertMaterial({ map: adTex, side: THREE.DoubleSide }));
      ad.position.set(bx - side * 0.72, 0.62, TL / 2);
      ad.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      s.add(ad);

      // Catchfence
      const fence = new THREE.Mesh(new THREE.PlaneGeometry(TL, 5.2),
        new THREE.MeshBasicMaterial({ map: fenceTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
      fence.position.set(bx - side * 0.72, 3.6, TL / 2);
      fence.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      s.add(fence);
    });

    // Start/finish checkerboard
    const COLS = 14, CW = TW / COLS, ROWS = 2;
    const checkW = new THREE.InstancedMesh(new THREE.BoxGeometry(CW - 0.04, 0.03, 2.8),
      new THREE.MeshLambertMaterial({ color: 0xffffff }), COLS * ROWS);
    const checkB = new THREE.InstancedMesh(new THREE.BoxGeometry(CW - 0.04, 0.03, 2.8),
      new THREE.MeshLambertMaterial({ color: 0x121212 }), COLS * ROWS);
    let wIdx = 0, bIdx = 0;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        d.position.set(-TW / 2 + CW / 2 + col * CW, 0.02, TL - 4.2 + row * 2.8);
        d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); d.updateMatrix();
        if ((col + row) % 2 === 0) checkW.setMatrixAt(wIdx++, d.matrix);
        else                       checkB.setMatrixAt(bIdx++, d.matrix);
      }
    }
    checkW.count = wIdx; checkB.count = bIdx;
    checkW.instanceMatrix.needsUpdate = true; checkB.instanceMatrix.needsUpdate = true;
    s.add(checkW); s.add(checkB);

    // Finish gantry with banner
    const postMat = new THREE.MeshLambertMaterial({ color: 0xcfcfd4 });
    [-(TW / 2 + 2), TW / 2 + 2].forEach(px => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.6, 13, 0.6), postMat);
      post.position.set(px, 6.5, TL - 2.8); s.add(post);
    });
    const gantry = new THREE.Mesh(new THREE.BoxGeometry(TW + 6, 0.6, 0.6), postMat);
    gantry.position.set(0, 12.6, TL - 2.8); s.add(gantry);
    const banner = new THREE.Mesh(new THREE.BoxGeometry(TW + 4, 2.4, 0.25),
      new THREE.MeshLambertMaterial({ map: r3dBannerTex() }));
    banner.position.set(0, 10.8, TL - 2.95); s.add(banner);

    // Starting grid markers
    const GRID_ROWS = 16;
    const gridMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(TW, 0.02, 0.45),
      new THREE.MeshLambertMaterial({ color: 0xf0c020 }), GRID_ROWS);
    for (let r = 0; r < GRID_ROWS; r++) {
      d.position.set(0, 0.016, r * R3D.GRID_SPACING + 0.25);
      d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); d.updateMatrix();
      gridMesh.setMatrixAt(r, d.matrix);
    }
    gridMesh.instanceMatrix.needsUpdate = true;
    s.add(gridMesh);
  }

  // ── Environment ──────────────────────────────────────────────
  _buildEnvironment() {
    const s  = this.scene;
    const TL = R3D.TRACK_LEN;
    const TW = R3D.TRACK_W;
    const d  = this._dummy;

    // Grandstands (one long textured structure per side, set behind the apron)
    const crowdTex = r3dCrowdTex();
    crowdTex.wrapS = crowdTex.wrapT = THREE.RepeatWrapping;
    crowdTex.repeat.set(TL / 14, 3);
    const standLen = TL * 0.82;
    [-1, 1].forEach(side => {
      const sx = side * (TW / 2 + 52);
      const faceIdx = side > 0 ? 1 : 0; // -X face for right stand, +X for left
      const mats = [];
      for (let i = 0; i < 6; i++) {
        mats.push(i === faceIdx
          ? new THREE.MeshLambertMaterial({ map: crowdTex })
          : new THREE.MeshLambertMaterial({ color: 0x9a9aa2 }));
      }
      const stand = new THREE.Mesh(new THREE.BoxGeometry(10, 13, standLen), mats);
      stand.position.set(sx, 6.5, TL / 2);
      s.add(stand);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(14, 1, standLen),
        new THREE.MeshLambertMaterial({ color: 0x33343c }));
      roof.position.set(sx - side * 1.5, 13.4, TL / 2);
      s.add(roof);
    });

    // Distant treeline ridge for depth (flat, far, behind stands)
    const ridgeMat = new THREE.MeshLambertMaterial({ color: 0x2f5a36 });
    [-1, 1].forEach(side => {
      const ridge = new THREE.Mesh(new THREE.BoxGeometry(18, 26, TL + 400), ridgeMat);
      ridge.position.set(side * (TW / 2 + 230), 8, TL / 2);
      s.add(ridge);
    });

    // Light poles (instanced)
    const POLE_STEP = 200;
    const POLE_COUNT = Math.floor(TL / POLE_STEP);
    const poleMesh  = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 24, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x80828a }), POLE_COUNT * 2);
    const lightMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(7, 0.7, 0.7),
      new THREE.MeshLambertMaterial({ color: 0xfffce0 }), POLE_COUNT * 2);
    let pi = 0;
    for (let z = 160; z < TL - 100; z += POLE_STEP) {
      [-1, 1].forEach(sx => {
        const px = sx * (TW / 2 + 66);
        d.position.set(px, 12, z); d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1);
        d.updateMatrix(); poleMesh.setMatrixAt(pi, d.matrix);
        d.position.set(px - sx * 3, 24.2, z); d.updateMatrix(); lightMesh.setMatrixAt(pi, d.matrix);
        pi++;
      });
    }
    poleMesh.count = pi; lightMesh.count = pi;
    poleMesh.instanceMatrix.needsUpdate = true; lightMesh.instanceMatrix.needsUpdate = true;
    s.add(poleMesh); s.add(lightMesh);

    // Pit-wall banner strip (left side)
    const bannerColors = [0xe4002b, 0x1f6fc0, 0x2f9a52, 0xe0a800, 0x6a4ea0];
    for (let z = 80, k = 0; z < TL - 80; z += 160, k++) {
      const bm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 150),
        new THREE.MeshLambertMaterial({ color: bannerColors[k % bannerColors.length] }));
      bm.position.set(-(TW / 2 + 0.2), 1.55, z + 75);
      s.add(bm);
    }
  }

  // ── Cars ─────────────────────────────────────────────────────
  _buildCars() {
    const { config } = this;
    const fieldSize  = Math.min(config.aiEntries.length + 1, config.fieldSize);

    // Grid slots ordered POLE FIRST. +Z is the direction of travel, so row 0
    // must sit at the highest z — building them the other way round made the
    // announced starting position the exact inverse of the real one.
    const slots = [];
    const rows  = Math.ceil(fieldSize / 2);
    for (let r = 0; r < rows; r++) {
      const baseZ = (rows - 1 - r) * R3D.GRID_SPACING;
      slots.push({ x: -3.5, z: baseZ });         // inside line
      slots.push({ x:  3.5, z: baseZ - 1.6 });   // outside line, staggered back
    }
    slots.length = fieldSize;                    // never draw a slot past the field

    // Qualifying draw. Normally anywhere in the field, but a Data Analyst
    // biases it toward the front — take the best of N draws, one extra draw
    // per analyst on staff.
    const draws = 1 + (config.qualifyBoost || 0);
    let playerSlotIdx = Math.floor(Math.random() * slots.length);
    for (let i = 1; i < draws; i++) {
      playerSlotIdx = Math.min(playerSlotIdx, Math.floor(Math.random() * slots.length));
    }
    this._startingPos = playerSlotIdx + 1;     // now genuinely 1 = pole
    const ps = slots[playerSlotIdx];
    this.player = this._makeCar(ps.x, ps.z, {
      color:      config.playerColor || '#e8001d',
      number:     config.playerNumber || 1,
      power:      config.playerPower,
      isPlayer:   true,
      isTeammate: false,
      label:      config.playerName || 'YOU',
      carId:      config.playerCarId || null,
    });
    this.cars.push(this.player);

    let aiIdx = 0;
    for (let i = 0; i < slots.length && aiIdx < config.aiEntries.length; i++) {
      if (i === playerSlotIdx) continue;
      const entry = config.aiEntries[aiIdx++];
      const slot  = slots[i];
      this.cars.push(this._makeCar(slot.x, slot.z, {
        color:      entry.color,
        number:     entry.number || (aiIdx + 1),
        power:      clamp(entry.power, 0.25, 0.95),
        isPlayer:   false,
        isTeammate: !!entry.isTeammate,
        label:      entry.name,
        carId:      entry.carId || null,
      }));
    }
  }

  _makeCar(x, z, { color, number, power, isPlayer, isTeammate, label, carId }) {
    const hex = typeof color === 'string' ? parseInt(color.replace('#', ''), 16) : color;
    const G = this.G, M = this.M;
    const g = new THREE.Group();

    const bodyMat = new THREE.MeshLambertMaterial({ color: hex });
    const darker  = (hex & 0xfefefe) >> 1; // ~50% darker for accent panels
    const accMat  = new THREE.MeshLambertMaterial({ color: darker });

    // Lower hull
    const lower = new THREE.Mesh(G.lowerBody, bodyMat);
    lower.position.set(0, 0.42, 0); lower.castShadow = true; g.add(lower);

    // Sloped nose (front, +Z) and tail (rear, -Z)
    const nose = new THREE.Mesh(G.nose, bodyMat);
    nose.position.set(0, 0.40, 2.05); nose.rotation.x = 0.18; nose.castShadow = true; g.add(nose);
    const tail = new THREE.Mesh(G.tail, bodyMat);
    tail.position.set(0, 0.44, -2.05); tail.rotation.x = -0.12; g.add(tail);

    // Hood + decklid
    const hood = new THREE.Mesh(G.hood, bodyMat);
    hood.position.set(0, 0.60, 1.05); hood.rotation.x = -0.05; g.add(hood);

    // Greenhouse / cabin + roof
    const cabin = new THREE.Mesh(G.cabin, accMat);
    cabin.position.set(0, 0.78, -0.15); cabin.castShadow = true; g.add(cabin);
    const roof = new THREE.Mesh(G.roof, bodyMat);
    roof.position.set(0, 1.05, -0.15); g.add(roof);

    // Glass: windshield, rear glass, side windows
    const ws = new THREE.Mesh(G.glass, M.glass);
    ws.position.set(0, 0.86, 0.78); ws.rotation.x = 0.5; g.add(ws);
    const rw = new THREE.Mesh(G.glass, M.glass);
    rw.position.set(0, 0.86, -1.05); rw.rotation.x = -0.5; g.add(rw);
    [-0.9, 0.9].forEach(sx => {
      const sg = new THREE.Mesh(G.sideglass, M.glass);
      sg.position.set(sx, 0.84, -0.15); g.add(sg);
    });

    // Aero: front air dam + splitter, rear wing
    const dam = new THREE.Mesh(G.airdam, M.trim);
    dam.position.set(0, 0.20, 2.28); g.add(dam);
    const splitter = new THREE.Mesh(G.splitter, M.trim);
    splitter.position.set(0, 0.10, 2.38); g.add(splitter);
    const wing = new THREE.Mesh(G.wing, M.trim);
    wing.position.set(0, 1.08, -2.18); g.add(wing);
    [-1.08, 1.08].forEach(sx => {
      const ep = new THREE.Mesh(G.wingEnd, M.trim);
      ep.position.set(sx, 0.92, -2.18); g.add(ep);
      const st = new THREE.Mesh(G.strut, M.trim);
      st.position.set(sx * 0.55, 0.86, -2.18); g.add(st);
    });

    // Mirrors
    [-1.0, 1.0].forEach(sx => {
      const mir = new THREE.Mesh(G.mirror, M.trim);
      mir.position.set(sx, 0.82, 0.55); g.add(mir);
    });

    // Lights (decal-style emissive planes)
    [-0.6, 0.6].forEach(sx => {
      const hl = new THREE.Mesh(G.lamp, M.head);
      hl.position.set(sx, 0.46, 2.51); g.add(hl);
      const tl = new THREE.Mesh(G.lamp, M.tail);
      tl.position.set(sx, 0.5, -2.51); tl.rotation.y = Math.PI; g.add(tl);
    });

    // Wheels (shared geometry; stored for rolling animation)
    const wheels = [];
    [[-1.12, -1.42], [1.12, -1.42], [-1.12, 1.42], [1.12, 1.42]].forEach(([wx, wz]) => {
      const tire = new THREE.Mesh(G.tire, M.tire);
      tire.position.set(wx, R3D.WHEEL_R, wz); tire.castShadow = true; g.add(tire);
      const rim = new THREE.Mesh(G.rim, M.rim);
      rim.position.set(wx, R3D.WHEEL_R, wz); g.add(rim);
      const hub = new THREE.Mesh(G.hub, M.hub);
      hub.position.set(wx, R3D.WHEEL_R, wz); g.add(hub);
      wheels.push(tire, rim, hub);
    });

    // Painted number decals — roof + both doors
    const roundel = r3dRoundelTex(number);
    const decalMat = new THREE.MeshBasicMaterial({ map: roundel, transparent: true });
    const roofDecal = new THREE.Mesh(G.decalRoof, decalMat);
    roofDecal.position.set(0, 1.14, -0.15); roofDecal.rotation.x = -Math.PI / 2; g.add(roofDecal);
    [[-1.09, Math.PI / 2], [1.09, -Math.PI / 2]].forEach(([sx, ry]) => {
      const door = new THREE.Mesh(G.decalDoor, decalMat);
      door.position.set(sx, 0.5, -0.1); door.rotation.y = ry; g.add(door);
    });

    // (No draft box around the car — the HUD draft meter carries that info.)

    // Teammate marker — flat gold trim painted on the car itself.
    // (No floating banner: keeps the field readable at speed.)
    if (isTeammate) {
      const tmMat = new THREE.MeshLambertMaterial({ color: 0xe0a800 });
      const roofBand = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.05, 0.3), tmMat);
      roofBand.position.set(0, 1.14, 0.6); g.add(roofBand);
      [-1.10, 1.10].forEach(sx => {
        const rocker = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.13, 3.4), tmMat);
        rocker.position.set(sx, 0.22, 0); g.add(rocker);
      });
    }

    g.position.set(x, 0, z);
    this.scene.add(g);

    return {
      mesh: g, wheels, isTeammate, carId,
      isPlayer, power, label, hex, number, x, z,
      lv: 0,
      lvx: 0,          // AI lateral velocity (inertia)
      speed: R3D.SPEED_BASE * (0.78 + power * 0.22),
      targetX: x,
      spinning: false, spinTimer: 0, spinDir: 1,
      finished: false, dnf: false,
      draftBoost: 0, draftMomentum: 0,
      laneTimer: Math.random() * 4,
      contactCooldown: 0,
      tilt: 0,
    };
  }

  // ── Minimap dots (DOM) ───────────────────────────────────────
  _buildMinimap() {
    const track = document.getElementById('r3d-map-track');
    if (!track) return;
    for (const car of this.cars) {
      const dot = document.createElement('div');
      dot.className = 'r3d-map-dot';
      if (car.isPlayer) dot.classList.add('is-player');
      else dot.style.background = r3dHex(car.hex);
      track.appendChild(dot);
      car._dot = dot;
    }
  }

  // ── Rolling start sequence ───────────────────────────────────
  _countdown() {
    const el   = document.getElementById('r3d-countdown');
    const hint = document.getElementById('r3d-hint');
    this.paceMode = true;

    const setMsg = (txt, big = false) => {
      if (!el) return;
      el.textContent = txt;
      el.style.opacity = '1';
      el.style.fontSize = big ? '1.5rem' : '';
      el.style.letterSpacing = big ? '0.12em' : '';
      el.classList.remove('go');
    };

    setMsg(`FORMATION LAP  —  P${this._startingPos} START`, true);
    setTimeout(() => {
      if (this.done) return;
      setMsg('3');
      setTimeout(() => {
        if (this.done) return;
        setMsg('2');
        setTimeout(() => {
          if (this.done) return;
          setMsg('1');
          setTimeout(() => {
            if (this.done) return;
            if (el) {
              el.textContent = 'GREEN FLAG';
              el.style.fontSize = ''; el.style.letterSpacing = '';
              el.classList.add('go');
            }
            this.paceMode = false;
            this.racing = true;
            if (hint) hint.style.opacity = '0';
            setTimeout(() => { if (el) el.style.opacity = '0'; }, 1100);
          }, 1000);
        }, 1000);
      }, 1000);
    }, 3000);
  }

  // ── Main update ──────────────────────────────────────────────
  _update(dt) {
    if (this.paused) return;

    if (this.paceMode) {
      this._updatePaceLap(dt);
      this._animateCars(dt);
      this._updateCamera(dt);
      this._updateHUD(dt);
      return;
    }
    if (!this.racing || this.done) return;

    // NOTE: _pushLocked is cleared inside _separateCars, not here. It is set
    // by the contact solver which runs AFTER _updateAI, so clearing it here
    // meant _updateAI always saw false and cars in a pack kept making lane
    // decisions while locked bumper-to-bumper — a big source of the twitching.
    this._updatePlayer(dt);
    this._updateAI(dt);
    this._calcDraft(dt);
    this._calcChainBonus();
    this._separateCars(dt);
    this._checkCollisions();
    this._checkFinish();
    this._animateCars(dt);
    this._updateCamera(dt);
    this._updateHUD(dt);

    const endgameGlobal = this.player.z / R3D.TRACK_LEN >= R3D.ENDGAME_FRAC;
    const maxWrecks = endgameGlobal ? R3D.MAX_WRECKS + 3 : R3D.MAX_WRECKS;
    if (this.wreckCount < maxWrecks) {
      this.wreckCooldown -= dt;
      if (this.wreckCooldown <= 0) {
        this._triggerWreck();
        const minCD = endgameGlobal ? R3D.WRECK_MIN * 0.40 : R3D.WRECK_MIN;
        const maxCD = endgameGlobal ? R3D.WRECK_MAX * 0.50 : R3D.WRECK_MAX;
        this.wreckCooldown = minCD + Math.random() * (maxCD - minCD);
      }
    }
  }

  _updatePaceLap(dt) {
    const hw = R3D.HALF_W - 1.2;
    const p  = this.player;
    if      (this.keys.a) p.lv += R3D.LAT_ACC * 0.6 * dt;
    else if (this.keys.d) p.lv -= R3D.LAT_ACC * 0.6 * dt;
    else                  p.lv *= Math.pow(R3D.LAT_DAMP, dt);
    p.lv = clamp(p.lv, -R3D.LAT_MAX * 0.6, R3D.LAT_MAX * 0.6);
    p.x  = clamp(p.x + p.lv * dt, -hw, hw);

    for (const car of this.cars) {
      car.speed += (R3D.PACE_SPEED - car.speed) * Math.min(1, dt * 3.0);
      car.z += car.speed * dt;
      car.mesh.position.set(car.x, 0, car.z);
    }
    p.mesh.position.set(p.x, 0, p.z);
  }

  _updatePlayer(dt) {
    const p  = this.player;
    const hw = R3D.HALF_W - 1.2;

    if (p.spinning) {
      p.spinTimer -= dt;
      p.mesh.rotation.y += p.spinDir * 4.5 * dt;
      p.speed = Math.max(15, p.speed - 120 * dt);
      p.z += p.speed * dt;
      p.mesh.position.z = p.z;
      if (p.spinTimer <= 0) { p.spinning = false; p.mesh.rotation.y = 0; }
      return;
    }

    // Steering authority falls off slightly with speed (less twitchy at top speed)
    const spdFrac = clamp((p.speed - R3D.SPEED_BASE) / (R3D.SPEED_MAX - R3D.SPEED_BASE), 0, 1);
    const steerAuth = 1 - spdFrac * R3D.STEER_FALLOFF;
    // A = left = +X (world), D = right = -X (world); camera looks +Z so world +X = screen left
    if      (this.keys.a) p.lv += R3D.LAT_ACC * steerAuth * dt;
    else if (this.keys.d) p.lv -= R3D.LAT_ACC * steerAuth * dt;
    else                  p.lv *= Math.pow(R3D.LAT_DAMP, dt);

    p.lv = clamp(p.lv, -R3D.LAT_MAX, R3D.LAT_MAX);
    p.x  = clamp(p.x + p.lv * dt, -hw, hw);

    if (Math.abs(p.x) >= hw - 0.05) {
      p.lv = -p.lv * 0.28;
      p.speed = Math.max(p.speed * 0.88, 80);
      this.camShake = Math.max(this.camShake, 0.35);
      this._warn('WALL BRUSH');
    }

    const activeCount = this.cars.filter(c => !c.dnf && !c.finished).length;
    const aheadCount  = this.cars.filter(c => !c.dnf && !c.finished && c.z > p.z).length;
    const posFrac     = activeCount > 1 ? aheadCount / (activeCount - 1) : 0;
    const rubberBand  = posFrac * R3D.RUBBER_BAND;

    const tgt = Math.min(R3D.SPEED_BASE * (0.84 + p.power * 0.18) + p.draftBoost + rubberBand, R3D.SPEED_MAX);
    let braking = false;
    if (this.keys.s) {
      p.speed = Math.max(tgt * 0.38, p.speed - R3D.BRAKE_FORCE * dt);
      braking = true;
    } else {
      p.speed += (tgt - p.speed) * Math.min(1, dt * R3D.ACCEL);
    }

    p.z += p.speed * dt;
    p.mesh.position.set(p.x, 0, p.z);

    // Body roll (steer) + squat/dive (throttle/brake)
    const roll = this.keys.a ? -0.05 : this.keys.d ? 0.05 : 0;
    p.mesh.rotation.z += (roll - p.mesh.rotation.z) * 0.12;
    const pitch = braking ? 0.035 : (p.speed < tgt - 4 ? -0.025 : 0);
    p.mesh.rotation.x += (pitch - p.mesh.rotation.x) * 0.08;
  }

  _updateAI(dt) {
    // Where the race leader is, so stragglers know how much ground to make up
    this._leadZ = this.cars.reduce(
      (m, c) => (!c.dnf && !c.finished && c.z > m ? c.z : m), -Infinity);
    if (!isFinite(this._leadZ)) this._leadZ = this.player.z;

    for (const car of this.cars) {
      if (car.isPlayer) continue;
      if (car.contactCooldown > 0) car.contactCooldown -= dt;
      if (car.finished) continue;

      if (car.dnf) { car.mesh.rotation.y += 0.35 * dt; continue; }
      if (car.spinning) {
        car.spinTimer -= dt;
        car.mesh.rotation.y += car.spinDir * 3.5 * dt;
        car.speed = Math.max(8, car.speed - 70 * dt);
        car.z += car.speed * dt;
        car.mesh.position.z = car.z;
        if (car.spinTimer <= 0) { car.dnf = true; car.spinning = false; }
        continue;
      }

      // Continuous aggression ramp — no sudden switch from calm to chaos.
      const progress = car.z / R3D.TRACK_LEN;
      // Team-mates are working with you — they never inherit the difficulty
      // aggression bump, which is what made them twitchy on Pro.
      const aggroMul = car.isTeammate ? 1 : this.diff.aiAggro;
      // Harder settings start racing hard sooner
      const calmFrac = R3D.CALM_FRAC / Math.max(0.5, aggroMul);
      const aggro = clamp(
        (progress - calmFrac) / Math.max(0.01, R3D.ENDGAME_FRAC - calmFrac), 0, 1);
      const mix = (calm, wild) => calm + (wild - calm) * aggro;
      const endgame = progress >= R3D.ENDGAME_FRAC;
      car.laneTimer -= dt;

      // ── Teammates work with you ────────────────────────────
      // If a teammate is close behind you they line up to push; if they are
      // just ahead they hold their lane so you can push them. Either way they
      // never try to pass you.
      if (car.isTeammate && !car._pushLocked) {
        const p  = this.player;
        const dz = p.z - car.z;                    // >0 = player is ahead
        if (!p.dnf && !p.finished && !p.spinning && Math.abs(dz) < R3D.TEAM_HELP_Z) {
          const hw = R3D.HALF_W - 1.4;
          car.followX  = car.followX == null ? car.x : car.followX;
          car.followX += (p.x - car.followX) * (1 - Math.exp(-2.2 * dt));
          car.targetX  = clamp(car.followX, -hw, hw);   // ease onto their line
          car.laneTimer = 0.5;                     // hold this, skip random drift
          car._helping  = true;
          // Behind you: close the gap. Ahead of you: ease so you can catch up.
          car.speed += (dz > 0 ? 14 : -6) * dt;
        } else {
          car._helping = false;
        }
      }

      // ── Racecraft (Amateur and above) ──────────────────────
      // A rival that has dropped back tucks into your tow to reel you in
      // rather than wandering across the track, and one you are catching
      // shades over to defend its line. Both are committed to for a beat so
      // it reads as racecraft, not twitching.
      const craft = this.diff.racecraft || 0;
      car._tactic = car._tactic || null;
      if (craft > 0 && !car.isTeammate && !car._pushLocked) {
        const p  = this.player;
        const hw = R3D.HALF_W - 1.4;
        if (!p.dnf && !p.finished && !p.spinning) {
          const dz    = p.z - car.z;                 // >0 you are ahead of them
          const dx    = Math.abs(p.x - car.x);
          const closing = p.speed - car.speed;       // >0 you are catching them

          car.tacticTimer = (car.tacticTimer || 0) - dt;
          if (car.tacticTimer <= 0) {
            // Decide on the situation, then COMMIT — a driver who re-decides
            // every frame is exactly what reads as erratic.
            car.tacticTimer = R3D.TACTIC_COMMIT;
            const prev = car._tactic;
            car._tactic = null;

            if (dz > R3D.PUSH_Z && dz < R3D.DRAFT_Z && dx < R3D.LANE_WIDTH * 2) {
              // They have lost ground and you are within tow range — hook on.
              // Worth doing whenever they are not slower than you.
              if (closing > -6 && Math.random() < craft) car._tactic = 'tow';
            } else if (dz < -1.5 && dz > -R3D.BLOCK_Z && closing > 1.5) {
              // You are on their bumper and coming. Defend the line — but only
              // if they still have somewhere legal to be.
              if (Math.random() < craft * 0.8) car._tactic = 'defend';
            }

            // Lock in the defensive line once, so they hold it instead of
            // sliding across the track frame by frame.
            if (car._tactic === 'defend' && prev !== 'defend') {
              const shade = clamp(p.x - car.x, -R3D.BLOCK_MAX, R3D.BLOCK_MAX);
              car._blockX = clamp(car.x + shade, -hw, hw);
            }
          }

          if (car._tactic === 'tow') {
            car.followX = car.followX == null ? car.x : car.followX;
            car.followX += (p.x - car.followX) * (1 - Math.exp(-2.0 * dt));
            car.targetX = clamp(car.followX, -hw, hw);   // ease into the tow
          } else if (car._tactic === 'defend') {
            car.targetX = clamp(car._blockX != null ? car._blockX : car.x, -hw, hw);
          }
        } else {
          car._tactic = null;
        }
      }

      // ── Lane choice by judgement, not coin flip ────────────
      // Lanes are scored on what is actually there: clear air, a tow to latch
      // onto, room from the wall, and whether anyone is alongside. A car only
      // moves if a lane is clearly better AND it has held its current line
      // long enough — that commitment is what stops the weaving.
      if (!car._pushLocked && !car._helping && !car._tactic) {
        const hw = R3D.HALF_W - 1.4;

        const nearWreck = this.wrecks.find(w =>
          w.z > car.z && w.z < car.z + 60 && Math.abs(w.x - car.x) < 6);

        if (nearWreck) {
          // Avoiding a wreck overrides everything else
          const dir = nearWreck.x > 0 ? -1 : 1;
          car.targetX  = clamp(nearWreck.x + dir * 8, -hw, hw);
          car.laneTimer = 1.2;
        } else if (car.laneTimer <= 0) {
          const step = R3D.LANE_STEP;
          const options = [car.x, car.x - step, car.x + step, car.x - step * 2, car.x + step * 2]
            .map(x => clamp(x, -hw, hw));
          let bestX = car.x;
          let bestScore = this._scoreLane(car, car.x, aggro);
          const stay = bestScore;
          for (let i = 1; i < options.length; i++) {
            const s = this._scoreLane(car, options[i], aggro);
            if (s > bestScore) { bestScore = s; bestX = options[i]; }
          }
          // Only commit to a move that is meaningfully better
          if (bestScore > stay + R3D.LANE_GAIN_MIN) {
            car.targetX = bestX;
            car.laneTimer = mix(R3D.LANE_COMMIT, R3D.LANE_COMMIT * 0.55);
          } else {
            car.targetX = car.x;                       // hold the line
            car.laneTimer = mix(R3D.LANE_COMMIT * 1.4, R3D.LANE_COMMIT * 0.7);
          }
        }
      }

      // Difficulty lifts both the AI's pace and its ceiling.
      // The base spread is deliberately narrow: on a superspeedway the cars are
      // all within a whisker of each other and the draft does the rest, which
      // is what keeps the field packed instead of strung out.
      const dSpd = this.diff.aiSpeed;
      // Anyone stranded behind the leader gets a hand back to the pack
      const lead = this._leadZ || car.z;
      const back = clamp((lead - car.z) / R3D.PACK_GAP, 0, 1);
      const catchUp = back * R3D.PACK_CATCHUP;
      const tgt = Math.min(
        (R3D.SPEED_BASE * (0.86 + car.power * 0.15)) * dSpd + car.draftBoost + catchUp,
        R3D.SPEED_MAX * dSpd + catchUp);
      car.speed += (tgt - car.speed) * (1 - Math.exp(-2.2 * dt));   // frame-rate independent

      // ── Lateral motion with inertia ─────────────────────────
      // A stock car has mass: it cannot reverse direction instantly. Steering
      // sets a DESIRED lateral velocity, and real velocity is accelerated
      // toward it under a hard limit, so every line change is a smooth arc and
      // a bump is absorbed rather than teleporting the car sideways.
      const maxLat  = mix(R3D.AI_LAT_MAX * 0.75, R3D.AI_LAT_MAX) * aggroMul;
      const latAcc  = mix(R3D.AI_LAT_ACC * 0.7, R3D.AI_LAT_ACC) * aggroMul;
      const err     = car.targetX - car.x;
      // Ease into the target so cars settle instead of overshooting and hunting
      const desired = clamp(err * R3D.AI_STEER_GAIN, -maxLat, maxLat);
      const edge = R3D.HALF_W - 1.2;
      car.lvx = car.lvx || 0;
      car.lvx += clamp(desired - car.lvx, -latAcc * dt, latAcc * dt);
      car.lvx *= Math.pow(R3D.AI_LAT_DAMP, dt);
      car.x = clamp(car.x + car.lvx * dt, -edge, edge);
      if (Math.abs(car.x) >= edge - 0.001) car.lvx *= 0.3;   // scrub along the wall
      car.z += car.speed * dt;
      car.mesh.position.set(car.x, 0, car.z);
      // Subtle AI body roll based on lateral movement
      const aiRoll = clamp((car.lvx / R3D.AI_LAT_MAX) * 0.055, -0.055, 0.055);
      car.mesh.rotation.z += (aiRoll - car.mesh.rotation.z) * (1 - Math.exp(-6 * dt));
    }
  }

  // ── Lane judgement ───────────────────────────────────────────
  // Score how good a piece of track would be for this car right now. Higher is
  // better. This is what gives the AI race IQ: it moves for a reason (clear
  // air, a tow, avoiding someone alongside) instead of drifting at random.
  _scoreLane(car, laneX, aggro) {
    const hw = R3D.HALF_W - 1.4;
    if (Math.abs(laneX) > hw) return -100;

    let score      = 0;
    let nearestAhead = Infinity;   // gap to the next car in this lane
    let aheadCar   = null;         // whoever that is
    let towGap     = Infinity;     // gap to a car close enough to tow off
    let towCar     = null;         // the car providing that tow
    let blocked    = false;        // someone occupying that space right now

    for (const other of this.cars) {
      if (other === car || other.dnf || other.finished) continue;
      const dz  = other.z - car.z;
      const adx = Math.abs(other.x - laneX);
      if (adx > R3D.LANE_WIDTH) continue;

      // Anyone level with us there makes the move unsafe
      if (Math.abs(dz) < R3D.CAR_SEP_Z * 1.6 && adx < R3D.CAR_SEP_X * 1.25) blocked = true;

      if (dz > 0) {
        if (dz < nearestAhead) { nearestAhead = dz; aheadCar = other; }
        if (dz > R3D.PUSH_Z && dz < R3D.DRAFT_Z && dz < towGap) { towGap = dz; towCar = other; }
      }
    }

    // Clear air ahead is worth a lot — this is what makes a car pull out of a
    // queue and go, rather than sitting in dirty air forever.
    score += Math.min(nearestAhead, 140) / 140 * 1.0;

    // A tow beats clear air almost every time: on a superspeedway you go
    // nowhere alone, and hooking onto a train is how you get to the front. The
    // longer the train already is, the more every driver wants to be in it.
    if (towGap < Infinity) {
      const towQuality = 1 - (towGap / R3D.DRAFT_Z);       // closer = stronger
      const trainLen   = (towCar && towCar.chainLen) || 1; // how big is that line
      const trainPull  = 1 + Math.min(trainLen - 1, 4) * 0.22;
      score += towQuality * R3D.TOW_APPEAL * trainPull;
    }

    // Stuck behind someone slower is the thing a racer most wants to fix, so
    // a lane that has you bottled up scores badly and the way past looks good.
    if (aheadCar && nearestAhead < R3D.STUCK_Z && aheadCar.speed < car.speed - 1) {
      const howStuck = 1 - (nearestAhead / R3D.STUCK_Z);
      score -= howStuck * R3D.STUCK_PENALTY;
    }

    // Never move into a car
    if (blocked) score -= 3.0;

    // Prefer to keep off the wall
    score -= Math.pow(Math.abs(laneX) / hw, 3) * 0.5;

    // Sticking to your current line has value; late in the race, less so
    if (Math.abs(laneX - car.x) < 0.05) score += R3D.LANE_INERTIA * (1 - aggro * 0.6);

    return score;
  }

  _calcDraft(dt) {
    for (const car of this.cars) {
      if (car.dnf || car.finished) { car.draftBoost = 0; car.draftMomentum = 0; continue; }

      let liveBoost = 0, pushing = false;
      for (const other of this.cars) {
        if (other === car || other.dnf || other.finished) continue;
        const dz = other.z - car.z;
        const dx = Math.abs(other.x - car.x);
        if (dz <= 0) continue;

        if (dz < R3D.PUSH_Z && dx < R3D.PUSH_X) {
          // A team-mate pushes harder than a stranger, and takes the shove too
          const teamLink = (car.isTeammate && other.isPlayer) || (car.isPlayer && other.isTeammate);
          const bonus = R3D.PUSH_BONUS + (teamLink ? R3D.TEAM_PUSH_BONUS : 0);
          liveBoost = Math.max(liveBoost, R3D.DRAFT_BOOST + bonus);
          pushing = true;
          if (!other._pushBoosted) {
            other._pushBoosted = true;
            other.draftBoost = Math.max(other.draftBoost || 0, bonus * (teamLink ? 1.0 : 0.7));
          }
          continue;
        }
        if (dz > R3D.DRAFT_Z || dx > R3D.DRAFT_X) continue;
        // The tow ropes you in: there is a real tug from the far edge of the
        // cone, and it keeps building the closer you get, until you arrive on
        // the bumper and start pushing instead.
        const closeness  = 1 - (dz / R3D.DRAFT_Z);
        const intensity  = Math.pow(closeness, R3D.DRAFT_CURVE);
        liveBoost = Math.max(liveBoost, intensity * R3D.DRAFT_BOOST);
      }
      car._pushBoosted = false;

      // Higher difficulties give the player less free speed from the tow
      if (car.isPlayer) liveBoost *= this.diff.playerDraft;

      if (liveBoost > car.draftMomentum) car.draftMomentum = liveBoost;
      else car.draftMomentum = Math.max(0, car.draftMomentum - R3D.DRAFT_SLING * dt);
      car.draftBoost = car.draftMomentum;

    }
  }

  _calcChainBonus() {
    const active = this.cars.filter(c => !c.dnf && !c.finished).sort((a, b) => b.z - a.z);
    if (active.length < 2) return;
    let chainStart = 0;
    for (let i = 0; i <= active.length; i++) {
      const inChain = i < active.length && i > 0 &&
        (active[i - 1].z - active[i].z) < R3D.DRAFT_Z &&
        Math.abs(active[i - 1].x - active[i].x) < R3D.DRAFT_X;
      if (!inChain || i === active.length) {
        const len = i - chainStart;
        if (len >= 2) {
          // Each extra car in the train is worth more than the last, so a
          // three-car chain genuinely hauls in a two-car link rather than
          // trailing it by a nose. Capped so a huge train can't escape.
          const raw = (len - 1) * R3D.CHAIN_PER_CAR * (1 + (len - 2) * R3D.CHAIN_CURVE);
          const bonus = Math.min(raw, R3D.CHAIN_MAX);
          for (let k = chainStart; k < i; k++) {
            active[k].draftBoost += bonus;
            active[k].chainLen = len;
          }
        } else {
          for (let k = chainStart; k < i; k++) active[k].chainLen = 1;
        }
        chainStart = i;
      }
    }
  }

  // ── Contact resolution ───────────────────────────────────────
  // Cars are pushed apart at a bounded RATE and nudged with velocity impulses,
  // never snapped to a new position. That is the difference between a stock car
  // leaning on another one and a car teleporting sideways when you touch it.
  _separateCars(dt) {
    const step = Math.max(dt || 0.016, 0.001);
    const active = this.cars.filter(c => !c.finished && !c.dnf && !c.spinning);
    const hw = R3D.HALF_W - 1.1;
    // Cleared here so _updateAI (which runs first) reads last frame's value
    for (const c of this.cars) c._pushLocked = false;

    // Two passes so a shunt propagates down a queue in the same frame
    for (let pass = 0; pass < 2; pass++) {
      active.sort((a, b) => b.z - a.z);
      for (let i = 0; i < active.length; i++) {
        for (let j = i + 1; j < active.length; j++) {
          const A = active[i], B = active[j];      // A ahead, B behind
          const dz = A.z - B.z, dx = B.x - A.x, adx = Math.abs(dx);
          if (dz >= R3D.CAR_SEP_Z || adx >= R3D.CAR_SEP_X) continue;

          A._pushLocked = true; B._pushLocked = true;

          // ── Longitudinal: ease B back, hard stop only if truly inside A ──
          const overlapZ = R3D.CAR_SEP_Z - dz;
          const maxCorr  = R3D.SEP_Z_RATE * step;
          B.z -= Math.min(overlapZ, maxCorr);
          const floorZ = A.z - R3D.CAR_SEP_Z * 0.82;   // never visually interpenetrate
          if (B.z > floorZ) B.z = floorZ;
          B.mesh.position.z = B.z;

          // Momentum transfer, applied smoothly rather than as a step change
          const diff = B.speed - A.speed;
          if (diff > 0) {
            const give = Math.min(diff, 60) * step * 6;      // ~0.1 of the delta per frame
            A.speed = Math.min(R3D.SPEED_MAX * 1.05, A.speed + give);
            B.speed = Math.max(40, B.speed - give * 0.35);
          }

          // ── Lateral: only when genuinely side by side ──────────────
          // Pure bumper contact gets NO sideways force at all, which is what
          // makes pushing feel planted instead of squirrelly.
          if (adx > R3D.CAR_SEP_X * 0.45) {
            const overlapX = (R3D.CAR_SEP_X - adx) * 0.5;
            const dir  = dx > 0 ? 1 : -1;                     // from A toward B
            const corr = Math.min(overlapX, R3D.SEP_X_RATE * step);
            A.x = clamp(A.x - dir * corr, -hw, hw);
            B.x = clamp(B.x + dir * corr, -hw, hw);
            A.mesh.position.x = A.x; B.mesh.position.x = B.x;

            // Impulse, not a teleport: the cars lean off each other and the
            // AI's own steering recovers the line over the next second.
            const imp = R3D.CONTACT_IMPULSE;
            if (A.isPlayer) A.lv  = clamp(A.lv - dir * imp, -R3D.LAT_MAX, R3D.LAT_MAX);
            else            A.lvx = clamp((A.lvx || 0) - dir * imp, -R3D.AI_LAT_MAX * 1.5, R3D.AI_LAT_MAX * 1.5);
            if (B.isPlayer) B.lv  = clamp(B.lv + dir * imp, -R3D.LAT_MAX, R3D.LAT_MAX);
            else            B.lvx = clamp((B.lvx || 0) + dir * imp, -R3D.AI_LAT_MAX * 1.5, R3D.AI_LAT_MAX * 1.5);
          }
        }
      }
    }
  }

  _checkCollisions() {
    const p = this.player;
    if (p.spinning || p.finished) return;
    for (const car of this.cars) {
      if (car === p || car.finished) continue;
      const adx = Math.abs(p.x - car.x), adz = Math.abs(p.z - car.z);
      if (adx < 1.9 && adz < 4.2) {
        const isBumperPush = p.z < car.z && adz > adx * 1.5;
        if (!isBumperPush && car.contactCooldown <= 0) {
          car.contactCooldown = R3D.BUMP_DEBOUNCE;
          this._bumpPlayer(car.x < p.x ? 1 : -1);
        }
        return;
      }
    }
    for (const w of this.wrecks) {
      if (Math.abs(p.x - w.x) < 2.4 && Math.abs(p.z - w.z) < 2.8) {
        this._spinPlayer(2.0, Math.sign(p.lv) || 1, 1.5);
        this._warn('HIT WRECK');
        return;
      }
    }
  }

  _bumpPlayer(pushDir) {
    const p = this.player;
    if (p.spinning) return;
    p.lv = clamp(p.lv + pushDir * 1.5, -R3D.LAT_MAX, R3D.LAT_MAX);
    p.speed = Math.max(p.speed * 0.96, 80);
    this.camShake = Math.max(this.camShake, 0.2);
    if (Math.random() < R3D.SPIN_CHANCE) {
      this._spinPlayer(1.6, pushDir, 1.1);
      this._warn('SPIN OUT');
    }
  }

  _spinPlayer(duration, dir, shake) {
    const p = this.player;
    if (p.spinning) return;
    p.spinning = true; p.spinTimer = duration; p.spinDir = dir || 1;
    p.speed = 20;
    this.camShake = Math.max(this.camShake, shake);
  }

  // Visual-only: roll the wheels at road speed
  _animateCars(dt) {
    for (const car of this.cars) {
      if (!car.wheels) continue;
      const droll = car.speed * dt / R3D.WHEEL_R;
      for (const w of car.wheels) w.rotation.x -= droll;
    }
  }

  _togglePause() {
    if (this.done) return;
    this.paused = !this.paused;
    const overlay  = document.getElementById('r3d-pause-overlay');
    const pauseBtn = document.getElementById('r3d-pause-btn');
    if (overlay)  overlay.classList.toggle('active', this.paused);
    if (pauseBtn) pauseBtn.textContent = this.paused ? 'RESUME' : 'PAUSE';
    if (!this.paused && this.clock) this.clock.getDelta();
  }

  _checkFinish() {
    const TL = R3D.TRACK_LEN;
    // Several cars can cross on the same frame — at 200+ units/sec a frame is
    // worth ~10 units of track. They must be credited in the order they are
    // actually down the road, NOT in array order: the player sits at index 0,
    // so iterating the array credited you ahead of a team-mate you had just
    // pushed to the line.
    const crossed = [];
    for (const car of this.cars) {
      if (!car.finished && car.z >= TL) crossed.push(car);
    }
    if (!crossed.length) return;
    crossed.sort((a, b) => b.z - a.z);        // furthest down the track first

    for (const car of crossed) {
      car.finished = true;
      this.finishOrder.push(car);
    }
    const player = crossed.find(c => c.isPlayer);
    if (player) {
      this.done = true;
      this._showFinish(this.finishOrder.indexOf(player) + 1);
    }
  }

  // The real running order at the moment the player takes the flag: cars that
  // already finished in the order they crossed, then everyone else by distance,
  // then retirements. Used so the on-track result — including your team-mates —
  // is what actually goes in the results table.
  finalOrder() {
    const finished = this.finishOrder.slice();
    const running  = this.cars
      .filter(c => !c.finished && !c.dnf)
      .sort((a, b) => b.z - a.z);
    const retired  = this.cars.filter(c => c.dnf);
    return [...finished, ...running, ...retired].map((c, i) => ({
      carId:    c.carId || null,
      isPlayer: !!c.isPlayer,
      number:   c.number,
      label:    c.label,
      position: i + 1,
      dnf:      !!c.dnf,
    }));
  }

  _triggerWreck() {
    const pz = this.player.z;
    const endgame = pz / R3D.TRACK_LEN >= R3D.ENDGAME_FRAC;
    const aheadMin  = endgame ? 30 : 80;
    const finishBuf = endgame ? 60 : 200;
    const cands = this.cars.filter(c =>
      !c.isPlayer && !c.spinning && !c.finished && !c.dnf &&
      c.z > pz + aheadMin && c.z < R3D.TRACK_LEN - finishBuf);
    if (cands.length < 2) return;

    this.wreckCount++;
    const victim = cands[Math.floor(Math.random() * cands.length)];
    victim.spinning = true; victim.spinTimer = 4.0;
    victim.spinDir = Math.random() > 0.5 ? 1 : -1;

    setTimeout(() => {
      if (!this.scene) return;
      const wx = victim.x, wz = victim.z;
      this.wrecks.push({ x: wx, z: wz });
      const db = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.35, 2.8),
        new THREE.MeshLambertMaterial({ color: 0x4c4c52 }));
      db.rotation.y = Math.random() * Math.PI;
      db.position.set(wx, 0.18, wz); this.scene.add(db);
      const sm = new THREE.Mesh(new THREE.SphereGeometry(2.6, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x8a8a90, transparent: true, opacity: 0.38 }));
      sm.position.set(wx, 1.9, wz); this.scene.add(sm);
      if (Math.abs(wz - pz) < 400) this._warn('WRECK AHEAD — STEER CLEAR');
    }, 1200);
  }

  _updateCamera(dt) {
    const p  = this.player;
    const sk = this.camShake;
    const nx = sk > 0 ? (Math.random() - 0.5) * sk : 0;
    const ny = sk > 0 ? (Math.random() - 0.5) * sk * 0.4 : 0;

    const spd = clamp((p.speed - R3D.SPEED_BASE) / (R3D.SPEED_MAX - R3D.SPEED_BASE), 0, 1);
    const fovTarget = 62 + spd * 13;
    this.camera.fov += (fovTarget - this.camera.fov) * 0.07;
    this.camera.updateProjectionMatrix();

    const tx = p.x * 0.85 + nx;
    const ty = 4.4 + ny;
    const tz = p.z - 10.5 + nx * 0.15;
    this.camera.position.x += (tx - this.camera.position.x) * 0.12;
    this.camera.position.y += (ty - this.camera.position.y) * 0.10;
    this.camera.position.z += (tz - this.camera.position.z) * 0.12;
    this.camera.lookAt(p.x * 0.55, 1.5, p.z + 26);
    this.camShake = Math.max(0, sk - dt * 2.5);

    // Sit just above and behind the roofline, aimed level down the track so
    // cars behind sit in the middle of the glass rather than at the top edge.
    this.mirrorCam.position.set(p.x, 2.5, p.z + 1.2);
    this.mirrorCam.lookAt(p.x, 1.8, p.z - 60);
  }

  // Rear-view mirror.
  //
  // The old approach negated projectionMatrix.elements[0] to flip left/right.
  // That also reverses triangle winding, so every front face was drawn as a
  // back face — surfaces looked hollow and textures read wrong. Instead we
  // render the rear view normally into an offscreen target (correct winding,
  // correct lighting) and then blit it through a quad with mirrored UVs.
  _initMirrorTarget(w, h) {
    if (this.mirrorRT) this.mirrorRT.dispose();
    this.mirrorRT = new THREE.WebGLRenderTarget(Math.max(2, w), Math.max(2, h), {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format:    THREE.RGBAFormat,
    });
    this.mirrorRTSize = { w, h };

    if (!this.mirrorScene) {
      this.mirrorScene = new THREE.Scene();
      this.mirrorQuadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      // depthTest off: the main scene has already written depth into this
      // region of the canvas and would otherwise reject the quad.
      this.mirrorQuadMat = new THREE.MeshBasicMaterial({
        map: this.mirrorRT.texture, depthTest: false, depthWrite: false,
      });
      const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mirrorQuadMat);
      this.mirrorScene.add(quad);
    } else {
      this.mirrorQuadMat.map = this.mirrorRT.texture;
      this.mirrorQuadMat.needsUpdate = true;
    }
    // Horizontal flip — this is what makes it read as a mirror.
    const t = this.mirrorRT.texture;
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.x = -1;
    t.offset.x = 1;
  }

  _renderMirror() {
    const wrap = document.getElementById('r3d-mirror-wrap');
    if (!wrap || !this.scene || !this.mirrorCam || !this.renderer) return;
    const rect = wrap.getBoundingClientRect();
    const cr   = this.canvas.getBoundingClientRect();
    const mw = Math.round(rect.width);
    const mh = Math.round(rect.height);
    if (mw < 2 || mh < 2) return;

    const dpr = this.renderer.getPixelRatio();
    const rtW = Math.round(mw * dpr);
    const rtH = Math.round(mh * dpr);
    if (!this.mirrorRT || this.mirrorRTSize.w !== rtW || this.mirrorRTSize.h !== rtH) {
      this._initMirrorTarget(rtW, rtH);
    }

    const r = this.renderer;
    const sz = new THREE.Vector2();
    r.getSize(sz);

    // Pass 1 — rear view into the offscreen target, unflipped.
    // The mirror is a wide letterbox. Driving it with a fixed VERTICAL fov
    // meant the horizontal fov ballooned with the aspect ratio (~154° at
    // 620x104) and everything looked fisheyed. Derive the vertical fov from a
    // fixed HORIZONTAL fov instead, so the view stays natural at any size.
    const aspect = mw / mh;
    const hFov   = R3D.MIRROR_HFOV * Math.PI / 180;
    const vFov   = 2 * Math.atan(Math.tan(hFov / 2) / aspect);
    this.mirrorCam.aspect = aspect;
    this.mirrorCam.fov    = clamp(vFov * 180 / Math.PI, 12, 70);
    this.mirrorCam.updateProjectionMatrix();
    r.setRenderTarget(this.mirrorRT);
    r.setViewport(0, 0, rtW, rtH);
    r.clear(true, true, true);
    r.render(this.scene, this.mirrorCam);
    r.setRenderTarget(null);

    // Pass 2 — blit it into the mirror rectangle with mirrored UVs.
    const mx  = Math.round(rect.left - cr.left);
    const my  = Math.round(rect.top  - cr.top);
    const glY = Math.round(sz.y - my - mh);
    r.setScissorTest(true);
    r.setScissor(mx, glY, mw, mh);
    r.setViewport(mx, glY, mw, mh);
    r.render(this.mirrorScene, this.mirrorQuadCam);
    r.setScissorTest(false);
    r.setViewport(0, 0, sz.x, sz.y);
  }

  // ── HUD ──────────────────────────────────────────────────────
  _updateHUD(dt) {
    const p = this.player;

    // Cars that have already taken the flag are still ahead of you. Excluding
    // them made your displayed position climb as the leaders finished, so you
    // could be shown P1 while running last.
    const active = this.cars.filter(c => !c.dnf);
    const ahead  = active.filter(c => c !== p && (c.finished || c.z > p.z)).length;
    const pos    = ahead + 1;
    const total  = active.length;

    const posEl = document.getElementById('r3d-pos');
    if (posEl) posEl.textContent = pos;
    const ofEl = document.getElementById('r3d-pos-of');
    if (ofEl) ofEl.textContent = '/ ' + total;

    // Speed
    const mph = Math.round(p.speed * 0.78 + 33);
    const spdEl = document.getElementById('r3d-speed');
    if (spdEl) spdEl.textContent = mph;

    // Draft label + meter
    const momentum = p.draftMomentum || 0;
    const isPush = momentum > R3D.DRAFT_BOOST;
    const frac = clamp(momentum / (R3D.DRAFT_BOOST + R3D.PUSH_BONUS), 0, 1);
    const draftEl = document.getElementById('r3d-draft');
    const fillEl  = document.getElementById('r3d-draft-fill');
    if (draftEl) {
      const on = frac > 0.04;
      draftEl.textContent = isPush ? 'PUSH DRAFT' : 'DRAFT';
      draftEl.style.color = !on ? 'var(--text-mute)' : isPush ? 'var(--warn)' : 'var(--accent)';
    }
    if (fillEl) {
      fillEl.style.width = (frac * 100).toFixed(0) + '%';
      fillEl.style.background = isPush ? 'var(--warn)' : 'var(--accent)';
    }

    // Progress
    const prog = document.getElementById('r3d-prog-fill');
    if (prog) prog.style.width = clamp(p.z / R3D.TRACK_LEN * 100, 0, 100).toFixed(1) + '%';

    // Minimap (throttled ~20fps)
    this._mapAcc += dt;
    if (this._mapAcc >= 0.05) {
      this._mapAcc = 0;
      const hw = R3D.HALF_W;
      for (const car of this.cars) {
        if (!car._dot) continue;
        if (car.dnf) { car._dot.style.opacity = '0.25'; }
        const topPct  = clamp(100 - (car.z / R3D.TRACK_LEN) * 100, 0, 100);
        const leftPct = clamp(50 + (car.x / hw) * 42, 4, 96);
        car._dot.style.top  = topPct + '%';
        car._dot.style.left = leftPct + '%';
      }
    }

    // Running-order tower (throttled ~5fps)
    this._orderAcc += dt;
    if (this._orderAcc >= 0.18) {
      this._orderAcc = 0;
      this._updateOrder(pos, total);
    }
  }

  _updateOrder(playerPos, total) {
    const el = document.getElementById('r3d-order');
    if (!el) return;
    // Sort: finished first (in finish order), then by z desc
    const ranked = this.cars.filter(c => !c.dnf).slice().sort((a, b) => {
      if (a.finished && b.finished) return this.finishOrder.indexOf(a) - this.finishOrder.indexOf(b);
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.z - a.z;
    });
    // Window of 7 rows centered on the player
    const pIdx = ranked.indexOf(this.player);
    let start = clamp(pIdx - 3, 0, Math.max(0, ranked.length - 7));
    const rows = ranked.slice(start, start + 7).map((c, k) => {
      const place = start + k + 1;
      const nm = (c.label || '').split(' / ').pop();
      const cls = c.isPlayer ? ' is-player' : c.isTeammate ? ' is-teammate' : '';
      return `<div class="r3d-order-row${cls}">
        <span class="r3d-order-pos">${place}</span>
        <span class="r3d-order-chip" style="background:${r3dHex(c.hex)}"></span>
        <span class="r3d-order-num">#${c.number}</span>
        <span class="r3d-order-name">${nm}</span>
      </div>`;
    }).join('');
    el.innerHTML = rows;
  }

  _warn(msg) {
    const el = document.getElementById('r3d-warn');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(this._warnTimeout);
    this._warnTimeout = setTimeout(() => { if (el) el.classList.add('hidden'); }, 3200);
  }

  _showFinish(pos) {
    const el = document.getElementById('r3d-finish');
    if (!el) return;
    const msg = pos === 1 ? 'Victory Lane' : pos <= 3 ? 'Podium Finish' : `P${pos} Finish`;
    el.innerHTML = `
      <div class="r3d-finish-box">
        <div class="r3d-finish-pos">${pos}${ordinal(pos)} Place</div>
        <div class="r3d-finish-msg">${msg}</div>
        <button class="btn btn-primary btn-lg" onclick="window._r3dFinish(${pos})">Continue</button>
      </div>`;
    el.style.display = 'flex';
  }

  _loop() {
    this._raf = requestAnimationFrame(() => this._loop());
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this._update(dt);
    if (this.renderer && this.scene && this.camera) {
      this.renderer.autoClear = true;
      this.renderer.render(this.scene, this.camera);
      this.renderer.autoClear = false;
      this._renderMirror();
      this.renderer.autoClear = true;
    }
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    this._raf = null;
    clearTimeout(this._warnTimeout);
    document.removeEventListener('keydown', this._kd);
    document.removeEventListener('keyup',   this._ku);
    window.removeEventListener('resize',    this._onResize);

    // Release GPU resources — without this, every race leaks its track,
    // car geometry and canvas textures for the life of the page.
    if (this.scene && this.scene.traverse) {
      const shared = new Set(_r3dRoundelCache.values()); // reused across races — keep
      const seen = new Set();
      this.scene.traverse(obj => {
        if (obj.geometry && !seen.has(obj.geometry)) {
          seen.add(obj.geometry);
          obj.geometry.dispose && obj.geometry.dispose();
        }
        const mats = Array.isArray(obj.material) ? obj.material : (obj.material ? [obj.material] : []);
        for (const m of mats) {
          if (!m || seen.has(m)) continue;
          seen.add(m);
          if (m.map && m.map.dispose && !shared.has(m.map)) m.map.dispose();
          m.dispose && m.dispose();
        }
      });
    }
    if (this.mirrorRT) { this.mirrorRT.dispose(); this.mirrorRT = null; }
    if (this.mirrorQuadMat) { this.mirrorQuadMat.dispose(); this.mirrorQuadMat = null; }
    this.mirrorScene = null;
    if (this.renderer) { this.renderer.dispose(); this.renderer = null; }
    this.scene  = null;
    this.camera = null;
    this.cars   = [];
    this.done   = true;
  }
}
`````

---

## 7. `js/ui.js`

*1397 lines, 67674 bytes.*

`````javascript
// ============================================================
// STOCK CAR EMPIRE - UI Rendering
// ============================================================

// ─── Screen router ───────────────────────────────────────────
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById('screen-' + name)?.classList.remove('hidden');
}

function showTab(tabName) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.nav-btn[data-tab="${tabName}"]`)?.classList.add('active');
  renderTab(tabName);
}

function renderTab(tabName) {
  const main = document.getElementById('main-content');
  switch (tabName) {
    case 'dashboard':  main.innerHTML = renderDashboard();   break;
    case 'garage':     main.innerHTML = renderGarage();      break;
    case 'team':       main.innerHTML = renderTeam();        break;
    case 'schedule':   main.innerHTML = renderSchedule();    break;
    case 'market':     main.innerHTML = renderMarket();      break;
    case 'standings':  main.innerHTML = renderStandings();   break;
    case 'carstats':   main.innerHTML = renderCareerStats(); break;
    case 'settings':   main.innerHTML = renderSettings();    break;
    default:           main.innerHTML = renderDashboard();
  }
  attachTabListeners(tabName);
}

// ─── Update header info ──────────────────────────────────────
function updateHeader() {
  if (!game) return;
  document.getElementById('hdr-money').textContent  = fmt$(game.money);
  document.getElementById('hdr-team').textContent   = game.teamName;
  const series = SERIES[game.currentSeries];
  document.getElementById('hdr-series').textContent = series.shortName;
  document.getElementById('hdr-series').style.color = series.color;
  const race = currentRace();
  const raceLabel = race
    ? `Race ${game.season.raceIndex + 1}/${game.season.calendar.length}`
    : 'Season End';
  document.getElementById('hdr-race').textContent = raceLabel;
  document.getElementById('hdr-year').textContent = `Year ${game.season.year}`;

  // Flag an unsaved career — auto-save only runs once a slot is chosen.
  const saveBtn = document.getElementById('btn-hdr-save');
  if (saveBtn) {
    const unsaved = (typeof currentSlot === 'undefined' || currentSlot === null);
    saveBtn.textContent = unsaved ? 'Save *' : 'Save';
    saveBtn.title = unsaved
      ? 'Not saved yet — choose a slot to enable auto-save (Ctrl+S)'
      : `Auto-saving to Slot ${currentSlot + 1} (Ctrl+S)`;
    saveBtn.classList.toggle('btn-unsaved', unsaved);
  }
}

// ─── Notifications / toasts ──────────────────────────────────
function toast(msg, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.classList.add('show'), 50);
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 400);
  }, duration);
}

// ─── Standings name ───────────────────────────────────────────
// Championship tables are driver standings, so always lead with the driver's
// name and keep the team as the secondary label.
function standingName(entry) {
  if (entry.isPlayer) {
    const drv = game.driverName || 'You';
    return `<strong>${drv}</strong> <span class="st-team">${game.teamName}</span>`;
  }
  // AI entries are stored as "Team Name (Driver Name)"
  const m = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(entry.name || '');
  if (m) return `${m[2]} <span class="st-team">${m[1]}</span>`;
  return entry.name || '';
}

// Race results / leaderboards store "Team / Driver" — show the driver first.
function resultName(r) {
  const parts = String(r.displayName || '').split(' / ');
  if (parts.length >= 2) {
    return `${parts[parts.length - 1]} <span class="st-team">${parts[0]}</span>`;
  }
  return r.displayName || '';
}

// ─── Stat bar HTML ────────────────────────────────────────────
function statBar(label, value, max = 100, color = '') {
  const pct = Math.round((value / max) * 100);
  const cls = color || (pct >= 70 ? 'bar-green' : pct >= 40 ? 'bar-yellow' : 'bar-red');
  return `
    <div class="stat-row">
      <span class="stat-label">${label}</span>
      <div class="stat-bar-wrap">
        <div class="stat-bar ${cls}" style="width:${pct}%"></div>
      </div>
      <span class="stat-value">${value}</span>
    </div>`;
}

function condBar(val) {
  const pct = Math.round(val);
  const cls = pct >= 70 ? 'bar-green' : pct >= 40 ? 'bar-yellow' : 'bar-red';
  return `
    <div class="stat-row">
      <span class="stat-label">Condition</span>
      <div class="stat-bar-wrap">
        <div class="stat-bar ${cls}" style="width:${pct}%"></div>
      </div>
      <span class="stat-value">${pct}%</span>
    </div>`;
}

// ─── Dashboard ───────────────────────────────────────────────
function renderDashboard() {
  const series   = SERIES[game.currentSeries];
  const race     = currentRace();
  const track    = race ? TRACKS.find(t => t.id === race.trackId) : null;
  const pos      = getPlayerStandingPos();
  const sorted   = getStandings();
  const totalEntrants = sorted.length;
  const playerEntry  = sorted.find(e => e.id === 'player');
  const seasonOver   = isSeasonOver();
  const expenses     = weeklyExpenses();
  const income       = weeklySponsorIncome();

  const topStandings = sorted.slice(0, 8).map((e, i) => {
    const cls = e.isPlayer ? 'standing-row player-row'
              : e.isTeamCar ? 'standing-row team-row'
              : 'standing-row';
    return `<div class="${cls}">
      <span class="pos-num">${i + 1}</span>
      <span class="entry-name">${standingName(e)}</span>
      <span class="pts-val">${e.points} pts</span>
    </div>`;
  }).join('');

  const racesCompleted = game.season.calendar.filter(r => r.status === 'completed').length;

  const net = income - expenses;
  const nextRaceLabel = seasonOver ? '—' : `${race.raceNum} / ${game.season.calendar.length}`;

  return `
  <!-- Command Strip -->
  <div class="cmd-strip">
    <div class="cmd-cell">
      <span class="cmd-label">Championship</span>
      <span class="cmd-value gold">${pos}${ordinal(pos)}</span>
      <span class="cmd-sub">of ${totalEntrants} teams</span>
    </div>
    <div class="cmd-cell">
      <span class="cmd-label">Points</span>
      <span class="cmd-value">${playerEntry?.points || 0}</span>
      <span class="cmd-sub">${playerEntry?.wins || 0} wins this season</span>
    </div>
    <div class="cmd-cell">
      <span class="cmd-label">Cash</span>
      <span class="cmd-value gold">${fmt$(game.money)}</span>
      <span class="cmd-sub ${net >= 0 ? 'green' : 'red'}">${net >= 0 ? '+' : ''}${fmt$(net)} / race</span>
    </div>
    <div class="cmd-cell">
      <span class="cmd-label">Series</span>
      <span class="cmd-value" style="color:${series.color};font-size:1.1rem">${series.name}</span>
      <span class="cmd-sub">Year ${game.season.year}</span>
    </div>
    <div class="cmd-cell">
      <span class="cmd-label">Next Race</span>
      <span class="cmd-value">${nextRaceLabel}</span>
      <span class="cmd-sub">${seasonOver ? 'Season complete' : (track?.name || '—')}</span>
    </div>
  </div>

  <div class="dashboard-grid">

    <!-- Next Race / Season End -->
    <div class="card">
      <div class="card-header">${seasonOver ? 'Season Complete' : 'Next Race'}</div>
      ${seasonOver ? `
        <div class="race-spotlight">
          <span class="race-spotlight-name">Final Standing: ${pos}${ordinal(pos)}</span>
          <span class="race-spotlight-meta">${series.name} · Year ${game.season.year}</span>
        </div>
        ${pos <= series.promotionSpots && series.level < 2
          ? `<div style="margin-bottom:.75rem"><span class="badge badge-green">PROMOTION ELIGIBLE</span></div>` : ''}
        ${series.relegationSpots > 0 && pos > totalEntrants - series.relegationSpots
          ? `<div style="margin-bottom:.75rem"><span class="badge badge-red">RELEGATION ZONE</span></div>` : ''}
        <button class="btn btn-primary" onclick="handleEndSeason()">Begin Off-Season</button>
      ` : `
        <div class="race-spotlight">
          <span class="race-spotlight-name">${track?.name || 'TBD'}</span>
          <span class="race-spotlight-meta">${formatTrackType(track?.type)} · ${track?.length} mi · ${track?.laps} laps</span>
        </div>
        <div class="team-stat"><span>Entry Fee</span><span class="red">${fmt$(series.entryFee)}</span></div>
        <div class="team-stat"><span>1st Prize</span><span class="green">${fmt$(series.prize[0])}</span></div>
        <div class="btn-row mt">
          <button class="btn btn-primary" onclick="handleOpenRaceWeekend()">Race Weekend</button>
        </div>
      `}
    </div>

    <!-- Championship Standings -->
    <div class="card">
      <div class="card-header">Championship Standings</div>
      <div class="season-progress-bar-wrap">
        <div class="season-progress-bar" style="width:${Math.round(racesCompleted / game.season.calendar.length * 100)}%"></div>
      </div>
      <p class="muted-text small" style="margin-bottom:.75rem">${racesCompleted} / ${game.season.calendar.length} races complete</p>
      <div class="standings-mini">${topStandings}</div>
      ${sorted.length > 8 ? `<p class="muted-text small mt"><a class="link" onclick="showTab('standings')">Full standings</a></p>` : ''}
    </div>

    <!-- Finances -->
    <div class="card">
      <div class="card-header">Finances</div>
      <div class="team-stat"><span>Cash</span><span class="highlight">${fmt$(game.money)}</span></div>
      <div class="team-stat"><span>Sponsor Income</span><span class="green">+${fmt$(income)}/race</span></div>
      <div class="team-stat"><span>Staff Costs</span><span class="red">-${fmt$(expenses)}/race</span></div>
      <div class="team-stat"><span>Net</span><span class="${net >= 0 ? 'green' : 'red'}">${net >= 0 ? '+' : ''}${fmt$(net)}/race</span></div>
      <div class="team-stat"><span>Sponsors</span><span>${game.activeSponsors.length} / ${sponsorSlots()}</span></div>
      <div class="team-stat"><span>Staff</span><span>${game.staff.length + game.hiredDrivers.length} on payroll</span></div>
      ${totalDebt() > 0 ? `
        <div class="team-stat"><span>Bank Debt</span><span class="red">${fmt$(totalDebt())}</span></div>
        <a class="link mt" onclick="showTab('market')">Manage loans</a>`
      : game.money < 0 ? `<a class="link mt" onclick="showTab('market')">Visit the bank</a>` : ''}
    </div>

    <!-- Garage -->
    <div class="card">
      <div class="card-header">Your Garage</div>
      ${game.cars.map(car => {
        const score = effectiveCarScore(car);
        const condPct = Math.round(car.condition);
        const condColor = condPct >= 70 ? 'var(--green)' : condPct >= 40 ? 'var(--gold)' : 'var(--red)';
        return `<div class="car-mini-row">
          <span class="car-mini-name">${car.name}</span>
          <div style="flex:1;height:4px;background:#1a1a1a;border-radius:0;overflow:hidden">
            <div style="width:${condPct}%;height:100%;background:${condColor}"></div>
          </div>
          <span class="car-mini-score">${condPct}%</span>
        </div>`;
      }).join('')}
      <a class="link mt" onclick="showTab('garage')">Manage</a>
    </div>

    <!-- Driver Profile -->
    <div class="card">
      <div class="card-header">Driver Profile</div>
      <div class="team-stat"><span>Driver</span><span class="highlight">${game.driverName || game.teamName}</span></div>
      ${game.driverMode === 'hired' ? `
        <div class="team-stat"><span>Team</span><span>${game.season.aiTeams.find(t=>t.id===game.hiredTeamId)?.name || '—'}</span></div>
        <div class="team-stat"><span>Salary</span><span class="green">${fmt$(game.hiredSalary || 0)}/week</span></div>
      ` : game.driverMode === 'manager' ? `
        <div class="team-stat"><span>Role</span><span>Team Manager</span></div>
      ` : `<div class="team-stat"><span>Role</span><span>Driver / Owner</span></div>`}
      ${statBar('Driver Skill', Math.round(game.playerSkill))}
      <div class="team-stat" style="margin-top:.5rem"><span>Seasons Raced</span><span>${game.history.length}</span></div>
      ${game.history.length > 0 ? game.history.slice(-3).map(h => `
        <div class="team-stat">
          <span>Yr ${h.year} ${h.series.split(' ')[0]}</span>
          <span>${h.finalPos}${ordinal(h.finalPos)} · ${h.wins}W</span>
        </div>`).join('') : ''}
    </div>

    <!-- Season Calendar snapshot -->
    <div class="card">
      <div class="card-header">Recent Results</div>
      ${game.season.calendar.filter(r => r.status === 'completed').slice(-5).reverse().map(r => {
        const t = TRACKS.find(tr => tr.id === r.trackId);
        const pos2 = r.playerResult?.position;
        const posStr = pos2 ? `P${pos2}` : 'Skipped';
        const col = pos2 === 1 ? 'var(--gold)' : pos2 <= 5 ? 'var(--green)' : pos2 ? 'var(--text)' : '#555';
        return `<div class="team-stat">
          <span>Race ${r.raceNum} · ${t?.name || '?'}</span>
          <span style="color:${col};font-weight:700">${posStr}${pos2 ? ' · ' + fmt$(r.earnings) : ''}</span>
        </div>`;
      }).join('') || '<p class="muted-text small">No races completed yet.</p>'}
    </div>

  </div>`;
}

function trackTypeBadge(type) {
  switch(type) {
    case 'short_oval':   return 'orange';
    case 'intermediate': return 'blue';
    case 'superspeedway':return 'red';
    case 'road_course':  return 'green';
    default: return 'gray';
  }
}
function formatTrackType(type) {
  return type?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) || '';
}

// ─── Garage ──────────────────────────────────────────────────
function renderGarage() {
  const series = SERIES[game.currentSeries];
  const cls    = CAR_CLASSES[series.carClass];

  const maxUpgrades = UPGRADE_TIERS.length * MAX_PER_TIER;

  const carCards = game.cars.map(car => {
    const repairCost = Math.round((100 - car.condition) * cls.repairCostPerPoint * (game.staff.some(s=>s.typeId==='mechanic') ? 0.75 : 1));
    // Who is actually in this car: you, a hired driver, or nobody.
    const seat = hireForCar(car.id);
    const seatDrv = seat ? HIREABLE_DRIVERS.find(d => d.id === seat.driverId) : null;
    const driverName = seatDrv
      ? `${seatDrv.name} (Skill ${Math.floor(hiredDriverSkill(seat))})`
      : car.assignedDriverId === 'player'
        ? `${game.driverName || 'You'} (Skill ${Math.round(game.playerSkill)})`
        : 'No driver assigned';
    const noDriver = !seatDrv && car.assignedDriverId !== 'player';

    return `
    <div class="car-card" id="car-${car.id}">
      <div class="car-card-header">
        <span class="car-name"><span class="car-num">#${car.number || 1}</span> ${car.name}</span>
        <span class="car-class-badge">${cls.name}</span>
      </div>
      <div class="team-stat">
        <span>Car Number</span>
        <span><button class="btn btn-sm btn-ghost" onclick="handleSetCarNumber('${car.id}')">#${car.number || 1} — Change</button></span>
      </div>
      <div class="car-stats">
        ${statBar('Speed', car.speed)}
        ${statBar('Handling', car.handling)}
        ${statBar('Reliability', car.reliability)}
        ${condBar(car.condition)}
      </div>
      <div class="car-meta">
        <div class="team-stat"><span>Driver</span><span class="${noDriver ? 'red' : ''}">${driverName}</span></div>
        <div class="team-stat"><span>Races</span><span>${car.races}</span></div>
        <div class="team-stat"><span>Wins</span><span>${car.wins}</span></div>
        <div class="team-stat"><span>Upgrades</span><span>${car.appliedUpgrades.length}/${maxUpgrades}</span></div>
      </div>
      <div class="car-actions">
        ${car.condition < 100 ? `<button class="btn btn-sm btn-warning" onclick="handleRepair('${car.id}', ${repairCost})">Repair (${fmt$(repairCost)})</button>` : `<button class="btn btn-sm" disabled>Perfect Condition</button>`}
        <button class="btn btn-sm btn-primary" onclick="showUpgradeModal('${car.id}')">Upgrades</button>
        <button class="btn btn-sm btn-ghost" onclick="handleRenameCar('${car.id}')">Rename</button>
        ${game.cars.length > 1 ? `<button class="btn btn-sm btn-danger" onclick="handleSellCar('${car.id}')">Sell</button>` : ''}
      </div>
      <div class="car-color-row">
        <span class="stat-label">Car Color</span>
        ${['#e8001d','#3498db','#2ecc71','#f39c12','#9b59b6','#ffffff','#222222','#ff6600','#00cccc','#ff69b4'].map(c =>
          `<button class="color-swatch${(car.color||'#e8001d')===c?' active':''}" style="background:${c}" onclick="setCarColor('${car.id}','${c}');renderTab('garage')" title="${c}"></button>`
        ).join('')}
      </div>
    </div>`;
  }).join('');

  return `
  <div class="page-header">
    <h2>Garage</h2>
    <button class="btn btn-primary" onclick="showTab('market')">Buy New Car (${fmt$(cls.buyCost)})</button>
  </div>
  <div class="car-grid">${carCards}</div>`;
}

function renderUpgradeModal(carId) {
  const car = game.cars.find(c => c.id === carId);
  if (!car) return '';
  const series = SERIES[game.currentSeries];
  const cls    = CAR_CLASSES[car.classId];

  const cap      = tierCapacity();          // 3 + one per Data Analyst
  const analysts = analystCount();

  const sections = UPGRADE_TIERS.map(t => {
    const parts    = cls.upgrades.filter(u => u.tier === t.tier);
    const fitted   = tierInstalled(car, t.tier, cls);
    const unlocked = tierUnlocked(car, t.tier, cls);
    const full     = fitted >= cap;

    const rows = parts.map(upg => {
      const installed = car.appliedUpgrades.includes(upg.id);
      const affordable = game.money >= upg.cost;
      const canBuy = !installed && unlocked && !full && affordable;
      const effectStr = Object.entries(upg.effect)
        .map(([k, v]) => `+${v} ${k.charAt(0).toUpperCase() + k.slice(1)}`).join(' · ');

      let action;
      if (installed)       action = `<span class="badge badge-green">Fitted</span>`;
      else if (!unlocked)  action = `<span class="badge badge-gray">Locked</span>`;
      else if (full)       action = `<span class="badge badge-gray">Tier Full</span>`;
      else if (!affordable)action = `<button class="btn btn-sm" disabled title="Not enough money">${fmt$(upg.cost)}</button>`;
      else                 action = `<button class="btn btn-sm btn-primary" onclick="handleUpgrade('${carId}','${upg.id}')">${fmt$(upg.cost)}</button>`;

      return `<div class="upgrade-row${installed ? ' installed' : ''}${!unlocked ? ' locked' : ''}">
        <div class="upgrade-info">
          <span class="upgrade-name">${upg.name}</span>
          <span class="upgrade-effect">${effectStr}</span>
        </div>
        <div class="upgrade-action">${action}</div>
      </div>`;
    }).join('');

    return `
      <div class="upgrade-tier${!unlocked ? ' is-locked' : ''}">
        <div class="upgrade-tier-head">
          <div>
            <span class="upgrade-tier-name">Tier ${t.tier} — ${t.name}</span>
            <span class="upgrade-tier-blurb">${unlocked ? t.blurb : `Fit ${MAX_PER_TIER} Tier ${t.tier - 1} parts to unlock.`}</span>
          </div>
          <span class="upgrade-tier-count${full ? ' is-full' : ''}">${fitted}/${cap}</span>
        </div>
        ${rows}
      </div>`;
  }).join('');

  const totalFitted = (car.appliedUpgrades || []).length;
  const analystNote = analysts > 0
    ? `<p class="muted-text small">${analysts} Data Analyst${analysts > 1 ? 's' : ''} on staff — ${analysts * ANALYST_TIER_SLOTS} extra slot${analysts * ANALYST_TIER_SLOTS > 1 ? 's' : ''} in every tier.</p>`
    : `<p class="muted-text small">Hire a Data Analyst to open an extra slot in every tier.</p>`;
  return `
  <div class="modal-overlay" id="upgrade-modal" onclick="closeUpgradeModal(event)">
    <div class="modal modal-wide" onclick="event.stopPropagation()">
      <div class="modal-header">
        <h3>Upgrades — #${car.number || 1} ${car.name}</h3>
        <button class="modal-close" onclick="closeUpgradeModal()">Close</button>
      </div>
      <div class="modal-body">
        <div class="upgrade-summary">
          <div><span class="upgrade-sum-label">Fitted</span><span class="upgrade-sum-val">${totalFitted} / ${UPGRADE_TIERS.length * cap}</span></div>
          <div><span class="upgrade-sum-label">Speed</span><span class="upgrade-sum-val">${car.speed}</span></div>
          <div><span class="upgrade-sum-label">Handling</span><span class="upgrade-sum-val">${car.handling}</span></div>
          <div><span class="upgrade-sum-label">Reliability</span><span class="upgrade-sum-val">${car.reliability}</span></div>
          <div><span class="upgrade-sum-label">Budget</span><span class="upgrade-sum-val gold">${fmt$(game.money)}</span></div>
        </div>
        ${analystNote}
        ${sections}
      </div>
    </div>
  </div>`;
}

// ─── Team ────────────────────────────────────────────────────
function renderTeam() {
  const hiredIds = new Set(game.hiredDrivers.map(h => h.driverId));

  const yourDriverRows = game.hiredDrivers.map(h => {
    const d   = HIREABLE_DRIVERS.find(dr => dr.id === h.driverId);
    const car = game.cars.find(c => c.id === h.carId);
    if (!d) return '';
    const skill = hiredDriverSkill(h);
    const start = h.startSkill != null ? h.startSkill : d.skill;
    const gained = Math.floor(skill) - Math.floor(start);
    const ceiling = h.potential != null ? h.potential : d.skill;
    const pct = Math.round((skill / Math.max(1, ceiling)) * 100);
    return `<div class="staff-row">
      <div class="staff-info">
        <span class="staff-name">${d.name}</span>
        <div class="staff-meta">
          Skill ${Math.floor(skill)}${gained > 0 ? ` <span class="green">+${gained}</span>` : ''}
          • Aggression ${d.aggression} • ${fmt$(h.weeklyCost)}/week
        </div>
        <div class="staff-meta muted-text">
          Driving: ${car ? `#${car.number || 1} ${car.name}` : 'Unassigned'}
          • ${h.racesRun || 0} race${(h.racesRun || 0) === 1 ? '' : 's'}
          • potential ${ceiling}
        </div>
        <div class="driver-growth"><div class="driver-growth-fill" style="width:${clamp(pct,0,100)}%"></div></div>
      </div>
      <button class="btn btn-sm btn-danger" onclick="handleFireDriver('${d.id}')">Release</button>
    </div>`;
  }).join('') || '<p class="muted-text">No hired drivers — you drive yourself.</p>';

  const staffRows = game.staff.map(s => {
    const type = STAFF_TYPES.find(t => t.id === s.typeId);
    return `<div class="staff-row">
      <div class="staff-info">
        <span class="staff-name">${s.name}</span>
        <div class="staff-meta">${type?.bonus || ''} • ${fmt$(s.weeklyCost)}/week</div>
      </div>
      <button class="btn btn-sm btn-danger" onclick="handleFireStaff('${s.id}')">Fire</button>
    </div>`;
  }).join('') || '<p class="muted-text">No support staff hired.</p>';

  const availableDrivers = HIREABLE_DRIVERS.filter(d => !hiredIds.has(d.id));
  const openSeats = freeCarsForHire().length;
  const seatWarning = game.cars.length === 0
    ? `<p class="form-warning">No car — buy a car before hiring a driver.</p>`
    : openSeats === 0
      ? `<p class="form-warning">No free car — every car already has a driver. Buy another car to hire more.</p>`
      : '';

  const driverRows = availableDrivers.map(d => {
    const signingFee = d.weeklyCost * 4;
    const canAfford  = game.money >= signingFee;

    return `<div class="staff-row">
      <div class="staff-info">
        <span class="staff-name">${d.name}</span>
        <div class="staff-meta">Skill ${d.skill} • Aggression ${d.aggression}</div>
        <div class="staff-meta muted-text">${fmt$(d.weeklyCost)}/week • Signing: ${fmt$(signingFee)}</div>
      </div>
      ${canAfford ? `<button class="btn btn-sm btn-primary" onclick="openHireDriverModal('${d.id}')">Hire</button>`
                  : `<button class="btn btn-sm" disabled>Can't afford</button>`}
    </div>`;
  }).join('');

  const staffHireRows = STAFF_TYPES.map(type => {
    const current = game.staff.filter(s => s.typeId === type.id).length;
    const cost    = type.weeklyCost[game.currentSeries];
    const sigFee  = cost * 4;
    const canHire = current < type.max && game.money >= sigFee;
    return `<div class="staff-row">
      <div class="staff-info">
        <span class="staff-name">${type.name}</span>
        <div class="staff-meta">${type.description}</div>
        <div class="staff-meta muted-text">${fmt$(cost)}/week • Signing fee: ${fmt$(sigFee)} • Hired: ${current}/${type.max}</div>
      </div>
      ${canHire ? `<button class="btn btn-sm btn-primary" onclick="handleHireStaff('${type.id}')">Hire (${fmt$(sigFee)})</button>`
               : `<button class="btn btn-sm" disabled>${current >= type.max ? 'Max Hired' : 'Can\'t afford'}</button>`}
    </div>`;
  }).join('');

  return `
  <div class="page-header"><h2>Team Management</h2></div>
  <div class="two-col-grid">
    <div>
      <div class="card">
        <div class="card-header">Your Drivers</div>
        ${yourDriverRows}
      </div>
      <div class="card mt">
        <div class="card-header">Your Support Staff</div>
        ${staffRows}
      </div>
    </div>
    <div>
      <div class="card">
        <div class="card-header">Hire Drivers</div>
        <p class="muted-text small">Hire drivers for your extra cars. Signing fee = 4 weeks' salary. You can carry ${MAX_HIRED_DRIVERS} drivers (${game.hiredDrivers.length} signed).</p>
        ${seatWarning}
        ${driverRows}
      </div>
      <div class="card mt">
        <div class="card-header">Hire Support Staff</div>
        ${staffHireRows}
      </div>
    </div>
  </div>`;
}

function renderHireDriverModal(driverId) {
  const d = HIREABLE_DRIVERS.find(dr => dr.id === driverId);
  if (!d) return '';
  const freeCars = freeCarsForHire();
  if (freeCars.length === 0) {
    return `<div class="modal-overlay" id="hire-modal" onclick="closeHireModal(event)">
      <div class="modal" onclick="event.stopPropagation()">
        <div class="modal-header"><h3>Hire ${d.name}</h3><button class="modal-close" onclick="closeHireModal()">Close</button></div>
        <div class="modal-body"><p>No free cars available. Buy another car or release an existing driver first.</p></div>
      </div>
    </div>`;
  }
  const carOpts = freeCars.map(c => `<option value="${c.id}">#${c.number || 1} ${c.name}</option>`).join('');
  return `<div class="modal-overlay" id="hire-modal" onclick="closeHireModal(event)">
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-header"><h3>Hire ${d.name}</h3><button class="modal-close" onclick="closeHireModal()">Close</button></div>
      <div class="modal-body">
        <p>Skill: ${d.skill} | Aggression: ${d.aggression}</p>
        <p>${fmt$(d.weeklyCost)}/week | Signing fee: ${fmt$(d.weeklyCost*4)}</p>
        <label class="form-label">Assign to car:</label>
        <select id="hire-car-select" class="form-select">${carOpts}</select>
        <div class="btn-row mt">
          <button class="btn btn-primary" onclick="confirmHireDriver('${driverId}')">Hire Driver</button>
          <button class="btn btn-ghost" onclick="closeHireModal()">Cancel</button>
        </div>
      </div>
    </div>
  </div>`;
}

// ─── Schedule ────────────────────────────────────────────────
function renderSchedule() {
  const series = SERIES[game.currentSeries];
  const rows = game.season.calendar.map((race, i) => {
    const track = TRACKS.find(t => t.id === race.trackId);
    let statusBadge = '';
    let resultInfo  = '';

    if (race.status === 'completed') {
      const pos = race.playerResult?.position;
      statusBadge = `<span class="badge badge-blue">Completed</span>`;
      resultInfo  = pos ? `P${pos} · ${fmt$(race.earnings)} · ${race.playerPoints}pts` : '';
    } else if (race.status === 'skipped') {
      statusBadge = `<span class="badge badge-gray">Skipped</span>`;
    } else if (i === game.season.raceIndex) {
      statusBadge = `<span class="badge badge-green">NEXT</span>`;
    } else {
      statusBadge = `<span class="badge badge-gray">Upcoming</span>`;
    }

    return `<div class="schedule-row ${i === game.season.raceIndex ? 'next-race' : ''}">
      <span class="race-num">${race.raceNum}</span>
      <div class="race-details">
        <span class="race-track">${track?.name || 'Unknown'}</span>
        <span class="race-type muted-text">${formatTrackType(track?.type)} · ${track?.length}mi · ${track?.laps} laps</span>
      </div>
      ${statusBadge}
      <span class="race-result muted-text">${resultInfo}</span>
    </div>`;
  }).join('');

  const completedRaces = game.season.calendar.filter(r => r.status === 'completed');
  const wins   = completedRaces.filter(r => r.playerResult?.position === 1).length;
  const top5   = completedRaces.filter(r => r.playerResult?.position <= 5).length;
  const top10  = completedRaces.filter(r => r.playerResult?.position <= 10).length;
  const totalEarnings = completedRaces.reduce((s, r) => s + (r.earnings || 0), 0);

  return `
  <div class="page-header"><h2>${series.name} — Year ${game.season.year} Schedule</h2></div>
  <div class="season-stats-bar">
    <div class="season-stat"><span class="ss-num">${completedRaces.length}</span><span>Races</span></div>
    <div class="season-stat"><span class="ss-num">${wins}</span><span>Wins</span></div>
    <div class="season-stat"><span class="ss-num">${top5}</span><span>Top 5</span></div>
    <div class="season-stat"><span class="ss-num">${top10}</span><span>Top 10</span></div>
    <div class="season-stat"><span class="ss-num">${fmt$(totalEarnings)}</span><span>Earned</span></div>
  </div>
  <div class="schedule-list">${rows}</div>`;
}

// ─── Market ──────────────────────────────────────────────────
function renderMarket() {
  const series   = SERIES[game.currentSeries];
  const cls      = CAR_CLASSES[series.carClass];
  const canBuy   = game.money >= cls.buyCost;

  const availableSponsors = SPONSOR_DEALS.filter(d =>
    d.level <= game.currentSeries && !game.activeSponsors.includes(d.id)
  );
  const sponsorRows = availableSponsors.map(d => `
    <div class="staff-row">
      <div class="staff-info">
        <span class="staff-name">${d.name}</span>
        <div class="staff-meta">Base: ${fmt$(d.weekly)}/race · Bonus: ${fmt$(d.bonus)} if ${d.cond}</div>
      </div>
      ${game.activeSponsors.length < sponsorSlots()
        ? `<button class="btn btn-sm btn-primary" onclick="handleSignSponsor('${d.id}')">Sign Deal</button>`
        : `<button class="btn btn-sm" disabled>Max sponsors</button>`}
    </div>`).join('') || '<p class="muted-text">No new sponsors available right now.</p>';

  const activeSponsors = game.activeSponsors.map(sid => {
    const d = SPONSOR_DEALS.find(s => s.id === sid);
    if (!d) return '';
    return `<div class="staff-row">
      <div class="staff-info">
        <span class="staff-name">${d.name}</span>
        <div class="staff-meta">Base: ${fmt$(d.weekly)}/race · Bonus: ${fmt$(d.bonus)} if ${d.cond}</div>
      </div>
      <button class="btn btn-sm btn-danger" onclick="handleDropSponsor('${d.id}')">Drop</button>
    </div>`;
  }).join('') || '<p class="muted-text">No active sponsors.</p>';

  // ── Bank ────────────────────────────────────────────────
  const loans = getLoans();
  const debt  = totalDebt();
  const limit = creditLimit();
  const avail = creditAvailable();

  const loanRows = loans.map(l => {
    const late = l.racesLeft <= 0;
    return `<div class="loan-row${late ? ' is-late' : ''}">
      <div class="loan-info">
        <span class="loan-name">${l.name}${late ? ' — OVERDUE' : ''}</span>
        <div class="staff-meta">Owed ${fmt$(l.balance)} · borrowed ${fmt$(l.principal)}</div>
        <div class="staff-meta ${late ? 'red' : 'muted-text'}">
          ${late ? `Accruing ${Math.round(LOAN_LATE_RATE * 100)}% interest every race`
                 : `${l.racesLeft} race${l.racesLeft === 1 ? '' : 's'} left to repay`}
        </div>
      </div>
      <div class="loan-actions">
        <button class="btn btn-sm btn-primary" onclick="handleRepayLoan('${l.id}')"
          ${game.money <= 0 ? 'disabled' : ''}>Repay All</button>
        <button class="btn btn-sm btn-ghost" onclick="handleRepayLoan('${l.id}', ${Math.max(500, Math.round(l.balance / 2))})"
          ${game.money <= 0 ? 'disabled' : ''}>Pay Half</button>
      </div>
    </div>`;
  }).join('') || '<p class="muted-text">No outstanding loans.</p>';

  const offerRows = LOAN_OFFERS.map(o => {
    const principal = loanPrincipal(o);
    const owed = Math.round(principal * (1 + o.rate));
    const canTake = principal >= 500 && loans.length < 3;
    return `<div class="staff-row">
      <div class="staff-info">
        <span class="staff-name">${o.name}</span>
        <div class="staff-meta">Borrow ${fmt$(principal)} · repay ${fmt$(owed)} within ${o.term} races</div>
        <div class="staff-meta muted-text">${o.blurb}</div>
      </div>
      ${canTake
        ? `<button class="btn btn-sm btn-primary" onclick="handleTakeLoan('${o.id}')">Borrow</button>`
        : `<button class="btn btn-sm" disabled>${loans.length >= 3 ? 'Max loans' : 'No credit'}</button>`}
    </div>`;
  }).join('');

  const creditPct = limit > 0 ? Math.round((debt / limit) * 100) : 0;
  const bankCard = `
    <div class="card mt">
      <div class="card-header">Bank</div>
      ${game.money < 0 ? `<p class="form-warning">You are in the red. Borrowing now buys time, but the balance must be cleared before the term runs out.</p>` : ''}
      <div class="team-stat"><span>Cash</span><span class="${game.money < 0 ? 'red' : 'highlight'}">${fmt$(game.money)}</span></div>
      <div class="team-stat"><span>Total Debt</span><span class="${debt > 0 ? 'red' : ''}">${fmt$(debt)}</span></div>
      <div class="team-stat"><span>Credit Limit</span><span>${fmt$(limit)}</span></div>
      <div class="team-stat"><span>Available</span><span class="green">${fmt$(avail)}</span></div>
      <div class="stat-row mt">
        <span class="stat-label">Credit Used</span>
        <div class="stat-bar-wrap"><div class="stat-bar ${creditPct >= 80 ? 'bar-red' : creditPct >= 50 ? 'bar-yellow' : 'bar-green'}" style="width:${clamp(creditPct,0,100)}%"></div></div>
        <span class="stat-value">${creditPct}%</span>
      </div>
      <div class="card-header mt">Your Loans</div>
      ${loanRows}
      <div class="card-header mt">Available Credit</div>
      <p class="muted-text small">Repay within the term or the balance starts compounding at ${Math.round(LOAN_LATE_RATE * 100)}% per race. Credit grows with your reputation.</p>
      ${offerRows}
    </div>`;

  // ── Charity ─────────────────────────────────────────────
  const rep = game.reputation != null ? game.reputation : 50;
  const canGive = canDonate();
  const charityRows = CHARITY_CAUSES.map(c => {
    const cost = charityCost(c, game.currentSeries);
    const gain = charityRepGain(c, rep);
    const afford = game.money >= cost;
    return `<div class="staff-row">
      <div class="staff-info">
        <span class="staff-name">${c.name}</span>
        <div class="staff-meta">${fmt$(cost)} · <span class="green">+${gain} reputation</span></div>
        <div class="staff-meta muted-text">${c.blurb}</div>
      </div>
      ${canGive && afford
        ? `<button class="btn btn-sm btn-primary" onclick="handleDonate('${c.id}')">Donate</button>`
        : `<button class="btn btn-sm" disabled>${!canGive ? 'Given' : 'Too costly'}</button>`}
    </div>`;
  }).join('');

  const charityCard = `
    <div class="card mt">
      <div class="card-header">Charity</div>
      <p class="muted-text small">Giving back builds your standing in the sport. One pledge per race weekend${
        game.charityGiven ? ` · ${fmt$(game.charityGiven)} given so far` : ''}.</p>
      ${!canGive ? `<p class="form-warning">You have already given this race weekend.</p>` : ''}
      <div class="stat-row">
        <span class="stat-label">Reputation</span>
        <div class="stat-bar-wrap"><div class="stat-bar ${rep >= 60 ? 'bar-green' : rep >= 40 ? 'bar-yellow' : 'bar-red'}" style="width:${clamp(rep,0,100)}%"></div></div>
        <span class="stat-value">${rep}</span>
      </div>
      ${charityRows}
    </div>`;

  return `
  <div class="page-header"><h2>Market</h2></div>
  <div class="two-col-grid">
    <div>
      <div class="card">
        <div class="card-header">Buy a Car</div>
        <p class="muted-text">${cls.description}</p>
        <div class="team-stat"><span>Cost</span><span class="highlight">${fmt$(cls.buyCost)}</span></div>
        <div class="team-stat"><span>Sell Value</span><span>${fmt$(cls.sellValue)}</span></div>
        <div class="team-stat"><span>Base Speed</span><span>${cls.baseStats.speed}</span></div>
        <div class="team-stat"><span>Base Handling</span><span>${cls.baseStats.handling}</span></div>
        <div class="team-stat"><span>Base Reliability</span><span>${cls.baseStats.reliability}</span></div>
        <div class="team-stat"><span>Your Cars</span><span>${game.cars.length} / ${MAX_TEAM_CARS}</span></div>
        ${game.cars.length >= MAX_TEAM_CARS
          ? `<button class="btn mt" disabled>Team full (${MAX_TEAM_CARS} cars)</button>`
          : canBuy
            ? `<button class="btn btn-primary mt" onclick="handleBuyCar()">Buy Car (${fmt$(cls.buyCost)})</button>`
            : `<button class="btn mt" disabled>Not enough money (need ${fmt$(cls.buyCost)})</button>`}
      </div>
      ${bankCard}
    </div>
    <div>
      <div class="card">
        <div class="card-header">Active Sponsors</div>
        ${activeSponsors}
      </div>
      <div class="card mt">
        <div class="card-header">Available Sponsors</div>
        <p class="muted-text small">Sponsors pay you every race. You can run ${sponsorSlots()} deals at once.</p>
        ${sponsorRows}
      </div>
      ${charityCard}
    </div>
  </div>`;
}

// ─── Standings ───────────────────────────────────────────────
function renderStandings() {
  const series = SERIES[game.currentSeries];
  const sorted = getStandings();

  const rows = sorted.map((e, i) => {
    const pos = i + 1;
    const cls = e.isPlayer ? 'standings-row player-standing'
              : e.isTeamCar ? 'standings-row team-standing'
              : 'standings-row';
    return `<div class="${cls}">
      <span class="st-pos">${pos}</span>
      <span class="st-name">${standingName(e)}</span>
      <span class="st-races">${e.races}</span>
      <span class="st-wins">${e.wins}</span>
      <span class="st-top5">${e.top5}</span>
      <span class="st-pts">${e.points}</span>
    </div>`;
  }).join('');

  return `
  <div class="page-header"><h2>${series.name} — Championship Standings</h2></div>
  <div class="card">
    <div class="standings-header standings-row">
      <span class="st-pos">Pos</span>
      <span class="st-name">Driver / Team</span>
      <span class="st-races">Races</span>
      <span class="st-wins">Wins</span>
      <span class="st-top5">Top 5</span>
      <span class="st-pts">Points</span>
    </div>
    ${rows}
  </div>
  ${series.promotionSpots > 0 ? `<p class="muted-text small mt">Top ${series.promotionSpots} earn promotion to ${SERIES[series.level+1]?.name}</p>` : ''}
  ${series.relegationSpots > 0 ? `<p class="muted-text small">Bottom ${series.relegationSpots} may be relegated</p>` : ''}`;
}

// ─── Race Weekend ────────────────────────────────────────────
function renderRaceSetup() {
  const race   = currentRace();
  const track  = TRACKS.find(t => t.id === race.trackId);
  const series = SERIES[game.currentSeries];

  // Which cars can the player enter?
  const cars = game.driverMode === 'hired' ? [] : game.cars;

  const isHired    = game.driverMode === 'hired';
  const isManager  = game.driverMode === 'manager';

  let carSection = '';
  if (isHired) {
    const team = game.season.aiTeams.find(t => t.id === game.hiredTeamId);
    carSection = `<p>You will drive for <strong>${team?.name || 'your team'}</strong>.</p>`;
  } else if (isManager) {
    carSection = `<p>Your team enters all cars. Drivers are assigned automatically.</p>
    ${game.cars.map(c => {
      const d = c.assignedDriverId && c.assignedDriverId !== 'player'
        ? HIREABLE_DRIVERS.find(dr => dr.id === c.assignedDriverId)?.name : 'No Driver';
      return `<div class="team-stat"><span>${c.name}</span><span>${d || 'Needs driver'}</span></div>`;
    }).join('')}`;
  } else {
    // A car with a hired driver in it is not available for you to drive.
    const taken = new Map();
    (game.hiredDrivers || []).forEach(h => {
      const drv = HIREABLE_DRIVERS.find(d => d.id === h.driverId);
      if (drv) taken.set(h.carId, drv.name);
    });
    const openCars = cars.filter(c => !taken.has(c.id));
    const idleCars = cars.filter(c => taken.has(c.id) === false && c.assignedDriverId !== 'player');

    const driverCar = openCars.find(c => c.assignedDriverId === 'player') || openCars[0];
    carSection = `
      <p class="muted-text">Select which car you will drive:</p>
      ${openCars.map(c => `
        <label class="radio-row">
          <input type="radio" name="drive-car" value="${c.id}" ${c === driverCar ? 'checked' : ''}>
          <span>#${c.number || 1} ${c.name} — Speed ${c.speed}, Handling ${c.handling}, Condition ${Math.round(c.condition)}%</span>
        </label>`).join('') || '<p class="form-warning">Every car has a hired driver in it — release a driver to drive one yourself.</p>'}
      ${taken.size ? `
        <div class="card-header mt">Entered By Your Drivers</div>
        ${[...taken.entries()].map(([carId, nm]) => {
          const c = game.cars.find(x => x.id === carId);
          return `<div class="team-stat"><span>#${c?.number || 1} ${c?.name || 'Car'}</span><span>${nm}</span></div>`;
        }).join('')}` : ''}
      ${idleCars.length > 1 || (idleCars.length === 1 && idleCars[0] !== driverCar) ? `
        <p class="form-warning">Some cars have no driver assigned and will not be entered. Assign a driver in the Team tab.</p>` : ''}
    `;
  }

  return `
  <div class="race-setup-page">
    <div class="card">
      <div class="card-header">Race Weekend</div>
      <div class="race-info-box big">
        <span class="race-track-name big">${track.name}</span>
        <span class="badge badge-${trackTypeBadge(track.type)}">${formatTrackType(track.type)}</span>
      </div>
      <div class="race-details-grid">
        <div class="team-stat"><span>Track Length</span><span>${track.length} miles</span></div>
        <div class="team-stat"><span>Laps</span><span>${track.laps}</span></div>
        <div class="team-stat"><span>Entry Fee</span><span>${fmt$(series.entryFee)}</span></div>
        <div class="team-stat"><span>1st Prize</span><span>${fmt$(series.prize[0])}</span></div>
        <div class="team-stat"><span>Speed Emphasis</span><span>${Math.round(track.speedW * 10)}/10</span></div>
        <div class="team-stat"><span>Handling Emphasis</span><span>${Math.round(track.handW * 10)}/10</span></div>
      </div>
    </div>
    <div class="card mt">
      <div class="card-header">Car Selection</div>
      ${carSection}
    </div>
    <div class="btn-row mt">
      <button class="btn btn-primary btn-lg" id="btn-start-race" onclick="handleStartRace()">Race</button>
      <button class="btn btn-ghost btn-lg" onclick="handleSimulateRace()">Simulate</button>
      <button class="btn btn-ghost" onclick="showScreen('game')">Back</button>
    </div>
  </div>`;
}

// ─── Race Display (live) ──────────────────────────────────────
function renderRaceScreen(trackName) {
  return `
  <div class="race-screen">
    <div class="race-header">
      <h2 id="race-title">${trackName}</h2>
      <div id="race-phase-label" class="race-phase">Pre-Race</div>
    </div>
    <div class="race-main">
      <div class="race-left">
        <div class="card">
          <div class="card-header">Leaderboard</div>
          <div id="race-leaderboard">Loading...</div>
        </div>
      </div>
      <div class="race-right">
        <div class="card">
          <div class="card-header">Race Events</div>
          <div id="race-events" class="race-events-log"></div>
        </div>
      </div>
    </div>
    <div class="race-footer">
      <button class="btn btn-primary" id="btn-race-skip" onclick="handleRaceSkipToEnd()">Skip to End</button>
      <button class="btn btn-ghost" id="btn-race-speed" onclick="handleRaceSpeed()">Speed Up</button>
    </div>
  </div>`;
}

function renderLeaderboard(results, highlightPlayer) {
  return results.slice(0, 15).map(r => `
    <div class="lb-row ${r.isPlayer ? 'lb-player' : ''}">
      <span class="lb-pos">${r.position}</span>
      <div class="lb-dot" style="background:${r.teamColor}"></div>
      <span class="lb-name">${r.displayName.split(' / ').pop()}</span>
      ${r.dnf ? '<span class="badge badge-red lb-badge">DNF</span>' : ''}
    </div>`).join('');
}

// ─── Race Results modal ───────────────────────────────────────
function renderRaceResultsModal(results, events, playerResult) {
  const series  = SERIES[game.currentSeries];
  const topRows = results.slice(0, 10).map(r => `
    <div class="result-row ${r.isPlayer ? 'player-result' : ''}">
      <span class="res-pos ${r.position <= 3 ? 'podium' : ''}">${r.position}</span>
      <span class="res-name">${resultName(r)}</span>
      <span class="res-pts">${r.points}pts</span>
      <span class="res-prize green">${fmt$(r.prize)}</span>
      ${r.dnf ? '<span class="badge badge-red">DNF</span>' : ''}
    </div>`).join('');

  let playerSection = '';
  if (playerResult) {
    const pos = playerResult.position;
    const label = pos === 1 ? 'VICTORY LANE' : pos <= 3 ? 'PODIUM FINISH' : `P${pos} FINISH`;
    playerSection = `
      <div class="player-result-hero">
        <div class="big-pos-label">${label}</div>
        <div>
          <div class="big-pos">${pos}${ordinal(pos)} place</div>
          <div class="big-prize green">${fmt$(playerResult.prize)} earned</div>
          <div class="muted-text">${playerResult.points} championship points</div>
        </div>
      </div>`;
  }

  return `
  <div class="modal-overlay" id="results-modal">
    <div class="modal modal-wide">
      <div class="modal-header">
        <h3>Race Results</h3>
      </div>
      <div class="modal-body">
        ${playerSection}
        <div class="card-header mt">Top 10 Finishers</div>
        <div class="results-list">${topRows}</div>
        ${results.length > 10 ? `<p class="muted-text small">${results.length - 10} more finishers...</p>` : ''}
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" id="btn-close-results" onclick="handleCloseResults()">Continue</button>
      </div>
    </div>
  </div>`;
}

// ─── End of Season / Premier Choice ─────────────────────────
function renderEndSeasonModal(info) {
  const purse = (info.playerPayout || 0) + (info.teamPayout || 0);

  const payoutRows = (info.payouts || []).map(p => `
    <div class="result-row ${p.isPlayer ? 'player-result' : p.isTeamCar ? 'team-standing' : ''}">
      <span class="res-pos ${p.pos <= 3 ? 'podium' : ''}">${p.pos}</span>
      <span class="res-name">${p.isPlayer ? `<strong>${info.driver}</strong>` : p.name}</span>
      <span class="res-prize green">${fmt$(p.amount)}</span>
    </div>`).join('');

  // ── Champion: the big one ────────────────────────────────
  if (info.champion) {
    return `
    <div class="modal-overlay" id="end-season-modal">
      <div class="modal modal-wide champ-modal">
        <div class="champ-banner">
          <div class="champ-checker"></div>
          <div class="champ-eyebrow">${info.seriesName} · Season ${info.year}</div>
          <div class="champ-title">CHAMPION</div>
          <div class="champ-driver">${info.driver}</div>
          <div class="champ-checker"></div>
        </div>
        <div class="modal-body">
          <div class="champ-stats">
            <div><span class="champ-stat-num">${info.wins}</span><span class="champ-stat-label">Wins</span></div>
            <div><span class="champ-stat-num">${info.top5}</span><span class="champ-stat-label">Top 5</span></div>
            <div><span class="champ-stat-num">${info.points}</span><span class="champ-stat-label">Points</span></div>
            <div><span class="champ-stat-num">${info.races}</span><span class="champ-stat-label">Races</span></div>
            <div><span class="champ-stat-num">${info.titles}</span><span class="champ-stat-label">${info.titles === 1 ? 'Title' : 'Titles'}</span></div>
          </div>
          <div class="champ-purse">
            <span class="champ-purse-label">Championship Purse</span>
            <span class="champ-purse-val">${fmt$(purse)}</span>
          </div>
          <p class="highlight">${info.message}</p>
          ${info.promoted ? `<div class="achievement-badge">PROMOTED</div>` : ''}
          <div class="card-header mt">Season Payouts</div>
          <div class="results-list">${payoutRows}</div>
          ${info.totalEntrants > 10 ? `<p class="muted-text small">Every one of the ${info.totalEntrants} drivers is paid on final position.</p>` : ''}
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary btn-lg" onclick="handleDismissEndSeason()">Start Next Season</button>
        </div>
      </div>
    </div>`;
  }

  // ── Everyone else ────────────────────────────────────────
  return `
  <div class="modal-overlay" id="end-season-modal">
    <div class="modal modal-wide">
      <div class="modal-header"><h3>Season Over — ${info.seriesName}</h3></div>
      <div class="modal-body">
        <p class="highlight">${info.message}</p>
        ${info.promoted ? `<div class="achievement-badge">PROMOTED</div>` : ''}
        ${info.relegated ? `<div class="achievement-badge rele">RELEGATED</div>` : ''}
        <div class="champ-purse mt">
          <span class="champ-purse-label">Season Payout</span>
          <span class="champ-purse-val">${fmt$(purse)}</span>
        </div>
        <div class="card-header mt">Season Payouts</div>
        <div class="results-list">${payoutRows}</div>
        ${info.totalEntrants > 10 ? `<p class="muted-text small">Every one of the ${info.totalEntrants} drivers is paid on final position.</p>` : ''}
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" onclick="handleDismissEndSeason()">Start Next Season</button>
      </div>
    </div>
  </div>`;
}

function renderPremierChoiceModal() {
  const aiTeams = game.season.aiTeams.slice(0, 6);
  const teamOpts = aiTeams.map(t =>
    `<option value="${t.id}">${t.name}</option>`
  ).join('');

  return `
  <div class="modal-overlay" id="premier-choice-modal">
    <div class="modal modal-wide">
      <div class="modal-header"><h3>Welcome to the Premier Cup Series</h3></div>
      <div class="modal-body">
        <p>You've reached the top tier of stock car racing. How do you want to continue your career?</p>
        <div class="career-choices">
          <div class="career-card" onclick="selectCareerChoice('driver')">
            <div class="career-icon">01</div>
            <div class="career-title">Stay as Driver</div>
            <div class="career-desc">Drive one of your own cars each race. Compete for the championship yourself.</div>
          </div>
          <div class="career-card" onclick="selectCareerChoice('manager')">
            <div class="career-icon">02</div>
            <div class="career-title">Become a Manager</div>
            <div class="career-desc">Step back from driving. Run the team from the pit wall. Hire drivers for all your cars.</div>
          </div>
          <div class="career-card" onclick="selectCareerChoice('hired')">
            <div class="career-icon">03</div>
            <div class="career-title">Drive for Another Team</div>
            <div class="career-desc">Join an established team, collect a weekly salary, and leave the management headaches behind.</div>
          </div>
        </div>
        <div id="hired-team-select" class="hidden mt">
          <label class="form-label">Choose a team to drive for:</label>
          <select id="select-ai-team" class="form-select">${teamOpts}</select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" id="btn-confirm-career" onclick="confirmCareerChoice()" disabled>Confirm Choice</button>
      </div>
    </div>
  </div>`;
}

// ─── Career Stats ─────────────────────────────────────────────
function renderCareerStats() {
  if (!game) return '';

  // ── Career totals ────────────────────────────────────────
  const hist        = game.history || [];
  const seasonStand = getStandings();
  const me          = seasonStand.find(e => e.id === 'player');
  const seasonPos   = seasonStand.findIndex(e => e.id === 'player') + 1;

  const seasonWins  = me?.wins  || 0;
  const seasonTop5  = me?.top5  || 0;
  const seasonTop10 = me?.top10 || 0;
  const seasonRaces = me?.races || 0;
  const seasonPts   = me?.points || 0;

  // All-time = every completed season plus what is banked this year
  const pastWins  = hist.reduce((s, h) => s + (h.wins || 0), 0);
  const allWins   = pastWins + seasonWins;
  const allRaces  = game.cars.reduce((s, c) => s + (c.races || 0), 0);
  const titles    = game.titles || hist.filter(h => h.champion).length;
  const seasons   = hist.length;
  const earnings  = game.season.calendar
    .filter(r => r.status === 'completed')
    .reduce((s, r) => s + (r.earnings || 0), 0);
  const careerPayouts = hist.reduce((s, h) => s + (h.payout || 0), 0);

  const rep = game.reputation || 50;
  const repLabel = rep >= 80 ? 'Legend' : rep >= 60 ? 'Respected' : rep >= 40 ? 'Known' : rep >= 20 ? 'Rookie' : 'Unknown';
  const repCls   = rep >= 60 ? 'bar-green' : rep >= 40 ? 'bar-yellow' : 'bar-red';

  const winRate = allRaces > 0 ? Math.round(allWins / allRaces * 100) : 0;

  // ── Last season ──────────────────────────────────────────
  const last = hist.length ? hist[hist.length - 1] : null;
  const lastSeason = last ? `
    <div class="card mb">
      <div class="card-header">Last Season — ${last.series}, Year ${last.year}</div>
      <div class="card-body">
        <div class="champ-stats">
          <div><span class="champ-stat-num">${last.finalPos}${ordinal(last.finalPos)}</span><span class="champ-stat-label">Finish</span></div>
          <div><span class="champ-stat-num">${last.wins || 0}</span><span class="champ-stat-label">Wins</span></div>
          <div><span class="champ-stat-num">${last.champion ? 'YES' : 'NO'}</span><span class="champ-stat-label">Title</span></div>
          <div><span class="champ-stat-num">${fmt$(last.payout || 0)}</span><span class="champ-stat-label">Purse</span></div>
          <div><span class="champ-stat-num">${seasons}</span><span class="champ-stat-label">Seasons</span></div>
        </div>
      </div>
    </div>` : `
    <div class="card mb">
      <div class="card-header">Last Season</div>
      <div class="card-body"><p class="muted-text">You have not completed a season yet.</p></div>
    </div>`;

  const histRows = hist.slice().reverse().map(h => `
    <div class="result-row ${h.champion ? 'player-result' : ''}">
      <span class="res-pos ${h.finalPos <= 3 ? 'podium' : ''}">${h.finalPos}</span>
      <span class="res-name">Year ${h.year} <span class="st-team">${h.series}</span></span>
      <span class="res-pts">${h.wins || 0}W</span>
      <span class="res-prize green">${fmt$(h.payout || 0)}</span>
    </div>`).join('') || '<p class="muted-text">No completed seasons yet.</p>';

  return `
  <div class="page-header"><h2>Career — ${game.driverName || game.teamName}</h2></div>

  <div class="cmd-strip">
    <div class="cmd-cell">
      <span class="cmd-label">Career Wins</span>
      <span class="cmd-value gold">${allWins}</span>
      <span class="cmd-sub">${winRate}% of ${allRaces} starts</span>
    </div>
    <div class="cmd-cell">
      <span class="cmd-label">Championships</span>
      <span class="cmd-value">${titles}</span>
      <span class="cmd-sub">${seasons} season${seasons === 1 ? '' : 's'} run</span>
    </div>
    <div class="cmd-cell">
      <span class="cmd-label">Wins This Season</span>
      <span class="cmd-value">${seasonWins}</span>
      <span class="cmd-sub">${seasonTop5} top 5 · ${seasonTop10} top 10</span>
    </div>
    <div class="cmd-cell">
      <span class="cmd-label">Championship</span>
      <span class="cmd-value">${seasonPos}${ordinal(seasonPos)}</span>
      <span class="cmd-sub">${seasonPts} points</span>
    </div>
    <div class="cmd-cell">
      <span class="cmd-label">Reputation</span>
      <span class="cmd-value">${repLabel}</span>
      <span class="cmd-sub">${rep}/100</span>
    </div>
  </div>

  <div class="two-col-grid">
    <div>
      <div class="card mb">
        <div class="card-header">Credentials</div>
        <div class="card-body">
          <div class="stat-row">
            <span class="stat-label">Reputation</span>
            <div class="stat-bar-wrap"><div class="stat-bar ${repCls}" style="width:${clamp(rep,0,100)}%"></div></div>
            <span class="stat-value">${rep}</span>
          </div>
          ${statBar('Driver Skill', Math.round(game.playerSkill))}
          <div class="team-stat"><span>Team</span><span>${game.teamName}</span></div>
          <div class="team-stat"><span>Series</span><span>${SERIES[game.currentSeries].name}</span></div>
          <div class="team-stat"><span>Role</span><span>${
            game.driverMode === 'hired' ? 'Hired Driver'
            : game.driverMode === 'manager' ? 'Team Manager' : 'Driver / Owner'}</span></div>
        </div>
      </div>

      <div class="card mb">
        <div class="card-header">This Season</div>
        <div class="card-body">
          <div class="team-stat"><span>Races Run</span><span>${seasonRaces}</span></div>
          <div class="team-stat"><span>Wins</span><span>${seasonWins}</span></div>
          <div class="team-stat"><span>Top 5 Finishes</span><span>${seasonTop5}</span></div>
          <div class="team-stat"><span>Top 10 Finishes</span><span>${seasonTop10}</span></div>
          <div class="team-stat"><span>Points</span><span>${seasonPts}</span></div>
          <div class="team-stat"><span>Prize Money</span><span class="green">${fmt$(earnings)}</span></div>
        </div>
      </div>
    </div>

    <div>
      ${lastSeason}
      <div class="card mb">
        <div class="card-header">All Time</div>
        <div class="card-body">
          <div class="team-stat"><span>Career Wins</span><span class="highlight">${allWins}</span></div>
          <div class="team-stat"><span>Career Starts</span><span>${allRaces}</span></div>
          <div class="team-stat"><span>Win Rate</span><span>${winRate}%</span></div>
          <div class="team-stat"><span>Championships</span><span class="gold">${titles}</span></div>
          <div class="team-stat"><span>Seasons Completed</span><span>${seasons}</span></div>
          <div class="team-stat"><span>Season Purses Won</span><span class="green">${fmt$(careerPayouts)}</span></div>
        </div>
      </div>
      <div class="card mb">
        <div class="card-header">Season History</div>
        <div class="card-body results-list">${histRows}</div>
      </div>
    </div>
  </div>`;
}

// ─── Settings ─────────────────────────────────────────────────
function renderSettings() {
  if (!game) return '';
  const curDiff = game.difficulty || DEFAULT_DIFFICULTY;
  const unsaved = (typeof currentSlot === 'undefined' || currentSlot === null);
  const slotLabel = unsaved ? 'Not saved yet' : `Slot ${currentSlot + 1}`;

  return `
  <div class="page-header"><h2>Settings</h2></div>

  <div class="card mb">
    <div class="card-header">Difficulty</div>
    <div class="card-body">
      <p class="muted-text small">How hard the field races you. Applies from your next race onward.</p>
      <div class="difficulty-grid lg">
        ${DIFFICULTIES.map(d => `
          <div class="difficulty-card${d.id === curDiff ? ' selected' : ''}"
               onclick="handleSetDifficulty('${d.id}')">
            <span class="difficulty-name">${d.name}</span>
            <span class="difficulty-blurb">${d.blurb}</span>
          </div>`).join('')}
      </div>
    </div>
  </div>

  <div class="card mb">
    <div class="card-header">Auto Save</div>
    <div class="card-body">
      <div class="team-stat"><span>Auto-saving to</span><span class="${unsaved ? 'red' : 'green'}">${slotLabel}</span></div>
      <p class="muted-text small">Nothing is written to a slot until you pick one. After that the game keeps saving there automatically after every race.</p>
      <div class="btn-row mt">
        <button class="btn btn-primary" onclick="handleSaveGame()">${unsaved ? 'Choose a Slot' : 'Save Now'}</button>
        <button class="btn btn-ghost" onclick="showLoadModal()">Load a Game</button>
      </div>
    </div>
  </div>`;
}

// ─── Save / Load slot modals ──────────────────────────────────
function renderSaveModal() {
  const meta = getSaveMeta();
  const slots = meta.map((m, i) => {
    const filled = m !== null;
    const info = filled
      ? `<strong>${m.teamName}</strong><br>${m.series} · Year ${m.year} · ${m.wins} wins<br><span class="muted-text">${new Date(m.savedAt).toLocaleString()}</span>`
      : '<span class="muted-text">Empty</span>';
    return `
    <div class="save-slot">
      <div class="save-slot-info">${info}</div>
      <div class="save-slot-actions">
        <button class="btn btn-sm btn-primary" onclick="handleSaveToSlot(${i})">Save Here</button>
        ${filled ? `<button class="btn btn-sm btn-danger" onclick="handleDeleteSlot(${i})">Delete</button>` : ''}
      </div>
    </div>`;
  }).join('');

  return `
  <div class="modal-overlay" id="save-slot-modal">
    <div class="modal">
      <div class="modal-header">
        <h3>Save Game</h3>
        <button class="modal-close" onclick="closeSaveModal()">Close</button>
      </div>
      <div class="modal-body save-slots">${slots}</div>
    </div>
  </div>`;
}

function renderLoadModal() {
  const meta = getSaveMeta();
  const hasAnySave = meta.some(m => m !== null);

  const slots = meta.map((m, i) => {
    const filled = m !== null;
    const info = filled
      ? `<strong>${m.teamName}</strong><br>${m.series} · Year ${m.year} · ${m.wins} wins<br><span class="muted-text">${new Date(m.savedAt).toLocaleString()}</span>`
      : '<span class="muted-text">Empty</span>';
    return `
    <div class="save-slot ${!filled ? 'save-slot-empty' : ''}">
      <div class="save-slot-info">${info}</div>
      <div class="save-slot-actions">
        ${filled ? `
          <button class="btn btn-sm btn-primary" onclick="handleLoadFromSlot(${i})">Load</button>
          <button class="btn btn-sm btn-danger" onclick="handleDeleteSlot(${i})">Delete</button>` : ''}
      </div>
    </div>`;
  }).join('');

  return `
  <div class="modal-overlay" id="save-slot-modal">
    <div class="modal">
      <div class="modal-header">
        <h3>Load a Game</h3>
        <button class="modal-close" onclick="closeSaveModal()">Close</button>
      </div>
      <div class="modal-body save-slots">
        ${!hasAnySave ? '<p class="muted-text">No saved games found.</p>' : slots}
      </div>
    </div>
  </div>`;
}

// ─── Quick Race modal ─────────────────────────────────────────
function renderQuickRaceModal() {
  return `
  <div class="modal-overlay" id="quick-race-modal">
    <div class="modal">
      <div class="modal-header">
        <h3>Quick Race</h3>
        <button class="modal-close" onclick="document.getElementById('quick-race-modal')?.remove()">Close</button>
      </div>
      <div class="modal-body">
        <p>Jump straight into a superspeedway race — no career consequences.</p>
        <div class="card-header">Difficulty</div>
        <div class="difficulty-grid">
          ${DIFFICULTIES.map(d => `
            <div class="difficulty-card${d.id === quickRaceDifficulty ? ' selected' : ''}"
                 data-diff="${d.id}" onclick="setQuickRaceDifficulty('${d.id}')">
              <span class="difficulty-name">${d.name}</span>
              <span class="difficulty-blurb">${d.blurb}</span>
            </div>`).join('')}
        </div>
        <div class="card-header mt">Series</div>
        <div class="quick-series">
          ${SERIES.map(s => `
            <button class="quick-series-btn" onclick="handleStartQuickRace(${s.fieldSize})">
              <span class="quick-series-name" style="color:${s.color}">${s.name}</span>
              <span class="quick-series-meta">${s.fieldSize}-car field · ${s.description}</span>
            </button>`).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

// ─── Listeners wired after each tab render ───────────────────
function attachTabListeners(tabName) {
  // Nothing extra for most tabs; specific interactions are via onclick attributes
}
`````

---

## 8. `js/main.js`

*849 lines, 31757 bytes.*

`````javascript
// ============================================================
// STOCK CAR EMPIRE - Main Entry Point & Event Handling
// ============================================================

// ─── Race playback state ──────────────────────────────────────
let racePlayback = {
  results: null,
  events:  null,
  playerResult: null,
  step: 0,
  speed: 1,       // 1 = normal, 3 = fast, 99 = instant
  timer: null,
  skipRequested: false,
};

let selectedCareerPath = null;

// ─── Startup ─────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  showScreen('intro');
});

function enterGame() {
  try {
    showScreen('game');
    updateHeader();
    showTab('dashboard');
  } catch (e) {
    console.error('Failed to load game UI:', e);
    toast('Save file could not be loaded. Starting fresh.', 'error');
    deleteSave();
    showScreen('intro');
  }
}

// ─── Intro / New Game ─────────────────────────────────────────
document.getElementById('btn-start-new')?.addEventListener('click', () => {
  showScreen('setup');
});

document.getElementById('btn-load-game')?.addEventListener('click', () => {
  showLoadModal();
});

document.getElementById('btn-quick-race')?.addEventListener('click', () => {
  showQuickRaceScreen();
});

// New career is a two-step setup: details, then difficulty.
let pendingCareer = null;
let setupDifficulty = DEFAULT_DIFFICULTY;

document.getElementById('btn-create-team')?.addEventListener('click', () => {
  const teamName   = document.getElementById('inp-team-name').value.trim();
  const driverName = document.getElementById('inp-driver-name').value.trim();
  const carName    = document.getElementById('inp-car-name').value.trim();
  if (!teamName)   { toast('Please enter a team name.', 'warning'); return; }
  if (!driverName) { toast('Please enter a driver name.', 'warning'); return; }
  if (!carName)    { toast('Please name your first car.', 'warning'); return; }
  pendingCareer = { teamName, driverName, carName };
  showSetupDifficulty();
});

function renderSetupDifficultyCards() {
  const grid = document.getElementById('setup-difficulty-grid');
  if (!grid) return;
  grid.innerHTML = DIFFICULTIES.map(d => `
    <div class="difficulty-card${d.id === setupDifficulty ? ' selected' : ''}"
         data-diff="${d.id}" onclick="setSetupDifficulty('${d.id}')">
      <span class="difficulty-name">${d.name}</span>
      <span class="difficulty-blurb">${d.blurb}</span>
    </div>`).join('');
}

function setSetupDifficulty(id) {
  setupDifficulty = id;
  renderSetupDifficultyCards();
}

function showSetupDifficulty() {
  document.querySelector('#screen-setup .setup-panel:not(#setup-difficulty)')?.classList.add('hidden');
  document.getElementById('setup-difficulty')?.classList.remove('hidden');
  renderSetupDifficultyCards();
}

function backToSetupDetails() {
  document.getElementById('setup-difficulty')?.classList.add('hidden');
  document.querySelector('#screen-setup .setup-panel:not(#setup-difficulty)')?.classList.remove('hidden');
}

document.getElementById('btn-begin-career')?.addEventListener('click', () => {
  if (!pendingCareer) { backToSetupDetails(); return; }
  const { teamName, driverName, carName } = pendingCareer;
  newGame(teamName, driverName, carName);
  game.difficulty = setupDifficulty;
  const d = difficultyById(setupDifficulty);
  toast(`Welcome to Stock Car Empire, ${driverName} — racing on ${d.name}.`, 'success', 5000);
  pendingCareer = null;
  backToSetupDetails();          // reset the screen for next time
  enterGame();
});

// Allow Enter key on setup form
document.getElementById('inp-car-name')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-create-team').click();
});

// ─── Navigation ───────────────────────────────────────────────
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    showTab(tab);
    updateHeader();
  });
});

// ─── Quick Race ───────────────────────────────────────────────
function showQuickRaceScreen() {
  document.body.insertAdjacentHTML('beforeend', renderQuickRaceModal());
}

// Quick Race difficulty is chosen in the modal before launching
let quickRaceDifficulty = DEFAULT_DIFFICULTY;

function setQuickRaceDifficulty(id) {
  quickRaceDifficulty = id;
  document.querySelectorAll('#quick-race-modal .difficulty-card').forEach(el => {
    el.classList.toggle('selected', el.dataset.diff === id);
  });
}

function handleStartQuickRace(fieldSize) {
  document.getElementById('quick-race-modal')?.remove();
  const AI_COLORS = ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#c0392b','#16a085','#8e44ad','#2980b9','#27ae60'];
  const aiEntries = [];
  // Unique human driver names for the field
  const namePool = [...AI_DRIVER_NAMES].sort(() => Math.random() - 0.5);
  for (let i = 0; i < fieldSize - 1; i++) {
    const nm = namePool[i % namePool.length] + (i >= namePool.length ? ' Jr.' : '');
    aiEntries.push({ name: nm, color: AI_COLORS[i % AI_COLORS.length], number: i + 2, power: rand(0.35, 0.80) });
  }
  showScreen('game-race');
  launch3DRace(
    { playerColor: '#e8001d', playerNumber: 1, playerPower: 0.60, fieldSize,
      difficulty: quickRaceDifficulty, aiEntries },
    (pos) => {
      showScreen('intro');
      const d = difficultyById(quickRaceDifficulty).name;
      toast(`Quick Race (${d}) finished — you placed ${pos}${ordinal(pos)}!`, pos <= 3 ? 'success' : 'info');
    }
  );
}

// ─── Settings / Career ────────────────────────────────────────
function handleSetDifficulty(id) {
  const d = difficultyById(id);
  game.difficulty = d.id;
  saveGame();
  toast(`Difficulty set to ${d.name}.`, 'success');
  renderTab(activeTab());
}

function handleSetCarColor(carId, color) {
  setCarColor(carId, color);
  renderTab(activeTab());
}

function handleSetCarNumber(carId) {
  const car = game.cars.find(c => c.id === carId);
  if (!car) return;
  const val = prompt(`Car number for "${car.name}" (1–99):`, car.number || 1);
  if (val === null) return;                       // cancelled
  const res = setCarNumber(carId, val);
  if (!res.ok) { toast(res.msg, 'error'); return; }
  toast(`${car.name} is now #${res.number}.`, 'success');
  renderTab(activeTab());                          // stay on the tab you're on
}

// Which career tab is currently showing
function activeTab() {
  return document.querySelector('.nav-btn.active')?.dataset.tab || 'dashboard';
}

// ─── Dashboard handlers ───────────────────────────────────────
function handleOpenRaceWeekend() {
  if (!currentRace()) return;
  showScreen('race-setup');
  document.getElementById('race-setup-content').innerHTML = renderRaceSetup();
}

// Races can no longer be skipped — run them or simulate them.
function handleSkipRace() {
  toast('Races cannot be skipped. Run the race or use Simulate.', 'warning');
}

function handleEndSeason() {
  if (!isSeasonOver()) { toast('Season is not over yet!', 'warning'); return; }
  const info = endSeason();
  // Show result modal
  document.body.insertAdjacentHTML('beforeend', renderEndSeasonModal(info));
}

function handleDismissEndSeason() {
  document.getElementById('end-season-modal')?.remove();
  updateHeader();
  renderTab('dashboard');
}

// ─── Garage handlers ─────────────────────────────────────────
// Modals must be children of <body>. Rendering them inside #main-content puts
// them under an element whose entry animation leaves a transform behind, which
// makes position:fixed resolve against that element — the overlay ends up at
// the bottom of the page instead of centred on screen.
function showUpgradeModal(carId) {
  document.getElementById('upgrade-modal')?.remove();
  document.body.insertAdjacentHTML('beforeend', renderUpgradeModal(carId));
}

function closeUpgradeModal(event) {
  if (event && event.target.id !== 'upgrade-modal') return;
  document.getElementById('upgrade-modal')?.remove();
}

function handleRepair(carId, cost) {
  const result = repairCar(carId);
  if (!result.ok) { toast(result.msg, 'error'); return; }
  toast(`Car repaired for ${fmt$(result.cost)}.`, 'success');
  updateHeader();
  renderTab('garage');
}

function handleUpgrade(carId, upgradeId) {
  const result = upgradeCar(carId, upgradeId);
  if (!result.ok) { toast(result.msg, 'error'); return; }
  const car = game.cars.find(c => c.id === carId);
  const upg = CAR_CLASSES[car.classId].upgrades.find(u => u.id === upgradeId);
  toast(`${upg?.name} fitted.`, 'success');
  updateHeader();
  // Refresh the modal (tier counts move) and the garage behind it
  showUpgradeModal(carId);
  renderTab(activeTab());
}

function handleRenameCar(carId) {
  const car = game.cars.find(c => c.id === carId);
  if (!car) return;
  const name = prompt('Enter new car name:', car.name);
  if (!name || !name.trim()) return;
  renameCar(carId, name);
  renderTab('garage');
}

function handleSellCar(carId) {
  const car = game.cars.find(c => c.id === carId);
  if (!car) return;
  const cls = CAR_CLASSES[car.classId];
  const val = Math.round(cls.sellValue * (car.condition / 100));
  if (!confirm(`Sell ${car.name} for ${fmt$(val)}?`)) return;
  const result = sellCar(carId);
  if (!result.ok) { toast(result.msg, 'error'); return; }
  toast(`${car.name} sold for ${fmt$(result.value)}.`, 'success');
  updateHeader();
  renderTab('garage');
}

// ─── Team handlers ────────────────────────────────────────────
function handleHireStaff(typeId) {
  const result = hireStaff(typeId);
  if (!result.ok) { toast(result.msg, 'error'); return; }
  const type = STAFF_TYPES.find(s => s.id === typeId);
  toast(`${type?.name} hired!`, 'success');
  updateHeader();
  renderTab('team');
}

function handleFireStaff(staffId) {
  const s = game.staff.find(st => st.id === staffId);
  if (!confirm(`Fire ${s?.name}?`)) return;
  fireStaff(staffId);
  toast('Staff member released.', 'info');
  renderTab('team');
}

// Cars a hired driver could actually take: not the one you drive, and not
// already occupied by another hired driver.
function freeCarsForHire() {
  return (game.cars || []).filter(c =>
    c.assignedDriverId !== 'player' &&
    !(game.hiredDrivers || []).find(h => h.carId === c.id)
  );
}

function openHireDriverModal(driverId) {
  // You need a car before you can put a driver in one.
  if (!game.cars || game.cars.length === 0) {
    toast('No car — you must buy a car before hiring a driver.', 'error');
    return;
  }
  if (freeCarsForHire().length === 0) {
    toast('No free car — every car already has a driver. Buy another car first.', 'error');
    return;
  }
  document.getElementById('hire-modal')?.remove();
  document.body.insertAdjacentHTML('beforeend', renderHireDriverModal(driverId));
}

function closeHireModal(event) {
  if (event && event.target.id !== 'hire-modal') return;
  document.getElementById('hire-modal')?.remove();
}

function confirmHireDriver(driverId) {
  const carId = document.getElementById('hire-car-select')?.value;
  if (!carId) { toast('Select a car.', 'warning'); return; }
  const result = hireDriver(driverId, carId);
  if (!result.ok) { toast(result.msg, 'error'); return; }
  const d = HIREABLE_DRIVERS.find(dr => dr.id === driverId);
  toast(`${d?.name} hired!`, 'success');
  document.getElementById('hire-modal')?.remove();
  updateHeader();
  renderTab('team');
}

function handleFireDriver(driverId) {
  const entry = game.hiredDrivers.find(h => h.driverId === driverId);
  const d     = HIREABLE_DRIVERS.find(dr => dr.id === driverId);
  if (!confirm(`Release ${d?.name}?`)) return;
  fireDriver(driverId);
  toast(`${d?.name} released.`, 'info');
  renderTab('team');
}

// ─── Market handlers ──────────────────────────────────────────
function handleBuyCar() {
  const name = prompt('Name your new car:');
  if (!name || !name.trim()) return;
  const result = buyCar(name.trim());
  if (!result.ok) { toast(result.msg, 'error'); return; }
  toast(`${name} added to your garage!`, 'success');
  updateHeader();
  renderTab('market');
}

// ─── Bank ─────────────────────────────────────────────────────
function handleTakeLoan(offerId) {
  const res = takeLoan(offerId);
  if (!res.ok) { toast(res.msg, 'error'); return; }
  toast(`${res.loan.name}: ${fmt$(res.loan.principal)} received. Repay ${fmt$(res.loan.balance)} within ${res.loan.term} races.`, 'success', 6000);
  updateHeader();
  renderTab('market');
}

function handleRepayLoan(loanId, amount) {
  const res = repayLoan(loanId, amount);
  if (!res.ok) { toast(res.msg, 'error'); return; }
  toast(res.cleared ? `Loan cleared — ${fmt$(res.paid)} paid.` : `${fmt$(res.paid)} paid off.`, 'success');
  updateHeader();
  renderTab('market');
}

function handleDonate(causeId) {
  const res = donateToCharity(causeId);
  if (!res.ok) { toast(res.msg, 'error'); return; }
  toast(`${fmt$(res.cost)} pledged to ${res.name}. Reputation now ${res.reputation}.`, 'success', 5000);
  updateHeader();
  renderTab('market');
}

function handleSignSponsor(sponsorId) {
  const result = signSponsor(sponsorId);
  if (!result.ok) { toast(result.msg, 'error'); return; }
  const d = SPONSOR_DEALS.find(s => s.id === sponsorId);
  toast(`Signed deal with ${d?.name}!`, 'success');
  renderTab('market');
}

function handleDropSponsor(sponsorId) {
  const d = SPONSOR_DEALS.find(s => s.id === sponsorId);
  if (!confirm(`Drop ${d?.name}?`)) return;
  dropSponsor(sponsorId);
  toast('Sponsor deal dropped.', 'info');
  renderTab('market');
}

// ─── Race Weekend ─────────────────────────────────────────────
// Cars with nobody in them simply sit the race out — that is not an error.
// Returns { error } if the team genuinely cannot enter, plus { idle } listing
// any car being left at home so we can say so.
function validateRaceEntry(playerCarId) {
  if (!game.cars || game.cars.length === 0) {
    return { error: 'No car — you must buy a car before you can race.' };
  }
  if (game.driverMode === 'hired') return { error: null, idle: [] };

  const idle = game.cars.filter(c =>
    c.id !== playerCarId && !hireForCar(c.id)
  );
  // Only a problem if it leaves nobody at all on the grid
  if (idle.length === game.cars.length) {
    return { error: 'No driver available — assign yourself or hire a driver before racing.' };
  }
  return { error: null, idle };
}

// Cars that will actually take the green: yours plus any with a hired driver
function enteredCars(playerCarId) {
  return game.cars.filter(c => c.id === playerCarId || hireForCar(c.id));
}

// Tell the player which cars are staying home, without blocking them
function noteIdleCars(idle) {
  if (!idle || !idle.length) return;
  const names = idle.map(c => `#${c.number || 1} ${c.name}`).join(', ');
  toast(`${names} ${idle.length === 1 ? 'has' : 'have'} no driver and will not be entered.`, 'warning', 5000);
}

function handleStartRace() {
  const race   = currentRace();
  const series = SERIES[game.currentSeries];
  const isHiredMode = game.driverMode === 'hired';

  // Determine which car the player is driving
  let playerCarId = null;
  if (game.driverMode === 'driver') {
    const radioSelected = document.querySelector('input[name="drive-car"]:checked');
    playerCarId = radioSelected?.value
      || (game.cars.find(c => c.assignedDriverId === 'player') || game.cars[0])?.id;
    game.cars.forEach(c => {
      if (c.id === playerCarId) c.assignedDriverId = 'player';
      else if (c.assignedDriverId === 'player') c.assignedDriverId = null;
    });
  }

  // Cars without a driver just sit this one out
  const check = validateRaceEntry(playerCarId);
  if (check.error) { toast(check.error, 'error', 6000); return; }
  noteIdleCars(check.idle);

  // Entry fee is charged per car actually entered, not per car owned
  const entryFee = series.entryFee * Math.max(1, enteredCars(playerCarId).length);
  if (game.money < entryFee) {
    toast(`Not enough money for entry fee (${fmt$(entryFee)}).`, 'error');
    return;
  }
  game.money -= entryFee;

  // Player power based on their car + skill
  const pCar = game.cars.find(c => c.assignedDriverId === 'player') || game.cars[0];
  const carScore  = pCar ? (pCar.speed + pCar.handling + pCar.reliability) / 300 : 0.5;
  const playerPower = clamp(carScore * 0.65 + game.playerSkill / 100 * 0.35, 0.3, 0.95);

  // Build AI entry list for 3D race
  const aiEntries = [];
  const usedNums  = new Set([pCar?.number || 1]);
  const usedNames = new Set([game.driverName || game.teamName]);

  const nextNum = (preferred) => {
    let n = preferred;
    if (!n || usedNums.has(n)) { do { n = randInt(2, 99); } while (usedNums.has(n)); }
    usedNums.add(n);
    return n;
  };
  // Drivers are people — always show a human name in the race, never a team word.
  const nextDriverName = (preferred) => {
    if (preferred && !usedNames.has(preferred)) { usedNames.add(preferred); return preferred; }
    const free = AI_DRIVER_NAMES.filter(n => !usedNames.has(n));
    const nm = free.length ? pick(free) : `${pick(AI_DRIVER_NAMES).split(' ')[1]} #${usedNames.size}`;
    usedNames.add(nm);
    return nm;
  };

  // Player's own teammate cars (other cars in game.cars not driven by player)
  game.cars.forEach(car => {
    if (car.id === pCar?.id) return; // skip the car the player is driving
    const hired = hireForCar(car.id);
    if (!hired) return;                    // nobody in it — stays in the garage
    const hiredName = HIREABLE_DRIVERS.find(d => d.id === hired.driverId)?.name;
    if (!car.driverName) car.driverName = nextDriverName();
    // Teammate pace reflects both the car and how good the driver has become
    const carScore = (car.speed + car.handling + car.reliability) / 300;
    const skill    = hired ? hiredDriverSkill(hired) / 100 : 0.5;
    aiEntries.push({
      name:       nextDriverName(hiredName || car.driverName),
      color:      car.color || pCar?.color || '#e8001d',
      number:     nextNum(car.number),
      power:      clamp(carScore * 0.68 + skill * 0.27, 0.25, 0.95),
      isTeammate: true,
      carId:      car.id,          // lets the 3D result map back to this car
    });
  });

  game.season.aiTeams.forEach(team => {
    team.cars.forEach(car => {
      if (isHiredMode && team.id === game.hiredTeamId) return;
      aiEntries.push({
        name:   nextDriverName(car.driverName),
        color:  car.color || team.color,
        number: nextNum(car.number),
        power:  clamp(car.power * (car.condition / 100), 0.25, 0.95),
      });
    });
  });
  // Pad with generic backmarkers to fill field
  while (aiEntries.length < series.fieldSize - 1) {
    const tmpl = pick(AI_TEAM_TEMPLATES);
    aiEntries.push({ name: nextDriverName(), color: tmpl.color, number: nextNum(), power: rand(0.28, 0.48) });
  }

  // Switch to race screen and launch 3D
  showScreen('game-race');

  launch3DRace(
    {
      playerColor:  pCar?.color  || '#e8001d',
      playerNumber: pCar?.number || 1,
      playerPower,
      playerName:   game.driverName || game.teamName,
      playerCarId,
      fieldSize:    series.fieldSize,
      difficulty:   game.difficulty || DEFAULT_DIFFICULTY,
      qualifyBoost: analystCount(),   // Data Analysts sharpen the grid draw
      aiEntries:    aiEntries.slice(0, series.fieldSize - 1),
    },
    (playerPosition, trackOrder) => {
      // 3D race complete — playerPosition is 1-indexed finish position
      // Run background sim to get AI standings (player result will be overridden)
      const simResult = simulateRace({ playerCarId, trackId: race.trackId, isHiredMode });

      // Your team-mates raced on track alongside you, so their real finishing
      // order has to carry over too — otherwise the car you pushed to the win
      // shows up somewhere else entirely in the results.
      // The FULL on-track order, every car — not just ours. Filtering this to
      // our own cars made the merge treat those few entries as the whole
      // field, handing them the top positions regardless of where they really
      // finished.
      const teamOrder = trackOrder || [];

      // Slot the player's real 3D finish into the field, shifting everyone
      // else so every position stays unique.
      const stub = {
        entrantId:   'player',
        carId:       playerCarId,
        displayName: `${game.teamName} / ${game.driverName || 'You'}`,
        teamName:    game.teamName,
        teamColor:   pCar?.color || '#e8001d',
        isPlayer:    true,
        dnf:         false,
        position:    playerPosition,
      };
      const merged     = simResult.results.map(r => (r.isPlayer ? stub : r));
      const allResults = reRankWithTeamOrder(merged, playerPosition, teamOrder);
      const pr         = allResults.find(r => r.isPlayer);
      const prize      = pr.prize;
      const pts        = pr.points;

      applyRaceResults(allResults);

      // Persist race state
      race.status       = 'completed';
      race.playerResult = pr;
      race.playerPoints = pts;
      race.earnings     = prize;

      postRaceUpdate(pr, prize, allResults);
      saveGame();

      // Show results modal over the now-blank race screen
      showScreen('game');
      document.body.insertAdjacentHTML('beforeend',
        renderRaceResultsModal(allResults, [], pr)
      );
    }
  );
}

// ─── Simulate Race (instant, no 3D) ───────────────────────────
function handleSimulateRace() {
  const race   = currentRace();
  const series = SERIES[game.currentSeries];
  if (!race) return;

  // Determine player car
  let playerCarId = null;
  if (game.driverMode === 'driver') {
    const radioSelected = document.querySelector('input[name="drive-car"]:checked');
    playerCarId = radioSelected?.value
      || (game.cars.find(c => c.assignedDriverId === 'player') || game.cars[0])?.id;
    game.cars.forEach(c => {
      if (c.id === playerCarId) c.assignedDriverId = 'player';
      else if (c.assignedDriverId === 'player') c.assignedDriverId = null;
    });
  }

  const check = validateRaceEntry(playerCarId);
  if (check.error) { toast(check.error, 'error', 6000); return; }
  noteIdleCars(check.idle);

  // Deduct entry fee — only for cars actually entered
  const entryFee = series.entryFee * Math.max(1, enteredCars(playerCarId).length);
  if (game.money < entryFee) {
    toast(`Not enough money for entry fee (${fmt$(entryFee)}).`, 'error');
    return;
  }
  game.money -= entryFee;

  // Run full simulation
  const simResult = simulateRace({ playerCarId, trackId: race.trackId, isHiredMode: game.driverMode === 'hired' });
  const pr = simResult.playerResult;
  if (!pr) { toast('Simulation error.', 'error'); return; }

  applyRaceResults(simResult.results);
  race.status       = 'completed';
  race.playerResult = pr;
  race.playerPoints = pr.points;
  race.earnings     = pr.prize;
  postRaceUpdate(pr, pr.prize, simResult.results);
  saveGame();

  showScreen('game');
  document.body.insertAdjacentHTML('beforeend',
    renderRaceResultsModal(
      simResult.results.sort((a, b) => a.position - b.position),
      simResult.events,
      pr
    )
  );
}

// ─── Kept for potential future use (unused with 3D mode) ──────
function handleRaceSkipToEnd() {}
function handleRaceSpeed() {}

// ─── (Legacy playback removed — replaced by 3D race) ─────────
function startRacePlayback(results, events, playerResult) {
  // no-op placeholder
  setPhaseLabel('start');
  scheduleNextEvent();
}

function scheduleNextEvent() {
  if (racePlayback.skipRequested) { finishRacePlayback(); return; }
  const delay = racePlayback.speed === 1 ? 900 : 350;
  racePlayback.timer = setTimeout(showNextEvent, delay);
}

function showNextEvent() {
  const { events, step } = racePlayback;
  if (step >= events.length) {
    finishRacePlayback();
    return;
  }

  const evt = events[step];
  racePlayback.step++;

  // Update phase label
  if (evt.phase) setPhaseLabel(evt.phase);

  // Add event to log
  const log = document.getElementById('race-events');
  if (log) {
    const el = document.createElement('div');
    el.className = `race-event evt-${evt.type} ${evt.isPlayer ? 'evt-player' : ''}`;
    el.textContent = evt.text;
    log.prepend(el);
    // Limit to 15 entries
    while (log.children.length > 15) log.removeChild(log.lastChild);
  }

  // Refresh leaderboard every few events
  if (racePlayback.step % 3 === 0) {
    const lb = document.getElementById('race-leaderboard');
    if (lb) lb.innerHTML = renderLeaderboard(racePlayback.results, true);
  }

  scheduleNextEvent();
}

function setPhaseLabel(phase) {
  const el = document.getElementById('race-phase-label');
  if (el) el.textContent = PHASE_LABELS[phase] || phase;
}

function finishRacePlayback() {
  if (racePlayback.timer) clearTimeout(racePlayback.timer);

  const lb = document.getElementById('race-leaderboard');
  if (lb) lb.innerHTML = renderLeaderboard(racePlayback.results, true);
  setPhaseLabel('finish');

  const log = document.getElementById('race-events');
  if (log) {
    const el = document.createElement('div');
    el.className = 'race-event evt-finish';
    el.textContent = 'Checkered flag — race complete.';
    log.prepend(el);
  }

  // Show results modal after short delay
  setTimeout(() => {
    document.body.insertAdjacentHTML('beforeend',
      renderRaceResultsModal(racePlayback.results, racePlayback.events, racePlayback.playerResult)
    );
  }, 800);
}

// ─── Save reminder ────────────────────────────────────────────
// Auto-save only runs once a slot is bound, so nag (gently) while a career is
// unsaved: after the first race, then every few races after that.
function checkSaveReminder() {
  if (!game) return;
  if (currentSlot !== null && currentSlot !== undefined) return;   // already saving
  const done = game.season.calendar.filter(r => r.status === 'completed').length;
  if (done === 0) return;
  const last = game._lastSaveNag || 0;
  if (done === 1 || done - last >= 3) {
    game._lastSaveNag = done;
    setTimeout(() => showSaveReminder(done), 1400);
  }
}

function showSaveReminder(racesDone) {
  if (document.getElementById('save-reminder')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay" id="save-reminder">
      <div class="modal">
        <div class="modal-header"><h3>Save Your Career</h3></div>
        <div class="modal-body">
          <p>You have run ${racesDone} race${racesDone === 1 ? '' : 's'} and this career has not been saved yet.
             Pick a slot and the game will keep saving there automatically.</p>
          <p class="muted-text small">Nothing is written to a save slot until you choose one, so closing the tab now would lose this career.</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="dismissSaveReminder()">Later</button>
          <button class="btn btn-primary" onclick="dismissSaveReminder(); handleSaveGame();">Choose Slot</button>
        </div>
      </div>
    </div>`);
}

function dismissSaveReminder() {
  document.getElementById('save-reminder')?.remove();
}

// Surface what happened off-track during the race weekend
function reportLoanNotes() {
  const notes = [
    ...(game.lastDriverNotes || []).map(t => ({ t, type: 'success' })),
    ...(game.lastLoanNotes   || []).map(t => ({ t, type: t.includes('overdue') ? 'error' : 'info' })),
  ];
  notes.forEach((n, i) => setTimeout(() => toast(n.t, n.type, 6000), 400 + i * 600));
  game.lastDriverNotes = [];
  game.lastLoanNotes   = [];
}

function handleCloseResults() {
  document.getElementById('results-modal')?.remove();
  showScreen('game');
  updateHeader();
  renderTab('dashboard');
  reportLoanNotes();
  checkSaveReminder();     // back in the lobby — nudge if nothing is saved
}

// ─── Premier Cup Series career choice ────────────────────────────────
function showPremierChoiceModal() {
  document.body.insertAdjacentHTML('beforeend', renderPremierChoiceModal());
}

function selectCareerChoice(path) {
  selectedCareerPath = path;
  document.querySelectorAll('.career-card').forEach(c => c.classList.remove('selected'));
  document.querySelector(`.career-card[onclick*="${path}"]`)?.classList.add('selected');
  document.getElementById('btn-confirm-career').disabled = false;

  const hiredSection = document.getElementById('hired-team-select');
  if (path === 'hired') {
    hiredSection?.classList.remove('hidden');
  } else {
    hiredSection?.classList.add('hidden');
  }
}

function confirmCareerChoice() {
  if (!selectedCareerPath) return;
  let aiTeamId = null;
  if (selectedCareerPath === 'hired') {
    aiTeamId = document.getElementById('select-ai-team')?.value;
    if (!aiTeamId) { toast('Select a team.', 'warning'); return; }
  }
  chooseCareerPath(selectedCareerPath, aiTeamId);
  document.getElementById('premier-choice-modal')?.remove();
  toast('Career path set! Good luck in the Premier Cup Series.', 'success');
  updateHeader();
  renderTab('dashboard');
}

// ─── Settings / save ─────────────────────────────────────────
function handleSaveGame() {
  showSaveModal();
}

function showSaveModal() {
  document.body.insertAdjacentHTML('beforeend', renderSaveModal());
}

function showLoadModal() {
  document.body.insertAdjacentHTML('beforeend', renderLoadModal());
}

function handleSaveToSlot(slot) {
  saveToSlot(slot);
  document.getElementById('save-slot-modal')?.remove();
  toast(`Saved to Slot ${slot + 1}!`, 'success');
}

function handleLoadFromSlot(slot) {
  if (loadFromSlot(slot)) {
    document.getElementById('save-slot-modal')?.remove();
    enterGame();
  } else {
    toast('Could not load save.', 'error');
  }
}

function handleDeleteSlot(slot) {
  if (!confirm(`Delete save in Slot ${slot + 1}?`)) return;
  deleteSlot(slot);
  document.getElementById('save-slot-modal')?.remove();
  showLoadModal();
}

function closeSaveModal() {
  document.getElementById('save-slot-modal')?.remove();
}

function handleNewGamePrompt() {
  if (!confirm('Start a new game? All current progress will be lost.')) return;
  deleteSave();
  location.reload();
}

// Keyboard shortcut: S to save
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    handleSaveGame();
  }
});
`````

---

END OF SOURCE SNAPSHOT
