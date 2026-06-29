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

  it("saves a circular edge aperture radius", async () => {
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
    await userEvent.type(screen.getByRole("textbox", { name: "Radius" }), "4.25");
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onConfirm).toHaveBeenCalledWith({
      clear_aperture: { shape: "circular" },
      edge_aperture: { shape: "circular", radius: 4.25 },
    });
  });

  it("clears edge aperture when set back to default", async () => {
    const onConfirm = jest.fn();
    render(
      <ApertureModal
        isOpen
        initialClearAperture={{ shape: "circular" }}
        initialEdgeAperture={{ shape: "circular", radius: 6 }}
        onConfirm={onConfirm}
        onClose={jest.fn()}
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText("Edge Aperture Shape"), "default");
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onConfirm).toHaveBeenCalledWith({
      clear_aperture: { shape: "circular" },
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

  it("renders disabled controls and Close-only footer in read-only mode", () => {
    render(
      <ApertureModal
        isOpen
        readOnly
        initialClearAperture={{ shape: "circular" }}
        initialEdgeAperture={{ shape: "circular", radius: 6 }}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByLabelText("Clear Aperture Shape")).toBeDisabled();
    expect(screen.getByLabelText("Edge Aperture Shape")).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Radius" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm" })).not.toBeInTheDocument();
  });
});
