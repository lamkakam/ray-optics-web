import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/shared/components/primitives/Button";

describe("Button", () => {
  it("renders children", () => {
    render(<Button variant="primary">Click me</Button>);
    expect(
      screen.getByRole("button", { name: "Click me" }),
    ).toBeInTheDocument();
  });

  it("defaults type to button", () => {
    render(<Button variant="primary">OK</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("forwards type override", () => {
    render(
      <Button variant="primary" type="submit">
        Submit
      </Button>,
    );
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("forwards onClick", async () => {
    const onClick = jest.fn();
    render(
      <Button variant="primary" onClick={onClick}>
        Go
      </Button>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("forwards aria-label", () => {
    render(
      <Button variant="primary" aria-label="my-action">
        Go
      </Button>,
    );
    expect(
      screen.getByRole("button", { name: "my-action" }),
    ).toBeInTheDocument();
  });

  it("forwards title", () => {
    render(
      <Button variant="primary" title="My Title">
        Go
      </Button>,
    );
    expect(screen.getByRole("button")).toHaveAttribute("title", "My Title");
  });

  it("forwards disabled", () => {
    render(
      <Button variant="primary" disabled>
        Go
      </Button>,
    );
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveClass(
      "disabled:opacity-50",
      "disabled:cursor-not-allowed",
    );
  });
});
