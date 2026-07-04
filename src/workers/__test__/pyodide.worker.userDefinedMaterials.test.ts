import { describe, it, expect } from "@jest/globals";
import {
  _addUserDefinedGlasses,
  _deleteUserDefinedGlasses,
  _getUserDefinedGlasses,
  _updateUserDefinedGlasses,
} from "../pyodide.worker";
import type {
  RawUserDefinedMaterialsData,
  UserDefinedGlassInput,
} from "@/features/glass-map/types/glassMap";

const materials: readonly UserDefinedGlassInput[] = [
  {
    name: "CUSTOM_A",
    pairs: [
      [0.4861, 1.522],
      [0.5461, 1.518],
      [0.5876, 1.5168],
      [0.6563, 1.5143],
    ],
  },
];

const rawUserDefinedData: RawUserDefinedMaterialsData = {
  CUSTOM_A: {
    refractive_index_d: 1.5168,
    refractive_index_e: 1.518,
    abbe_number_d: 64.17,
    abbe_number_e: 63.96,
    partial_dispersions: { P_g_F: 0.5349, P_F_d: 0.41, P_F_e: 0.4 },
    dispersion_coeff_kind: "tabulated",
    dispersion_coeffs: [
      [0.4861, 1.522],
      [0.5461, 1.518],
      [0.5876, 1.5168],
      [0.6563, 1.5143],
    ],
  },
};

describe("user-defined material worker APIs", () => {
  it("_addUserDefinedGlasses sets materials and returns raw user-defined material data", async () => {
    let capturedCode = "";

    const result = await _addUserDefinedGlasses(async (code) => {
      capturedCode = code;
      return JSON.stringify(rawUserDefinedData);
    }, materials);

    expect(capturedCode).toContain("user_defined_materials[name] = pairs");
    expect(capturedCode).toContain("user_defined_materials.get_materials_data(names)");
    expect(capturedCode).toContain("CUSTOM_A");
    expect(capturedCode).not.toContain("len(pairs)");
    expect(capturedCode).not.toContain("len(set(names))");
    expect(result).toEqual(rawUserDefinedData);
    expect(result.CUSTOM_A.dispersion_coeff_kind).toBe("tabulated");
    expect(result.CUSTOM_A.dispersion_coeffs[0]).toEqual([0.4861, 1.522]);
  });

  it("_updateUserDefinedGlasses deletes then sets materials and returns raw user-defined material data", async () => {
    let capturedCode = "";

    const result = await _updateUserDefinedGlasses(async (code) => {
      capturedCode = code;
      return JSON.stringify(rawUserDefinedData);
    }, materials);

    expect(capturedCode).toContain("del user_defined_materials[name]");
    expect(capturedCode).toContain("user_defined_materials[name] = pairs");
    expect(capturedCode).toContain("user_defined_materials.get_materials_data(names)");
    expect(capturedCode).not.toContain("len(pairs)");
    expect(capturedCode).not.toContain("len(set(names))");
    expect(result).toEqual(rawUserDefinedData);
  });

  it("_deleteUserDefinedGlasses deletes requested names and returns no parsed payload", async () => {
    let capturedCode = "";

    const result = await _deleteUserDefinedGlasses(async (code) => {
      capturedCode = code;
      return undefined;
    }, ["CUSTOM_A"]);

    expect(capturedCode).toContain("del user_defined_materials[name]");
    expect(capturedCode).not.toContain("get_materials_data");
    expect(result).toBeUndefined();
  });

  it("_getUserDefinedGlasses returns raw user-defined material data", async () => {
    let capturedCode = "";

    const result = await _getUserDefinedGlasses(async (code) => {
      capturedCode = code;
      return JSON.stringify(rawUserDefinedData);
    }, ["CUSTOM_A"]);

    expect(capturedCode).toContain("user_defined_materials.get_materials_data(names)");
    expect(capturedCode).toContain("CUSTOM_A");
    expect(result).toEqual(rawUserDefinedData);
    expect(result.CUSTOM_A.dispersion_coeff_kind).toBe("tabulated");
  });
});
