import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import fs from "node:fs";
import path from "node:path";
import { ApertureModal } from "../";

describe("ApertureModal", () => {
  it("declares aperture shape component maps at module scope before ApertureModal", () => {
    const source = fs.readFileSync(path.join(__dirname, "../ApertureModal.tsx"), "utf8");
    const modalDeclarationIndex = source.indexOf("export function ApertureModal");
    const clearMapIndex = source.indexOf("const CLEAR_APERTURE_SHAPE_COMPONENTS");
    const edgeMapIndex = source.indexOf("const EDGE_APERTURE_SHAPE_COMPONENTS");

    expect(clearMapIndex).toBeGreaterThan(-1);
    expect(edgeMapIndex).toBeGreaterThan(-1);
    expect(clearMapIndex).toBeLessThan(modalDeclarationIndex);
    expect(edgeMapIndex).toBeLessThan(modalDeclarationIndex);
  });

  it("keeps aperture draft state inside clear and edge section components", () => {
    const source = fs.readFileSync(path.join(__dirname, "../ApertureModal.tsx"), "utf8");
    const clearSectionIndex = source.indexOf("const ClearApertureSection");
    const edgeSectionIndex = source.indexOf("const EdgeApertureSection");
    const modalDeclarationIndex = source.indexOf("export function ApertureModal");
    const modalSource = source.slice(modalDeclarationIndex);

    expect(clearSectionIndex).toBeGreaterThan(-1);
    expect(edgeSectionIndex).toBeGreaterThan(-1);
    expect(clearSectionIndex).toBeLessThan(modalDeclarationIndex);
    expect(edgeSectionIndex).toBeLessThan(modalDeclarationIndex);
    expect(modalSource).not.toMatch(/\[\s*(clearShape|edgeShape|clearOffsetX|clearOffsetY|edgeRadius|edgeOffsetX|edgeOffsetY|obstructionRadius)\s*,/);
  });

  it("does not render when closed", () => {
    render(
      <ApertureModal
        isOpen={false}
        semiDiameter={10}
        initialClearAperture={undefined}
        initialEdgeAperture={undefined}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("saves circular clear and edge aperture offsets", async () => {
    const onConfirm = jest.fn();
    render(
      <ApertureModal
        isOpen
        semiDiameter={10}
        initialClearAperture={undefined}
        initialEdgeAperture={undefined}
        onConfirm={onConfirm}
        onClose={jest.fn()}
      />,
    );

    await userEvent.clear(screen.getByRole("textbox", { name: "Clear Offset X" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Clear Offset X" }), "-1.25");
    await userEvent.clear(screen.getByRole("textbox", { name: "Clear Offset Y" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Clear Offset Y" }), "2.5");
    await userEvent.selectOptions(screen.getByLabelText("Edge Aperture Shape"), "circular");
    await userEvent.clear(screen.getByRole("textbox", { name: "Radius" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Radius" }), "4.25");
    await userEvent.clear(screen.getByRole("textbox", { name: "Edge Offset X" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Edge Offset X" }), "-3.5");
    await userEvent.clear(screen.getByRole("textbox", { name: "Edge Offset Y" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Edge Offset Y" }), "0");
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onConfirm).toHaveBeenCalledWith({
      clear_aperture: { shape: "circular", offsetX: -1.25, offsetY: 2.5 },
      edge_aperture: { shape: "circular", radius: 4.25, offsetX: -3.5, offsetY: 0 },
    });
  });

  it("preloads initial circular aperture offsets", async () => {
    render(
      <ApertureModal
        isOpen
        semiDiameter={10}
        initialClearAperture={{ shape: "circular", offsetX: 1.5, offsetY: -2.5 }}
        initialEdgeAperture={{ shape: "circular", radius: 6, offsetX: -3.5, offsetY: 4.5 }}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByRole("textbox", { name: "Clear Offset X" })).toHaveValue("1.5");
    expect(screen.getByRole("textbox", { name: "Clear Offset Y" })).toHaveValue("-2.5");
    expect(screen.getByRole("textbox", { name: "Edge Offset X" })).toHaveValue("-3.5");
    expect(screen.getByRole("textbox", { name: "Edge Offset Y" })).toHaveValue("4.5");
  });

  it("clears edge aperture when set back to default", async () => {
    const onConfirm = jest.fn();
    render(
      <ApertureModal
        isOpen
        semiDiameter={10}
        initialClearAperture={{ shape: "circular", offsetX: 1, offsetY: -1 }}
        initialEdgeAperture={{ shape: "circular", radius: 6, offsetX: 2, offsetY: -2 }}
        onConfirm={onConfirm}
        onClose={jest.fn()}
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText("Edge Aperture Shape"), "default");
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onConfirm).toHaveBeenCalledWith({
      clear_aperture: { shape: "circular", offsetX: 1, offsetY: -1 },
      edge_aperture: undefined,
    });
  });

  it.each(["0", "-1", "abc"])("rejects invalid circular edge radius %s", async (radius) => {
    const onConfirm = jest.fn();
    render(
      <ApertureModal
        isOpen
        semiDiameter={10}
        initialClearAperture={undefined}
        initialEdgeAperture={undefined}
        onConfirm={onConfirm}
        onClose={jest.fn()}
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText("Edge Aperture Shape"), "circular");
    await userEvent.clear(screen.getByRole("textbox", { name: "Radius" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Radius" }), radius);
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText("Radius must be greater than 0.")).toBeInTheDocument();
  });

  it.each([
    ["Clear Offset X", "abc"],
    ["Clear Offset Y", "Infinity"],
    ["Edge Offset X", "NaN"],
    ["Edge Offset Y", ""],
  ])("rejects invalid circular aperture offset %s=%s", async (fieldName, value) => {
    const onConfirm = jest.fn();
    render(
      <ApertureModal
        isOpen
        semiDiameter={10}
        initialClearAperture={undefined}
        initialEdgeAperture={undefined}
        onConfirm={onConfirm}
        onClose={jest.fn()}
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText("Edge Aperture Shape"), "circular");
    await userEvent.clear(screen.getByRole("textbox", { name: fieldName }));
    if (value !== "") {
      await userEvent.type(screen.getByRole("textbox", { name: fieldName }), value);
    }
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText("Offsets must be finite numbers.")).toBeInTheDocument();
  });

  it("renders disabled controls and Close-only footer in read-only mode", () => {
    render(
      <ApertureModal
        isOpen
        semiDiameter={10}
        readOnly
        initialClearAperture={{ shape: "circular", offsetX: 1, offsetY: -1 }}
        initialEdgeAperture={{ shape: "circular", radius: 6, offsetX: 2, offsetY: -2 }}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByLabelText("Clear Aperture Shape")).toBeDisabled();
    expect(screen.getByLabelText("Edge Aperture Shape")).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Radius" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Clear Offset X" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Clear Offset Y" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Edge Offset X" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Edge Offset Y" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm" })).not.toBeInTheDocument();
  });

  it("offers Annular only for clear aperture and saves obstruction radius before offsets", async () => {
    const onConfirm = jest.fn();
    render(
      <ApertureModal
        isOpen
        semiDiameter={8}
        initialClearAperture={undefined}
        initialEdgeAperture={undefined}
        onConfirm={onConfirm}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByLabelText("Clear Aperture Shape")).toHaveTextContent("Annular");
    expect(screen.getByLabelText("Edge Aperture Shape")).not.toHaveTextContent("Annular");

    await userEvent.selectOptions(screen.getByLabelText("Clear Aperture Shape"), "annular");
    const obstruction = screen.getByRole("textbox", { name: "Central Obstruction Radius" });
    const clearOffsetX = screen.getByRole("textbox", { name: "Clear Offset X" });
    expect(obstruction.compareDocumentPosition(clearOffsetX) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await userEvent.clear(obstruction);
    await userEvent.type(obstruction, "2.5");
    await userEvent.clear(clearOffsetX);
    await userEvent.type(clearOffsetX, "-1.25");
    await userEvent.clear(screen.getByRole("textbox", { name: "Clear Offset Y" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Clear Offset Y" }), "3.5");
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onConfirm).toHaveBeenCalledWith({
      clear_aperture: { shape: "annular", obstructionRadius: 2.5, offsetX: -1.25, offsetY: 3.5 },
      edge_aperture: undefined,
    });
  });

  it("saves rectangular clear and edge aperture values", async () => {
    const onConfirm = jest.fn();
    render(
      <ApertureModal
        isOpen
        semiDiameter={8}
        initialClearAperture={undefined}
        initialEdgeAperture={undefined}
        onConfirm={onConfirm}
        onClose={jest.fn()}
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText("Clear Aperture Shape"), "rectangular");
    await userEvent.clear(screen.getByRole("textbox", { name: "Clear Half-Length" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Clear Half-Length" }), "4.5");
    await userEvent.clear(screen.getByRole("textbox", { name: "Clear Half-Width" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Clear Half-Width" }), "2.25");
    await userEvent.clear(screen.getByRole("textbox", { name: "Clear Rotation" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Clear Rotation" }), "15");
    await userEvent.clear(screen.getByRole("textbox", { name: "Clear Offset X" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Clear Offset X" }), "-1");
    await userEvent.clear(screen.getByRole("textbox", { name: "Clear Offset Y" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Clear Offset Y" }), "2");

    await userEvent.selectOptions(screen.getByLabelText("Edge Aperture Shape"), "rectangular");
    await userEvent.clear(screen.getByRole("textbox", { name: "Edge Half-Length" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Edge Half-Length" }), "5");
    await userEvent.clear(screen.getByRole("textbox", { name: "Edge Half-Width" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Edge Half-Width" }), "3");
    await userEvent.clear(screen.getByRole("textbox", { name: "Edge Rotation" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Edge Rotation" }), "-30");
    await userEvent.clear(screen.getByRole("textbox", { name: "Edge Offset X" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Edge Offset X" }), "0.5");
    await userEvent.clear(screen.getByRole("textbox", { name: "Edge Offset Y" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Edge Offset Y" }), "-0.75");

    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onConfirm).toHaveBeenCalledWith({
      clear_aperture: {
        shape: "rectangular",
        xHalfWidth: 4.5,
        yHalfWidth: 2.25,
        rotation: 15,
        offsetX: -1,
        offsetY: 2,
      },
      edge_aperture: {
        shape: "rectangular",
        xHalfWidth: 5,
        yHalfWidth: 3,
        rotation: -30,
        offsetX: 0.5,
        offsetY: -0.75,
      },
    });
  });

  it("shows Half-Length and Half-Width for clear rectangular aperture when auto aperture is disabled", async () => {
    render(
      <ApertureModal
        isOpen
        semiDiameter={8}
        initialClearAperture={undefined}
        initialEdgeAperture={undefined}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText("Clear Aperture Shape"), "rectangular");

    expect(screen.getByRole("textbox", { name: "Clear Half-Length" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Clear Half-Width" })).toBeInTheDocument();
  });

  it("shows Length Ratio and Width Ratio for clear rectangular aperture when auto aperture is enabled", async () => {
    render(
      <ApertureModal
        isOpen
        autoAperture
        semiDiameter={8}
        initialClearAperture={undefined}
        initialEdgeAperture={undefined}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText("Clear Aperture Shape"), "rectangular");

    expect(screen.getByRole("textbox", { name: "Clear Length Ratio" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Clear Width Ratio" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Clear Half-Length" })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Clear Half-Width" })).not.toBeInTheDocument();
  });

  it("keeps Half-Length and Half-Width labels for rectangular edge aperture when auto aperture is enabled", async () => {
    render(
      <ApertureModal
        isOpen
        autoAperture
        semiDiameter={8}
        initialClearAperture={undefined}
        initialEdgeAperture={undefined}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText("Edge Aperture Shape"), "rectangular");

    expect(screen.getByRole("textbox", { name: "Edge Half-Length" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Edge Half-Width" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Edge Length Ratio" })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Edge Width Ratio" })).not.toBeInTheDocument();
  });

  it("preloads and disables rectangular aperture controls in read-only mode", () => {
    render(
      <ApertureModal
        isOpen
        semiDiameter={9}
        readOnly
        initialClearAperture={{
          shape: "rectangular",
          xHalfWidth: 4,
          yHalfWidth: 2,
          rotation: 12,
          offsetX: 1,
          offsetY: -1,
        }}
        initialEdgeAperture={{
          shape: "rectangular",
          xHalfWidth: 5,
          yHalfWidth: 3,
          rotation: -8,
          offsetX: 2,
          offsetY: -2,
        }}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByLabelText("Clear Aperture Shape")).toHaveValue("rectangular");
    expect(screen.getByRole("textbox", { name: "Clear Half-Length" })).toHaveValue("4");
    expect(screen.getByRole("textbox", { name: "Clear Half-Width" })).toHaveValue("2");
    expect(screen.getByRole("textbox", { name: "Clear Rotation" })).toHaveValue("12");
    expect(screen.getByRole("textbox", { name: "Edge Half-Length" })).toHaveValue("5");
    expect(screen.getByRole("textbox", { name: "Edge Half-Width" })).toHaveValue("3");
    expect(screen.getByRole("textbox", { name: "Edge Rotation" })).toHaveValue("-8");
    expect(screen.getByRole("textbox", { name: "Clear Half-Length" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Edge Half-Length" })).toBeDisabled();
  });

  it.each([
    ["Clear Half-Length", "0", "Half-Length and Half-Width must be greater than 0."],
    ["Clear Half-Width", "-1", "Half-Length and Half-Width must be greater than 0."],
    ["Clear Rotation", "Infinity", "Rotation must be a finite number."],
  ])("rejects invalid rectangular clear aperture field %s=%s", async (fieldName, value, errorMessage) => {
    const onConfirm = jest.fn();
    render(
      <ApertureModal
        isOpen
        semiDiameter={8}
        initialClearAperture={undefined}
        initialEdgeAperture={undefined}
        onConfirm={onConfirm}
        onClose={jest.fn()}
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText("Clear Aperture Shape"), "rectangular");
    await userEvent.clear(screen.getByRole("textbox", { name: fieldName }));
    await userEvent.type(screen.getByRole("textbox", { name: fieldName }), value);
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it("preloads and disables annular clear aperture controls in read-only mode", () => {
    render(
      <ApertureModal
        isOpen
        semiDiameter={9}
        readOnly
        initialClearAperture={{ shape: "annular", obstructionRadius: 3, offsetX: 1, offsetY: -1 }}
        initialEdgeAperture={undefined}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByLabelText("Clear Aperture Shape")).toHaveValue("annular");
    expect(screen.getByRole("textbox", { name: "Central Obstruction Radius" })).toHaveValue("3");
    expect(screen.getByRole("textbox", { name: "Central Obstruction Radius" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Clear Offset X" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Clear Offset Y" })).toBeDisabled();
  });

  it.each([
    ["0", "Central obstruction radius must be greater than 0 and smaller than the clear aperture radius."],
    ["-1", "Central obstruction radius must be greater than 0 and smaller than the clear aperture radius."],
    ["abc", "Central obstruction radius must be greater than 0 and smaller than the clear aperture radius."],
    ["8", "Central obstruction radius must be greater than 0 and smaller than the clear aperture radius."],
  ])("rejects invalid annular obstruction radius %s", async (obstructionRadius, errorMessage) => {
    const onConfirm = jest.fn();
    render(
      <ApertureModal
        isOpen
        semiDiameter={8}
        initialClearAperture={undefined}
        initialEdgeAperture={undefined}
        onConfirm={onConfirm}
        onClose={jest.fn()}
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText("Clear Aperture Shape"), "annular");
    await userEvent.clear(screen.getByRole("textbox", { name: "Central Obstruction Radius" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Central Obstruction Radius" }), obstructionRadius);
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });
});
