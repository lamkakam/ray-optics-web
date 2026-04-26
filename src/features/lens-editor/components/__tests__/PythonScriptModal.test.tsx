import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PythonScriptModal } from "@/features/lens-editor/components/PythonScriptModal";

jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: jest.fn() }),
}));

const SAMPLE_SCRIPT = "import rayoptics\nprint('hello')";

describe("PythonScriptModal", () => {
  it("does not render when isOpen=false", () => {
    render(
      <PythonScriptModal
        isOpen={false}
        script={SAMPLE_SCRIPT}
        onClose={jest.fn()}
      />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders dialog with title 'Python Script' when isOpen=true", () => {
    render(
      <PythonScriptModal
        isOpen={true}
        script={SAMPLE_SCRIPT}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Python Script")).toBeInTheDocument();
  });

  it("displays the script string in a <code> element", () => {
    render(
      <PythonScriptModal
        isOpen={true}
        script={SAMPLE_SCRIPT}
        onClose={jest.fn()}
      />
    );
    const code = screen.getByRole("dialog").querySelector("code");
    expect(code).toBeInTheDocument();
    expect(code).toHaveTextContent(SAMPLE_SCRIPT, { normalizeWhitespace: false });
  });

  it("calls onClose when OK button is clicked", async () => {
    const onClose = jest.fn();
    render(
      <PythonScriptModal isOpen={true} script={SAMPLE_SCRIPT} onClose={onClose} />
    );
    await userEvent.click(screen.getByRole("button", { name: "Ok" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  describe("copy button", () => {
    beforeEach(() => {
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: jest.fn().mockResolvedValue(undefined) },
        writable: true,
      });
    });

    it("renders copy button when isOpen=true", () => {
      render(
        <PythonScriptModal isOpen={true} script={SAMPLE_SCRIPT} onClose={jest.fn()} />
      );
      expect(screen.getByRole("button", { name: "Copy to clipboard" })).toBeInTheDocument();
    });

    it("calls clipboard API with script on click", async () => {
      render(
        <PythonScriptModal isOpen={true} script={SAMPLE_SCRIPT} onClose={jest.fn()} />
      );
      await userEvent.click(screen.getByRole("button", { name: "Copy to clipboard" }));
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(SAMPLE_SCRIPT);
    });

    it("shows 'Copied!' feedback then reverts to 'Copy' after 2s", async () => {
      jest.useFakeTimers();
      render(
        <PythonScriptModal isOpen={true} script={SAMPLE_SCRIPT} onClose={jest.fn()} />
      );
      const button = screen.getByRole("button", { name: "Copy to clipboard" });
      await act(async () => {
        fireEvent.click(button);
      });
      expect(button).toHaveTextContent("Copied!");
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      expect(button).toHaveTextContent("Copy");
      jest.useRealTimers();
    });
  });

  // --- Tooltip tests ---

  it("Copy button has a tooltip that becomes visible on hover", () => {
    render(
      <PythonScriptModal isOpen={true} script={SAMPLE_SCRIPT} onClose={jest.fn()} />
    );
    const btn = screen.getByRole("button", { name: "Copy to clipboard" });
    // Fire mouseEnter on the Tooltip's span wrapper (direct parent of the button)
    act(() => { fireEvent.mouseEnter(btn.parentElement!); });
    expect(screen.getByRole("tooltip")).toHaveClass("opacity-100");
  });

  it("Copy button wrapper div has absolute positioning classes", () => {
    render(
      <PythonScriptModal isOpen={true} script={SAMPLE_SCRIPT} onClose={jest.fn()} />
    );
    const btn = screen.getByRole("button", { name: "Copy to clipboard" });
    const wrapper = btn.closest("div.absolute");
    expect(wrapper).toHaveClass("absolute", "right-6", "top-6");
  });
});
