import { render, screen } from "@testing-library/react";
import AboutPage from "@/app/about/page";
import packageJson from "../../../package.json";

// Model JSON modules with only a default export, as required by the bundler.
jest.mock("../../../package.json", () => ({
  __esModule: true,
  default: jest.requireActual("../../../package.json"),
}));

/** Covers About content and the version from a default-exporting package JSON module. */
describe("AboutPage", () => {
  it("renders heading 'About'", () => {
    render(<AboutPage />);
    expect(screen.getByRole("heading", { name: "About" })).toBeInTheDocument();
  });

  it("displays the package version", () => {
    render(<AboutPage />);
    expect(
      screen.getByText(`Version: ${packageJson.version}`),
    ).toBeInTheDocument();
  });

  it("contains 'Ray Optics Web' text", () => {
    render(<AboutPage />);
    expect(screen.getAllByText(/Ray Optics Web/i).length).toBeGreaterThan(0);
  });
});
