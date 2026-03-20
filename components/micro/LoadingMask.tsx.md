# `components/micro/LoadingMask.tsx`

## Purpose

A minimal absolute-positioned loading overlay for use inside a `relative` container. Renders a semi-transparent backdrop over sibling content while a re-fetch is in progress.

Distinct from `LoadingOverlay`, which is a `fixed` full-screen overlay with a spinner and panel box. `LoadingMask` is lightweight: no spinner, no panel — just a text message centered over the nearest `relative` ancestor.

## Props

```ts
interface LoadingMaskProps {
  readonly message?: string; // default: "Loading…"
}
```

## Behavior

- Renders a `div` with `absolute inset-0` that covers its nearest `relative` ancestor.
- Displays the `message` text using `<Paragraph variant="placeholder">`.
- `data-testid="loading-mask"` for testability.

## Usage

Wrap the content to be masked in a `relative` container and conditionally render `<LoadingMask>`:

```tsx
<div className="relative">
  <SomeContent />
  {loading && <LoadingMask />}
</div>
```

## Usages

- `ZernikeTermsModal.tsx` — overlaid on the Zernike terms table during re-fetches (when `loading && data`).
