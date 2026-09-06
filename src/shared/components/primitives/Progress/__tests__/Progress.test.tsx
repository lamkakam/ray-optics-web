import { render, screen } from "@testing-library/react";
import { Progress } from "@/shared/components/primitives/Progress";
import { Progress as BarrelProgress } from "@/shared/components/primitives";

describe("Progress", () => {
  it("renders default linear progress with a status percentage", () => {
    render(<Progress value={50} />);

    const progress = screen.getByRole("progressbar", { name: "Progress" });

    expect(progress).toHaveAttribute("aria-valuemin", "0");
    expect(progress).toHaveAttribute("aria-valuemax", "100");
    expect(progress).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("hides status text when showStatus is false", () => {
    render(<Progress value={50} showStatus={false} />);

    expect(screen.queryByText("50%")).not.toBeInTheDocument();
  });

  it("normalizes custom min and max values", () => {
    render(<Progress value={15} min={10} max={20} ariaLabel="Upload progress" />);

    const progress = screen.getByRole("progressbar", { name: "Upload progress" });

    expect(progress).toHaveAttribute("aria-valuemin", "10");
    expect(progress).toHaveAttribute("aria-valuemax", "20");
    expect(progress).toHaveAttribute("aria-valuenow", "15");
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("clamps out-of-range low values to zero percent visually and in status", () => {
    render(<Progress value={-25} />);

    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getByTestId("progress-indicator")).toHaveStyle({ width: "0%" });
  });

  it("clamps out-of-range high values to one hundred percent visually and in status", () => {
    render(<Progress value={150} />);

    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByTestId("progress-indicator")).toHaveStyle({ width: "100%" });
  });

  it("is exported from the primitives barrel", () => {
    expect(BarrelProgress).toBe(Progress);
  });

  it("returns zero for a non-positive progress range", () => {
    const { rerender } = render(<Progress value={20} min={20} max={20} />);

    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getByTestId("progress-indicator")).toHaveStyle({ width: "0%" });

    rerender(<Progress value={20} min={30} max={20} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });
});
