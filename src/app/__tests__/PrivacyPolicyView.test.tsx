import React from "react";
import { render, screen } from "@testing-library/react";
import { PrivacyPolicyView } from "@/app/PrivacyPolicyView";

describe("PrivacyPolicyView", () => {
  it("renders heading 'Privacy Policy'", () => {
    render(<PrivacyPolicyView />);
    expect(screen.getByRole("heading", { name: "Privacy Policy" })).toBeInTheDocument();
  });

  it("mentions jsdelivr CDN", () => {
    render(<PrivacyPolicyView />);
    expect(screen.getByText(/cdn\.jsdelivr\.net/i)).toBeInTheDocument();
  });

  it("mentions pythonhosted CDN", () => {
    render(<PrivacyPolicyView />);
    expect(screen.getByText(/files\.pythonhosted\.org/i)).toBeInTheDocument();
  });

  it("mentions pypi CDN", () => {
    render(<PrivacyPolicyView />);
    expect(screen.getByText(/pypi\.org/i)).toBeInTheDocument();
  });
});
