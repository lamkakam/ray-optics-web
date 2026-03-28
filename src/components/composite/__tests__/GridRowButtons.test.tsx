import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GridRowButtons } from "../../composite/GridRowButtons";

describe("GridRowButtons", () => {
  it("renders add button when onAdd provided", () => {
    render(<GridRowButtons onAdd={() => { }} />);
    expect(screen.getByRole("button", { name: "Insert row" })).toBeInTheDocument();
  });

  it("renders delete button when onDelete provided", () => {
    render(<GridRowButtons onDelete={() => { }} />);
    expect(screen.getByRole("button", { name: "Delete row" })).toBeInTheDocument();
  });

  it("hides add button when onAdd undefined", () => {
    render(<GridRowButtons onDelete={() => { }} />);
    expect(screen.queryByRole("button", { name: "Insert row" })).not.toBeInTheDocument();
  });

  it("hides delete button when onDelete undefined", () => {
    render(<GridRowButtons onAdd={() => { }} />);
    expect(screen.queryByRole("button", { name: "Delete row" })).not.toBeInTheDocument();
  });

  it("calls onAdd on click", async () => {
    const user = userEvent.setup();
    const onAdd = jest.fn();
    render(<GridRowButtons onAdd={onAdd} />);
    await user.click(screen.getByRole("button", { name: "Insert row" }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("calls onDelete on click", async () => {
    const user = userEvent.setup();
    const onDelete = jest.fn();
    render(<GridRowButtons onDelete={onDelete} />);
    await user.click(screen.getByRole("button", { name: "Delete row" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("add button uses visibility hidden when addHidden is true", () => {
    const { container } = render(<GridRowButtons onAdd={() => { }} addHidden />);
    const btn = container.querySelector("button");
    expect(btn).toHaveStyle({ visibility: "hidden" });
  });

  it("uses custom aria-labels when provided", () => {
    render(
      <GridRowButtons
        onAdd={() => { }}
        onDelete={() => { }}
        addLabel="Add field row"
        deleteLabel="Delete field row"
      />,
    );
    expect(screen.getByRole("button", { name: "Add field row" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete field row" })).toBeInTheDocument();
  });

  it("uses default aria-labels when not provided", () => {
    render(<GridRowButtons onAdd={() => { }} onDelete={() => { }} />);
    expect(screen.getByRole("button", { name: "Insert row" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete row" })).toBeInTheDocument();
  });

  it("add button has title attribute for native tooltip", () => {
    render(<GridRowButtons onAdd={() => { }} />);
    expect(screen.getByRole("button", { name: "Insert row" })).toHaveAttribute("title", "Insert row");
  });

  it("delete button has title attribute for native tooltip", () => {
    render(<GridRowButtons onDelete={() => { }} />);
    expect(screen.getByRole("button", { name: "Delete row" })).toHaveAttribute("title", "Delete row");
  });

  it("title attributes use custom labels", () => {
    render(
      <GridRowButtons
        onAdd={() => { }}
        onDelete={() => { }}
        addLabel="Add field row"
        deleteLabel="Delete field row"
      />,
    );
    expect(screen.getByRole("button", { name: "Add field row" })).toHaveAttribute("title", "Add field row");
    expect(screen.getByRole("button", { name: "Delete field row" })).toHaveAttribute("title", "Delete field row");
  });

  it("add button has a portal Tooltip with addLabel text", () => {
    render(<GridRowButtons onAdd={() => { }} addLabel="Insert row" />);
    const tooltips = screen.getAllByRole("tooltip");
    expect(tooltips.some((t) => t.textContent === "Insert row")).toBe(true);
  });

  it("delete button has a portal Tooltip with deleteLabel text", () => {
    render(<GridRowButtons onDelete={() => { }} deleteLabel="Delete row" />);
    const tooltips = screen.getAllByRole("tooltip");
    expect(tooltips.some((t) => t.textContent === "Delete row")).toBe(true);
  });

  it("both buttons have portal Tooltips when both provided", () => {
    render(<GridRowButtons onAdd={() => { }} onDelete={() => { }} />);
    const tooltips = screen.getAllByRole("tooltip");
    expect(tooltips).toHaveLength(2);
    expect(tooltips.some((t) => t.textContent === "Insert row")).toBe(true);
    expect(tooltips.some((t) => t.textContent === "Delete row")).toBe(true);
  });
});
