import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PickupModeFields } from "../PickupModeFields";

describe("PickupModeFields", () => {
  it("renders input-backed pickup fields and forwards edits", async () => {
    const user = userEvent.setup();
    const onSourceSurfaceChange = jest.fn();
    const onScaleChange = jest.fn();
    const onOffsetChange = jest.fn();
    const onExtraChange = jest.fn();

    function PickupFieldsHarness() {
      const [sourceSurface, setSourceSurface] = useState("2");
      const [scale, setScale] = useState("1");
      const [offset, setOffset] = useState("0");
      const [sourceTerm, setSourceTerm] = useState("3");

      return (
        <PickupModeFields
          idPrefix="radius"
          sourceSurfaceAriaLabel="Source surface"
          sourceSurfaceValue={sourceSurface}
          onSourceSurfaceChange={(value) => {
            onSourceSurfaceChange(value);
            setSourceSurface(value);
          }}
          scaleAriaLabel="scale"
          scaleValue={scale}
          onScaleChange={(value) => {
            onScaleChange(value);
            setScale(value);
          }}
          offsetAriaLabel="offset"
          offsetValue={offset}
          onOffsetChange={(value) => {
            onOffsetChange(value);
            setOffset(value);
          }}
          extraField={{
            idSuffix: "source-term",
            label: "Source term",
            ariaLabel: "Source term",
            value: sourceTerm,
            onChange: (value) => {
              onExtraChange(value);
              setSourceTerm(value);
            },
          }}
        />
      );
    }

    render(<PickupFieldsHarness />);

    await user.clear(screen.getByRole("textbox", { name: "Source surface" }));
    await user.type(screen.getByRole("textbox", { name: "Source surface" }), "4");
    await user.clear(screen.getByRole("textbox", { name: "scale" }));
    await user.type(screen.getByRole("textbox", { name: "scale" }), "2");
    await user.clear(screen.getByRole("textbox", { name: "offset" }));
    await user.type(screen.getByRole("textbox", { name: "offset" }), "-1");
    await user.clear(screen.getByRole("textbox", { name: "Source term" }));
    await user.type(screen.getByRole("textbox", { name: "Source term" }), "5");

    expect(onSourceSurfaceChange).toHaveBeenLastCalledWith("4");
    expect(onScaleChange).toHaveBeenLastCalledWith("2");
    expect(onOffsetChange).toHaveBeenLastCalledWith("-1");
    expect(onExtraChange).toHaveBeenLastCalledWith("5");
  });

  it("renders select-backed source fields and optional extra selections", async () => {
    const user = userEvent.setup();
    const onSourceSurfaceChange = jest.fn();
    const onExtraChange = jest.fn();

    render(
      <PickupModeFields
        idPrefix="asphere"
        sourceSurfaceAriaLabel="Source surface"
        sourceSurfaceValue="2"
        sourceSurfaceOptions={[{ value: "1", label: "1" }, { value: "2", label: "2" }]}
        onSourceSurfaceChange={onSourceSurfaceChange}
        scaleAriaLabel="scale"
        scaleValue="1"
        onScaleChange={jest.fn()}
        offsetAriaLabel="offset"
        offsetValue="0"
        onOffsetChange={jest.fn()}
        extraField={{
          idSuffix: "source-coeff",
          label: "Source coefficient",
          ariaLabel: "Source coefficient",
          value: "0",
          options: [{ value: "0", label: "a_2" }, { value: "1", label: "a_4" }],
          onChange: onExtraChange,
        }}
      />,
    );

    await user.selectOptions(screen.getByRole("combobox", { name: "Source surface" }), "1");
    await user.selectOptions(screen.getByRole("combobox", { name: "Source coefficient" }), "1");

    expect(onSourceSurfaceChange).toHaveBeenCalledWith("1");
    expect(onExtraChange).toHaveBeenCalledWith("1");
  });
});
