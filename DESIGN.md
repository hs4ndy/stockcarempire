---
name: Stock Car Empire
description: A precise sports career interface with red actions and a charcoal broadcast HUD.
colors:
  bg: "#131517"
  panel: "#1e2124"
  panel-2: "#282c30"
  panel-3: "#363b40"
  line: "#393e43"
  line-2: "#60676e"
  text: "#f5f5f2"
  text-dim: "#c1c5c8"
  text-mute: "#a9b0b6"
  accent: "#f04458"
  accent-solid: "#c91f39"
  accent-press: "#b61931"
  accent-ink: "#fff"
  danger-text: "#ff8795"
  good: "#8adeb0"
  warn: "#f0ce83"
  focus: "#b9e7ff"
typography:
  display:
    fontFamily: "'Barlow Condensed', 'Arial Narrow', Barlow, 'Helvetica Neue', Arial, system-ui, sans-serif"
    fontSize: "clamp(64px, 7.3vw, 96px)"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "-.025em"
  headline:
    fontFamily: "'Barlow Condensed', 'Arial Narrow', Barlow, 'Helvetica Neue', Arial, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-.01em"
  title:
    fontFamily: "Barlow, 'Helvetica Neue', Arial, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Barlow, 'Helvetica Neue', Arial, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Barlow, 'Helvetica Neue', Arial, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
  action:
    fontFamily: "Barlow, 'Helvetica Neue', Arial, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.35
  statistic:
    fontFamily: "'Barlow Condensed', 'Arial Narrow', Barlow, 'Helvetica Neue', Arial, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.05
rounded:
  field: "4px"
  navigation: "5px"
  control: "6px"
  surface: "8px"
spacing:
  space-1: "4px"
  space-2: "8px"
  space-3: "12px"
  space-4: "16px"
  space-5: "24px"
  space-6: "32px"
  space-7: "48px"
components:
  button-primary:
    backgroundColor: "{colors.accent-solid}"
    textColor: "{colors.accent-ink}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.accent-press}"
    textColor: "{colors.accent-ink}"
  button-secondary:
    backgroundColor: "{colors.panel-2}"
    textColor: "{colors.text}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "10px 20px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-dim}"
    rounded: "{rounded.control}"
    padding: "10px 20px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.danger-text}"
    rounded: "{rounded.control}"
    padding: "10px 20px"
  button-warning:
    backgroundColor: "transparent"
    textColor: "{colors.warn}"
    rounded: "{rounded.control}"
    padding: "10px 20px"
  field:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.text}"
    rounded: "{rounded.field}"
    padding: "12px 14px"
  navigation-active:
    backgroundColor: "{colors.text}"
    textColor: "{colors.bg}"
    rounded: "{rounded.navigation}"
    padding: "8px 18px"
    height: "42px"
  badge:
    backgroundColor: "{colors.panel-3}"
    textColor: "{colors.text-dim}"
    rounded: "{rounded.field}"
    padding: "4px 8px"
  card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.surface}"
    padding: "24px"
---

# Design System: Stock Car Empire

## Overview

**Creative North Star: "The Sports Career Hub"**

The user-selected FC25/26 sports presentation becomes a charcoal career interface with clear names, compact data rows, and decisive red actions. Barlow Condensed gives major titles and numbers a sporting presence; Barlow keeps decisions, costs, and supporting copy readable.

The same materials carry into racing: opaque graphite broadcast panels frame telemetry and running order while the road remains visible. Management surfaces use tonal separation and restrained corners; selection is off-white, and status colors retain functional meaning.

**Key Characteristics:**

- Charcoal surfaces with a limited graphite tone ramp.
- Red progression actions and off-white active selections.
- Condensed display type paired with readable Barlow text.
- Compact name-first rows with aligned numerical data.
- Shared controls across management, tutorials, dialogs, and racing.

Source basis: `style.css`, bundled faces in `assets/fonts/fonts.css`, `index.html`, and rendered component templates in `js/ui.js`, `js/tutorial.js`, and `js/race3d.js`. The approved direction is recorded in `.impeccable/surfaces/index-html.md`; this document describes the implemented system, not a pixel-matched approved comp.

## Colors

Bright text and functional red sit on dark charcoal, with graphite layers separating groups.

### Primary

- **Action Red** (`accent-solid`): filled progression actions, selection highlight, and the player's running-order row.
- **Signal Red** (`accent`): progress fill, warnings, and interactive text highlights.
- **Pressed Red** (`accent-press`): primary action hover state.
- **Action White** (`accent-ink`): text on red actions.

### Secondary

