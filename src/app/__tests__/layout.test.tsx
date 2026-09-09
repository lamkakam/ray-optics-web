/**
 * Verifies that the root layout keeps the interactive application behind a client-only boundary.
 *
 * @remarks
 * The routed child marker and application-shell marker must both be absent from
 * server-rendered HTML. Next.js may still render the document and client
 * bootstrap shell during static export, but it must not prerender the
 * interactive application tree.
 */
import type React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import RootLayout from "@/app/layout";

jest.mock("@/app/globals.css", () => ({}));

jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: (
    _loader: () => Promise<unknown>,
    options: { readonly ssr?: boolean },
  ) => {
    if (options.ssr !== false) {
      throw new Error("The application boundary must disable server rendering");
    }

    return function ClientOnlyDynamicComponent() {
      return undefined;
    };
  },
}));

jest.mock("@/app/AppShell", () => ({
  __esModule: true,
  default: ({ children }: { readonly children: React.ReactNode }) => (
    <main data-testid="server-rendered-app-shell">{children}</main>
  ),
}));

describe("RootLayout server rendering", () => {
  it("does not render the interactive application or routed content on the server", () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <section data-testid="server-rendered-route">Routed content</section>
      </RootLayout>,
    );

    expect(markup).not.toContain("server-rendered-app-shell");
    expect(markup).not.toContain("server-rendered-route");
    expect(markup).not.toContain("Routed content");
  });
});
