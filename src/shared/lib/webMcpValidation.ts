/**
 * Shared strict-input and cancellation helpers for imperative WebMCP tools.
 * Input failures throw `WebMcpToolError` with code `invalid_input`, a JSON
 * pointer `path`, and an AJV message enriched with the allowed values.
 */
import type { ErrorObject, ValidateFunction } from "ajv";
import { WebMcpToolError } from "@/shared/lib/webMcpErrors";

/** Converts an AJV error into the JSON-pointer path exposed to tool callers. */
export function webMcpErrorPath(error: ErrorObject | undefined): string {
  if (!error) return "/";
  if (error.keyword === "required") {
    return `${error.instancePath}/${String(error.params.missingProperty)}`;
  }
  if (error.keyword === "additionalProperties") {
    return `${error.instancePath}/${String(error.params.additionalProperty)}`;
  }
  if (error.keyword === "referenceIndexInRange") {
    return `${error.instancePath}/referenceIndex`;
  }
  return error.instancePath || "/";
}

function isUseful({ keyword }: ErrorObject): boolean {
  return keyword !== "oneOf" && keyword !== "anyOf";
}

/** Formats one AJV error, appending the allowed values AJV leaves out. */
function describeOne(error: ErrorObject): string {
  switch (error.keyword) {
    case "enum":
      return `${error.message ?? "must be one of the allowed values"} (${(
        error.params.allowedValues as readonly unknown[]
      )
        .map(String)
        .join(", ")})`;
    case "const":
      return `${error.message ?? "must be equal to constant"} (${JSON.stringify(error.params.allowedValue)})`;
    case "additionalProperties":
      return `${error.message ?? "must NOT have additional properties"} (unexpected property '${String(error.params.additionalProperty)}')`;
    case "referenceIndexInRange":
      return "must be an integer index into weights (0 to weights.length - 1)";
    default:
      return error.message ?? "schema check failed";
  }
}

/**
 * Describes the first useful AJV error as a JSON-pointer path and message.
 * Every `oneOf`/`anyOf` alternative failing at that same path is joined with
 * " or " so callers see each accepted form instead of one arbitrary branch.
 */
export function describeSchemaError(
  errors: readonly ErrorObject[] | null | undefined,
): { readonly path: string; readonly message: string } {
  const first = errors?.find(isUseful) ?? errors?.[0];
  if (!first) return { path: "/", message: "schema check failed" };
  const path = webMcpErrorPath(first);
  const messages = [
    ...new Set(
      (errors ?? [])
        .filter(
          (error) =>
            error === first ||
            (isUseful(error) && webMcpErrorPath(error) === path),
        )
        .map(describeOne),
    ),
  ];
  return { path, message: messages.join(" or ") };
}

/** Throws a typed `invalid_input` error when an imperative tool input is invalid. */
export function assertWebMcpInput<T>(
  validator: ValidateFunction<T>,
  input: unknown,
): asserts input is T {
  if (!validator(input)) {
    const { path, message } = describeSchemaError(validator.errors);
    throw new WebMcpToolError(
      "invalid_input",
      `Invalid input at ${path}: ${message}`,
      { path },
    );
  }
}

/** Rejects an execution that was cancelled before it can mutate application state. */
export function assertWebMcpNotCancelled(
  signal: AbortSignal | undefined,
): void {
  if (signal?.aborted) {
    throw new DOMException("Tool execution was cancelled", "AbortError");
  }
}
