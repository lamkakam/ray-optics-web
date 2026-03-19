# `lib/exampleSystems.ts`

## Purpose

Provides a catalogue of complete definitions covering a wide variety of optical designs, exported as a keyed record for use in the system-selector UI.

## Exports

```ts
const ExampleSystems: { [key: string]: OpticalModel };
```

Keys are of the form `"N: <name>"` where `N` is the 1-based index of the system in the list (e.g. `"1: Sasian Triplet"`).

## Edge Cases / Error Handling

- The record is plain data — no lazy loading. All 17 models are in memory at module init time.
- Keys are not guaranteed stable if new systems are inserted in the middle of `list`; the numeric prefix will shift. UI components should treat keys as opaque strings.
