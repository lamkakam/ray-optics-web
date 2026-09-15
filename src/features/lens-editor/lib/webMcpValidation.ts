/** Shared strict-input and cancellation helpers for Lens Editor WebMCP tools. */
import type { ErrorObject, ValidateFunction } from "ajv";

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

function firstUsefulError(
  errors: readonly ErrorObject[] | null | undefined,
): ErrorObject | undefined {
  return (
    errors?.find(({ keyword }) => keyword !== "oneOf" && keyword !== "anyOf") ??
    errors?.[0]
  );
}

/** Throws a stable JSON-pointer error when an imperative tool input is invalid. */
export function assertWebMcpInput<T>(
  validator: ValidateFunction<T>,
  input: unknown,
): asserts input is T {
  if (!validator(input)) {
    const error = firstUsefulError(validator.errors);
    throw new Error(
      `Invalid input at ${webMcpErrorPath(error)}: ${error?.message ?? "schema check failed"}`,
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
