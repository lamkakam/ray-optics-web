import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrivacyPolicyModal } from "@/components/composite/PrivacyPolicyModal";

describe("PrivacyPolicyModal", () => {
  it("does not render when isOpen=false", () => {
    render(<PrivacyPolicyModal isOpen={false} onClose={() => {}} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders dialog when isOpen=true", () => {
    render(<PrivacyPolicyModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("renders title 'Privacy Policy'", () => {
    render(<PrivacyPolicyModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
  });

  it("renders mention of cdn.jsdelivr.net", () => {
    render(<PrivacyPolicyModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText(/cdn\.jsdelivr\.net/)).toBeInTheDocument();
  });

  it("renders mention of files.pythonhosted.org", () => {
    render(<PrivacyPolicyModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText(/files\.pythonhosted\.org/)).toBeInTheDocument();
  });

  it("renders mention of pypi.org", () => {
    render(<PrivacyPolicyModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText(/pypi\.org/)).toBeInTheDocument();
  });

  it("'Close' button calls onClose", async () => {
    const onClose = jest.fn();
    render(<PrivacyPolicyModal isOpen={true} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
