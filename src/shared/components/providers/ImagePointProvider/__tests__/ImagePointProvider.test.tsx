import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImagePointProvider, useImagePoint } from "@/shared/components/providers/ImagePointProvider";

function Harness() {
  const { imagePoint, setImagePoint } = useImagePoint();

  return (
    <>
      <div data-testid="image-point">{imagePoint}</div>
      <button type="button" onClick={() => setImagePoint("chief_ray")}>Set chief ray</button>
      <button type="button" onClick={() => setImagePoint("centroid")}>Set centroid</button>
      <button type="button" onClick={() => setImagePoint("invalid" as never)}>Set invalid</button>
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

  it("accepts chief_ray from the primary persisted key", () => {
    localStorage.setItem("ray-optics-web-image-point", "chief_ray");

    render(
      <ImagePointProvider>
        <Harness />
      </ImagePointProvider>,
    );

    expect(screen.getByTestId("image-point")).toHaveTextContent("chief_ray");
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

  it("prefers the primary key when its value is invalid", () => {
    localStorage.setItem("ray-optics-web-image-point", "bogus");
    localStorage.setItem("ray-optics-web-opd-aim-point", "centroid");

    render(
      <ImagePointProvider>
        <Harness />
      </ImagePointProvider>,
    );

    expect(screen.getByTestId("image-point")).toHaveTextContent("chief_ray");
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
    expect(screen.getByTestId("image-point")).toHaveTextContent("centroid");
  });

  it("accepts a valid runtime update back to chief_ray", async () => {
    const user = userEvent.setup();
    render(
      <ImagePointProvider>
        <Harness />
      </ImagePointProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Set centroid" }));
    await user.click(screen.getByRole("button", { name: "Set chief ray" }));

    expect(screen.getByTestId("image-point")).toHaveTextContent("chief_ray");
    expect(localStorage.getItem("ray-optics-web-image-point")).toBe("chief_ray");
  });

  it("ignores invalid runtime updates and throws outside the provider", async () => {
    render(
      <ImagePointProvider>
        <Harness />
      </ImagePointProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Set invalid" }));
    expect(screen.getByTestId("image-point")).toHaveTextContent("chief_ray");
    expect(localStorage.getItem("ray-optics-web-image-point")).toBeNull();

    expect(() => render(<Harness />)).toThrow("useImagePoint must be used within an ImagePointProvider");
  });

});