- **Positive Mint** (`good`): condition, draft strength, improvement, and positive financial values.
- **Caution Sand** (`warn`): costs requiring attention, podiums, championships, and warnings.
- **Danger Rose** (`danger-text`): destructive controls, failures, and negative states.
- **Focus Ice** (`focus`): keyboard focus, field focus, and tutorial spotlight perimeter.

### Neutral

- **Career Charcoal** (`bg`): page and shell background, field interiors.
- **Broadcast Graphite** (`panel`): cards, dialogs, tutorial panels, HUD containers.
- **Raised Graphite** (`panel-2`): grouped actions, prominent event surfaces, row headers.
- **Selected Graphite** (`panel-3`): player row emphasis, meter tracks, badges, toasts.
- **Soft Divider** (`line`): row and shell separators.
- **Control Stroke** (`line-2`): controls, fields, and stronger separators.
- **Off-white Selection** (`text`): primary content and active selection backgrounds.
- **Supporting Silver** (`text-dim`): descriptions and secondary data.
- **Quiet Silver** (`text-mute`): tertiary labels and contextual metadata.

### Named Rules

**The Action and Selection Rule.** Red advances an action; off-white identifies the active navigation or selected option. Status colors communicate outcomes and conditions.

## Typography

**Display Font:** Barlow Condensed with Arial Narrow and the body stack as fallbacks.

**Body Font:** Barlow with Helvetica Neue, Arial, system-ui, and sans-serif fallbacks.

Bundled Barlow faces cover weights 400–800; Barlow Condensed covers 600–800. The bundled fonts are the identity, including offline releases. There is no distinct monospace UI family.

### Hierarchy

- **Display:** the frontmatter display role belongs to the Empire wordmark. Championship and race-win titles use the same family at (800, 56px, .95), reducing to (44px) on small screens.
- **Headline:** page headings use the frontmatter headline role, reducing to (34px) at the small-screen breakpoint. Event and track names use (700, 44px, 1.05).
- **Title:** card headings use the frontmatter title role. Dialog and tutorial titles use condensed type at (700, 30px, 1.1).
- **Statistic:** condensed status-strip numerals use the frontmatter statistic role; other statistical roles use (28–32px). Race position and speed use condensed display numerals with tabular figures.
- **Body:** global copy uses the frontmatter body role. Data rows and supporting sections use (14–15px); longer section copy is bounded to (65ch).
- **Label:** field labels use the frontmatter label role. Supporting HUD labels use Barlow at (13px); practice guidance and pause controls use (14px). Badges use (12px, 600, 1.4).

### Named Rules

**The Two Voices Rule.** Use condensed type for major headings and prominent numbers; use Barlow for names, decisions, costs, and explanatory copy.

**The Aligned Figures Rule.** Keep statistical numbers tabular and trailing numerical columns aligned; let names wrap where management layouts support it.

## Layout

The career shell has a sticky (80px) header with sticky horizontally scrollable navigation beneath it. Content is centered within (1320px), with (32px) desktop side padding. Common two-column layouts use equal columns and (24px) gaps; garage cards auto-fit around a (360px) minimum. Cards use (24px) internal spacing, reducing to (20px) at intermediate widths. The spacing tokens are a reused (4/8/12/16/24/32/48px) rhythm.

The header contains the brand and save/new-career actions; career telemetry belongs in the relevant page rather than the shell. At (1040px), side padding tightens. At (800px), general two-column management layouts stack. At (640px), the header becomes (72px), main padding becomes (16px) horizontally, dashboard panels stack, and secondary standings columns disappear while names, position, and points remain. At (420px), difficulty cards become one column. Active navigation scrolls into view when a tab changes.

Dialogs retain bounded headers and footers with an independently scrolling body. Team Management uses Drivers and Support Staff view controls with off-white active selections. The chosen roster sits beside recruitment in (.85fr/1.5fr) columns, stacking at (800px). Recruitment lists have a stable scrollbar gutter, visible counts and scroll hints, and bounded vertical scrolling. Wide-layout recruitment height follows (`clamp(240px, calc(100svh - 510px), 560px)`); stacked layouts use (500px). Names, signing fees/salaries, and actions align in columns; at (640px), names span the row above costs and actions. Driver development is a native disclosure. Career history statistics auto-fit around a (90px) minimum; Last Season shows Championship Finish, Wins, and Cash Earned, with non-wrapping numeric values. This is a local history pattern, not a universal no-wrap requirement for all finance values.

The race HUD uses edge-mounted telemetry and running order with a centered mirror. At (1040px), the minimap disappears; at (860px), side panels narrow; at (680px), running order disappears and telemetry becomes a bottom bar; at (520px), mirror width is constrained around the pause control. A (620px) height breakpoint shortens the mirror and running order. Mirror viewport bounds are renderer inputs: its caption sits outside that wrapper.

## Elevation & Depth

