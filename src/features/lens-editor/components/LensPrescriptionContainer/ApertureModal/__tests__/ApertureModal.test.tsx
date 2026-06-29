import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApertureModal } from "../";

describe("ApertureModal", () => {
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
