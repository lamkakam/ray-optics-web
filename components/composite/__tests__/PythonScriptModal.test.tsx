import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PythonScriptModal } from "@/components/composite/PythonScriptModal";

jest.mock("@/components/ThemeProvider", () => ({
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
});
