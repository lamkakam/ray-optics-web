/**
 * Jest mock for the `@deck.gl/react` `DeckGL` component.
 *
 * @remarks
 * Renders `DeckGL` as a simple `<div data-testid="deck-gl">` wrapper while preserving children, so analysis chart tests can render real chart components in jsdom.
 */
import type { ReactNode } from "react";

interface DeckGLMockProps {
  readonly children?: ReactNode;
}

export function DeckGL({ children }: DeckGLMockProps) {
  return <div data-testid="deck-gl">{children}</div>;
}
