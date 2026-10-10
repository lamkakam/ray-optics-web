/** Project AJV factory that compiles the TypeBox-generated optical-model JSON Schemas. */
import Ajv from "ajv";

/** Creates the project AJV instance with finite-number and cross-field support. */
export function createPrescriptionAjv(): Ajv {
  const ajv = new Ajv({ $data: true });
  ajv.addKeyword({
    keyword: "finiteNumber",
    type: "number",
    validate: (_schema: boolean, data: number) => Number.isFinite(data),
  });
  ajv.addKeyword({
    keyword: "referenceIndexInRange",
    type: "object",
    schemaType: "boolean",
    validate: (
      _schema: boolean,
      data: { readonly weights?: unknown; readonly referenceIndex?: unknown },
    ) => {
      const referenceIndex = data.referenceIndex;
      return (
        Array.isArray(data.weights) &&
        typeof referenceIndex === "number" &&
        Number.isInteger(referenceIndex) &&
        referenceIndex >= 0 &&
        referenceIndex < data.weights.length
      );
    },
  });
  return ajv;
}
