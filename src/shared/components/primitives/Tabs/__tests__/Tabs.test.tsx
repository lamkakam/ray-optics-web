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

  it("renders the controlled active tab when activeTabId is provided", () => {
    render(<Tabs tabs={TABS} activeTabId="c" />);
    expect(screen.getByText("Gamma content")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Gamma" })).toHaveAttribute("aria-selected", "true");
  });

  it("calls onTabChange in controlled mode when a different tab is clicked", async () => {
    const onTabChange = jest.fn();
    render(<Tabs tabs={TABS} activeTabId="a" onTabChange={onTabChange} />);

    await userEvent.click(screen.getByRole("tab", { name: "Beta" }));

    expect(onTabChange).toHaveBeenCalledWith("b");
    expect(screen.getByText("Alpha content")).toBeInTheDocument();
  });

  it("falls back to the first tab when controlled activeTabId does not exist", () => {
    render(<Tabs tabs={TABS} activeTabId="missing" />);
    expect(screen.getByText("Alpha content")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Alpha" })).toHaveAttribute("aria-selected", "true");
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

  it("falls back to the first remaining tab after the active tab is removed", async () => {
    const { rerender } = render(<Tabs tabs={TABS} />);

    await userEvent.click(screen.getByRole("tab", { name: "Beta" }));
    rerender(<Tabs tabs={[TABS[0]]} />);

    expect(screen.getByText("Alpha content")).toBeInTheDocument();
  });

  it("preserves the uncontrolled selection when controlled mode is released", async () => {
    const { rerender } = render(<Tabs tabs={TABS} activeTabId="a" />);

    await userEvent.click(screen.getByRole("tab", { name: "Beta" }));
    rerender(<Tabs tabs={TABS} />);

    expect(screen.getByText("Alpha content")).toBeInTheDocument();
  });

  it("renders an empty tab set without requiring a first tab", () => {
    render(<Tabs tabs={[]} />);

    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
    expect(screen.getByRole("tabpanel")).toBeEmptyDOMElement();
  });

  it("keeps the first tab selected when a later tab has an empty id", () => {
    render(
      <Tabs
        tabs={[
          { id: "first", label: "First", content: <div>First content</div> },
          { id: "", label: "Empty id", content: <div>Empty content</div> },
        ]}
      />,
    );

    expect(screen.getByText("First content")).toBeInTheDocument();
    expect(screen.queryByText("Empty content")).not.toBeInTheDocument();
  });

  it("keeps an initially empty uncontrolled selection when an empty-id tab appears later", () => {
    const { rerender } = render(<Tabs tabs={[]} />);

    rerender(
      <Tabs
        tabs={[
          { id: "first", label: "First", content: <div>First content</div> },
          { id: "", label: "Empty id", content: <div>Empty content</div> },
        ]}
      />,
    );

    expect(screen.getByText("Empty content")).toBeInTheDocument();
    expect(screen.queryByText("First content")).not.toBeInTheDocument();
  });
});
