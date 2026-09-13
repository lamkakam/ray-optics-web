/** Focused browser-storage, media-query, DOM-class, and context tests for theme state. */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ThemeProvider,
  useTheme,
} from "@/shared/components/providers/ThemeProvider";

/** Exposes the provider contract through accessible controls for state assertions. */
function ThemeHarness() {
  const { theme, setTheme } = useTheme();

  return (
    <>
      <div data-testid="theme">{theme}</div>
      <button type="button" onClick={() => setTheme("dark")}>
        Dark
      </button>
      <button type="button" onClick={() => setTheme("light")}>
        Light
      </button>
      <button type="button" onClick={() => setTheme("invalid" as never)}>
        Invalid
      </button>
    </>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
  });

  it("uses the OS dark preference on a first visit", () => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });

    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(document.documentElement).toHaveClass("dark");
    expect(window.matchMedia).toHaveBeenCalledWith(
      "(prefers-color-scheme: dark)",
    );
  });

  it.each([
    ["dark", false, "dark"],
    ["light", true, "light"],
  ] as const)(
    "uses the persisted %s theme before checking the OS",
    (stored, osMatches, expected) => {
      localStorage.setItem("ray-optics-theme", stored);
      window.matchMedia = jest.fn().mockReturnValue({ matches: osMatches });

      render(
        <ThemeProvider>
          <ThemeHarness />
        </ThemeProvider>,
      );

      expect(screen.getByTestId("theme")).toHaveTextContent(expected);
      expect(window.matchMedia).not.toHaveBeenCalled();
    },
  );

  it("falls back to the OS when the persisted value is invalid", () => {
    localStorage.setItem("ray-optics-theme", "sepia");
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });

    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(document.documentElement).toHaveClass("dark");
  });

  it("persists theme changes and synchronizes the document class", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Dark" }));
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(localStorage.getItem("ray-optics-theme")).toBe("dark");
    expect(document.documentElement).toHaveClass("dark");

    await user.click(screen.getByRole("button", { name: "Light" }));
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
    expect(localStorage.getItem("ray-optics-theme")).toBe("light");
    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("ignores invalid runtime theme values", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Invalid" }));

    expect(screen.getByTestId("theme")).toHaveTextContent("light");
    expect(localStorage.getItem("ray-optics-theme")).toBeNull();
  });

  it("throws when useTheme is rendered outside a provider", () => {
    expect(() => render(<ThemeHarness />)).toThrow(
      "useTheme must be used within a ThemeProvider",
    );
  });
});
