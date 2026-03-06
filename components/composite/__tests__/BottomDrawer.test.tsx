import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BottomDrawer } from "@/components/composite/BottomDrawer";

describe("BottomDrawer", () => {
  it("renders with tabs", () => {
    render(
      <BottomDrawer
        tabs={[
          { id: "specs", label: "System Specs", content: <div>Specs content</div> },
          { id: "prescription", label: "Prescription", content: <div>Prescription content</div> },
        ]}
      />
    );
    expect(screen.getByRole("tab", { name: "System Specs" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Prescription" })).toBeInTheDocument();
  });

  it("shows the first tab content by default", () => {
    render(
      <BottomDrawer
        tabs={[
          { id: "specs", label: "System Specs", content: <div>Specs content</div> },
          { id: "prescription", label: "Prescription", content: <div>Prescription content</div> },
        ]}
      />
    );
    expect(screen.getByText("Specs content")).toBeInTheDocument();
  });

  it("switches tab content when another tab is clicked", async () => {
    render(
      <BottomDrawer
        tabs={[
          { id: "specs", label: "System Specs", content: <div>Specs content</div> },
          { id: "prescription", label: "Prescription", content: <div>Prescription content</div> },
        ]}
      />
    );
    await userEvent.click(screen.getByRole("tab", { name: "Prescription" }));
    expect(screen.getByText("Prescription content")).toBeInTheDocument();
  });

  it("renders a drag handle", () => {
    render(
      <BottomDrawer
        tabs={[
          { id: "specs", label: "System Specs", content: <div>Specs content</div> },
        ]}
      />
    );
    expect(screen.getByRole("separator", { name: "Resize drawer" })).toBeInTheDocument();
  });

  it("renders a collapse/expand toggle button", () => {
    render(
      <BottomDrawer
        tabs={[
          { id: "specs", label: "System Specs", content: <div>content</div> },
        ]}
      />
    );
    expect(screen.getByRole("button", { name: "Toggle drawer" })).toBeInTheDocument();
  });
});
