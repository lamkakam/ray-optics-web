import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DiffractionGratingModal } from "@/features/lens-editor/components/DiffractionGratingModal";

const defaultGrating = {
  lpmm: 1200,
  order: 2,
};

describe("DiffractionGratingModal", () => {
  it("does not render when closed", () => {
    render(
      <DiffractionGratingModal
        isOpen={false}
        initialDiffractionGrating={undefined}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
        onRemove={jest.fn()}
      />
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders when open", () => {
    render(
      <DiffractionGratingModal
        isOpen={true}
        initialDiffractionGrating={undefined}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
        onRemove={jest.fn()}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Diffraction Grating")).toBeInTheDocument();
  });

  it("renders read-only controls and only Close action in read-only mode", () => {
    render(
      <DiffractionGratingModal
        isOpen={true}
        initialDiffractionGrating={defaultGrating}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
        onRemove={jest.fn()}
        readOnly
      />
    );

    expect(screen.getByRole("textbox", { name: "lp/mm" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "order" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm" })).not.toBeInTheDocument();
  });

  it("defaults lp/mm to 1000 and order to 1", () => {
    render(
      <DiffractionGratingModal
        isOpen={true}
        initialDiffractionGrating={undefined}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
        onRemove={jest.fn()}
      />
    );

    expect(screen.getByRole("textbox", { name: "lp/mm" })).toHaveValue("1000");
    expect(screen.getByRole("textbox", { name: "order" })).toHaveValue("1");
  });

  it("pre-fills inputs with existing diffraction grating values", () => {
    render(
      <DiffractionGratingModal
        isOpen={true}
        initialDiffractionGrating={defaultGrating}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
        onRemove={jest.fn()}
      />
    );

    expect(screen.getByRole("textbox", { name: "lp/mm" })).toHaveValue("1200");
    expect(screen.getByRole("textbox", { name: "order" })).toHaveValue("2");
  });

  it("calls onConfirm with parsed values when Confirm is clicked", async () => {
    const onConfirm = jest.fn();
    render(
      <DiffractionGratingModal
        isOpen={true}
        initialDiffractionGrating={defaultGrating}
        onConfirm={onConfirm}
        onClose={jest.fn()}
        onRemove={jest.fn()}
      />
    );

    await userEvent.clear(screen.getByRole("textbox", { name: "lp/mm" }));
    await userEvent.type(screen.getByRole("textbox", { name: "lp/mm" }), "600");
    await userEvent.clear(screen.getByRole("textbox", { name: "order" }));
    await userEvent.type(screen.getByRole("textbox", { name: "order" }), "3");
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onConfirm).toHaveBeenCalledWith({ lpmm: 600, order: 3 });
  });

  it("coerces invalid values back to initial values on confirm", async () => {
    const onConfirm = jest.fn();
    render(
      <DiffractionGratingModal
        isOpen={true}
        initialDiffractionGrating={defaultGrating}
        onConfirm={onConfirm}
        onClose={jest.fn()}
        onRemove={jest.fn()}
      />
    );

    await userEvent.clear(screen.getByRole("textbox", { name: "lp/mm" }));
    await userEvent.type(screen.getByRole("textbox", { name: "lp/mm" }), "0");
    await userEvent.clear(screen.getByRole("textbox", { name: "order" }));
    await userEvent.type(screen.getByRole("textbox", { name: "order" }), "1.5");
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onConfirm).toHaveBeenCalledWith({ lpmm: 1200, order: 2 });
  });

  it("calls onClose when Cancel is clicked", async () => {
    const onClose = jest.fn();
    render(
      <DiffractionGratingModal
        isOpen={true}
        initialDiffractionGrating={undefined}
        onConfirm={jest.fn()}
        onClose={onClose}
        onRemove={jest.fn()}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onRemove when Remove is clicked", async () => {
    const onRemove = jest.fn();
    render(
      <DiffractionGratingModal
        isOpen={true}
        initialDiffractionGrating={defaultGrating}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
        onRemove={onRemove}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
