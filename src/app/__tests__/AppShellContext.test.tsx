/**
 * Verifies the public contract of the AppShell runtime context independently
 * from the larger application shell and its worker-backed providers.
 */
import { render } from "@testing-library/react";
import { AppShellProvider, useAppShell } from "@/app/AppShellContext";

const suppliedValue = {
  proxy: undefined,
  isReady: false,
  openErrorModal: jest.fn(),
};

function ContextProbe({
  onRead,
}: {
  readonly onRead: (value: ReturnType<typeof useAppShell>) => void;
}) {
  onRead(useAppShell());
  return <span>Context consumer</span>;
}

describe("useAppShell", () => {
  it("throws when rendered outside AppShellProvider", () => {
    expect(() => render(<ContextProbe onRead={jest.fn()} />)).toThrow(
      "useAppShell must be used within an AppShellProvider",
    );
  });

  it("returns the exact value supplied by AppShellProvider", () => {
    const onRead = jest.fn();

    render(
      <AppShellProvider value={suppliedValue}>
        <ContextProbe onRead={onRead} />
      </AppShellProvider>,
    );

    expect(onRead).toHaveBeenCalledWith(suppliedValue);
  });
});
