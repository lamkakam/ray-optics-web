import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ParaxialDataModal } from "@/features/lens-editor/components/ParaxialDataModal";

const documentedData = {
  opt_inv: 0.1,
  power: 0.02,
  efl: 50.123456789,
  fl_obj: -50,
  fl_img: 50,
  pp1: 1,
  ppk: -2,
  pp_sep: 12,
  ffl: -49,
  bfl: 48,
  fno: 4,
  m: -0.5,
  red: 2,
  n_obj: 1,
  n_img: 1.5,
  obj_dist: 100,
  img_dist: 75,
  obj_ang: 12.5,
  img_ht: 18,
  enp_dist: 3,
  enp_radius: 6,
  exp_dist: -4,
  exp_radius: 5,
  obj_na: 0.1,
  img_na: -0.2,
  future_metric: 123.456,
};

describe("ParaxialDataModal", () => {
  it("does not render when closed", () => {
    render(<ParaxialDataModal isOpen={false} data={documentedData} onClose={jest.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the title and a complete two-column read-only table", () => {
    render(<ParaxialDataModal isOpen data={documentedData} onClose={jest.fn()} />);

    expect(screen.getByRole("dialog", { name: "Paraxial Data" })).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "Attribute",
      "Data",
    ]);
    expect(screen.getAllByRole("row")).toHaveLength(Object.keys(documentedData).length + 1);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("renders readable labels with raw keys for every documented RayOptics field", () => {
    render(<ParaxialDataModal isOpen data={documentedData} onClose={jest.fn()} />);

    const expectedLabels = [
      "Optical Invariant (opt_inv)",
      "Optical Power (power)",
      "Effective Focal Length (efl)",
      "Object-Space Focal Length (fl_obj)",
      "Image-Space Focal Length (fl_img)",
      "Front Principal Plane Distance (pp1)",
      "Rear Principal Plane Distance (ppk)",
      "Principal Plane Separation (pp_sep)",
      "Front Focal Length (ffl)",
      "Back Focal Length (bfl)",
      "F-Number (fno)",
      "Transverse Magnification (m)",
      "Reduction Ratio (red)",
      "Object-Space Refractive Index (n_obj)",
      "Image-Space Refractive Index (n_img)",
      "Object Distance (obj_dist)",
      "Image Distance (img_dist)",
      "Object Angle (obj_ang)",
      "Image Height (img_ht)",
      "Entrance Pupil Distance (enp_dist)",
      "Entrance Pupil Radius (enp_radius)",
      "Exit Pupil Distance (exp_dist)",
      "Exit Pupil Radius (exp_radius)",
      "Object-Space Numerical Aperture (obj_na)",
      "Image-Space Numerical Aperture (img_na)",
    ];

    expectedLabels.forEach((label) => expect(screen.getByRole("cell", { name: label })).toBeInTheDocument());
    expect(screen.getByRole("cell", { name: "future_metric" })).toBeInTheDocument();
  });

  it("preserves worker entry order and renders numeric values without rounding", () => {
    render(<ParaxialDataModal isOpen data={documentedData} onClose={jest.fn()} />);
    const bodyRows = screen.getAllByRole("row").slice(1);

    expect(within(bodyRows[0]).getByText("Optical Invariant (opt_inv)")).toBeInTheDocument();
    expect(within(bodyRows[1]).getByText("Optical Power (power)")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "50.123456789" })).toBeInTheDocument();
    expect(screen.queryByText("50.123457")).not.toBeInTheDocument();
  });

  it("right-aligns the Data column and delegates scrolling to the shared modal body", () => {
    render(<ParaxialDataModal isOpen data={documentedData} onClose={jest.fn()} />);

    expect(screen.getByRole("columnheader", { name: "Data" })).toHaveClass("text-right");
    expect(screen.getByRole("cell", { name: "50.123456789" })).toHaveClass("text-right");

    const dialog = screen.getByRole("dialog", { name: "Paraxial Data" });
    const verticalScrollers = dialog.querySelectorAll(".overflow-y-auto");
    expect(verticalScrollers).toHaveLength(1);
    expect(verticalScrollers[0]).toBe(screen.getByTestId("modal-body"));
  });

  it("can only be dismissed with the fixed-footer Ok action", async () => {
    const onClose = jest.fn();
    render(<ParaxialDataModal isOpen data={documentedData} onClose={onClose} />);

    fireEvent.click(screen.getByTestId("modal-backdrop"));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();

    const footer = screen.getByTestId("modal-footer");
    await userEvent.click(within(footer).getByRole("button", { name: "Ok" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
