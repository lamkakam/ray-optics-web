import { createPrescriptionAjv } from "@/shared/lib/schemas/prescriptionSchema";
import {
  assertWebMcpInput,
  assertWebMcpNotCancelled,
  describeSchemaError,
} from "@/shared/lib/webMcpValidation";
import { WebMcpToolError } from "@/shared/lib/webMcpErrors";

const ajv = createPrescriptionAjv();
const validate = ajv.compile({
  type: "object",
  required: ["mode"],
  additionalProperties: false,
  properties: {
    mode: { type: "string", enum: ["mono", "poly"] },
    kind: { const: "exact" },
    count: { type: "integer", minimum: 1, maximum: 10 },
    items: { type: "array", minItems: 2, maxItems: 3 },
    row: {
      oneOf: [
        { type: "string", enum: ["object", "image"] },
        { type: "integer", minimum: 1 },
      ],
    },
    wavelengths: {
      type: "object",
      referenceIndexInRange: true,
      properties: {
        weights: { type: "array" },
        referenceIndex: { type: "integer" },
      },
    },
  },
});

function failure(input: unknown): WebMcpToolError {
  try {
    assertWebMcpInput(validate, input);
  } catch (error) {
    return error as WebMcpToolError;
  }
  throw new Error("expected input validation to fail");
}

describe("assertWebMcpInput", () => {
  it("accepts valid input", () => {
    expect(() => assertWebMcpInput(validate, { mode: "mono" })).not.toThrow();
  });

  it("throws a typed invalid_input error with a JSON-pointer path", () => {
    const error = failure({});

    expect(error).toBeInstanceOf(WebMcpToolError);
    expect(error.code).toBe("invalid_input");
    expect(error.path).toBe("/mode");
    expect(error.message).toBe(
      "Invalid input at /mode: must have required property 'mode'",
    );
  });

  it("lists the allowed enum values", () => {
    expect(failure({ mode: "duo" }).message).toBe(
      "Invalid input at /mode: must be equal to one of the allowed values (mono, poly)",
    );
  });

  it("names the allowed constant", () => {
    expect(failure({ mode: "mono", kind: "rough" }).message).toBe(
      'Invalid input at /kind: must be equal to constant ("exact")',
    );
  });

  it("names an unexpected property", () => {
    const error = failure({ mode: "mono", extra: 1 });

    expect(error.path).toBe("/extra");
    expect(error.message).toBe(
      "Invalid input at /extra: must NOT have additional properties (unexpected property 'extra')",
    );
  });

  it("keeps AJV limit messages that already state the limit", () => {
    expect(failure({ mode: "mono", count: 11 }).message).toBe(
      "Invalid input at /count: must be <= 10",
    );
    expect(failure({ mode: "mono", items: [1] }).message).toBe(
      "Invalid input at /items: must NOT have fewer than 2 items",
    );
  });

  it("explains the custom reference-index keyword", () => {
    const error = failure({
      mode: "mono",
      wavelengths: { weights: [[550, 1]], referenceIndex: 3 },
    });
    expect(error.path).toBe("/wavelengths/referenceIndex");
    expect(error.message).toBe(
      "Invalid input at /wavelengths/referenceIndex: must be an integer index into weights (0 to weights.length - 1)",
    );
  });

  it("joins every alternative of a failed oneOf at the same path", () => {
    expect(failure({ mode: "mono", row: "first" }).message).toBe(
      "Invalid input at /row: must be equal to one of the allowed values (object, image) or must be integer",
    );
  });
});

describe("describeSchemaError", () => {
  it("returns the root path and a generic message without errors", () => {
    expect(describeSchemaError(undefined)).toEqual({
      path: "/",
      message: "schema check failed",
    });
  });
});

describe("assertWebMcpNotCancelled", () => {
  it("throws an AbortError only for an aborted signal", () => {
    const controller = new AbortController();
    expect(() => assertWebMcpNotCancelled(controller.signal)).not.toThrow();
    controller.abort();
    expect(() => assertWebMcpNotCancelled(controller.signal)).toThrow(
      expect.objectContaining({ name: "AbortError" }),
    );
  });
});
