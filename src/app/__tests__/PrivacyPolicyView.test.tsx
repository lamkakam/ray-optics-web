import React from "react";
import { render, screen } from "@testing-library/react";
import PrivacyPolicyPage from "@/app/privacy-policy/page";

describe("PrivacyPolicyPage", () => {
  it("renders heading 'Privacy Policy'", () => {
    render(<PrivacyPolicyPage />);
    expect(screen.getByRole("heading", { name: "Privacy Policy" })).toBeInTheDocument();
  });

  it("mentions jsdelivr CDN", () => {
    render(<PrivacyPolicyPage />);
    expect(screen.getByText(/cdn\.jsdelivr\.net/i)).toBeInTheDocument();
  });

  it("mentions pythonhosted CDN", () => {
    render(<PrivacyPolicyPage />);
    expect(screen.getByText(/files\.pythonhosted\.org/i)).toBeInTheDocument();
  });

  it("mentions pypi CDN", () => {
    render(<PrivacyPolicyPage />);
    expect(screen.getByText(/pypi\.org/i)).toBeInTheDocument();
  });
});
