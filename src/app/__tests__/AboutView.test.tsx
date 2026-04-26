import { render, screen } from "@testing-library/react";
import AboutPage from "@/app/about/page";

describe("AboutPage", () => {
  it("renders heading 'About'", () => {
    render(<AboutPage />);
    expect(screen.getByRole("heading", { name: "About" })).toBeInTheDocument();
  });

  it("contains 'Ray Optics Web' text", () => {
    render(<AboutPage />);
    expect(screen.getAllByText(/Ray Optics Web/i).length).toBeGreaterThan(0);
  });
});
