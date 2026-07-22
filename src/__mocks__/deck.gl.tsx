/**
Jest mock for deck.gl React integration and layer/view constructors.

- Exposes `COORDINATE_SYSTEM.CARTESIAN` for analysis chart layer configuration.
- Renders `DeckGL` as a simple `<div data-testid="deck-gl">` wrapper while preserving children.
- Provides constructible `GridLayer`, `BitmapLayer`, and `ScatterplotLayer` classes that preserve constructor `props` and derive `id` from `props.id` when present.
- Provides a constructible `OrthographicView` class with the same stored `props` and derived `id` shape.
- Supports deck.gl-backed analysis chart tests that render real Diffraction PSF, Wavefront Map, and Geometric PSF components without per-test browser or layer shims.
*/
import type { ReactNode } from "react";

export const COORDINATE_SYSTEM = {
  CARTESIAN: "cartesian",
} as const;

interface DeckGLMockProps {
  readonly children?: ReactNode;
}

export function DeckGL({ children }: DeckGLMockProps) {
  return <div data-testid="deck-gl">{children}</div>;
}

class MockDeckConstructible {
  readonly id: string | undefined;
  readonly props: unknown;

  constructor(props: unknown) {
    this.props = props;
    this.id = typeof props === "object" && props !== null && "id" in props
      ? String(props.id)
      : undefined;
  }
}

export class GridLayer<TData> extends MockDeckConstructible {}

export class BitmapLayer<TData> extends MockDeckConstructible {}

export class ScatterplotLayer<TData> extends MockDeckConstructible {}

export class OrthographicView extends MockDeckConstructible {}
