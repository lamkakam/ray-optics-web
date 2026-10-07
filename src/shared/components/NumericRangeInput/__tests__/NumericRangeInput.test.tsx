import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NumericRangeInput } from "@/shared/components/NumericRangeInput";

function renderRange(
  props: Partial<React.ComponentProps<typeof NumericRangeInput>> = {},
) {
  const onMinChange = jest.fn();
  const onMaxChange = jest.fn();
  render(
    <NumericRangeInput
      min="3"
      max={undefined}
      onMinChange={onMinChange}
      onMaxChange={onMaxChange}
      minAriaLabel="Lower bound"
      maxAriaLabel="Upper bound"
      {...props}
    />,
  );
  return { onMinChange, onMaxChange };
}

function ControlledRange({ positive }: { readonly positive?: boolean }) {
  const [min, setMin] = useState<string | undefined>("3");
  const [max, setMax] = useState<string | undefined>(undefined);
  return (
    <NumericRangeInput
      min={min}
      max={max}
      onMinChange={setMin}
      onMaxChange={setMax}
      minAriaLabel="Lower bound"
      maxAriaLabel="Upper bound"
      positive={positive}
    />
  );
}

describe("NumericRangeInput", () => {
  it("renders the lower and upper bound text, showing an absent bound as empty", () => {
    renderRange({ min: "3", max: undefined });

    expect(screen.getByRole("textbox", { name: "Lower bound" })).toHaveValue(
      "3",
    );
    expect(screen.getByRole("textbox", { name: "Upper bound" })).toHaveValue(
      "",
    );
  });

  it("reports each keystroke through the matching bound callback with the raw text", async () => {
    const user = userEvent.setup();
    const { onMinChange, onMaxChange } = renderRange({ min: "", max: "" });

    await user.type(screen.getByRole("textbox", { name: "Upper bound" }), "8");
    await user.type(screen.getByRole("textbox", { name: "Lower bound" }), "2");

    expect(onMaxChange).toHaveBeenCalledWith("8");
    expect(onMinChange).toHaveBeenCalledWith("2");
    expect(onMinChange).toHaveBeenCalledTimes(1);
    expect(onMaxChange).toHaveBeenCalledTimes(1);
  });

  it("lets a bound be cleared to mean unbounded", async () => {
    const user = userEvent.setup();
    render(<ControlledRange positive />);
    const lower = screen.getByRole("textbox", { name: "Lower bound" });

    await user.clear(lower);

    expect(lower).toHaveValue("");
    expect(lower).toBeValid();
  });

  it.each([
    ["blank", "", false],
    ["positive", "2.5", false],
    ["zero", "0", true],
    ["negative", "-1", true],
    ["non-numeric", "abc", true],
  ])(
    "marks a %s bound invalid=%s when bounds must be positive",
    (_, value, invalid) => {
      renderRange({ min: value, max: value, positive: true });

      for (const name of ["Lower bound", "Upper bound"]) {
        const input = screen.getByRole("textbox", { name });
        if (invalid) {
          expect(input).toBeInvalid();
        } else {
          expect(input).toBeValid();
        }
      }
    },
  );

  it.each([
    ["zero", "0", false],
    ["negative", "-1", false],
    ["non-numeric", "1..2", true],
  ])(
    "marks a %s bound invalid=%s when any finite number is allowed",
    (_, value, invalid) => {
      renderRange({ min: value, max: undefined });

      const input = screen.getByRole("textbox", { name: "Lower bound" });
      if (invalid) {
        expect(input).toBeInvalid();
      } else {
        expect(input).toBeValid();
      }
    },
  );
});
