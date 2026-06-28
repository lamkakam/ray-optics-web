import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImageReferencePanel } from "@/features/lens-editor/components/ImageReferencePanel";

const mockSetImagePoint = jest.fn();
let mockImagePoint = "chief_ray";

jest.mock("@/shared/components/providers/ImagePointProvider", () => ({
  useImagePoint: () => ({ imagePoint: mockImagePoint, setImagePoint: mockSetImagePoint }),
}));

describe("ImageReferencePanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockImagePoint = "chief_ray";
  });

  it("renders the image point selector with chief ray and centroid options", () => {
    render(<ImageReferencePanel />);

    const select = screen.getByLabelText("Image point") as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Chief ray" })).toHaveValue("chief_ray");
    expect(screen.getByRole("option", { name: "Centroid" })).toHaveValue("centroid");
  });

  it("defaults from the app-wide image point value", () => {
    mockImagePoint = "centroid";

    render(<ImageReferencePanel />);

    expect(screen.getByLabelText("Image point")).toHaveValue("centroid");
  });

  it("updates the app-wide image point on change", async () => {
    render(<ImageReferencePanel />);

    await userEvent.selectOptions(screen.getByLabelText("Image point"), "centroid");

    expect(mockSetImagePoint).toHaveBeenCalledWith("centroid");
  });
});
