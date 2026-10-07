# Interface terminology

- **Career**: the player's team, season, cars, and progress. Use this instead of "game" in save and load controls.
- **Save slot**: one of five career saves in this browser. Saving to an occupied slot replaces its career.
- **Race Weekend**: the official event entry screen. Entry fees are charged per entered car.
- **Drive Race**: drive the existing 3D sprint. Its result counts toward the career.
- **Simulate Race**: generate an instant official result.
- **Practice**: the tutorial sprint, which does not change career progress.
- **Signing fee**: an upfront hiring charge equal to four times the listed weekly salary. It is not prepaid salary.
- **End Deal**: stop a sponsor's payouts. **Release Staff**: remove a staff member.

## Current behavior to describe accurately

The header's New Career action deletes the active career's bound save slot before returning to the opening screen. Its confirmation must explicitly name that deletion.

The budget and event updates use the same payroll calculation: support-staff wages plus all hired-driver wages. Payroll is charged once per completed or skipped event, even when a hired driver's car does not race. Signing fees remain separate upfront charges.

Explicit saving must report success only when saveToSlot succeeds. On failure, keep the save dialog open and retain the previous slot binding.
