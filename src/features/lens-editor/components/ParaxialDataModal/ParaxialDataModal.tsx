import { Button } from "@/shared/components/primitives/Button";
import { Chip } from "@/shared/components/primitives/Chip";
import { Modal } from "@/shared/components/primitives/Modal";
import { Table } from "@/shared/components/primitives/Table";
import { formatOptionalSixDecimal } from "@/shared/components/ag-grid/readonlyGridConfig";

/** Visibility, worker data, and dismissal action for the paraxial-data dialog. */
export interface ParaxialDataModalProps {
  /** Controls visibility. */
  readonly isOpen: boolean;
  /** First-order values returned by the Pyodide worker. */
  readonly data: Record<string, number>;
  /** Called only when the Ok action is clicked. */
  readonly onClose: () => void;
}

/** Human-readable names for the first-order fields documented by RayOptics. */
const PARAXIAL_ATTRIBUTE_LABELS: Readonly<Record<string, string>> = {
  opt_inv: "Optical Invariant",
  power: "Optical Power",
  efl: "Effective Focal Length",
  fl_obj: "Object-Space Focal Length",
  fl_img: "Image-Space Focal Length",
  pp1: "Front Principal Plane Distance",
  ppk: "Rear Principal Plane Distance",
  pp_sep: "Principal Plane Separation",
  ffl: "Front Focal Length",
  bfl: "Back Focal Length",
  fno: "F-Number",
  m: "Transverse Magnification",
  red: "Reduction Ratio",
  n_obj: "Object-Space Refractive Index",
  n_img: "Image-Space Refractive Index",
  obj_dist: "Object Distance",
  img_dist: "Image Distance",
  obj_ang: "Object Angle",
  img_ht: "Image Height",
  enp_dist: "Entrance Pupil Distance",
  enp_radius: "Entrance Pupil Radius",
  exp_dist: "Exit Pupil Distance",
  exp_radius: "Exit Pupil Radius",
  obj_na: "Object-Space Numerical Aperture",
  img_na: "Image-Space Numerical Aperture",
};

/** Converts a worker attribute key to the short display text used by its Chip. */
function formatAttributeKey(key: string): string {
  return key === "fno" ? "f/#" : key.replaceAll("_", " ").toUpperCase();
}

/**
 * Read-only modal for the complete first-order data object returned by RayOptics.
 *
 * @remarks
 * - Rows preserve worker entry order and values use the shared optional six-decimal formatter.
 * - Documented fields show a readable label followed by a normalized key Chip with explicit spacing;
 *   unknown fields show only the normalized Chip. The `fno` key is displayed as `f/#`.
 * - The Data column is right-aligned, and vertical scrolling is delegated to the shared modal body
 *   within the dialog's existing `90dvh` limit.
 * - The fixed-footer Ok button is the sole dismissal action; backdrop clicks and Escape do not close it.
 */
export function ParaxialDataModal({ isOpen, data, onClose }: ParaxialDataModalProps) {
  const rows = Object.entries(data).map(([key, value]) => {
    const readableLabel = PARAXIAL_ATTRIBUTE_LABELS[key];
    const keyChip = <Chip key={`${key}-key`}>{formatAttributeKey(key)}</Chip>;
    const attribute = readableLabel === undefined
      ? keyChip
      : <span key={`${key}-label`} className="inline-flex items-center gap-2">{readableLabel}{keyChip}</span>;

    return [attribute, formatOptionalSixDecimal({ value })] as const;
  });

  return (
    <Modal
      isOpen={isOpen}
      title="Paraxial Data"
      titleId="paraxial-data-modal-title"
      size="lg"
      footer={(
        <div className="flex justify-end">
          <Button variant="primary" onClick={onClose}>Ok</Button>
        </div>
      )}
    >
      <Table
        headers={["Attribute", "Data"]}
        rows={rows}
        columnAlignments={["left", "right"]}
      />
    </Modal>
  );
}
