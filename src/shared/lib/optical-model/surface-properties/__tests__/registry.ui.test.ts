import { SURFACE_PROPERTY_KEYS } from "@/shared/lib/optical-model/surface-properties/registry";
import {
  SURFACE_PROPERTY_UI_KEYS,
  SURFACE_PROPERTY_UIS,
} from "@/shared/lib/optical-model/surface-properties/registry.ui";

/** Surface properties edited directly in their own grid cells rather than through a modal. */
const INLINE_EDITED_PROPERTIES = [
  "label",
  "comment",
  "curvatureRadius",
  "thickness",
  "semiDiameter",
];

describe("surface-property UI registry", () => {
  it("edits every surface property either inline or through exactly one modal-backed UI", () => {
    const modalBacked = SURFACE_PROPERTY_UI_KEYS.flatMap(
      (key) => SURFACE_PROPERTY_UIS[key].properties,
    );

    expect(new Set(modalBacked).size).toBe(modalBacked.length);
    expect([...INLINE_EDITED_PROPERTIES, ...modalBacked].sort()).toEqual(
      [...SURFACE_PROPERTY_KEYS].sort(),
    );
  });
});
