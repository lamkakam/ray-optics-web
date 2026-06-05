import type { RadiusMode } from "@/features/optimization/stores/optimizationStore";
import {
  CURVATURE_RADIUS_GUIDANCE_TEXT,
  MODAL_MODE_OPTIONS,
  curvatureRadiusCrossesZero,
  createPickupDraft,
  createVariableDraft,
  getCurvatureRadiusBoundsErrorText,
  curvatureRadiusNoZeroStraddleRule,
  minLessThanMaxRule,
  serializeRadiusMode,
  toRadiusModeDraft,
  validateVariableBounds,
} from "@/features/optimization/lib/modalHelpers";

describe("optimization modal helpers", () => {
  describe("curvatureRadiusCrossesZero", () => {
    it("returns true when bounds straddle zero", () => {
      expect(curvatureRadiusCrossesZero("-5", "5")).toBe(true);
    });

    it("returns false when bounds stay on one side of zero", () => {
      expect(curvatureRadiusCrossesZero("-5", "-1")).toBe(false);
      expect(curvatureRadiusCrossesZero("1", "5")).toBe(false);
    });

    it("returns false when either bound is not finite", () => {
      expect(curvatureRadiusCrossesZero("foo", "5")).toBe(false);
      expect(curvatureRadiusCrossesZero("-5", "bar")).toBe(false);
    });
  });

  describe("validateVariableBounds", () => {
    it("returns the first rule error in order", () => {
      const firstRule = jest.fn(() => "First error");
      const secondRule = jest.fn(() => "Second error");

      expect(validateVariableBounds("Radius", "10", "5", [firstRule, secondRule])).toBe("First error");
      expect(secondRule).not.toHaveBeenCalled();
    });

    it("rejects non-finite bounds with the shared min/max rule", () => {
      expect(validateVariableBounds("Thickness", "foo", "5", [minLessThanMaxRule])).toBe(
        "Thickness variable bounds must have Min. less than Max.",
      );
      expect(validateVariableBounds("Thickness", "1", "Infinity", [minLessThanMaxRule])).toBe(
        "Thickness variable bounds must have Min. less than Max.",
      );
    });

    it("rejects min greater than or equal to max with the shared min/max rule", () => {
      expect(validateVariableBounds("Radius", "5", "5", [minLessThanMaxRule])).toBe(
        "Radius variable bounds must have Min. less than Max.",
      );
      expect(validateVariableBounds("Radius", "6", "5", [minLessThanMaxRule])).toBe(
        "Radius variable bounds must have Min. less than Max.",
      );
    });

    it("accepts finite bounds with min less than max", () => {
      expect(validateVariableBounds("Thickness", "1", "5", [minLessThanMaxRule])).toBeUndefined();
    });

    it("rejects curvature-radius bounds that straddle zero", () => {
      expect(validateVariableBounds("Radius", "-5", "5", [curvatureRadiusNoZeroStraddleRule])).toBe(
        "Radius variable bounds must stay on one side of 0.",
      );
      expect(validateVariableBounds("Radius", "-5", "-1", [curvatureRadiusNoZeroStraddleRule])).toBeUndefined();
    });
  });

  it("exposes the shared modal mode options", () => {
    expect(MODAL_MODE_OPTIONS).toEqual([
      { value: "constant", label: "constant" },
      { value: "variable", label: "variable" },
      { value: "pickup", label: "pickup" },
    ]);
  });

  it("creates a variable draft from a numeric value", () => {
    expect(createVariableDraft(12.5)).toEqual({
      mode: "variable",
      min: "12.5",
      max: "12.5",
    });
  });

  it("exposes shared curvature-radius guidance copy", () => {
    expect(CURVATURE_RADIUS_GUIDANCE_TEXT).toEqual([
      "R = 0 means a flat surface (infinite radius).",
      "Use variable bounds entirely below 0 or entirely above 0; do not straddle 0.",
    ]);
  });

  it("formats curvature-radius bounds errors with the provided label", () => {
    expect(getCurvatureRadiusBoundsErrorText("Radius")).toBe(
      "Radius variable bounds must stay on one side of 0.",
    );
    expect(getCurvatureRadiusBoundsErrorText("Toroid sweep R")).toBe(
      "Toroid sweep R variable bounds must stay on one side of 0.",
    );
  });

  it("creates the default pickup draft", () => {
    expect(createPickupDraft()).toEqual({
      mode: "pickup",
      sourceSurfaceIndex: "1",
      scale: "1",
      offset: "0",
    });
  });

  it("converts a radius mode into a draft", () => {
    const variableMode: RadiusMode = {
      surfaceIndex: 3,
      mode: "variable",
      min: "10",
      max: "20",
    };

    expect(toRadiusModeDraft(variableMode)).toEqual({
      mode: "variable",
      min: "10",
      max: "20",
    });
  });

  it("serializes radius modes for keyed remounts", () => {
    const pickupMode: RadiusMode = {
      surfaceIndex: 3,
      mode: "pickup",
      sourceSurfaceIndex: "1",
      scale: "2",
      offset: "0.5",
    };

    expect(serializeRadiusMode(pickupMode)).toBe("pickup:1:2:0.5");
  });
});
