import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MediumSelectorModal } from "@/features/lens-editor/components/MediumSelectorModal";
import type { AllGlassCatalogsData } from "@/shared/lib/types/glassMap";

jest.mock("next/link", () => {
  return function MockLink({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { readonly href: string }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

const catalogsData: AllGlassCatalogsData = {
  CDGM: {},
  Hikari: {},
  Hoya: {},
  Ohara: {
    "S-FPL51": {
      refractiveIndexD: 1.497,
      refractiveIndexE: 1.5,
      abbeNumberD: 81.6,
      abbeNumberE: 81,
      partialDispersions: { P_F_e: 0.4, P_F_d: 0.41, P_g_F: 0.53 },
      dispersionCoeffKind: "Sellmeier3T",
      dispersionCoeffs: [1, 2, 3, 4, 5, 6],
    },
  },
  Schott: {
    "N-BK7": {
      refractiveIndexD: 1.5168,
      refractiveIndexE: 1.519,
      abbeNumberD: 64.17,
      abbeNumberE: 63.96,
      partialDispersions: { P_F_e: 0.4, P_F_d: 0.41, P_g_F: 0.53 },
      dispersionCoeffKind: "Sellmeier3T",
      dispersionCoeffs: [1, 2, 3, 4, 5, 6],
    },
    "N-SF6": {
      refractiveIndexD: 1.80518,
      refractiveIndexE: 1.8163,
      abbeNumberD: 25.36,
      abbeNumberE: 25.2,
      partialDispersions: { P_F_e: 0.298, P_F_d: 0.305, P_g_F: 0.6439 },
      dispersionCoeffKind: "Sellmeier3T",
      dispersionCoeffs: [1, 2, 3, 4, 5, 6],
    },
  },
  Sumita: {},
  Special: {
    CaF2: {
      refractiveIndexD: 1.4338,
      refractiveIndexE: 1.436,
      abbeNumberD: 95,
      abbeNumberE: 94,
      partialDispersions: { P_F_e: 0.4, P_F_d: 0.41, P_g_F: 0.53 },
      dispersionCoeffKind: "Sellmeier3T",
      dispersionCoeffs: [1, 2, 3, 4, 5, 6],
    },
  },
};

describe("MediumSelectorModal", () => {
  const defaultProps = {
    isOpen: true,
    initialMedium: "air",
    initialManufacturer: "",
    catalogsData,
    onConfirm: jest.fn(),
    onClose: jest.fn(),
  };

  it("does not render when isOpen is false", () => {
    render(<MediumSelectorModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders a dialog when isOpen is true", () => {
    render(<MediumSelectorModal {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("renders a backdrop overlay behind the dialog", () => {
    render(<MediumSelectorModal {...defaultProps} />);
    const backdrop = screen.getByTestId("modal-backdrop");
    expect(backdrop).toBeInTheDocument();
  });

  it("does not call onClose when clicking the backdrop overlay", async () => {
    const onClose = jest.fn();
    render(<MediumSelectorModal {...defaultProps} onClose={onClose} />);
    const backdrop = screen.getByTestId("modal-backdrop");

    await userEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(0);
  });

  it("has a manufacturer dropdown with Special and manufacturers from shared catalog data", () => {
    render(<MediumSelectorModal {...defaultProps} />);
    const select = screen.getByLabelText("Manufacturer");
    expect(select).toBeInTheDocument();
    expect(screen.getByLabelText("Use model glass")).not.toBeChecked();

    const options = Array.from(
      (select as HTMLSelectElement).options
    ).map((o) => o.value);
    expect(options).toContain("Special");
    expect(options).toContain("Schott");
    expect(options).toContain("Ohara");
    expect(options).toHaveLength(3);
  });

  it("shows special options from shared data plus non-glass media when Special manufacturer selected", async () => {
    render(
      <MediumSelectorModal
        {...defaultProps}
        initialManufacturer=""
        initialMedium="air"
      />
    );

    expect(screen.getByLabelText("Glass")).toBeInTheDocument();
    const glassSelect = screen.getByLabelText("Glass");
    const options = Array.from(
      (glassSelect as HTMLSelectElement).options
    ).map((o) => o.value);
    expect(options).toContain("air");
    expect(options).toContain("REFL");
    expect(options).toContain("CaF2");
  });

  it("shows a loading state when catalogs are still being fetched", () => {
    render(<MediumSelectorModal {...defaultProps} catalogsData={undefined} />);

    expect(screen.getByText("Loading glass catalog data…")).toBeInTheDocument();
    expect(screen.queryByLabelText("Manufacturer")).not.toBeInTheDocument();
  });

  it("shows an error state when catalogs fail to load", () => {
    render(<MediumSelectorModal {...defaultProps} catalogsData={undefined} catalogsError="Load failed" />);

    expect(screen.getByText("Load failed")).toBeInTheDocument();
    expect(screen.queryByLabelText("Manufacturer")).not.toBeInTheDocument();
  });

  it("shows glass options synchronously when a real manufacturer is selected", async () => {
    render(<MediumSelectorModal {...defaultProps} />);

    await userEvent.selectOptions(screen.getByLabelText("Manufacturer"), "Schott");

    const glassSelect = screen.getByLabelText("Glass");
    const options = Array.from(
      (glassSelect as HTMLSelectElement).options
    ).map((o) => o.value);
    expect(options).toContain("N-BK7");
    expect(options).toContain("N-SF6");
  });

  it("renders a glass map link for a selected catalog glass", async () => {
    render(<MediumSelectorModal {...defaultProps} />);

    await userEvent.selectOptions(screen.getByLabelText("Manufacturer"), "Schott");
    await userEvent.selectOptions(screen.getByLabelText("Glass"), "N-BK7");

    expect(screen.getByRole("link", { name: "View in glass map" })).toHaveAttribute(
      "href",
      "/glass-map?source=medium-selector&catalog=Schott&glass=N-BK7",
    );
  });

  it("updates the glass map link when the selected manufacturer and glass change", async () => {
    render(<MediumSelectorModal {...defaultProps} />);

    await userEvent.selectOptions(screen.getByLabelText("Manufacturer"), "Schott");
    await userEvent.selectOptions(screen.getByLabelText("Glass"), "N-SF6");
    await userEvent.selectOptions(screen.getByLabelText("Manufacturer"), "Ohara");

    expect(screen.getByRole("link", { name: "View in glass map" })).toHaveAttribute(
      "href",
      "/glass-map?source=medium-selector&catalog=Ohara&glass=S-FPL51",
    );
  });

  it("does not render the glass map link for Special media", () => {
    render(<MediumSelectorModal {...defaultProps} />);

    expect(screen.queryByRole("link", { name: "View in glass map" })).not.toBeInTheDocument();
  });

  it("hides the glass map link when Use model glass is checked", async () => {
    render(<MediumSelectorModal {...defaultProps} />);

    await userEvent.selectOptions(screen.getByLabelText("Manufacturer"), "Schott");
    expect(screen.getByRole("link", { name: "View in glass map" })).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText("Use model glass"));

    expect(screen.queryByRole("link", { name: "View in glass map" })).not.toBeInTheDocument();
  });

  it("calls onConfirm with selected medium and manufacturer", async () => {
    const onConfirm = jest.fn();
    render(
      <MediumSelectorModal
        {...defaultProps}
        onConfirm={onConfirm}
      />
    );

    await userEvent.selectOptions(screen.getByLabelText("Glass"), "REFL");
    await userEvent.click(screen.getByText("Confirm"));

    expect(onConfirm).toHaveBeenCalledWith("REFL", "");
  });

  it("replaces dropdowns with model-glass controls when Use model glass is checked", async () => {
    render(<MediumSelectorModal {...defaultProps} />);

    await userEvent.click(screen.getByLabelText("Use model glass"));

    expect(screen.queryByLabelText("Manufacturer")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Glass")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Single refractive index")).not.toBeChecked();
    expect(screen.getByLabelText("Refractive index at d-line")).toBeInTheDocument();
    expect(screen.getByLabelText("Abbe Number")).toBeInTheDocument();
  });

  it("clears and hides Abbe Number when Single refractive index is checked", async () => {
    render(<MediumSelectorModal {...defaultProps} />);

    await userEvent.click(screen.getByLabelText("Use model glass"));
    await userEvent.type(screen.getByLabelText("Abbe Number"), "64.1");
    await userEvent.click(screen.getByLabelText("Single refractive index"));

    expect(screen.getByLabelText("Single refractive index")).toBeChecked();
    expect(screen.queryByLabelText("Abbe Number")).not.toBeInTheDocument();
  });

  it("shows an empty Abbe Number input again when Single refractive index is unchecked", async () => {
    render(<MediumSelectorModal {...defaultProps} />);

    await userEvent.click(screen.getByLabelText("Use model glass"));
    await userEvent.type(screen.getByLabelText("Abbe Number"), "64.1");
    await userEvent.click(screen.getByLabelText("Single refractive index"));
    await userEvent.click(screen.getByLabelText("Single refractive index"));

    expect(screen.getByLabelText("Abbe Number")).toHaveValue("");
  });

  it("calls onConfirm with refractive index and Abbe number in model-glass mode", async () => {
    const onConfirm = jest.fn();
    render(<MediumSelectorModal {...defaultProps} onConfirm={onConfirm} />);

    await userEvent.click(screen.getByLabelText("Use model glass"));
    await userEvent.type(screen.getByLabelText("Refractive index at d-line"), "1.5168");
    await userEvent.type(screen.getByLabelText("Abbe Number"), "64.17");
    await userEvent.click(screen.getByText("Confirm"));

    expect(onConfirm).toHaveBeenCalledWith("1.5168", "64.17");
  });

  it("normalizes an invalid refractive index to 1.0 on blur", async () => {
    render(<MediumSelectorModal {...defaultProps} />);

    await userEvent.click(screen.getByLabelText("Use model glass"));
    const refractiveIndexInput = screen.getByLabelText("Refractive index at d-line");

    await userEvent.clear(refractiveIndexInput);
    await userEvent.type(refractiveIndexInput, "abc");
    await userEvent.tab();

    expect(refractiveIndexInput).toHaveValue("1.0");
  });

  it("normalizes a non-positive refractive index to 1.0 on blur", async () => {
    render(<MediumSelectorModal {...defaultProps} />);

    await userEvent.click(screen.getByLabelText("Use model glass"));
    const refractiveIndexInput = screen.getByLabelText("Refractive index at d-line");

    await userEvent.clear(refractiveIndexInput);
    await userEvent.type(refractiveIndexInput, "-2");
    await userEvent.tab();

    expect(refractiveIndexInput).toHaveValue("1.0");
  });

  it("preserves a valid positive refractive index on blur", async () => {
    render(<MediumSelectorModal {...defaultProps} />);

    await userEvent.click(screen.getByLabelText("Use model glass"));
    const refractiveIndexInput = screen.getByLabelText("Refractive index at d-line");

    await userEvent.clear(refractiveIndexInput);
    await userEvent.type(refractiveIndexInput, "1.5168");
    await userEvent.tab();

    expect(refractiveIndexInput).toHaveValue("1.5168");
  });

  it("normalizes an invalid Abbe number to an empty string on blur", async () => {
    render(<MediumSelectorModal {...defaultProps} />);

    await userEvent.click(screen.getByLabelText("Use model glass"));
    const abbeNumberInput = screen.getByLabelText("Abbe Number");

    await userEvent.clear(abbeNumberInput);
    await userEvent.type(abbeNumberInput, "abc");
    await userEvent.tab();

    expect(abbeNumberInput).toHaveValue("");
  });

  it("preserves an empty Abbe number on blur", async () => {
    render(<MediumSelectorModal {...defaultProps} />);

    await userEvent.click(screen.getByLabelText("Use model glass"));
    const abbeNumberInput = screen.getByLabelText("Abbe Number");

    await userEvent.clear(abbeNumberInput);
    await userEvent.tab();

    expect(abbeNumberInput).toHaveValue("");
  });

  it("preserves a valid numeric Abbe number on blur", async () => {
    render(<MediumSelectorModal {...defaultProps} />);

    await userEvent.click(screen.getByLabelText("Use model glass"));
    const abbeNumberInput = screen.getByLabelText("Abbe Number");

    await userEvent.clear(abbeNumberInput);
    await userEvent.type(abbeNumberInput, "64.17");
    await userEvent.tab();

    expect(abbeNumberInput).toHaveValue("64.17");
  });

  it("calls onConfirm with empty manufacturer in single-index mode", async () => {
    const onConfirm = jest.fn();
    render(<MediumSelectorModal {...defaultProps} onConfirm={onConfirm} />);

    await userEvent.click(screen.getByLabelText("Use model glass"));
    await userEvent.type(screen.getByLabelText("Refractive index at d-line"), "1.458");
    await userEvent.type(screen.getByLabelText("Abbe Number"), "67.8");
    await userEvent.click(screen.getByLabelText("Single refractive index"));
    await userEvent.click(screen.getByText("Confirm"));

    expect(onConfirm).toHaveBeenCalledWith("1.458", "");
  });

  it("auto-detects numeric initial values as model glass", () => {
    render(
      <MediumSelectorModal
        {...defaultProps}
        initialMedium="1.62"
        initialManufacturer="36.3"
      />
    );

    expect(screen.getByLabelText("Use model glass")).toBeChecked();
    expect(screen.getByLabelText("Refractive index at d-line")).toHaveValue("1.62");
    expect(screen.getByLabelText("Abbe Number")).toHaveValue("36.3");
    expect(screen.getByLabelText("Single refractive index")).not.toBeChecked();
  });

  it("auto-enables single-index mode when initial manufacturer is not numeric", () => {
    render(
      <MediumSelectorModal
        {...defaultProps}
        initialMedium="1.62"
        initialManufacturer=""
      />
    );

    expect(screen.getByLabelText("Use model glass")).toBeChecked();
    expect(screen.getByLabelText("Single refractive index")).toBeChecked();
    expect(screen.getByLabelText("Refractive index at d-line")).toHaveValue("1.62");
    expect(screen.queryByLabelText("Abbe Number")).not.toBeInTheDocument();
  });

  it("calls onClose when Cancel is clicked", async () => {
    const onClose = jest.fn();
    render(<MediumSelectorModal {...defaultProps} onClose={onClose} />);

    await userEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose when Escape is pressed", async () => {
    const onClose = jest.fn();
    render(<MediumSelectorModal {...defaultProps} onClose={onClose} />);

    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(0);
  });
});
