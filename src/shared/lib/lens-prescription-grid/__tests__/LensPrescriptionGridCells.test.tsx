import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SurfacePropertyCell } from "@/shared/lib/lens-prescription-grid";
import type { GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";
import type {
  ClearAperture,
  DecenterConfig,
  EdgeAperture,
  Surface,
} from "@/shared/lib/optical-model/model/opticalModel";
import { formatApertureLabel } from "@/shared/lib/optical-model/surface-properties/aperture/aperture.ui";
import {
  SURFACE_PROPERTY_UIS,
  type SurfacePropertyUiKey,
} from "@/shared/lib/optical-model/surface-properties/registry.ui";

const baseDecenter = {
  alpha: 0,
  beta: 0,
  gamma: 0,
  offsetX: 0,
  offsetY: 0,
} satisfies Omit<DecenterConfig, "coordinateSystemStrategy">;

function surfaceRow(values: Partial<Surface> = {}): GridRow {
  return {
    id: "row-surface-test",
    kind: "surface",
    label: "Default",
    curvatureRadius: 0,
    thickness: 0,
    medium: "air",
    manufacturer: "",
    semiDiameter: 1,
    ...values,
  };
}

/** Renders the shared cell exactly as the property's grid column does. */
function propertyCell(
  key: SurfacePropertyUiKey,
  row: GridRow,
  onOpenModal: () => void = () => undefined,
) {
  const ui = SURFACE_PROPERTY_UIS[key];
  return (
    <SurfacePropertyCell
      label={ui.formatLabel(row)}
      ariaLabel={ui.ariaLabel}
      tooltipText={ui.editTooltip}
      onOpenModal={onOpenModal}
    />
  );
}

describe("LensPrescriptionGridCells", () => {
  it("formats aperture labels", () => {
    const circularClear = (
      offsetX: number,
      offsetY: number,
    ): ClearAperture => ({
      shape: "circular",
      offsetX,
      offsetY,
    });
    const annularClear = (
      obstructionRadius: number,
      offsetX: number,
      offsetY: number,
    ): ClearAperture => ({
      shape: "annular",
      obstructionRadius,
      offsetX,
      offsetY,
    });
    const circularEdge = (
      radius: number,
      offsetX: number,
      offsetY: number,
    ): EdgeAperture => ({
      shape: "circular",
      radius,
      offsetX,
      offsetY,
    });

    expect(formatApertureLabel(undefined, undefined)).toBe("Default");
    expect(formatApertureLabel(circularClear(0, 0), undefined)).toBe("Default");
    expect(formatApertureLabel(circularClear(-1.25, 2.5), undefined)).toBe(
      "Cir offset (-1.25, 2.5)",
    );
    expect(formatApertureLabel(circularClear(-1.25, 0), undefined)).toBe(
      "Cir offset (-1.25, 0)",
    );
    expect(formatApertureLabel(circularClear(0, 2.5), undefined)).toBe(
      "Cir offset (0, 2.5)",
    );
    expect(formatApertureLabel(annularClear(1.5, 0, 0), undefined)).toBe(
      "Annu obs 1.5",
    );
    expect(formatApertureLabel(annularClear(1.5, -1, 2), undefined)).toBe(
      "Annu obs 1.5, offset (-1, 2)",
    );
    expect(formatApertureLabel(undefined, circularEdge(3.25, 0, 0))).toBe(
      "Default; Edge Cir 3.25",
    );
    expect(formatApertureLabel(undefined, circularEdge(3.25, 0.5, -0.75))).toBe(
      "Default; Edge Cir 3.25, offset (0.5, -0.75)",
    );
    expect(formatApertureLabel(undefined, circularEdge(3.25, 0, -0.75))).toBe(
      "Default; Edge Cir 3.25, offset (0, -0.75)",
    );
    expect(
      formatApertureLabel(
        annularClear(1.5, -1, 2),
        circularEdge(3.25, 0.5, -0.75),
      ),
    ).toBe("Annu obs 1.5, offset (-1, 2); Edge Cir 3.25, offset (0.5, -0.75)");
    expect(
      formatApertureLabel(
        {
          shape: "rectangular",
          xHalfWidth: 4,
          yHalfWidth: 2,
          rotation: 0,
          offsetX: 0,
          offsetY: 0,
        },
        undefined,
      ),
    ).toBe("Rect (4,2)");
    expect(
      formatApertureLabel(
        {
          shape: "rectangular",
          xHalfWidth: 4,
          yHalfWidth: 2,
          rotation: 15,
          offsetX: -1,
          offsetY: 2,
        },
        {
          shape: "rectangular",
          xHalfWidth: 5,
          yHalfWidth: 3,
          rotation: -30,
          offsetX: 0.5,
          offsetY: -0.75,
        },
      ),
    ).toBe(
      "Rect (4,2), rot 15°, offset (-1, 2); Edge Rect (5,3), rot -30°, offset (0.5, -0.75)",
    );
    expect(
      formatApertureLabel(
        {
          shape: "ronchi",
          lpmm: 10,
          rotation: 0,
          offsetX: 0,
          offsetY: 0,
        },
        undefined,
      ),
    ).toBe("Ronchi 10 lp/mm");
    expect(
      formatApertureLabel(
        {
          shape: "ronchi",
          lpmm: 12.5,
          rotation: 22,
          offsetX: -1,
          offsetY: 2,
        },
        undefined,
      ),
    ).toBe("Ronchi 12.5 lp/mm, rot 22°, offset (-1, 2)");
  });

  it("renders medium labels and opens the modal", async () => {
    const onOpenModal = jest.fn();
    render(propertyCell("medium", surfaceRow({ medium: "SK16" }), onOpenModal));

    const button = screen.getByRole("button", { name: "Edit medium" });
    expect(button).toHaveTextContent("SK16");
    await userEvent.click(button);
    expect(onOpenModal).toHaveBeenCalledTimes(1);
  });

  it("renders aperture labels and opens the modal", async () => {
    const onOpenModal = jest.fn();
    const { rerender } = render(
      propertyCell("aperture", surfaceRow(), onOpenModal),
    );

    expect(
      screen.getByRole("button", { name: "Edit aperture" }),
    ).toHaveTextContent("Default");

    rerender(
      propertyCell(
        "aperture",
        surfaceRow({
          clear_aperture: { shape: "circular", offsetX: -1, offsetY: 2 },
          edge_aperture: {
            shape: "circular",
            radius: 4,
            offsetX: 0,
            offsetY: 0,
          },
        }),
        onOpenModal,
      ),
    );
    expect(
      screen.getByRole("button", { name: "Edit aperture" }),
    ).toHaveTextContent("Cir offset (-1, 2); Edge Cir 4");

    await userEvent.click(
      screen.getByRole("button", { name: "Edit aperture" }),
    );
    expect(onOpenModal).toHaveBeenCalledTimes(1);
  });

  it("renders aspherical labels and opens the modal", async () => {
    const onOpenModal = jest.fn();
    const { rerender } = render(
      propertyCell("aspherical", surfaceRow(), onOpenModal),
    );

    expect(
      screen.getByRole("button", { name: "Edit aspherical parameters" }),
    ).toHaveTextContent("None");

    rerender(
      propertyCell(
        "aspherical",
        surfaceRow({ aspherical: { kind: "Conic", conicConstant: -1 } }),
        onOpenModal,
      ),
    );
    expect(
      screen.getByRole("button", { name: "Edit aspherical parameters" }),
    ).toHaveTextContent("Conic");

    rerender(
      propertyCell(
        "aspherical",
        surfaceRow({
          aspherical: {
            kind: "EvenAspherical",
            conicConstant: -1,
            polynomialCoefficients: [0.1],
          },
        }),
        onOpenModal,
      ),
    );
    expect(
      screen.getByRole("button", { name: "Edit aspherical parameters" }),
    ).toHaveTextContent("Even Aspherical");

    await userEvent.click(
      screen.getByRole("button", { name: "Edit aspherical parameters" }),
    );
    expect(onOpenModal).toHaveBeenCalledTimes(1);
  });

  it("renders decenter strategy labels and opens the modal", async () => {
    const onOpenModal = jest.fn();
    const { rerender } = render(
      propertyCell("decenter", surfaceRow(), onOpenModal),
    );

    expect(
      screen.getByRole("button", { name: "Edit decenter and tilt" }),
    ).toHaveTextContent("None");

    for (const strategy of [
      "bend",
      "dec and return",
      "decenter",
      "reverse",
    ] as const) {
      rerender(
        propertyCell(
          "decenter",
          surfaceRow({
            decenter: { ...baseDecenter, coordinateSystemStrategy: strategy },
          }),
          onOpenModal,
        ),
      );
      expect(
        screen.getByRole("button", { name: "Edit decenter and tilt" }),
      ).toHaveTextContent(strategy);
    }

    await userEvent.click(
      screen.getByRole("button", { name: "Edit decenter and tilt" }),
    );
    expect(onOpenModal).toHaveBeenCalledTimes(1);
  });

  it("renders diffraction grating labels and opens the modal", async () => {
    const onOpenModal = jest.fn();
    const { rerender } = render(
      propertyCell("diffractiveElement", surfaceRow(), onOpenModal),
    );

    expect(
      screen.getByRole("button", { name: "Edit diffraction grating" }),
    ).toHaveTextContent("None");

    rerender(
      propertyCell(
        "diffractiveElement",
        surfaceRow({
          diffractiveElement: { diffractionGrating: { lpmm: 600, order: 1 } },
        }),
        onOpenModal,
      ),
    );
    expect(
      screen.getByRole("button", { name: "Edit diffraction grating" }),
    ).toHaveTextContent("600 lp/mm");

    await userEvent.click(
      screen.getByRole("button", { name: "Edit diffraction grating" }),
    );
    expect(onOpenModal).toHaveBeenCalledTimes(1);
  });

  it("keeps tooltip-backed action cells touch-scroll safe", () => {
    render(propertyCell("medium", surfaceRow({ medium: "AIR" })));
    expect(
      screen.getByRole("button", { name: "Edit medium" }).parentElement?.style
        .touchAction,
    ).not.toBe("none");
  });

  it("uses single-line ellipsis for overflowing action cell text", () => {
    render(
      propertyCell(
        "medium",
        surfaceRow({ medium: "N-SF11 with a very long catalog display name" }),
      ),
    );

    expect(screen.getByRole("button", { name: "Edit medium" })).toHaveClass(
      "overflow-hidden",
      "text-ellipsis",
      "whitespace-nowrap",
    );
  });

  it("keeps portal tooltips mouse-hover only for the full trigger", () => {
    render(
      propertyCell(
        "diffractiveElement",
        surfaceRow({
          diffractiveElement: { diffractionGrating: { lpmm: 600, order: 1 } },
        }),
      ),
    );
    const tooltipTrigger = screen.getByRole("button", {
      name: "Edit diffraction grating",
    }).parentElement!;

    fireEvent.touchStart(tooltipTrigger);
    fireEvent.mouseEnter(tooltipTrigger);
    expect(screen.getByRole("tooltip")).toHaveClass("opacity-0");

    fireEvent.mouseLeave(tooltipTrigger);
    fireEvent.mouseEnter(tooltipTrigger);
    expect(screen.getByRole("tooltip")).toHaveClass("opacity-100");
  });

  it.each([
    [
      "medium",
      "Edit medium",
      "Click to set medium or glass",
      "Click to view medium or glass",
    ],
    [
      "aspherical",
      "Edit aspherical parameters",
      "Click to set aspherical parameters",
      "Click to view aspherical parameters",
    ],
    [
      "aperture",
      "Edit aperture",
      "Click to set aperture",
      "Click to view aperture",
    ],
    [
      "decenter",
      "Edit decenter and tilt",
      "Click to open settings for Tilt and Decenter",
      "Click to view tilt and decenter",
    ],
    [
      "diffractiveElement",
      "Edit diffraction grating",
      "Click to set diffraction grating",
      "Click to view diffraction grating",
    ],
  ] as const)(
    "gives the %s cell its editing and inspection tooltips",
    (key, buttonName, editTooltip, viewTooltip) => {
      const ui = SURFACE_PROPERTY_UIS[key];
      expect(ui.ariaLabel).toBe(buttonName);
      expect(ui.editTooltip).toBe(editTooltip);
      expect(ui.viewTooltip).toBe(viewTooltip);

      render(propertyCell(key, surfaceRow()));
      fireEvent.mouseEnter(
        screen.getByRole("button", { name: buttonName }).parentElement!,
      );
      expect(screen.getByRole("tooltip")).toHaveTextContent(editTooltip);
    },
  );
});
