/**
 * @jest-environment node
 *
 * Server-render coverage for the theme provider's browser capability guard.
 */
import { renderToString } from "react-dom/server";
import { ThemeProvider, useTheme } from "@/shared/components/providers/ThemeProvider";

/** Reads the provider's SSR default without invoking browser persistence. */
function ThemeText() {
  return <span>{useTheme().theme}</span>;
}

describe("ThemeProvider server rendering", () => {
  it("uses the light default without browser globals", () => {
    const markup = renderToString(
      <ThemeProvider>
        <ThemeText />
      </ThemeProvider>,
    );

    expect(markup).toContain("light");
  });
});