Resting surfaces are flat: contrast between charcoal and graphite supplies depth, with thin separators organizing rows and fields. There are no ambient card shadows. Dialog and pause overlays use dark scrims, while the tutorial uses a surrounding spotlight mask. The HUD distance caption has a small text shadow for contrast against the road.

### Shadow Vocabulary

- **Tutorial Mask:** (`0 0 0 200vmax rgba(0,0,0,.5)`) dims everything around the target; it is not a surface elevation shadow.
- **Road Caption:** (`0 1px 4px #000`) protects the distance label over the rendered scene.

### Named Rules

**The Tonal Depth Rule.** Separate resting surfaces by graphite tone and functional dividers. Keep masking and scene-caption shadows attached to their specific readability purpose.

## Shapes

Restrained rounding defines the system: fields, badges, and inset rows use the field radius; navigation uses its own radius; controls and HUD containers use the control radius; cards and dialogs use the surface radius. Borders are generally (1px), with a (3px) keyboard focus outline offset by (3px). Color swatches use (2px) selection borders. Circular minimap dots and narrow car-color markers are functional exceptions, not a separate decorative shape system.

## Components

### Buttons

Direct, readable controls. Standard buttons use the action typography, control radius, and primary/secondary/ghost/danger/warning tokens above. Minimum standard target height is (44px); large actions use (52px). Secondary and ghost controls hover to off-white with charcoal text; destructive and caution controls invert to their semantic fill. Disabled controls use raised graphite, a soft divider, and quiet silver. Keyboard focus retains the shared ice outline.

Color, background, and border transitions use (180ms). Start-screen controls are larger full-width choices, with (60px) minimum height and (19px) text.

### Chips

Compact status badges use graphite fill and the field radius. Positive, caution, and negative badge text uses the semantic color; badges are status labels rather than invented icon glyphs.

### Cards / Containers

Graphite groups with surface rounding and no resting shadow. Raised graphite highlights important groups. Data rows separate with thin dividers; name columns receive flexible space while numerical columns remain aligned. Player rows use the brighter graphite layer rather than another decorative color.

### Inputs / Fields

Charcoal interiors, control strokes, field rounding, and (48px) minimum height. Text fields and selects use (16px) reading text and (12px 14px) padding. Placeholder copy uses quiet silver. Field focus changes the stroke to ice and preserves the keyboard outline. Radio buttons use the action red accent.

### Navigation

Horizontal Barlow labels with graphite hover and off-white active state. Desktop navigation height is (42px); small screens use (44px). Tabs remain scrollable, and active selections are revealed programmatically.

### Selection Tiles

Difficulty and career choices group name and description in one clickable graphite tile. Off-white fill with charcoal text identifies a selected choice; supporting selected descriptions darken for contrast. Difficulty tiles use (20px) padding, a control radius, and a (116px) desktop minimum height.

### Native Disclosures

Budget, recent results, car details, and other secondary detail use native disclosure controls. A divided summary row shows readable Show/Hide state; expanded content follows the same text and row grammar.

### Dialogs and Tutorial

Graphite dialogs use the same controls and condensed heading roles. Standard dialogs cap at (560px), wide variants at (760px). Tutorial panels use a bounded scrolling graphite container, an ice spotlight, body copy, and recurring action buttons. Toasts use selected graphite and a semantic border with an opacity transition.

### Broadcast Telemetry

Opaque graphite panels share the control radius. Barlow supporting labels accompany condensed position and speed numerals; the player's order row is red. Draft and distance meters scale horizontally from the left, transitioning via transforms at (120ms linear) and (200ms linear), respectively. Reduced-motion preference collapses transition and animation durations and disables smooth scrolling.

## Do's and Don'ts

### Do:

- **Do** preserve the user-confirmed red identity and shared charcoal sports materials.
- **Do** use condensed type for major headings and prominent numerals, with Barlow for reading.
- **Do** keep names flexible, data figures aligned, and action labels readable.
- **Do** carry the shared focus treatment, meaningful disabled state, and bounded scrolling into new components.
- **Do** keep race HUD labels clear of mirror viewport bounds and central road content.

### Don't:

- **Don't** introduce decorative gradients or emoji into the shared interface.
- **Don't** add ambient shadows or hard offset shadows to the flat graphite surfaces.
- **Don't** turn factual series, season, status, or tutorial progress labels into decorative kickers or eyebrows.
- **Don't** replace bundled display fonts with a system display face.

Not canonized or repaired: legacy HUD literals matching palette colors, mixed legacy uppercase treatments, and the championship `champ-eyebrow` class name are implementation residue; only factual series/season context is described here. No decorative kicker rule is inherited. Pixel fit and final acceptance remain the finish review's responsibility.
