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

  it("renders readable labels with normalized key Chips for every documented RayOptics field", () => {
    render(<ParaxialDataModal isOpen data={documentedData} onClose={jest.fn()} />);

    const expectedLabelsAndChips = [
      ["Optical Invariant", "OPT INV"],
      ["Optical Power", "POWER"],
      ["Effective Focal Length", "EFL"],
      ["Object-Space Focal Length", "FL OBJ"],
      ["Image-Space Focal Length", "FL IMG"],
      ["Front Principal Plane Distance", "PP1"],
      ["Rear Principal Plane Distance", "PPK"],
      ["Principal Plane Separation", "PP SEP"],
      ["Front Focal Length", "FFL"],
      ["Back Focal Length", "BFL"],
      ["F-Number", "f/#"],
      ["Transverse Magnification", "M"],
      ["Reduction Ratio", "RED"],
      ["Object-Space Refractive Index", "N OBJ"],
      ["Image-Space Refractive Index", "N IMG"],
      ["Object Distance", "OBJ DIST"],
      ["Image Distance", "IMG DIST"],
      ["Object Angle", "OBJ ANG"],
      ["Image Height", "IMG HT"],
      ["Entrance Pupil Distance", "ENP DIST"],
      ["Entrance Pupil Radius", "ENP RADIUS"],
      ["Exit Pupil Distance", "EXP DIST"],
      ["Exit Pupil Radius", "EXP RADIUS"],
      ["Object-Space Numerical Aperture", "OBJ NA"],
      ["Image-Space Numerical Aperture", "IMG NA"],
    ];

    expectedLabelsAndChips.forEach(([label, chip]) => {
      const cell = screen.getByRole("cell", { name: `${label} ${chip}` });
      const wrapper = within(cell).getByText(chip).parentElement;
      expect(wrapper).toHaveClass("inline-flex", "gap-2");
      expect(within(cell).getByText(label)).toBeInTheDocument();
      expect(within(cell).getByText(chip)).toBeInTheDocument();
    });
  });

  it("renders unknown fields as a normalized Chip without duplicated plain text", () => {
    render(<ParaxialDataModal isOpen data={documentedData} onClose={jest.fn()} />);

    const cell = screen.getByRole("cell", { name: "FUTURE METRIC" });
    expect(within(cell).getByText("FUTURE METRIC")).toBeInTheDocument();
    expect(cell).not.toHaveTextContent("future_metric");
  });

  it("preserves worker entry order and formats numeric values to six decimal places", () => {
    render(<ParaxialDataModal isOpen data={documentedData} onClose={jest.fn()} />);
    const bodyRows = screen.getAllByRole("row").slice(1);

    expect(within(bodyRows[0]).getByText("Optical Invariant")).toBeInTheDocument();
    expect(within(bodyRows[1]).getByText("Optical Power")).toBeInTheDocument();
    expect(within(bodyRows[0]).getByRole("cell", { name: "0.100000" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "50.123457" })).toBeInTheDocument();
  });

  it("right-aligns the Data column and delegates scrolling to the shared modal body", () => {
    render(<ParaxialDataModal isOpen data={documentedData} onClose={jest.fn()} />);

    expect(screen.getByRole("columnheader", { name: "Data" })).toHaveClass("text-right");
    expect(screen.getByRole("cell", { name: "50.123457" })).toHaveClass("text-right");

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
