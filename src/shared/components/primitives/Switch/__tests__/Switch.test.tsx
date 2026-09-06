import type React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Switch } from "@/shared/components/primitives/Switch";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";

function splitClasses(str: string): string[] {
  return str.trim().split(/\s+/).filter(Boolean);
}

function expectClasses(element: HTMLElement, ...tokenStrings: string[]) {
  tokenStrings.forEach((token) => {
    splitClasses(token).forEach((cls) => {
      expect(element).toHaveClass(cls);
    });
  });
}

describe("Switch", () => {
  it("renders a named switch with the controlled checked state", () => {
    render(
      <Switch
        checked
        ariaLabel="Use model glass"
        onCheckedChange={jest.fn()}
      />
    );

    const switchButton = screen.getByRole("switch", { name: "Use model glass" });

    expect(switchButton).toHaveAttribute("aria-checked", "true");
  });

  it("defaults to type button", () => {
    render(
      <Switch
        checked={false}
        ariaLabel="Use model glass"
        onCheckedChange={jest.fn()}
      />
    );

    const switchButton = screen.getByRole("switch", { name: "Use model glass" });

    expect(switchButton).toHaveAttribute("type", "button");
  });

  it("calls onCheckedChange with true when unchecked and clicked", async () => {
    const onCheckedChange = jest.fn();
    render(
      <Switch
        checked={false}
        ariaLabel="Use model glass"
        onCheckedChange={onCheckedChange}
      />
    );

    await userEvent.click(screen.getByRole("switch", { name: "Use model glass" }));

    expect(onCheckedChange).toHaveBeenCalledTimes(1);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("calls onCheckedChange with false when checked and clicked", async () => {
    const onCheckedChange = jest.fn();
    render(
      <Switch
        checked
        ariaLabel="Use model glass"
        onCheckedChange={onCheckedChange}
      />
    );

    await userEvent.click(screen.getByRole("switch", { name: "Use model glass" }));

    expect(onCheckedChange).toHaveBeenCalledTimes(1);
    expect(onCheckedChange).toHaveBeenCalledWith(false);
  });

  it("does not call onCheckedChange when disabled", async () => {
    const onCheckedChange = jest.fn();
    render(
      <Switch
        checked={false}
        ariaLabel="Use model glass"
        onCheckedChange={onCheckedChange}
        disabled
      />
    );

    await userEvent.click(screen.getByRole("switch", { name: "Use model glass" }));

    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("does not change state when a consumer click handler prevents default", async () => {
    const onCheckedChange = jest.fn();
    const onClick = jest.fn((event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault());
    render(
      <Switch
        checked={false}
        ariaLabel="Use model glass"
        onCheckedChange={onCheckedChange}
        onClick={onClick}
      />,
    );

    await userEvent.click(screen.getByRole("switch", { name: "Use model glass" }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("renders checkedContent only when checked", () => {
    render(
      <Switch
        checked
        ariaLabel="Use model glass"
        onCheckedChange={jest.fn()}
        checkedContent="On"
        uncheckedContent="Off"
      />
    );

    expect(screen.getByText("On")).toBeInTheDocument();
    expect(screen.queryByText("Off")).not.toBeInTheDocument();
  });

  it("renders uncheckedContent only when unchecked", () => {
    render(
      <Switch
        checked={false}
        ariaLabel="Use model glass"
        onCheckedChange={jest.fn()}
        checkedContent="On"
        uncheckedContent="Off"
      />
    );

    expect(screen.getByText("Off")).toBeInTheDocument();
    expect(screen.queryByText("On")).not.toBeInTheDocument();
  });

  it("positions text content away from the thumb", () => {
    const { rerender } = render(
      <Switch
        checked={false}
        ariaLabel="Set auto aperture dimensions"
        onCheckedChange={jest.fn()}
        checkedContent="Auto"
        uncheckedContent="Manual"
        size="sm"
      />
    );

    const content = screen.getByTestId("switch-content");

    expect(content).toHaveClass("left-6", "right-1");
    expect(content).not.toHaveClass("inset-0");

    rerender(
      <Switch
        checked
        ariaLabel="Set auto aperture dimensions"
        onCheckedChange={jest.fn()}
        checkedContent="Auto"
        uncheckedContent="Manual"
        size="sm"
      />
    );

    expect(content).toHaveClass("left-1", "right-6");
    expect(content).not.toHaveClass("inset-0");
  });

  it("supports ReactNode state content", () => {
    render(
      <Switch
        checked
        ariaLabel="Use model glass"
        onCheckedChange={jest.fn()}
        checkedContent={<span data-testid="switch-icon">icon</span>}
      />
    );

    expect(screen.getByTestId("switch-icon")).toBeInTheDocument();
  });

  it("applies checked state token classes", () => {
    render(
      <Switch
        checked
        ariaLabel="Use model glass"
        onCheckedChange={jest.fn()}
      />
    );

    expectClasses(
      screen.getByRole("switch", { name: "Use model glass" }),
      cx.switch.color.checkedTrackColor,
    );
    expectClasses(
      screen.getByTestId("switch-thumb"),
      cx.switch.size.thumbTranslateCheckedMd,
    );
  });

  it("applies unchecked state token classes", () => {
    render(
      <Switch
        checked={false}
        ariaLabel="Use model glass"
        onCheckedChange={jest.fn()}
      />
    );

    expectClasses(
      screen.getByRole("switch", { name: "Use model glass" }),
      cx.switch.color.uncheckedTrackColor,
    );
    expectClasses(
      screen.getByTestId("switch-thumb"),
      cx.switch.size.thumbTranslateUnchecked,
    );
  });

  it("applies animation tokens", () => {
    render(
      <Switch
        checked={false}
        ariaLabel="Use model glass"
        onCheckedChange={jest.fn()}
      />
    );

    expectClasses(
      screen.getByRole("switch", { name: "Use model glass" }),
      cx.switch.style.trackTransition,
      cx.switch.style.transitionDuration,
      cx.switch.style.transitionEase,
    );
    expectClasses(
      screen.getByTestId("switch-thumb"),
      cx.switch.style.thumbTransition,
      cx.switch.style.transitionDuration,
      cx.switch.style.transitionEase,
      cx.switch.style.thumbWillChange,
    );
    expectClasses(
      screen.getByTestId("switch-content"),
      cx.switch.style.contentTransition,
      cx.switch.style.transitionDuration,
      cx.switch.style.transitionEase,
    );
  });

  it("applies disabled opacity and cursor tokens", () => {
    render(
      <Switch
        checked={false}
        ariaLabel="Use model glass"
        onCheckedChange={jest.fn()}
        disabled
      />
    );

    expectClasses(
      screen.getByRole("switch", { name: "Use model glass" }),
      cx.switch.style.opacity,
      cx.switch.style.cursor,
    );
  });

  it("keeps the switch structure and state content non-interactive", () => {
    render(
      <Switch
        checked={false}
        ariaLabel="Use model glass"
        onCheckedChange={jest.fn()}
        uncheckedContent="Off"
      />
    );

    expect(screen.getByRole("switch")).toHaveClass("relative", "inline-flex", "items-center", "border-0");
    expect(screen.getByTestId("switch-content")).toHaveClass("pointer-events-none");
    expect(screen.getByTestId("switch-thumb")).toHaveClass("pointer-events-none");
  });
});
