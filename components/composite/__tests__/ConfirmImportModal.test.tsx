import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmImportModal } from "@/components/composite/ConfirmImportModal";

describe("ConfirmImportModal", () => {
  it("does not render when isOpen=false", () => {
    render(<ConfirmImportModal isOpen={false} onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders dialog when isOpen=true", () => {
    render(<ConfirmImportModal isOpen={true} onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("renders title 'Load Config'", () => {
    render(<ConfirmImportModal isOpen={true} onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.getByText("Load Config")).toBeInTheDocument();
  });

  it("renders body text about overwriting System Specs and Lens Prescription", () => {
    render(<ConfirmImportModal isOpen={true} onConfirm={() => {}} onCancel={() => {}} />);
    expect(
      screen.getByText("This will overwrite your current System Specs and Lens Prescription. Continue?")
    ).toBeInTheDocument();
  });

  it("'Cancel' button calls onCancel", async () => {
    const onCancel = jest.fn();
    render(<ConfirmImportModal isOpen={true} onConfirm={() => {}} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("'Load' button calls onConfirm", async () => {
    const onConfirm = jest.fn();
    render(<ConfirmImportModal isOpen={true} onConfirm={onConfirm} onCancel={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Load" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
