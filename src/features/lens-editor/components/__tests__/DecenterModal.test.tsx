import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DecenterModal } from "@/features/lens-editor/components/DecenterModal";

const defaultDecenter = {
  coordinateSystemStrategy: "decenter" as const,
  alpha: 0,
  beta: 5.0,
  gamma: 0,
  offsetX: 1.0,
  offsetY: 0,
};

describe("DecenterModal", () => {
  it("does not render when closed", () => {
    render(
      <DecenterModal
        isOpen={false}
        initialDecenter={undefined}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
        onRemove={jest.fn()}
      />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders when open", () => {
    render(
      <DecenterModal
        isOpen={true}
        initialDecenter={undefined}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
        onRemove={jest.fn()}
      />
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("renders read-only controls and only Close action in read-only mode", () => {
    render(
      <DecenterModal
        isOpen={true}
        initialDecenter={defaultDecenter}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
        onRemove={jest.fn()}
        readOnly
      />
    );
    expect(screen.getByRole("combobox", { name: "Coordinate system for this and following surfaces" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Alpha (°)" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm" })).not.toBeInTheDocument();
  });

  it("renders title 'Decenter & Tilt'", () => {
    render(
      <DecenterModal
        isOpen={true}
        initialDecenter={undefined}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
        onRemove={jest.fn()}
      />
    );
    expect(screen.getByText("Tilt & Decenter")).toBeInTheDocument();
  });

  it("renders coordinate system select", () => {
    render(
      <DecenterModal
        isOpen={true}
        initialDecenter={undefined}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
        onRemove={jest.fn()}
      />
    );
    expect(screen.getByRole("combobox", { name: "Coordinate system for this and following surfaces" })).toBeInTheDocument();
  });

  it("renders all four posAndOrientation options", () => {
    render(
      <DecenterModal
        isOpen={true}
        initialDecenter={undefined}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
        onRemove={jest.fn()}
      />
    );
    const select = screen.getByRole("combobox", { name: "Coordinate system for this and following surfaces" });
    expect(select).toContainElement(screen.getByRole("option", { name: "Tilt & decenter for this surface; double tilt for following surfaces" }));
    expect(select).toContainElement(screen.getByRole("option", { name: "Apply to this surface only; restore previous coordinate system for following surfaces" }));
    expect(select).toContainElement(screen.getByRole("option", { name: "New coordinate system for this and following surfaces" }));
    expect(select).toContainElement(screen.getByRole("option", { name: "No change to this surface; reversed coordinate system for following surfaces" }));
  });

  it("renders numeric inputs for alpha, beta, gamma, offsetX, offsetY", () => {
    render(
      <DecenterModal
        isOpen={true}
        initialDecenter={undefined}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
        onRemove={jest.fn()}
      />
    );
    expect(screen.getByRole("textbox", { name: "Alpha (°)" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Beta (°)" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Gamma (°)" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Offset X" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Offset Y" })).toBeInTheDocument();
  });

  it("pre-fills inputs with initialDecenter values", () => {
    render(
      <DecenterModal
        isOpen={true}
        initialDecenter={defaultDecenter}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
        onRemove={jest.fn()}
      />
    );
    expect(screen.getByRole("textbox", { name: "Alpha (°)" })).toHaveValue("0");
    expect(screen.getByRole("textbox", { name: "Beta (°)" })).toHaveValue("5");
    expect(screen.getByRole("textbox", { name: "Offset X" })).toHaveValue("1");
  });

  it("defaults to zeros when initialDecenter is undefined", () => {
    render(
      <DecenterModal
        isOpen={true}
        initialDecenter={undefined}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
        onRemove={jest.fn()}
      />
    );
    expect(screen.getByRole("textbox", { name: "Alpha (°)" })).toHaveValue("0");
    expect(screen.getByRole("textbox", { name: "Beta (°)" })).toHaveValue("0");
  });

  it("calls onConfirm with parsed values when Confirm is clicked", async () => {
    const onConfirm = jest.fn();
    render(
      <DecenterModal
        isOpen={true}
        initialDecenter={defaultDecenter}
        onConfirm={onConfirm}
        onClose={jest.fn()}
        onRemove={jest.fn()}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledWith({
      coordinateSystemStrategy: "decenter",
      alpha: 0,
      beta: 5.0,
      gamma: 0,
      offsetX: 1.0,
      offsetY: 0,
    });
  });

  it("calls onClose when Cancel is clicked", async () => {
    const onClose = jest.fn();
    render(
      <DecenterModal
        isOpen={true}
        initialDecenter={undefined}
        onConfirm={jest.fn()}
        onClose={onClose}
        onRemove={jest.fn()}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onRemove when Remove Decenter is clicked", async () => {
    const onRemove = jest.fn();
    render(
      <DecenterModal
        isOpen={true}
        initialDecenter={defaultDecenter}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
        onRemove={onRemove}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Remove Decenter" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("updates value when user types in a numeric field", async () => {
    const onConfirm = jest.fn();
    render(
      <DecenterModal
        isOpen={true}
        initialDecenter={undefined}
        onConfirm={onConfirm}
        onClose={jest.fn()}
        onRemove={jest.fn()}
      />
    );
    const betaInput = screen.getByRole("textbox", { name: "Beta (°)" });
    await userEvent.clear(betaInput);
    await userEvent.type(betaInput, "3.5");
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ beta: 3.5 })
    );
  });

  it("renders Confirm, Cancel, and Remove Decenter buttons", () => {
    render(
      <DecenterModal
        isOpen={true}
        initialDecenter={undefined}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
        onRemove={jest.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Decenter" })).toBeInTheDocument();
  });
});
