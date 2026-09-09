/**
 * Verifies the browser-only application boundary forwards routed content to
 * the dynamically loaded application component.
 *
 * The dynamic import is represented by a test double that behaves like the
 * loaded application component. The assertion is intentionally about the
 * routed child reaching that component, not about the implementation's CSS or
 * internal React tree.
 */
import type React from "react";
import { render, screen } from "@testing-library/react";
import ClientOnlyApplication from "@/app/ClientOnlyApplication";

jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: (
    _loader: () => Promise<unknown>,
    _options: { readonly ssr?: boolean; readonly loading?: () => undefined },
  ) => {
    function DynamicallyLoadedApplication({ children }: { readonly children: React.ReactNode }) {
      return <div data-testid="dynamically-loaded-application">{children}</div>;
    }

    return DynamicallyLoadedApplication;
  },
}));

describe("ClientOnlyApplication", () => {
  it("passes routed children to the dynamically loaded application", () => {
    render(
      <ClientOnlyApplication>
        <p>Routed child</p>
      </ClientOnlyApplication>,
    );

    expect(screen.getByTestId("dynamically-loaded-application")).toContainElement(
      screen.getByText("Routed child"),
    );
  });
});
