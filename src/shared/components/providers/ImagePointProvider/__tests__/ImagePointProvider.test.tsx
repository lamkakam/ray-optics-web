import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImagePointProvider, useImagePoint } from "@/shared/components/providers/ImagePointProvider";

function Harness() {
  const { imagePoint, setImagePoint } = useImagePoint();

  return (
    <>
      <div data-testid="image-point">{imagePoint}</div>
      <button type="button" onClick={() => setImagePoint("centroid")}>Set centroid</button>
    </>
  );
}

describe("ImagePointProvider", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to chief_ray", () => {
    render(
      <ImagePointProvider>
        <Harness />
      </ImagePointProvider>,
    );

    expect(screen.getByTestId("image-point")).toHaveTextContent("chief_ray");
  });

  it("reads a valid persisted value", () => {
    localStorage.setItem("ray-optics-web-image-point", "centroid");

    render(
      <ImagePointProvider>
        <Harness />
      </ImagePointProvider>,
    );

    expect(screen.getByTestId("image-point")).toHaveTextContent("centroid");
  });

  it("reads the legacy persisted value as a migration fallback", () => {
    localStorage.setItem("ray-optics-web-opd-aim-point", "centroid");

    render(
      <ImagePointProvider>
        <Harness />
      </ImagePointProvider>,
    );

    expect(screen.getByTestId("image-point")).toHaveTextContent("centroid");
  });

  it("ignores an invalid persisted value", () => {
    localStorage.setItem("ray-optics-web-image-point", "bogus");

    render(
      <ImagePointProvider>
        <Harness />
      </ImagePointProvider>,
    );

    expect(screen.getByTestId("image-point")).toHaveTextContent("chief_ray");
  });

  it("persists updates", async () => {
    render(
      <ImagePointProvider>
        <Harness />
      </ImagePointProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Set centroid" }));

    expect(localStorage.getItem("ray-optics-web-image-point")).toBe("centroid");
  });
});
