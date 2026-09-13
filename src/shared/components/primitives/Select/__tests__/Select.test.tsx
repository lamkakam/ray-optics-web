import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select } from "@/shared/components/primitives/Select";

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

const OPTIONS = [
  { value: "a", label: "Option A" },
  { value: "b", label: "Option B" },
  { value: "c", label: "Option C" },
];

describe("Select", () => {
  const responsiveSelectFontSize = "text-base min-[1440px]:text-sm";

  it("renders a <select> element", () => {
    render(<Select options={OPTIONS} aria-label="test-select" />);
    expect(
      screen.getByRole("combobox", { name: "test-select" }),
    ).toBeInTheDocument();
  });

  it("renders correct number of options", () => {
    render(<Select options={OPTIONS} aria-label="test" />);
    const opts = screen.getAllByRole("option");
    expect(opts).toHaveLength(OPTIONS.length);
  });

  it("each option has correct value and label", () => {
    render(<Select options={OPTIONS} aria-label="test" />);
    const opts = screen.getAllByRole("option") as HTMLOptionElement[];
    OPTIONS.forEach((o, i) => {
      expect(opts[i]).toHaveValue(String(o.value));
      expect(opts[i]).toHaveTextContent(o.label);
    });
  });

  it("uses a mobile-safe font size to prevent browser zoom", () => {
    render(<Select options={OPTIONS} aria-label="test" />);
    const el = screen.getByRole("combobox");
    expectClasses(el, responsiveSelectFontSize);
  });

  it("renders a disabled placeholder option first when placeholder provided", () => {
    render(
      <Select options={OPTIONS} placeholder="Choose..." aria-label="test" />,
    );
    const opts = screen.getAllByRole("option") as HTMLOptionElement[];
    expect(opts).toHaveLength(OPTIONS.length + 1);
    expect(opts[0]).toHaveTextContent("Choose...");
    expect(opts[0]).toHaveValue("");
    expect(opts[0]).toBeDisabled();
  });

  it("does not render placeholder option when placeholder is not provided", () => {
    render(<Select options={OPTIONS} aria-label="test" />);
    const opts = screen.getAllByRole("option");
    expect(opts).toHaveLength(OPTIONS.length);
  });

  it("forwards value", () => {
    render(
      <Select
        options={OPTIONS}
        aria-label="test"
        value="b"
        onChange={() => undefined}
      />,
    );
    expect(screen.getByRole("combobox")).toHaveValue("b");
  });

  it("forwards onChange", async () => {
    const onChange = jest.fn();
    render(
      <Select
        options={OPTIONS}
        aria-label="test"
        defaultValue="a"
        onChange={onChange}
      />,
    );
    await userEvent.selectOptions(screen.getByRole("combobox"), "b");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("forwards id", () => {
    render(<Select options={OPTIONS} id="my-select" aria-label="test" />);
    expect(screen.getByRole("combobox")).toHaveAttribute("id", "my-select");
  });

  it("forwards aria-label", () => {
    render(<Select options={OPTIONS} aria-label="my label" />);
    expect(
      screen.getByRole("combobox", { name: "my label" }),
    ).toBeInTheDocument();
  });

  it("forwards disabled", () => {
    render(<Select options={OPTIONS} aria-label="test" disabled />);
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("forwards defaultValue", () => {
    render(<Select options={OPTIONS} aria-label="test" defaultValue="c" />);
    expect(screen.getByRole("combobox")).toHaveValue("c");
  });

  it("handles numeric option values", () => {
    const numOpts = [
      { value: 0, label: "Zero" },
      { value: 1, label: "One" },
      { value: 2, label: "Two" },
    ];
    render(<Select options={numOpts} aria-label="test" defaultValue={1} />);
    const opts = screen.getAllByRole("option") as HTMLOptionElement[];
    expect(opts[0]).toHaveValue("0");
    expect(opts[1]).toHaveValue("1");
    expect(opts[2]).toHaveValue("2");
    expect(screen.getByRole("combobox")).toHaveValue("1");
  });

  it("ref forwarding gives an HTMLSelectElement instance", () => {
    const ref = createRef<HTMLSelectElement>();
    render(<Select options={OPTIONS} aria-label="test" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLSelectElement);
  });
});
