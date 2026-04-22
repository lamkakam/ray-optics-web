import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModeSelectField } from "@/features/optimization/components/ModeSelectField";
import { PickupModeFields } from "@/features/optimization/components/PickupModeFields";
import { VariableModeFields } from "@/features/optimization/components/VariableModeFields";

describe("OptimizationModeFields", () => {
  it("renders the shared mode selector and reports changes", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(
      <ModeSelectField
        id="shared-mode"
        label="Mode"
        ariaLabel="Shared mode"
        value="constant"
        onChange={onChange}
      />,
    );

    await user.selectOptions(screen.getByRole("combobox", { name: "Shared mode" }), "pickup");

    expect(onChange).toHaveBeenCalledWith("pickup");
  });

  it("renders shared variable fields, helper text, and validation text", async () => {
    const user = userEvent.setup();
    const onMinChange = jest.fn();
    const onMaxChange = jest.fn();

    render(
      <VariableModeFields
        idPrefix="shared-variable"
        minAriaLabel="Shared Min."
        minValue=""
        maxAriaLabel="Shared Max."
        maxValue=""
        onMinChange={onMinChange}
        onMaxChange={onMaxChange}
        guidanceText={[
          "First helper line.",
          "Second helper line.",
        ]}
        errorText="Bounds are invalid."
      />,
    );

    expect(screen.getByText("First helper line.")).toBeInTheDocument();
    expect(screen.getByText("Second helper line.")).toBeInTheDocument();
    expect(screen.getByText("Bounds are invalid.")).toBeInTheDocument();

    await user.clear(screen.getByRole("textbox", { name: "Shared Min." }));
    await user.type(screen.getByRole("textbox", { name: "Shared Min." }), "3");
    await user.clear(screen.getByRole("textbox", { name: "Shared Max." }));
    await user.type(screen.getByRole("textbox", { name: "Shared Max." }), "4");

    expect(onMinChange).toHaveBeenLastCalledWith("3");
    expect(onMaxChange).toHaveBeenLastCalledWith("4");
  });

  it("renders shared pickup fields and an optional extra pickup field", async () => {
    const user = userEvent.setup();
    const onSourceSurfaceChange = jest.fn();
    const onScaleChange = jest.fn();
    const onOffsetChange = jest.fn();
    const onExtraChange = jest.fn();

    render(
      <PickupModeFields
        idPrefix="shared-pickup"
        sourceSurfaceAriaLabel="Shared source surface index"
        sourceSurfaceValue=""
        onSourceSurfaceChange={onSourceSurfaceChange}
        scaleAriaLabel="Shared scale"
        scaleValue=""
        onScaleChange={onScaleChange}
        offsetAriaLabel="Shared offset"
        offsetValue=""
        onOffsetChange={onOffsetChange}
        extraField={{
          idSuffix: "source-coeff",
          label: "Source coefficient index",
          ariaLabel: "Shared source coefficient index",
          value: "",
          onChange: onExtraChange,
        }}
      />,
    );

    await user.clear(screen.getByRole("textbox", { name: "Shared source surface index" }));
    await user.type(screen.getByRole("textbox", { name: "Shared source surface index" }), "3");
    await user.clear(screen.getByRole("textbox", { name: "Shared scale" }));
    await user.type(screen.getByRole("textbox", { name: "Shared scale" }), "5");
    await user.clear(screen.getByRole("textbox", { name: "Shared offset" }));
    await user.type(screen.getByRole("textbox", { name: "Shared offset" }), "8");
    await user.clear(screen.getByRole("textbox", { name: "Shared source coefficient index" }));
    await user.type(screen.getByRole("textbox", { name: "Shared source coefficient index" }), "6");

    expect(onSourceSurfaceChange).toHaveBeenLastCalledWith("3");
    expect(onScaleChange).toHaveBeenLastCalledWith("5");
    expect(onOffsetChange).toHaveBeenLastCalledWith("8");
    expect(onExtraChange).toHaveBeenLastCalledWith("6");
  });
});
