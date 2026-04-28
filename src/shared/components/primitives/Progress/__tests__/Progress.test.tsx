import { render, screen } from "@testing-library/react";
import { Progress } from "@/shared/components/primitives/Progress";
import { Progress as BarrelProgress } from "@/shared/components/primitives";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";

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

  it("applies small size token classes", () => {
    render(<Progress value={25} size="sm" />);

    expectClasses(
      screen.getByTestId("progress-track"),
      cx.progress.size.trackHeightSm,
    );
    expectClasses(
      screen.getByText("25%"),
      cx.progress.size.statusFontSizeSm,
    );
  });

  it("applies medium size token classes by default", () => {
    render(<Progress value={25} />);

    expectClasses(
      screen.getByTestId("progress-track"),
      cx.progress.size.trackHeightMd,
    );
    expectClasses(
      screen.getByText("25%"),
      cx.progress.size.statusFontSizeMd,
    );
  });

  it("merges extra className after token classes", () => {
    render(<Progress value={25} className="w-32" />);

    const progress = screen.getByRole("progressbar");

    expect(progress).toHaveClass("w-32");
    splitClasses(cx.progress.size.width).forEach((cls) => {
      expect(progress).not.toHaveClass(cls);
    });
    expectClasses(progress, cx.progress.size.gap);
  });

  it("is exported from the primitives barrel", () => {
    expect(BarrelProgress).toBe(Progress);
  });
});
