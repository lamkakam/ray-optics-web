/**
Shared Jest setup for the jsdom test environment.

- Registers `@testing-library/jest-dom` matchers.
- Installs Node `TextDecoder` and `TextEncoder` on `global` for browser-oriented code paths.
- Provides a minimal `ResizeObserver` test double for responsive chart components.
- Provides a configurable, writable `ImageData` test double that stores `data`, `width`, and `height` so deck.gl bitmap-backed analysis charts can construct browser image payloads in jsdom.
- Provides a writable `window.matchMedia` test double with listener and dispatch methods backed by Jest mocks.
*/
import "@testing-library/jest-dom";
import { TextDecoder, TextEncoder } from "util";

global.TextDecoder = TextDecoder as typeof global.TextDecoder;
global.TextEncoder = TextEncoder as typeof global.TextEncoder;

// Mock ResizeObserver (not available in jsdom, required by @visx/responsive)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock ImageData (not available in jsdom, required by deck.gl bitmap charts)
class MockImageData {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;

  constructor(data: Uint8ClampedArray, width: number, height: number) {
    this.data = data;
    this.width = width;
    this.height = height;
  }
}

Object.defineProperty(globalThis, "ImageData", {
  configurable: true,
  writable: true,
  value: MockImageData,
});

// Mock window.matchMedia for jsdom (not implemented by default)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }),
});
