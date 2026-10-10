import {
  imagePrescriptionSchema,
  surfaceSchema,
} from "@/shared/lib/optical-model/model/opticalModelSchema";
import {
  IMAGE_PROPERTY_KEYS,
  OPTIONAL_SURFACE_PROPERTY_KEYS,
  SURFACE_PROPERTIES,
  SURFACE_PROPERTY_KEYS,
} from "@/shared/lib/optical-model/surface-properties/registry";

describe("surface-property registry", () => {
  it("describes every surface schema property exactly once", () => {
    expect([...SURFACE_PROPERTY_KEYS].sort()).toEqual(
      Object.keys(surfaceSchema.properties).sort(),
    );
    for (const key of SURFACE_PROPERTY_KEYS) {
      expect(SURFACE_PROPERTIES[key].key).toBe(key);
    }
  });

  it("gives every required surface property a default and no optional property one", () => {
    const required = new Set<string>(surfaceSchema.required);
    for (const key of SURFACE_PROPERTY_KEYS) {
      expect([key, SURFACE_PROPERTIES[key].default !== undefined]).toEqual([
        key,
        required.has(key),
      ]);
    }
    expect([...OPTIONAL_SURFACE_PROPERTY_KEYS].sort()).toEqual(
      SURFACE_PROPERTY_KEYS.filter((key) => !required.has(key)).sort(),
    );
  });

  it("covers every image-plane property with a surface-property descriptor", () => {
    expect([...IMAGE_PROPERTY_KEYS].sort()).toEqual(
      Object.keys(imagePrescriptionSchema.properties).sort(),
    );
    for (const key of IMAGE_PROPERTY_KEYS) {
      expect(SURFACE_PROPERTY_KEYS).toContain(key);
    }
  });
});
