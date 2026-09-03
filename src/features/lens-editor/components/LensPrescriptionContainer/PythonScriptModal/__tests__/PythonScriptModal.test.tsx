import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PythonScriptModal } from "../";

jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: jest.fn() }),
}));

const USER_DEFINED_MATERIALS = "import json\nuser_defined_materials = {}";
const REMAINING_SCRIPT = "import rayoptics\nprint('hello')";

const COPY_ALL_LABEL = "Copy all to clipboard";
const COPY_USER_DEFINED_MATERIALS_LABEL = "Copy user-defined materials to clipboard";
const COPY_REMAINING_SCRIPT_LABEL = "Copy remaining script to clipboard";

function renderPythonScriptModal(onClose = jest.fn()) {
  return render(
    <PythonScriptModal
      isOpen={true}
      userDefinedMaterials={USER_DEFINED_MATERIALS}
      remainingScript={REMAINING_SCRIPT}
      onClose={onClose}
    />,
  );
}

describe("PythonScriptModal", () => {
  it("does not render when isOpen=false", () => {
    render(
      <PythonScriptModal
        isOpen={false}
        userDefinedMaterials={USER_DEFINED_MATERIALS}
        remainingScript={REMAINING_SCRIPT}
        onClose={jest.fn()}
      />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders dialog with title 'Python Script' when isOpen=true", () => {
    render(
      <PythonScriptModal
        isOpen={true}
        userDefinedMaterials={USER_DEFINED_MATERIALS}
        remainingScript={REMAINING_SCRIPT}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Python Script")).toBeInTheDocument();
  });

  it("displays the two sections in separate <pre><code> blocks", () => {
    renderPythonScriptModal();
    const codeElements = screen.getByRole("dialog").querySelectorAll("pre > code");

    expect(codeElements).toHaveLength(2);
    expect(codeElements[0]).toHaveTextContent(USER_DEFINED_MATERIALS, { normalizeWhitespace: false });
    expect(codeElements[1]).toHaveTextContent(REMAINING_SCRIPT, { normalizeWhitespace: false });
  });

  it("instructs users to replace the custom glass JSON path", () => {
    renderPythonScriptModal();

    expect(screen.getByText(
      "Replace <PATH TO CUSTOM GLASS JSON FILE> with the real path to your custom glass JSON file before running the script.",
    )).toBeInTheDocument();
  });

  it("calls onClose when OK button is clicked", async () => {
    const onClose = jest.fn();
    render(
      <PythonScriptModal
        isOpen={true}
        userDefinedMaterials={USER_DEFINED_MATERIALS}
        remainingScript={REMAINING_SCRIPT}
        onClose={onClose}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Ok" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  describe("copy button", () => {
    let writeText: jest.Mock;

    beforeEach(() => {
      writeText = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText },
        writable: true,
      });
    });

    it("renders one Copy all button and one floating Copy button for each section", () => {
      renderPythonScriptModal();

      expect(screen.getByRole("button", { name: COPY_ALL_LABEL })).toHaveTextContent("Copy all");
      expect(screen.getByRole("button", { name: COPY_USER_DEFINED_MATERIALS_LABEL })).toHaveTextContent("Copy");
      expect(screen.getByRole("button", { name: COPY_REMAINING_SCRIPT_LABEL })).toHaveTextContent("Copy");
      expect(screen.getAllByRole("button")).toHaveLength(4);
    });

    it("copies the combined script or the selected section", async () => {
      renderPythonScriptModal();

      await userEvent.click(screen.getByRole("button", { name: COPY_ALL_LABEL }));
      await userEvent.click(screen.getByRole("button", { name: COPY_USER_DEFINED_MATERIALS_LABEL }));
      await userEvent.click(screen.getByRole("button", { name: COPY_REMAINING_SCRIPT_LABEL }));

      expect(writeText).toHaveBeenNthCalledWith(
        1,
        [USER_DEFINED_MATERIALS, REMAINING_SCRIPT].join("\n\n"),
      );
      expect(writeText).toHaveBeenNthCalledWith(2, USER_DEFINED_MATERIALS);
      expect(writeText).toHaveBeenNthCalledWith(3, REMAINING_SCRIPT);
    });

    it("resets each section's Copied feedback on its own two-second timer", async () => {
      jest.useFakeTimers();
      renderPythonScriptModal();
      const materialsButton = screen.getByRole("button", { name: COPY_USER_DEFINED_MATERIALS_LABEL });
      const remainingButton = screen.getByRole("button", { name: COPY_REMAINING_SCRIPT_LABEL });

      await act(async () => {
        fireEvent.click(materialsButton);
      });
      expect(materialsButton).toHaveTextContent("Copied!");
      expect(remainingButton).toHaveTextContent("Copy");

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await act(async () => {
        fireEvent.click(remainingButton);
      });
      expect(materialsButton).toHaveTextContent("Copied!");
      expect(remainingButton).toHaveTextContent("Copied!");

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(materialsButton).toHaveTextContent("Copy");
      expect(remainingButton).toHaveTextContent("Copied!");

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(remainingButton).toHaveTextContent("Copy");
      jest.useRealTimers();
    });
  });

  // --- Tooltip tests ---

  it("gives each copy button distinct tooltip text", () => {
    renderPythonScriptModal();

    expect(screen.getByRole("tooltip", { name: COPY_ALL_LABEL })).toBeInTheDocument();
    expect(screen.getByRole("tooltip", { name: COPY_USER_DEFINED_MATERIALS_LABEL })).toBeInTheDocument();
    expect(screen.getByRole("tooltip", { name: COPY_REMAINING_SCRIPT_LABEL })).toBeInTheDocument();
  });

  it("shows the hovered section tooltip", () => {
    renderPythonScriptModal();
    const btn = screen.getByRole("button", { name: COPY_USER_DEFINED_MATERIALS_LABEL });

    act(() => { fireEvent.mouseEnter(btn.parentElement!); });
    expect(screen.getByRole("tooltip", { name: COPY_USER_DEFINED_MATERIALS_LABEL })).toHaveClass("opacity-100");
  });

  it("section Copy buttons have absolute positioning classes", () => {
    renderPythonScriptModal();
    const buttons = [
      screen.getByRole("button", { name: COPY_USER_DEFINED_MATERIALS_LABEL }),
      screen.getByRole("button", { name: COPY_REMAINING_SCRIPT_LABEL }),
    ];

    for (const button of buttons) {
      const wrapper = button.closest("div.absolute");
      expect(wrapper).toHaveClass("absolute", "right-6", "top-6");
    }
  });
});
