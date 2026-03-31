import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmOverwriteModal } from "@/features/lens-editor/components/ConfirmOverwriteModal";

describe("ConfirmOverwriteModal", () => {
  it("does not render when isOpen=false", () => {
    render(<ConfirmOverwriteModal isOpen={false} onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders dialog when isOpen=true", () => {
    render(<ConfirmOverwriteModal isOpen={true} onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("renders title 'Load Example System'", () => {
    render(<ConfirmOverwriteModal isOpen={true} onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.getByText("Load Example System")).toBeInTheDocument();
  });

  it("renders body text", () => {
    render(<ConfirmOverwriteModal isOpen={true} onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.getByText("This will overwrite your current configuration. Continue?")).toBeInTheDocument();
  });

  it("'Cancel' button calls onCancel", async () => {
    const onCancel = jest.fn();
    render(<ConfirmOverwriteModal isOpen={true} onConfirm={() => {}} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("'Load' button calls onConfirm", async () => {
    const onConfirm = jest.fn();
    render(<ConfirmOverwriteModal isOpen={true} onConfirm={onConfirm} onCancel={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Load" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
