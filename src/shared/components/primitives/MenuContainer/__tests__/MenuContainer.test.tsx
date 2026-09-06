import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import { MenuContainer } from "@/shared/components/primitives/MenuContainer";

describe("MenuContainer", () => {
  it("renders a semantic menu with fixed-height scrolling styles", () => {
    render(
      <MenuContainer aria-label="Example systems">
        <li>Example item</li>
      </MenuContainer>,
    );

    const menu = screen.getByRole("list", { name: "Example systems" });
    expect(menu.tagName).toBe("MENU");
    expect(menu).toHaveClass("max-h-[min(32rem,calc(100dvh-12rem))]");
    expect(menu).toHaveClass("overflow-y-auto");
  });

  it("focuses and selects the next enabled menu button on ArrowDown", () => {
    const handleFirst = jest.fn();
    const handleSecond = jest.fn();

    render(
      <MenuContainer aria-label="Examples">
        <li>
          <button type="button" onClick={handleFirst}>
            First
          </button>
        </li>
        <li>
          <button type="button" onClick={handleSecond}>
            Second
          </button>
        </li>
      </MenuContainer>,
    );

    const first = screen.getByRole("button", { name: "First" });
    const second = screen.getByRole("button", { name: "Second" });

    first.focus();
    fireEvent.keyDown(first, { key: "ArrowDown" });

    expect(second).toHaveFocus();
    expect(handleSecond).toHaveBeenCalledTimes(1);
    expect(handleFirst).not.toHaveBeenCalled();
  });

  it("wraps to the last enabled menu button on ArrowUp from the first button", () => {
    const handleFirst = jest.fn();
    const handleLast = jest.fn();

    render(
      <MenuContainer aria-label="Examples">
        <li>
          <button type="button" onClick={handleFirst}>
            First
          </button>
        </li>
        <li>
          <button type="button" onClick={handleLast}>
            Last
          </button>
        </li>
      </MenuContainer>,
    );

    const first = screen.getByRole("button", { name: "First" });
    const last = screen.getByRole("button", { name: "Last" });

    first.focus();
    fireEvent.keyDown(first, { key: "ArrowUp" });

    expect(last).toHaveFocus();
    expect(handleLast).toHaveBeenCalledTimes(1);
    expect(handleFirst).not.toHaveBeenCalled();
  });

  it("starts at the first or last enabled button when focus is outside the items", () => {
    render(
      <MenuContainer aria-label="Examples">
        <li><button type="button">First</button></li>
        <li><button type="button">Last</button></li>
      </MenuContainer>,
    );
    const menu = screen.getByRole("list", { name: "Examples" });
    const first = screen.getByRole("button", { name: "First" });
    const last = screen.getByRole("button", { name: "Last" });

    fireEvent.keyDown(menu, { key: "ArrowUp" });
    expect(last).toHaveFocus();
    expect(first).not.toHaveFocus();
  });

  it("wraps from the last button to the first on ArrowDown", () => {
    render(
      <MenuContainer aria-label="Examples">
        <li><button type="button">First</button></li>
        <li><button type="button">Last</button></li>
      </MenuContainer>,
    );
    const first = screen.getByRole("button", { name: "First" });
    const last = screen.getByRole("button", { name: "Last" });

    last.focus();
    fireEvent.keyDown(last, { key: "ArrowDown" });

    expect(first).toHaveFocus();
  });

  it("skips disabled menu buttons during arrow navigation", () => {
    const handleFirst = jest.fn();
    const handleDisabled = jest.fn();
    const handleLast = jest.fn();

    render(
      <MenuContainer aria-label="Examples">
        <li>
          <button type="button" onClick={handleFirst}>
            First
          </button>
        </li>
        <li>
          <button type="button" disabled onClick={handleDisabled}>
            Disabled
          </button>
        </li>
        <li>
          <button type="button" onClick={handleLast}>
            Last
          </button>
        </li>
      </MenuContainer>,
    );

    const first = screen.getByRole("button", { name: "First" });
    const last = screen.getByRole("button", { name: "Last" });

    first.focus();
    fireEvent.keyDown(first, { key: "ArrowDown" });

    expect(last).toHaveFocus();
    expect(handleLast).toHaveBeenCalledTimes(1);
    expect(handleDisabled).not.toHaveBeenCalled();
    expect(handleFirst).not.toHaveBeenCalled();
  });

  it("uses the adjacent item in both directions when focus is in the middle", () => {
    render(
      <MenuContainer aria-label="Examples">
        <li><button type="button">First</button></li>
        <li><button type="button">Middle</button></li>
        <li><button type="button">Last</button></li>
      </MenuContainer>,
    );
    const first = screen.getByRole("button", { name: "First" });
    const middle = screen.getByRole("button", { name: "Middle" });
    const last = screen.getByRole("button", { name: "Last" });

    middle.focus();
    fireEvent.keyDown(middle, { key: "ArrowDown" });
    expect(last).toHaveFocus();

    last.focus();
    fireEvent.keyDown(last, { key: "ArrowUp" });
    expect(middle).toHaveFocus();

    first.focus();
    fireEvent.keyDown(first, { key: "ArrowDown" });
    expect(middle).toHaveFocus();
  });

  it("does not navigate when a consumer keydown handler prevents default", () => {
    const handleFirst = jest.fn();
    const handleSecond = jest.fn();

    render(
      <MenuContainer
        aria-label="Examples"
        onKeyDown={(event) => event.preventDefault()}
      >
        <li>
          <button type="button" onClick={handleFirst}>
            First
          </button>
        </li>
        <li>
          <button type="button" onClick={handleSecond}>
            Second
          </button>
        </li>
      </MenuContainer>,
    );

    const first = screen.getByRole("button", { name: "First" });
    const second = screen.getByRole("button", { name: "Second" });

    first.focus();
    fireEvent.keyDown(first, { key: "ArrowDown" });

    expect(first).toHaveFocus();
    expect(second).not.toHaveFocus();
    expect(handleSecond).not.toHaveBeenCalled();
    expect(handleFirst).not.toHaveBeenCalled();
  });

  it("leaves unrelated keys and menus without buttons untouched", () => {
    render(
      <MenuContainer aria-label="Examples">
        <li>Text only</li>
      </MenuContainer>,
    );
    const menu = screen.getByRole("list", { name: "Examples" });
    const event = createEvent.keyDown(menu, { key: "ArrowDown" });

    fireEvent(menu, event);
    expect(event.defaultPrevented).toBe(false);
    fireEvent.keyDown(menu, { key: "Escape" });
    expect(menu).toBeInTheDocument();
  });
});
