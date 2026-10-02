/**
 * Jest mock for the `@deck.gl/core` coordinate-system constants and view constructors.
 *
 * @remarks
 * - Exposes `COORDINATE_SYSTEM.CARTESIAN` for analysis chart layer configuration.
 * - Provides a constructible `OrthographicView` class that preserves constructor `props` and derives `id` from `props.id` when present.
 * - Supports deck.gl-backed analysis chart tests that render real Diffraction PSF, Wavefront Map, and Geometric PSF components without per-test browser or layer shims.
 */

export const COORDINATE_SYSTEM = {
  CARTESIAN: "cartesian",
} as const;

/**
 * Base class for mocked deck.gl layer and view constructors.
 *
 * @remarks
 * Stores the constructor `props` verbatim and derives `id` from `props.id` when present.
 */
export class MockDeckConstructible {
  readonly id: string | undefined;
  readonly props: unknown;

  constructor(props: unknown) {
    this.props = props;
    this.id =
      typeof props === "object" && props !== null && "id" in props
        ? String(props.id)
        : undefined;
  }
}

export class OrthographicView extends MockDeckConstructible {}
