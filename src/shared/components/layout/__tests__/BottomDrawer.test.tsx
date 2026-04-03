import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BottomDrawer } from "@/shared/components/layout/BottomDrawer";

const DEFAULT_WINDOW_HEIGHT = 1000;

function setupWindowHeight(height: number = DEFAULT_WINDOW_HEIGHT) {
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    writable: true,
    value: height,
  });
}

function getDrawerRoot(handle: HTMLElement): HTMLElement {
  const drawerRoot = handle.parentElement;
  if (!drawerRoot) {
    throw new Error("Expected drawer root element");
  }
  return drawerRoot;
}

function mockPointerCapture(element: HTMLElement) {
  Object.defineProperty(element, "setPointerCapture", {
    configurable: true,
    value: jest.fn(),
  });
}

describe("BottomDrawer", () => {
  beforeEach(() => {
    setupWindowHeight();
    Object.defineProperty(window, "PointerEvent", {
      configurable: true,
      writable: true,
      value: MouseEvent,
    });
  });

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

  it("renders the controlled active tab content", () => {
    render(
      <BottomDrawer
        tabs={[
          { id: "specs", label: "System Specs", content: <div>Specs content</div> },
          { id: "prescription", label: "Prescription", content: <div>Prescription content</div> },
        ]}
        activeTabId="prescription"
      />
    );

    expect(screen.getByText("Prescription content")).toBeInTheDocument();
  });

  it("calls onTabChange when a tab is clicked in controlled mode", async () => {
    const onTabChange = jest.fn();

    render(
      <BottomDrawer
        tabs={[
          { id: "specs", label: "System Specs", content: <div>Specs content</div> },
          { id: "prescription", label: "Prescription", content: <div>Prescription content</div> },
        ]}
        activeTabId="specs"
        onTabChange={onTabChange}
      />
    );

    await userEvent.click(screen.getByRole("tab", { name: "Prescription" }));

    expect(onTabChange).toHaveBeenCalledWith("prescription");
    expect(screen.getByText("Specs content")).toBeInTheDocument();
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

  it("initializes to the default open height", async () => {
    render(
      <BottomDrawer
        tabs={[
          { id: "specs", label: "System Specs", content: <div>content</div> },
        ]}
      />
    );

    const drawer = getDrawerRoot(screen.getByRole("separator", { name: "Resize drawer" }));

    await waitFor(() => {
      expect(drawer).toHaveStyle({ height: "400px" });
    });
  });

  it("uses the provided initial height on first render", () => {
    render(
      <BottomDrawer
        tabs={[
          { id: "specs", label: "System Specs", content: <div>content</div> },
        ]}
        initialHeight={512}
      />
    );

    const drawer = getDrawerRoot(screen.getByRole("separator", { name: "Resize drawer" }));

    expect(drawer).toHaveStyle({ height: "512px" });
  });

  it("starts collapsed when the provided initial height is collapsed", () => {
    render(
      <BottomDrawer
        tabs={[
          { id: "specs", label: "System Specs", content: <div>content</div> },
        ]}
        initialHeight={48}
      />
    );

    const drawer = getDrawerRoot(screen.getByRole("separator", { name: "Resize drawer" }));

    expect(drawer).toHaveStyle({ height: "48px" });
    expect(screen.queryByText("content")).not.toBeInTheDocument();
  });

  it("keeps the dragged height after pointer release instead of snapping", async () => {
    render(
      <BottomDrawer
        tabs={[
          { id: "specs", label: "System Specs", content: <div>content</div> },
        ]}
      />
    );

    const handle = screen.getByRole("separator", { name: "Resize drawer" });
    const drawer = getDrawerRoot(handle);
    mockPointerCapture(handle);

    await waitFor(() => {
      expect(drawer).toHaveStyle({ height: "400px" });
    });

    fireEvent.pointerDown(handle, {
      clientY: 700,
      pointerId: 1,
    });
    fireEvent.pointerMove(handle, {
      clientY: 600,
      pointerId: 1,
    });

    expect(drawer).toHaveStyle({ height: "500px" });

    fireEvent.pointerUp(handle, { pointerId: 1 });

    expect(drawer).toHaveStyle({ height: "500px" });
  });

  it("commits the dragged height only after pointer release", async () => {
    const onHeightCommit = jest.fn();

    render(
      <BottomDrawer
        tabs={[
          { id: "specs", label: "System Specs", content: <div>content</div> },
        ]}
        onHeightCommit={onHeightCommit}
      />
    );

    const handle = screen.getByRole("separator", { name: "Resize drawer" });
    mockPointerCapture(handle);

    await waitFor(() => {
      const drawer = getDrawerRoot(handle);
      expect(drawer).toHaveStyle({ height: "400px" });
    });

    fireEvent.pointerDown(handle, {
      clientY: 700,
      pointerId: 1,
    });
    fireEvent.pointerMove(handle, {
      clientY: 600,
      pointerId: 1,
    });

    expect(onHeightCommit).not.toHaveBeenCalled();

    fireEvent.pointerUp(handle, { pointerId: 1 });

    expect(onHeightCommit).toHaveBeenCalledWith(500);
  });

  it("collapses when dragged down to the minimum height", async () => {
    render(
      <BottomDrawer
        tabs={[
          { id: "specs", label: "System Specs", content: <div>content</div> },
        ]}
      />
    );

    const handle = screen.getByRole("separator", { name: "Resize drawer" });
    const drawer = getDrawerRoot(handle);
    mockPointerCapture(handle);

    await waitFor(() => {
      expect(drawer).toHaveStyle({ height: "400px" });
    });

    fireEvent.pointerDown(handle, {
      clientY: 500,
      pointerId: 1,
    });
    fireEvent.pointerMove(handle, {
      clientY: 200,
      pointerId: 1,
    });
    fireEvent.pointerMove(handle, {
      clientY: 1300,
      pointerId: 1,
    });
    fireEvent.pointerUp(handle, { pointerId: 1 });

    expect(drawer).toHaveStyle({ height: "48px" });
    expect(screen.queryByText("content")).not.toBeInTheDocument();
  });

  it("restores the default open height after collapsing with the toggle button", async () => {
    const user = userEvent.setup();

    render(
      <BottomDrawer
        tabs={[
          { id: "specs", label: "System Specs", content: <div>content</div> },
        ]}
      />
    );

    const drawer = getDrawerRoot(screen.getByRole("separator", { name: "Resize drawer" }));
    const toggleButton = screen.getByRole("button", { name: "Toggle drawer" });

    await waitFor(() => {
      expect(drawer).toHaveStyle({ height: "400px" });
    });

    await user.click(toggleButton);
    expect(drawer).toHaveStyle({ height: "48px" });

    await user.click(toggleButton);
    expect(drawer).toHaveStyle({ height: "400px" });
  });

  it("commits the collapsed and restored heights when toggled", async () => {
    const onHeightCommit = jest.fn();
    const user = userEvent.setup();
    const expectedOpenHeight = Math.round(window.innerHeight * 0.4);

    render(
      <BottomDrawer
        tabs={[
          { id: "specs", label: "System Specs", content: <div>content</div> },
        ]}
        onHeightCommit={onHeightCommit}
      />
    );

    const drawer = getDrawerRoot(screen.getByRole("separator", { name: "Resize drawer" }));
    const toggleButton = screen.getByRole("button", { name: "Toggle drawer" });

    await waitFor(() => {
      expect(drawer).toHaveStyle({ height: `${expectedOpenHeight}px` });
    });

    await user.click(toggleButton);
    await user.click(toggleButton);

    expect(onHeightCommit).toHaveBeenCalledTimes(2);
    expect(onHeightCommit).toHaveBeenNthCalledWith(1, 48);
    expect(onHeightCommit).toHaveBeenNthCalledWith(2, expectedOpenHeight);
  });
});

describe("BottomDrawer with draggable=false", () => {
  const tabs = [
    { id: "specs", label: "System Specs", content: <div>Specs content</div> },
    { id: "prescription", label: "Prescription", content: <div>Prescription content</div> },
  ];

  it("does not render a drag handle", () => {
    render(<BottomDrawer tabs={tabs} draggable={false} />);
    expect(screen.queryByRole("separator", { name: "Resize drawer" })).not.toBeInTheDocument();
  });

  it("does not render a collapse/expand toggle button", () => {
    render(<BottomDrawer tabs={tabs} draggable={false} />);
    expect(screen.queryByRole("button", { name: "Toggle drawer" })).not.toBeInTheDocument();
  });

  it("shows the first tab content without needing to expand", () => {
    render(<BottomDrawer tabs={tabs} draggable={false} />);
    expect(screen.getByText("Specs content")).toBeInTheDocument();
  });

  it("switches tab content when another tab is clicked", async () => {
    render(<BottomDrawer tabs={tabs} draggable={false} />);
    await userEvent.click(screen.getByRole("tab", { name: "Prescription" }));
    expect(screen.getByText("Prescription content")).toBeInTheDocument();
  });

  it("respects controlled tab selection in non-draggable mode", () => {
    render(<BottomDrawer tabs={tabs} draggable={false} activeTabId="prescription" />);
    expect(screen.getByText("Prescription content")).toBeInTheDocument();
  });
});
