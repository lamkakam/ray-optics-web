/**
 * Jest mock for the `@deck.gl/layers` layer constructors used by analysis charts.
 *
 * @remarks
 * - Provides constructible `BitmapLayer` and `ScatterplotLayer` classes that preserve constructor `props` and derive `id` from `props.id` when present.
 * - Reuses the `MockDeckConstructible` base from the `@deck.gl/core` mock.
 */
import { MockDeckConstructible } from "@/__mocks__/@deck.gl/core";

export class BitmapLayer<_TData> extends MockDeckConstructible {}

export class ScatterplotLayer<_TData> extends MockDeckConstructible {}
