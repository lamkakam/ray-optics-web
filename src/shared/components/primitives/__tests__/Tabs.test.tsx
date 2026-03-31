import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs } from "@/shared/components/primitives/Tabs";

const TABS = [
  { id: "a", label: "Alpha", content: <div>Alpha content</div> },
  { id: "b", label: "Beta", content: <div>Beta content</div> },
  { id: "c", label: "Gamma", content: <div>Gamma content</div> },
];

describe("Tabs", () => {
  it("renders tab buttons with correct labels", () => {
    render(<Tabs tabs={TABS} />);
    expect(screen.getByRole("tab", { name: "Alpha" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Beta" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Gamma" })).toBeInTheDocument();
  });

  it("renders first tab content by default", () => {
    render(<Tabs tabs={TABS} />);
    expect(screen.getByText("Alpha content")).toBeInTheDocument();
    expect(screen.queryByText("Beta content")).not.toBeInTheDocument();
  });

  it("switches content when another tab is clicked", async () => {
    render(<Tabs tabs={TABS} />);
    await userEvent.click(screen.getByRole("tab", { name: "Beta" }));
    expect(screen.getByText("Beta content")).toBeInTheDocument();
    expect(screen.queryByText("Alpha content")).not.toBeInTheDocument();
  });

  it("active tab has aria-selected=true, others aria-selected=false", () => {
    render(<Tabs tabs={TABS} />);
    expect(screen.getByRole("tab", { name: "Alpha" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Beta" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "Gamma" })).toHaveAttribute("aria-selected", "false");
  });

  it("active tab applies activeBgColor and activeTextColor token classes", () => {
    render(<Tabs tabs={TABS} />);
    const activeTab = screen.getByRole("tab", { name: "Alpha" });
    expect(activeTab.className).toMatch(/bg-gray-100/);
    expect(activeTab.className).toMatch(/text-gray-900/);
  });

  it("inactive tab applies inactiveTextColor token class", () => {
    render(<Tabs tabs={TABS} />);
    const inactiveTab = screen.getByRole("tab", { name: "Beta" });
    expect(inactiveTab.className).toMatch(/text-gray-500/);
  });

  it("renders actions slot when provided", () => {
    render(<Tabs tabs={TABS} actions={<button>Extra</button>} />);
    expect(screen.getByRole("button", { name: "Extra" })).toBeInTheDocument();
  });

  it("does not render actions when omitted", () => {
    const { container } = render(<Tabs tabs={TABS} />);
    // only tab buttons should be present, no extra buttons
    expect(screen.queryByRole("button", { name: "Extra" })).not.toBeInTheDocument();
    // sanity: tab buttons still there
    expect(container.querySelectorAll('[role="tab"]')).toHaveLength(3);
  });

  it("showPanel=false hides the tabpanel", () => {
    render(<Tabs tabs={TABS} showPanel={false} />);
    expect(screen.queryByRole("tabpanel")).not.toBeInTheDocument();
  });

  it("showPanel defaults to true (panel visible)", () => {
    render(<Tabs tabs={TABS} />);
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
  });

  it("panelClassName is applied to the tabpanel div", () => {
    render(<Tabs tabs={TABS} panelClassName="custom-panel-class" />);
    const panel = screen.getByRole("tabpanel");
    expect(panel.className).toMatch(/custom-panel-class/);
  });

  it("tablist has overflow-x-auto to allow horizontal scrolling", () => {
    render(<Tabs tabs={TABS} />);
    const tablist = screen.getByRole("tablist");
    expect(tablist.className).toMatch(/overflow-x-auto/);
  });

  it("tab buttons have whitespace-nowrap to prevent label wrapping", () => {
    render(<Tabs tabs={TABS} />);
    const tab = screen.getByRole("tab", { name: "Alpha" });
    expect(tab.className).toMatch(/whitespace-nowrap/);
  });
});
