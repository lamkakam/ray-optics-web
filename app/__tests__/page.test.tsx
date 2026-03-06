import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";

// Mock next/dynamic — jest resolves imports synchronously
jest.mock("next/dynamic", () => {
  return (
    loader: () => Promise<unknown>,
    _opts?: Record<string, unknown>
  ) => {
    let Comp: React.ComponentType | undefined;
    loader().then((resolved: unknown) => {
      if (typeof resolved === "function") {
        // loader already extracted the named export (e.g. .then(m => m.Foo))
        Comp = resolved as React.ComponentType;
      } else if (resolved && typeof resolved === "object") {
        const mod = resolved as Record<string, unknown>;
        Comp =
          (mod.default as React.ComponentType | undefined) ??
          (Object.values(mod).find(
            (v) => typeof v === "function"
          ) as React.ComponentType | undefined);
      }
    });
    const DynamicWrapper = (props: Record<string, unknown>) => {
      if (!Comp) return null;
      return React.createElement(Comp, props);
    };
    DynamicWrapper.displayName = "DynamicMock";
    return DynamicWrapper;
  };
});

// Mock useTheme
jest.mock("@/components/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: jest.fn() }),
}));

describe("Home page", () => {
  it("renders the header with title", () => {
    render(<Home />);
    expect(screen.getByText("Ray Optics Web")).toBeInTheDocument();
  });

  it("renders the lens layout panel area", () => {
    render(<Home />);
    expect(
      screen.getByRole("button", { name: "Refresh lens layout" })
    ).toBeInTheDocument();
  });

  it("renders the analysis panel with field and plot type selectors", () => {
    render(<Home />);
    expect(screen.getByLabelText("Field")).toBeInTheDocument();
    expect(screen.getByLabelText("Plot type")).toBeInTheDocument();
  });

  it("renders field options as absolute field values with units", () => {
    render(<Home />);
    const fieldSelect = screen.getByLabelText("Field");
    // Demo fields: [0, 0.7, 1] relative, maxField = 20, type = angle
    expect(fieldSelect).toContainHTML("0.0°");
    expect(fieldSelect).toContainHTML("14.0°");
    expect(fieldSelect).toContainHTML("20.0°");
  });

  it("renders the bottom drawer with System Specs and Prescription tabs", () => {
    render(<Home />);
    expect(screen.getByRole("tab", { name: "System Specs" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Prescription" })).toBeInTheDocument();
  });

  it("shows SpecsConfigurerContainer content in System Specs tab", () => {
    render(<Home />);
    // System Aperture is rendered by SpecsConfigurerPanel
    expect(screen.getByText("System Aperture")).toBeInTheDocument();
  });

  it("switches to Prescription tab and shows LensPrescriptionContainer", async () => {
    render(<Home />);
    await userEvent.click(screen.getByRole("tab", { name: "Prescription" }));
    // The Export JSON button is in LensPrescriptionContainer
    expect(screen.getByText("Export JSON")).toBeInTheDocument();
  });
});
