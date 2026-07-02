# `jest.setup.ts`

Shared Jest setup for the jsdom test environment.

- Registers `@testing-library/jest-dom` matchers.
- Installs Node `TextDecoder` and `TextEncoder` on `global` for browser-oriented code paths.
- Provides a minimal `ResizeObserver` test double for responsive chart components.
- Provides a configurable, writable `ImageData` test double that stores `data`, `width`, and `height` so deck.gl bitmap-backed analysis charts can construct browser image payloads in jsdom.
- Provides a writable `window.matchMedia` test double with listener and dispatch methods backed by Jest mocks.
