/** Covers browser rendering, tab interactions, and pointer and keyboard resizing. */
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

  it("exposes resize values and supports keyboard resizing", () => {
    const onHeightCommit = jest.fn();
    render(
      <BottomDrawer
        tabs={[{ id: "specs", label: "System Specs", content: <div>Specs</div> }]}
        initialHeight={300}
        onHeightCommit={onHeightCommit}
      />,
    );
    const handle = screen.getByRole("separator", { name: "Resize drawer" });

    expect(handle).toHaveAttribute("aria-valuemin", "48");
    expect(handle).toHaveAttribute("aria-valuemax", "850");
    expect(handle).toHaveAttribute("aria-valuenow", "300");
    fireEvent.keyDown(handle, { key: "ArrowUp" });
    expect(handle).toHaveAttribute("aria-valuenow", "310");
    expect(onHeightCommit).toHaveBeenLastCalledWith(310);
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

  it("applies a custom panel class to the tab panel", () => {
    render(
      <BottomDrawer
        tabs={[
          { id: "specs", label: "System Specs", content: <div>Specs content</div> },
        ]}
        panelClassName="p-0"
      />
    );

    expect(screen.getByRole("tabpanel")).toHaveClass("p-0");
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

  it("does not flex-shrink while resized", async () => {
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
    expect(drawer).toHaveClass("shrink-0");
  });

  it("keeps the provided initial height after mount", async () => {
    render(
      <BottomDrawer
        tabs={[
          { id: "specs", label: "System Specs", content: <div>content</div> },
        ]}
        initialHeight={512}
      />
    );

    const drawer = getDrawerRoot(screen.getByRole("separator", { name: "Resize drawer" }));

    await waitFor(() => {
      expect(drawer).toHaveStyle({ height: "512px" });
    });
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

  it.each([
    [58, true],
    [59, false],
  ] as const)("uses the inclusive collapsed threshold at %d pixels", (initialHeight, collapsed) => {
    render(
      <BottomDrawer
        tabs={[{ id: "specs", label: "System Specs", content: <div>content</div> }]}
        initialHeight={initialHeight}
      />,
    );

    const drawer = getDrawerRoot(screen.getByRole("separator", { name: "Resize drawer" }));
    expect(drawer).toHaveStyle({ height: `${collapsed ? 48 : initialHeight}px` });
    if (collapsed) {
      expect(screen.queryByText("content")).not.toBeInTheDocument();
    } else {
      expect(screen.getByText("content")).toBeInTheDocument();
    }
  });

  it("ignores pointer movement and release before a drag starts", () => {
    const onHeightCommit = jest.fn();
    render(
      <BottomDrawer
        tabs={[{ id: "specs", label: "System Specs", content: <div>content</div> }]}
        initialHeight={300}
        onHeightCommit={onHeightCommit}
      />,
    );
    const handle = screen.getByRole("separator", { name: "Resize drawer" });
    const drawer = getDrawerRoot(handle);

    fireEvent.pointerMove(handle, { clientY: 0, pointerId: 1 });
    fireEvent.pointerUp(handle, { pointerId: 1 });

    expect(drawer).toHaveStyle({ height: "300px" });
    expect(onHeightCommit).not.toHaveBeenCalled();
  });

  it("caps pointer resizing at 85 percent of the viewport", () => {
    render(
      <BottomDrawer
        tabs={[{ id: "specs", label: "System Specs", content: <div>content</div> }]}
        initialHeight={300}
      />,
    );
    const handle = screen.getByRole("separator", { name: "Resize drawer" });
    const drawer = getDrawerRoot(handle);
    mockPointerCapture(handle);

    fireEvent.pointerDown(handle, { clientY: 700, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientY: -1000, pointerId: 1 });

    expect(drawer).toHaveStyle({ height: "850px" });
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

  it("captures the pointer on the resize handle", () => {
    render(
      <BottomDrawer
        tabs={[{ id: "specs", label: "System Specs", content: <div>content</div> }]}
        initialHeight={300}
      />,
    );
    const handle = screen.getByRole("separator", { name: "Resize drawer" });
    mockPointerCapture(handle);

    fireEvent.pointerDown(handle, { clientY: 700, pointerId: 7 });

    expect(handle.setPointerCapture).toHaveBeenCalledTimes(1);
  });

  it("reports live height changes while dragging before the height is committed", async () => {
    const onHeightChange = jest.fn();

    render(
      <BottomDrawer
        tabs={[
          { id: "specs", label: "System Specs", content: <div>content</div> },
        ]}
        onHeightChange={onHeightChange}
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

    expect(onHeightChange).toHaveBeenCalledWith(500);
  });

  it.each([
    ["ArrowUp", 310],
    ["ArrowDown", 290],
    ["Home", 48],
    ["End", 850],
  ] as const)("supports %s keyboard resizing", (key, expectedHeight) => {
    const onHeightCommit = jest.fn();
    render(
      <BottomDrawer
        tabs={[{ id: "specs", label: "System Specs", content: <div>content</div> }]}
        initialHeight={300}
        onHeightCommit={onHeightCommit}
      />,
    );
    const handle = screen.getByRole("separator", { name: "Resize drawer" });

    fireEvent.keyDown(handle, { key });

    expect(handle).toHaveAttribute("aria-valuenow", `${expectedHeight}`);
    expect(onHeightCommit).toHaveBeenCalledWith(expectedHeight);
  });

  it("ignores unrelated keyboard input and tolerates omitted callbacks", () => {
    render(
      <BottomDrawer
        tabs={[{ id: "specs", label: "System Specs", content: <div>content</div> }]}
        initialHeight={300}
      />,
    );
    const handle = screen.getByRole("separator", { name: "Resize drawer" });

    expect(() => fireEvent.keyDown(handle, { key: "PageDown" })).not.toThrow();
    expect(handle).toHaveAttribute("aria-valuenow", "300");
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

  it("reports live height changes when toggled collapsed and expanded", async () => {
    const onHeightChange = jest.fn();
    const user = userEvent.setup();
    const expectedOpenHeight = Math.round(window.innerHeight * 0.4);

    render(
      <BottomDrawer
        tabs={[
          { id: "specs", label: "System Specs", content: <div>content</div> },
        ]}
        onHeightChange={onHeightChange}
      />
    );

    const drawer = getDrawerRoot(screen.getByRole("separator", { name: "Resize drawer" }));
    const toggleButton = screen.getByRole("button", { name: "Toggle drawer" });

    await waitFor(() => {
      expect(drawer).toHaveStyle({ height: `${expectedOpenHeight}px` });
    });

    await user.click(toggleButton);
    await user.click(toggleButton);

    expect(onHeightChange).toHaveBeenCalledTimes(2);
    expect(onHeightChange).toHaveBeenNthCalledWith(1, 48);
    expect(onHeightChange).toHaveBeenNthCalledWith(2, expectedOpenHeight);
  });

  it("shows the collapse state through the toggle label and keeps the panel classes", async () => {
    const user = userEvent.setup();
    render(
      <BottomDrawer
        tabs={[{ id: "specs", label: "System Specs", content: <div>content</div> }]}
        initialHeight={300}
      />,
    );

    const drawer = getDrawerRoot(screen.getByRole("separator", { name: "Resize drawer" }));
    const toggleButton = screen.getByRole("button", { name: "Toggle drawer" });
    const panel = screen.getByRole("tabpanel");
    expect(drawer).toHaveClass("will-change-[height]");
    expect(panel).toHaveClass("flex-1", "overflow-auto", "p-3");
    expect(toggleButton).toHaveTextContent("▼");

    await user.click(toggleButton);
    expect(toggleButton).toHaveTextContent("▲");
  });

  it("cancels the default-height frame when unmounted", () => {
    const cancelAnimationFrame = jest.spyOn(window, "cancelAnimationFrame");
    const { unmount } = render(
      <BottomDrawer
        tabs={[{ id: "specs", label: "System Specs", content: <div>content</div> }]}
      />,
    );

    unmount();

    expect(cancelAnimationFrame).toHaveBeenCalled();
    cancelAnimationFrame.mockRestore();
  });

  it("reruns initialization when initialHeight changes", async () => {
    const { rerender } = render(
      <BottomDrawer
        tabs={[{ id: "specs", label: "System Specs", content: <div>content</div> }]}
        initialHeight={512}
      />,
    );
    const drawer = getDrawerRoot(screen.getByRole("separator", { name: "Resize drawer" }));

    rerender(
      <BottomDrawer
        tabs={[{ id: "specs", label: "System Specs", content: <div>content</div> }]}
      />,
    );

    await waitFor(() => {
      expect(drawer).toHaveStyle({ height: "400px" });
    });
  });

  it("does not replace a provided initial height during effect initialization", async () => {
    const requestAnimationFrame = jest.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 0;
    });

    render(
      <BottomDrawer
        tabs={[{ id: "specs", label: "System Specs", content: <div>content</div> }]}
        initialHeight={512}
      />,
    );
    const drawer = getDrawerRoot(screen.getByRole("separator", { name: "Resize drawer" }));

    await waitFor(() => {
      expect(drawer).toHaveStyle({ height: "512px" });
    });
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    requestAnimationFrame.mockRestore();
  });

  it("uses the browser viewport when calculating the maximum height", async () => {
    setupWindowHeight(1200);
    render(
      <BottomDrawer
        tabs={[{ id: "specs", label: "System Specs", content: <div>content</div> }]}
        initialHeight={300}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("separator", { name: "Resize drawer" }))
        .toHaveAttribute("aria-valuemax", "1020");
    });
  });

  it("uses a small browser viewport to calculate the maximum height", async () => {
    setupWindowHeight(800);
    render(
      <BottomDrawer
        tabs={[{ id: "specs", label: "System Specs", content: <div>content</div> }]}
        initialHeight={300}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("separator", { name: "Resize drawer" }))
        .toHaveAttribute("aria-valuemax", "680");
    });
  });

  it("ignores pointer movement after the drag is released", () => {
    const onHeightChange = jest.fn();
    render(
      <BottomDrawer
        tabs={[{ id: "specs", label: "System Specs", content: <div>content</div> }]}
        initialHeight={300}
        onHeightChange={onHeightChange}
      />,
    );
    const handle = screen.getByRole("separator", { name: "Resize drawer" });
    mockPointerCapture(handle);

    fireEvent.pointerDown(handle, { clientY: 500, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientY: 450, pointerId: 1 });
    fireEvent.pointerUp(handle, { pointerId: 1 });
    fireEvent.pointerMove(handle, { clientY: 400, pointerId: 1 });

    expect(onHeightChange).toHaveBeenCalledTimes(1);
    expect(onHeightChange).toHaveBeenLastCalledWith(350);
  });

  it("uses the latest live height callback while dragging", () => {
    const firstCallback = jest.fn();
    const secondCallback = jest.fn();
    const { rerender } = render(
      <BottomDrawer
        tabs={[{ id: "specs", label: "System Specs", content: <div>content</div> }]}
        initialHeight={300}
        onHeightChange={firstCallback}
      />,
    );
    const handle = screen.getByRole("separator", { name: "Resize drawer" });
    mockPointerCapture(handle);
    fireEvent.pointerDown(handle, { clientY: 500, pointerId: 1 });

    rerender(
      <BottomDrawer
        tabs={[{ id: "specs", label: "System Specs", content: <div>content</div> }]}
        initialHeight={300}
        onHeightChange={secondCallback}
      />,
    );
    fireEvent.pointerMove(handle, { clientY: 450, pointerId: 1 });

    expect(firstCallback).not.toHaveBeenCalled();
    expect(secondCallback).toHaveBeenCalledWith(350);
  });

  it("uses the latest commit callback on pointer release", () => {
    const firstCallback = jest.fn();
    const secondCallback = jest.fn();
    const { rerender } = render(
      <BottomDrawer
        tabs={[{ id: "specs", label: "System Specs", content: <div>content</div> }]}
        initialHeight={300}
        onHeightCommit={firstCallback}
      />,
    );
    const handle = screen.getByRole("separator", { name: "Resize drawer" });
    mockPointerCapture(handle);
    fireEvent.pointerDown(handle, { clientY: 500, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientY: 450, pointerId: 1 });

    rerender(
      <BottomDrawer
        tabs={[{ id: "specs", label: "System Specs", content: <div>content</div> }]}
        initialHeight={300}
        onHeightCommit={secondCallback}
      />,
    );
    fireEvent.pointerUp(handle, { pointerId: 1 });

    expect(firstCallback).not.toHaveBeenCalled();
    expect(secondCallback).toHaveBeenCalledWith(350);
  });

  it("uses the latest callbacks for keyboard commits after rerender", () => {
    const firstChange = jest.fn();
    const firstCommit = jest.fn();
    const secondChange = jest.fn();
    const secondCommit = jest.fn();
    const { rerender } = render(
      <BottomDrawer
        tabs={[{ id: "specs", label: "System Specs", content: <div>content</div> }]}
        initialHeight={300}
        onHeightChange={firstChange}
        onHeightCommit={firstCommit}
      />,
    );
    const handle = screen.getByRole("separator", { name: "Resize drawer" });

    rerender(
      <BottomDrawer
        tabs={[{ id: "specs", label: "System Specs", content: <div>content</div> }]}
        initialHeight={300}
        onHeightChange={secondChange}
        onHeightCommit={secondCommit}
      />,
    );
    fireEvent.keyDown(handle, { key: "ArrowUp" });

    expect(firstChange).not.toHaveBeenCalled();
    expect(firstCommit).not.toHaveBeenCalled();
    expect(secondChange).toHaveBeenCalledWith(310);
    expect(secondCommit).toHaveBeenCalledWith(310);
  });

  it("keeps the collapsed ref synchronized with the collapse toggle", async () => {
    const user = userEvent.setup();
    render(
      <BottomDrawer
        tabs={[{ id: "specs", label: "System Specs", content: <div>content</div> }]}
        initialHeight={300}
      />,
    );
    const handle = screen.getByRole("separator", { name: "Resize drawer" });

    await user.click(screen.getByRole("button", { name: "Toggle drawer" }));
    fireEvent.keyDown(handle, { key: "ArrowUp" });
    expect(handle).toHaveAttribute("aria-valuenow", "48");
    expect(getDrawerRoot(handle)).toHaveStyle({ height: "48px" });
  });

  it("uses the open height after expanding from collapsed state", async () => {
    const user = userEvent.setup();
    render(
      <BottomDrawer
        tabs={[{ id: "specs", label: "System Specs", content: <div>content</div> }]}
        initialHeight={48}
      />,
    );
    const handle = screen.getByRole("separator", { name: "Resize drawer" });

    await user.click(screen.getByRole("button", { name: "Toggle drawer" }));
    fireEvent.keyDown(handle, { key: "ArrowDown" });
    expect(handle).toHaveAttribute("aria-valuenow", "390");
    expect(getDrawerRoot(handle)).toHaveStyle({ height: "390px" });
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

  it("applies a custom panel class in non-draggable mode", () => {
    render(<BottomDrawer tabs={tabs} draggable={false} panelClassName="p-0" />);
    expect(screen.getByRole("tabpanel")).toHaveClass("p-0");
  });

  it("keeps the default non-draggable panel padding when no override is supplied", () => {
    render(<BottomDrawer tabs={tabs} draggable={false} />);

    expect(screen.getByRole("tabpanel")).toHaveClass("p-3");
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
