import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OpdAimPointProvider, useOpdAimPoint } from "@/shared/components/providers/OpdAimPointProvider";

function Harness() {
  const { opdAimPoint, setOpdAimPoint } = useOpdAimPoint();

  return (
    <>
      <div data-testid="opd-aim-point">{opdAimPoint}</div>
      <button type="button" onClick={() => setOpdAimPoint("centroid")}>Set centroid</button>
    </>
  );
}

describe("OpdAimPointProvider", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to chief_ray", () => {
    render(
      <OpdAimPointProvider>
        <Harness />
      </OpdAimPointProvider>,
    );

    expect(screen.getByTestId("opd-aim-point")).toHaveTextContent("chief_ray");
  });

  it("reads a valid persisted value", () => {
    localStorage.setItem("ray-optics-web-opd-aim-point", "centroid");

    render(
      <OpdAimPointProvider>
        <Harness />
      </OpdAimPointProvider>,
    );

    expect(screen.getByTestId("opd-aim-point")).toHaveTextContent("centroid");
  });

  it("ignores an invalid persisted value", () => {
    localStorage.setItem("ray-optics-web-opd-aim-point", "bogus");

    render(
      <OpdAimPointProvider>
        <Harness />
      </OpdAimPointProvider>,
    );

    expect(screen.getByTestId("opd-aim-point")).toHaveTextContent("chief_ray");
  });

  it("persists updates", async () => {
    render(
      <OpdAimPointProvider>
        <Harness />
      </OpdAimPointProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Set centroid" }));

    expect(localStorage.getItem("ray-optics-web-opd-aim-point")).toBe("centroid");
  });
});
