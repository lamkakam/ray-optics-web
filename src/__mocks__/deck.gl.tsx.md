# `__mocks__/deck.gl.tsx`

Jest mock for deck.gl React integration and layer/view constructors.

- Exposes `COORDINATE_SYSTEM.CARTESIAN` for analysis chart layer configuration.
- Renders `DeckGL` as a simple `<div data-testid="deck-gl">` wrapper while preserving children.
- Provides constructible `GridLayer`, `BitmapLayer`, and `ScatterplotLayer` classes that preserve constructor `props` and derive `id` from `props.id` when present.
- Provides a constructible `OrthographicView` class with the same stored `props` and derived `id` shape.
- Supports deck.gl-backed analysis chart tests that render real Diffraction PSF, Wavefront Map, and Geometric PSF components without per-test browser or layer shims.
