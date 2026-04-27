import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  AsphericalCell,
  DecenterCell,
  DiffractionGratingCell,
  MediumCell,
} from "@/shared/lib/lens-prescription-grid";
import type { DecenterConfig } from "@/shared/lib/types/opticalModel";

const baseDecenter = {
  alpha: 0,
  beta: 0,
  gamma: 0,
  offsetX: 0,
  offsetY: 0,
} satisfies Omit<DecenterConfig, "coordinateSystemStrategy">;

describe("LensPrescriptionGridCells", () => {
  it("renders aspherical labels and opens the modal", async () => {
    const onOpenModal = jest.fn();
    const { rerender } = render(<AsphericalCell aspherical={undefined} onOpenModal={onOpenModal} />);

    expect(screen.getByRole("button", { name: "Edit aspherical parameters" })).toHaveTextContent("None");

    rerender(<AsphericalCell aspherical={{ kind: "Conic", conicConstant: -1 }} onOpenModal={onOpenModal} />);
    expect(screen.getByRole("button", { name: "Edit aspherical parameters" })).toHaveTextContent("Conic");

    rerender(
      <AsphericalCell
        aspherical={{ kind: "EvenAspherical", conicConstant: -1, polynomialCoefficients: [0.1] }}
        onOpenModal={onOpenModal}
      />,
    );
    expect(screen.getByRole("button", { name: "Edit aspherical parameters" })).toHaveTextContent("Even Aspherical");

    await userEvent.click(screen.getByRole("button", { name: "Edit aspherical parameters" }));
    expect(onOpenModal).toHaveBeenCalledTimes(1);
  });

  it("renders decenter strategy labels and opens the modal", async () => {
    const onOpenModal = jest.fn();
    const { rerender } = render(<DecenterCell decenter={undefined} onOpenModal={onOpenModal} />);

    expect(screen.getByRole("button", { name: "Edit decenter and tilt" })).toHaveTextContent("None");

    for (const strategy of ["bend", "dec and return", "decenter", "reverse"] as const) {
      rerender(
        <DecenterCell
          decenter={{ ...baseDecenter, coordinateSystemStrategy: strategy }}
          onOpenModal={onOpenModal}
        />,
      );
      expect(screen.getByRole("button", { name: "Edit decenter and tilt" })).toHaveTextContent(strategy);
    }

    await userEvent.click(screen.getByRole("button", { name: "Edit decenter and tilt" }));
    expect(onOpenModal).toHaveBeenCalledTimes(1);
  });

  it("renders diffraction grating labels and opens the modal", async () => {
    const onOpenModal = jest.fn();
    const { rerender } = render(<DiffractionGratingCell diffractionGrating={undefined} onOpenModal={onOpenModal} />);

    expect(screen.getByRole("button", { name: "Edit diffraction grating" })).toHaveTextContent("None");

    rerender(<DiffractionGratingCell diffractionGrating={{ lpmm: 600, order: 1 }} onOpenModal={onOpenModal} />);
    expect(screen.getByRole("button", { name: "Edit diffraction grating" })).toHaveTextContent("600 lp/mm");

    await userEvent.click(screen.getByRole("button", { name: "Edit diffraction grating" }));
    expect(onOpenModal).toHaveBeenCalledTimes(1);
  });

  it("keeps tooltip-backed action cells touch-scroll safe", () => {
    const { rerender } = render(<MediumCell medium="AIR" onOpenModal={() => {}} />);
    expect(screen.getByRole("button", { name: "Edit medium" }).parentElement!.style.touchAction).not.toBe("none");

    rerender(<AsphericalCell aspherical={undefined} onOpenModal={() => {}} />);
    expect(
      screen.getByRole("button", { name: "Edit aspherical parameters" }).parentElement!.style.touchAction,
    ).not.toBe("none");

    rerender(<DecenterCell decenter={undefined} onOpenModal={() => {}} />);
    expect(screen.getByRole("button", { name: "Edit decenter and tilt" }).parentElement!.style.touchAction).not.toBe(
      "none",
    );

    rerender(<DiffractionGratingCell diffractionGrating={undefined} onOpenModal={() => {}} />);
    expect(screen.getByRole("button", { name: "Edit diffraction grating" }).parentElement!.style.touchAction).not.toBe(
      "none",
    );
  });

  it("keeps portal tooltips mouse-hover only for the full trigger", () => {
    render(<DiffractionGratingCell diffractionGrating={{ lpmm: 600, order: 1 }} onOpenModal={() => {}} />);
    const tooltipTrigger = screen.getByRole("button", { name: "Edit diffraction grating" }).parentElement!;

    fireEvent.touchStart(tooltipTrigger);
    fireEvent.mouseEnter(tooltipTrigger);
    expect(screen.getByRole("tooltip")).toHaveClass("opacity-0");

    fireEvent.mouseLeave(tooltipTrigger);
    fireEvent.mouseEnter(tooltipTrigger);
    expect(screen.getByRole("tooltip")).toHaveClass("opacity-100");
  });
});
