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
