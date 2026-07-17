# `e2e/validateExampleSystems.spec.ts`

## Purpose

Playwright end-to-end coverage that validates every bundled example system through the same visible controls used by a person.

## Behavior

- Opens `/example-systems` and discovers the complete rendered example list from the accessible UI; it does not import or inspect `ExampleSystemList`.
- For each displayed example, selects it, applies it, confirms the overwrite dialog, and waits for the automatic lens-layout computation to settle.
- Opens the Lens Editor's Prescription tab, clicks `Update System`, and waits for the button's disabled/enabled transition to prove the update started and finished.
- Asserts that no error dialog is displayed and that the lens-layout diagram is visible.
- Uses the side navigation to return to Example Systems before testing the next displayed item.
- Allows up to 15 minutes for the full catalogue while retaining 60-second per-computation limits.
