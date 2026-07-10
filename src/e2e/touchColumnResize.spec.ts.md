# `e2e/touchColumnResize.spec.ts`

## Purpose

Verifies that a real AG Grid column resize handle responds to a touchscreen pointer drag.

## Coverage

- Creates a touch-enabled Chromium browser context.
- Opens the Lens Editor prescription grid and drags the resizable `Surface` header handle with touch pointer events.
- Asserts that the rendered header width increases after the drag.
