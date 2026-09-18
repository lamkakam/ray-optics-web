/**
 * Dependency-injected WebMCP descriptors for reading and staging Lens Editor
 * System Specs. These setters update only the draft specs form; recomputation is
 * deliberately owned by `recompute_optical_system`. The `set_half_field` setter
 * remains relative-only and populates the neutral field store with
 * `isRelative: true`. All descriptor executions use the shared WebMCP
 * validation and cancellation boundary helpers.
 */
import type { StoreApi } from "zustand";
import type { OpticalSpecs, PupilSpec } from "@/shared/lib/types/opticalModel";
import type { SpecsConfiguratorState } from "@/features/lens-editor/stores/specsConfiguratorStore";
import {
  createPrescriptionAjv,
  opticalSpecsSchema,
  pupilSpecSchema,
  relativeFieldSpecSchema,
  wavelengthsSpecSchema,
} from "@/shared/lib/schemas/prescriptionSchema";
import {
  assertWebMcpInput,
  assertWebMcpNotCancelled,
} from "@/shared/lib/webMcpValidation";

/** Empty input accepted by the current-draft System Specs read tool. */
export const getSystemSpecsInputSchema = {
  type: "object",
  additionalProperties: false,
} as const;

/** Direct pupil input accepted by `set_system_aperture`. */
export const setSystemApertureInputSchema = pupilSpecSchema;
/** Relative field input accepted by `set_half_field`. */
export const setHalfFieldInputSchema = relativeFieldSpecSchema;
/** Wavelength/weight input accepted by `set_wavelengths`. */
export const setWavelengthsInputSchema = wavelengthsSpecSchema;

// Keep the complete shared schema referenced in this module so the tool-side
// validators and import-side validator cannot drift in supported combinations.
const validators = (() => {
  const ajv = createPrescriptionAjv();
  return {
    get: ajv.compile(getSystemSpecsInputSchema),
    aperture: ajv.compile<PupilSpec>(setSystemApertureInputSchema),
    field: ajv.compile<OpticalSpecs["field"]>(setHalfFieldInputSchema),
    wavelengths: ajv.compile<OpticalSpecs["wavelengths"]>(
      setWavelengthsInputSchema,
    ),
    specs: ajv.compile<OpticalSpecs>(opticalSpecsSchema),
  };
})();

/** Named readonly handles for the four System Specs descriptors. */
export type SystemSpecsTools = Readonly<{
  readonly getSystemSpecs: WebMCP.ModelContextTool;
  readonly setSystemAperture: WebMCP.ModelContextTool;
  readonly setHalfField: WebMCP.ModelContextTool;
  readonly setWavelengths: WebMCP.ModelContextTool;
}>;

/** Creates strict System Specs tools bound to a provider-backed draft store. */
export function createSystemSpecsTools(
  store: StoreApi<SpecsConfiguratorState>,
): SystemSpecsTools {
  return {
    getSystemSpecs: {
      name: "get_system_specs",
      description: "Read the current draft OpticalSpecs from the Lens Editor.",
      inputSchema: getSystemSpecsInputSchema,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: (input, { signal }) => {
        assertWebMcpInput(validators.get, input);
        assertWebMcpNotCancelled(signal);
        const specs = store.getState().toOpticalSpecs();
        assertWebMcpInput(validators.specs, specs);
        return JSON.stringify(specs);
      },
    },
    setSystemAperture: {
      name: "set_system_aperture",
      description:
        "Stage a supported Object EPD/NA or Image F/# pupil specification for the Lens Editor.",
      inputSchema: setSystemApertureInputSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input, { signal }) => {
        assertWebMcpInput(validators.aperture, input);
        assertWebMcpNotCancelled(signal);
        const pupil = input as PupilSpec;
        store.getState().setAperture({
          pupilSpace: pupil.space,
          pupilType: pupil.type,
          pupilValue: pupil.value,
        });
        return JSON.stringify({
          pupil: store.getState().toOpticalSpecs().pupil,
          systemUpdateRequired: true,
        });
      },
    },
    setHalfField: {
      name: "set_half_field",
      description:
        "Stage a relative Object Height/Angle or Image Height half-field specification with one to ten samples.",
      inputSchema: setHalfFieldInputSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input, { signal }) => {
        assertWebMcpInput(validators.field, input);
        assertWebMcpNotCancelled(signal);
        const field = input as OpticalSpecs["field"];
        if (!field.isRelative) {
          throw new Error("set_half_field requires relative field samples.");
        }
        store.getState().setField({
          space: field.space,
          type: field.type,
          maxField: field.maxField,
          fields: field.fields,
          isRelative: true,
          isWideAngle: field.isWideAngle === true,
        });
        return JSON.stringify({
          field,
          systemUpdateRequired: true,
        });
      },
    },
    setWavelengths: {
      name: "set_wavelengths",
      description:
        "Stage one to seven wavelength/weight tuples and an in-range reference wavelength index.",
      inputSchema: setWavelengthsInputSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input, { signal }) => {
        assertWebMcpInput(validators.wavelengths, input);
        assertWebMcpNotCancelled(signal);
        const wavelengths = input as OpticalSpecs["wavelengths"];
        store.getState().setWavelengths(wavelengths);
        return JSON.stringify({
          wavelengths: store.getState().toOpticalSpecs().wavelengths,
          systemUpdateRequired: true,
        });
      },
    },
  };
}

/** Alias using the feature name for callers composing Lens Editor tools. */
export const createLensSystemSpecsTools = createSystemSpecsTools;
