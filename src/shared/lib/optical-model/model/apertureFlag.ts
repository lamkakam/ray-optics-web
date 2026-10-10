/** Defines the flag controlling whether RayOptics computes apertures automatically or uses the values set by the user. */
import Type from "typebox";

/** Strict schema for the auto/manual aperture flag. */
export const setAutoApertureFlagSchema = Type.Enum(
  ["autoAperture", "manualAperture"],
  { type: "string" },
);

/** Whether RayOptics recomputes semi-diameters or preserves manual values. */
export type SetAutoApertureFlag = Type.Static<typeof setAutoApertureFlagSchema>;
