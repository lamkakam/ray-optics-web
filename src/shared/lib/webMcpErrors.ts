/**
 * Structured error contract shared by every WebMCP tool. Descriptors throw
 * `WebMcpToolError` (or let worker/domain errors propagate), and the
 * registration boundary in `useWebMCP` converts every failure with
 * `toWebMcpRejection` so agents always receive a parseable JSON envelope
 * `{ "error": { tool, code, message, path?, hint?, details? } }` as the
 * rejection message.
 */

/** Machine-readable failure categories exposed to WebMCP callers. */
export type WebMcpErrorCode =
  /** The supplied tool input is invalid; `path` locates the offending field. */
  | "invalid_input"
  /** Application state the tool reads is invalid; the caller must fix it first. */
  | "invalid_state"
  /** A dependency (worker, catalog) is still initializing; retrying later can succeed. */
  | "not_ready"
  /** Another tool must run first, or the current workflow state forbids the call. */
  | "precondition_failed"
  /** The calculation worker rejected or failed the computation. */
  | "calculation_failed"
  /** The execution was cancelled through its abort signal. */
  | "cancelled"
  /** An unexpected failure that does not fit another category. */
  | "internal_error";

/** Optional structured context attached to a `WebMcpToolError`. */
export interface WebMcpToolErrorOptions {
  /** JSON pointer into the tool input (or state) that caused the failure. */
  readonly path?: string;
  /** Actionable next step for the agent. */
  readonly hint?: string;
  /** Additional JSON-safe data, such as a sanitized worker report. */
  readonly details?: Readonly<Record<string, unknown>>;
}

/** Typed failure thrown by WebMCP descriptors and their shared operations. */
export class WebMcpToolError extends Error {
  readonly code: WebMcpErrorCode;
  readonly path?: string;
  readonly hint?: string;
  readonly details?: Readonly<Record<string, unknown>>;

  constructor(
    code: WebMcpErrorCode,
    message: string,
    options: WebMcpToolErrorOptions = {},
  ) {
    super(message);
    this.name = "WebMcpToolError";
    this.code = code;
    if (options.path !== undefined) this.path = options.path;
    if (options.hint !== undefined) this.hint = options.hint;
    if (options.details !== undefined) this.details = options.details;
  }
}

/** JSON body carried by every rejected WebMCP execution. */
export interface WebMcpErrorPayload {
  readonly error: {
    readonly tool: string;
    readonly code: WebMcpErrorCode;
    readonly message: string;
    readonly path?: string;
    readonly hint?: string;
    readonly details?: Readonly<Record<string, unknown>>;
  };
}

const MISSING_GLASS_HINT =
  "Fix the unknown media with update_lens_row or set_lens_prescription; use get_all_glasses or get_custom_glasses for exact catalog and glass names.";

function errorName(error: unknown): string | undefined {
  return typeof error === "object" &&
    error !== null &&
    typeof (error as { name?: unknown }).name === "string"
    ? (error as { name: string }).name
    : undefined;
}

function errorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (
    typeof error === "object" &&
    error !== null &&
    typeof (error as { message?: unknown }).message === "string"
  )
    return (error as { message: string }).message;
  return "Unknown error";
}

/**
 * Classifies any thrown value: `WebMcpToolError` keeps its fields,
 * `AbortError` becomes `cancelled`, Pyodide business/fatal errors become
 * `calculation_failed`, `MissingPrescriptionGlassError` becomes
 * `invalid_state` with a fixing hint, and everything else is `internal_error`.
 * Errors are matched by `name` so Comlink-reconstructed errors classify too.
 */
export function toWebMcpErrorPayload(
  tool: string,
  error: unknown,
): WebMcpErrorPayload {
  if (error instanceof WebMcpToolError) {
    return {
      error: {
        tool,
        code: error.code,
        message: error.message,
        ...(error.path === undefined ? {} : { path: error.path }),
        ...(error.hint === undefined ? {} : { hint: error.hint }),
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    };
  }
  const message = errorMessage(error);
  switch (errorName(error)) {
    case "AbortError":
      return { error: { tool, code: "cancelled", message } };
    case "PyodideBusinessError":
    case "PyodideFatalError":
      return { error: { tool, code: "calculation_failed", message } };
    case "MissingPrescriptionGlassError":
      return {
        error: {
          tool,
          code: "invalid_state",
          message,
          hint: MISSING_GLASS_HINT,
        },
      };
    default:
      return { error: { tool, code: "internal_error", message } };
  }
}

/**
 * Builds the rejection reported to the browser: an `Error` whose message is the
 * JSON payload, or an `AbortError` `DOMException` for cancellations so the
 * browser still recognizes them.
 */
export function toWebMcpRejection(tool: string, error: unknown): Error {
  const payload = toWebMcpErrorPayload(tool, error);
  const json = JSON.stringify(payload);
  return payload.error.code === "cancelled"
    ? new DOMException(json, "AbortError")
    : new Error(json);
}
