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

export class GridLayer<TData> {
  readonly id: string | undefined;
  readonly props: unknown;

  constructor(props: unknown) {
    this.props = props;
    this.id = typeof props === "object" && props !== null && "id" in props
      ? String(props.id)
      : undefined;
  }
}

export class OrthographicView {
  readonly id: string | undefined;
  readonly props: unknown;

  constructor(props: unknown) {
    this.props = props;
    this.id = typeof props === "object" && props !== null && "id" in props
      ? String(props.id)
      : undefined;
  }
}
