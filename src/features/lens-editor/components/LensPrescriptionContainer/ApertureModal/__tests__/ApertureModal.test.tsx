import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApertureModal } from "../";

describe("ApertureModal", () => {
  it("does not render when closed", () => {
    render(
      <ApertureModal
        isOpen={false}
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
});
