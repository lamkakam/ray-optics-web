/** Contract tests for the app-wide glass catalog context and its required provider boundary. */

import { render, screen } from "@testing-library/react";
import {
  GlassCatalogProvider,
  type GlassCatalogContextValue,
  useGlassCatalogs,
} from "@/shared/components/providers/GlassCatalogProvider";

/** Creates a minimal loaded context value without starting a real catalog request. */
function makeValue(): GlassCatalogContextValue {
  return {
    catalogs: undefined,
    lookupMaps: undefined,
    error: undefined,
    isLoaded: true,
    isLoading: false,
    preload: jest.fn(async () => undefined),
  };
}

/** Renders identity-sensitive context state for provider and boundary assertions. */
function ContextReader({
  expected,
}: {
  readonly expected: GlassCatalogContextValue;
}) {
  const context = useGlassCatalogs();

  return (
    <output data-testid="catalog-context">
      {context === expected
        ? `${context.isLoaded}:${context.isLoading}`
        : "different"}
    </output>
  );
}

describe("GlassCatalogProvider", () => {
  it("provides the exact catalog context value to descendants", () => {
    const value = makeValue();

    render(
      <GlassCatalogProvider value={value}>
        <ContextReader expected={value} />
      </GlassCatalogProvider>,
    );

    expect(screen.getByTestId("catalog-context")).toHaveTextContent(
      "true:false",
    );
  });

  it("requires useGlassCatalogs to be called inside the provider", () => {
    expect(() => render(<ContextReader expected={makeValue()} />)).toThrow(
      "useGlassCatalogs must be used within a GlassCatalogProvider",
    );
  });
});
