import { render, screen } from "@testing-library/react";
import AboutPage from "@/app/about/page";
import { version } from "../../../package.json";

/** Covers About content, including the version sourced from the root package. */
describe("AboutPage", () => {
  it("renders heading 'About'", () => {
    render(<AboutPage />);
    expect(screen.getByRole("heading", { name: "About" })).toBeInTheDocument();
  });

  it("displays the package version", () => {
    render(<AboutPage />);
    expect(screen.getByText(`Version: ${version}`)).toBeInTheDocument();
  });

  it("contains 'Ray Optics Web' text", () => {
    render(<AboutPage />);
    expect(screen.getAllByText(/Ray Optics Web/i).length).toBeGreaterThan(0);
  });
});
