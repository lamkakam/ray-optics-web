import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "@/shared/components/primitives/Modal";

describe("Modal", () => {
  it("does not render when isOpen is false", () => {
    render(<Modal isOpen={false} title="Test Modal"><p>content</p></Modal>);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders role=dialog with aria-modal=true when isOpen is true", () => {
    render(<Modal isOpen={true} title="Test Modal"><p>content</p></Modal>);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("renders the title text", () => {
    render(<Modal isOpen={true} title="My Title"><p>content</p></Modal>);
    expect(screen.getByText("My Title")).toBeInTheDocument();
  });

  it("sets aria-labelledby pointing to the h2 id", () => {
    render(<Modal isOpen={true} title="Test Modal"><p>content</p></Modal>);
    const dialog = screen.getByRole("dialog");
    const labelledById = dialog.getAttribute("aria-labelledby");
    expect(labelledById).toBeTruthy();
    const h2 = screen.getByRole("heading", { name: "Test Modal" });
    expect(h2.id).toBe(labelledById);
  });

  it("renders modal-backdrop", () => {
    render(<Modal isOpen={true} title="Test Modal"><p>content</p></Modal>);
    expect(screen.getByTestId("modal-backdrop")).toBeInTheDocument();
  });

  it("backdrop has no onClick handler when onBackdropClick is not provided", async () => {
    render(<Modal isOpen={true} title="Test Modal"><p>content</p></Modal>);
    const backdrop = screen.getByTestId("modal-backdrop");
    // Should not throw and nothing should happen
    await userEvent.click(backdrop);
    expect(backdrop).toBeInTheDocument();
  });

  it("calls onBackdropClick when backdrop is clicked", async () => {
    const onBackdropClick = jest.fn();
    render(
      <Modal isOpen={true} title="Test Modal" onBackdropClick={onBackdropClick}>
        <p>content</p>
      </Modal>
    );
    await userEvent.click(screen.getByTestId("modal-backdrop"));
    expect(onBackdropClick).toHaveBeenCalledTimes(1);
  });

  it("keyboard events do not propagate out of modal container", () => {
    const outerHandler = jest.fn();
    render(
      <div onKeyDown={outerHandler}>
        <Modal isOpen={true} title="Test Modal"><p>content</p></Modal>
      </div>
    );
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(outerHandler).not.toHaveBeenCalled();
  });

  it("renders children inside the panel", () => {
    render(<Modal isOpen={true} title="Test Modal"><p>hello children</p></Modal>);
    expect(screen.getByText("hello children")).toBeInTheDocument();
  });

  it("uses the provided titleId for h2 and aria-labelledby", () => {
    render(
      <Modal isOpen={true} title="Test Modal" titleId="my-title-id">
        <p>content</p>
      </Modal>
    );
    const h2 = screen.getByRole("heading", { name: "Test Modal" });
    expect(h2.id).toBe("my-title-id");
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-labelledby", "my-title-id");
  });

  it.each([
    ["md", "max-w-md"],
    ["lg", "max-w-lg"],
    ["4xl", "max-w-4xl"],
  ] as const)("applies %s size as %s class on the dialog panel", (size, expectedClass) => {
    render(<Modal isOpen={true} title="Test Modal" size={size}><p>content</p></Modal>);
    expect(screen.getByRole("dialog")).toHaveClass(expectedClass);
  });

  it("defaults to md size when size is not provided", () => {
    render(<Modal isOpen={true} title="Test Modal"><p>content</p></Modal>);
    expect(screen.getByRole("dialog")).toHaveClass("max-w-md");
  });

  it("backdrop has touch-none class to prevent background scroll on mobile", () => {
    render(<Modal isOpen={true} title="Test Modal"><p>content</p></Modal>);
    expect(screen.getByTestId("modal-backdrop")).toHaveClass("touch-none");
  });
});
