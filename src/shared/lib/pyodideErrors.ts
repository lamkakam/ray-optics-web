/** Shared presentation and diagnostic policy for the worker and its consumers. */

export const CALCULATION_FAILED_MESSAGE =
  "The calculation could not be completed. Please try again.";
export const INITIALIZATION_FAILED_MESSAGE =
  "The calculation engine could not start. Please reload the page and try again.";
export const DUPLICATE_GLASS_MESSAGE =
  "A user-defined glass with this name already exists.";
export const OPTIMIZATION_DID_NOT_CONVERGE_MESSAGE =
  "Optimization did not converge.";

const FOLD_MESSAGE =
  "Projected-pupil mapping contains a fold or orientation reversal.";
const EXACT_SPEC_MESSAGE =
  "The exact optical specification could not be satisfied. Check the field and pupil settings.";
const RAY_TRACE_MESSAGE =
  "A ray could not be traced through the optical system. Check the prescription and aperture settings.";
const PROJECTED_PUPIL_MESSAGE =
  "The projected pupil could not be calculated. Check the optical geometry and aperture settings.";
const VALIDATION_MESSAGE =
  "The calculation settings are invalid. Check the inputs and try again.";
const MISSING_GLASS_MESSAGE =
  "The requested user-defined glass could not be found.";
const CANCELLED_MESSAGE = "The calculation was cancelled.";
const ZERNIKE_FIT_MESSAGE =
  "The Zernike fit could not be completed. Try fewer terms or check the pupil settings.";
const WAVEFRONT_REFERENCE_MESSAGE =
  "The wavefront reference could not be calculated. Check the field and pupil settings.";
const GLASS_CANDIDATE_MESSAGE =
  "A glass candidate could not be resolved. Check the selected catalogs and materials.";

/** Exact, audited validation messages; generic Python exception types are never allowlisted. */
const validationMessages = new Set([
  FOLD_MESSAGE,
  "Projected-pupil mapping contains a singular cell.",
  "Projected-pupil input ray grid must be rectangular.",
  "Projected-pupil sampling requires at least two rays per axis.",
  "Projected-pupil convergence tolerances must be positive.",
  "Initial guess is outside of provided bounds",
  "At least 4 wavelength-refractive index pairs are required.",
  "Optical model must define at least one wavelength.",
  "No valid rays are available to compute angular centroid.",
  "Exiting ray is parallel to the exit-pupil plane.",
  "Variables must provide both min and max bounds",
  "lm variables must omit both min and max bounds together",
  "Differential evolution variables must provide finite min and max bounds",
  "Levenberg-Marquardt requires at least as many residuals as variables",
  "Pickup cycle detected",
  "Glass optimization variables must omit both min and max or provide both",
  "Glass optimization variable bounds must satisfy finite min < max",
  "Glass candidates must provide name and catalog",
  "Glass candidate name must be a non-empty string",
  "Unsupported current material for glass optimization",
  "tol must be a positive finite number",
  "Insufficient valid samples for the requested Zernike terms.",
  "Exit pupil space is unavailable for infinite image space.",
  "At least one Zernike term is required.",
  "Zernike terms must not contain duplicate entries.",
  "Zernike quadrature weights must not be negative.",
  "Fixed normalization radius must be positive and finite.",
  "Maximum boundary resolution cannot be below the fit grid resolution.",
]);
const businessMessages = new Set([
  ...validationMessages,
  EXACT_SPEC_MESSAGE,
  RAY_TRACE_MESSAGE,
  PROJECTED_PUPIL_MESSAGE,
  VALIDATION_MESSAGE,
  DUPLICATE_GLASS_MESSAGE,
  MISSING_GLASS_MESSAGE,
  OPTIMIZATION_DID_NOT_CONVERGE_MESSAGE,
  ZERNIKE_FIT_MESSAGE,
  WAVEFRONT_REFERENCE_MESSAGE,
  GLASS_CANDIDATE_MESSAGE,
]);

type FailureSource = "worker" | "transport";
type Classification = { readonly message: string; readonly business: boolean };

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

/** Selects the final exception header, excluding chained causes, source lines and trailing notes. */
function exceptionDetails(error: unknown): { type: string; message: string } {
  const value = record(error);
  const raw =
    typeof error === "string"
      ? error
      : typeof value?.message === "string" &&
          (typeof value.name === "string" ||
            typeof value.exception_type === "string")
        ? value.message
        : "";
  const finalTrace = raw.slice(
    Math.max(0, raw.lastIndexOf("Traceback (most recent call last):")),
  );
  const header =
    /^(?:[\w.]+\.)?([\w]*(?:Error|Exception|Interrupt))(?:: (.*))?$/m.exec(
      finalTrace,
    );
  if (header) return { type: header[1], message: header[2] ?? "" };
  return {
    type:
      typeof value?.exception_type === "string"
        ? value.exception_type
        : typeof value?.name === "string"
          ? value.name
          : "",
    message: raw,
  };
}

function classify(error: unknown, operation = ""): Classification {
  const { type, message } = exceptionDetails(error);
  if (businessMessages.has(message)) return { message, business: true };
  if (
    /^Zernike design matrix (?:is rank deficient|is ill-conditioned|has invalid singular values)/.test(
      message,
    )
  )
    return { message: ZERNIKE_FIT_MESSAGE, business: true };
  if (
    /^(?:Centroid reference-(?:sphere|plane) solve |Centroid (?:wavefront|plane-wave) reference requires |No (?:positively weighted )?valid rays are available to compute centroid|Centroid is not projectable onto the image surface\.|Chief ray (?:does not define a finite image reference|is parallel to the focused image surface))/.test(
      message,
    )
  )
    return { message: WAVEFRONT_REFERENCE_MESSAGE, business: true };
  if (
    /^(?:Unable to resolve glass |Glass candidate .+ is not eligible$|Glass variable surface \d+ must provide candidates$)/.test(
      message,
    )
  )
    return { message: GLASS_CANDIDATE_MESSAGE, business: true };
  if (type === "ProjectedPupilGeometryError")
    return { message: PROJECTED_PUPIL_MESSAGE, business: true };
  if (/^ExactSpec(?:Trace|Convergence)?Error$/.test(type))
    return { message: EXACT_SPEC_MESSAGE, business: true };
  if (
    /^Trace(?:MissedSurface|TIR|RayBlocked|EvanescentDiffraction|Ray)Error$/.test(
      type,
    )
  )
    return { message: RAY_TRACE_MESSAGE, business: true };
  if (
    /^User-defined glass already exists: .+$/.test(message) ||
    /^Key '.+' already exists\.$/.test(message)
  )
    return { message: DUPLICATE_GLASS_MESSAGE, business: true };
  if (
    type === "KeyError" &&
    /^(get|delete|update)UserDefinedGlasses$/.test(operation)
  )
    return { message: MISSING_GLASS_MESSAGE, business: true };
  if (
    /^(?:Unknown (?:optimizer|variable|pickup|operand|asphere) kind: |Unknown least-squares method: |Unknown decenter type: |Unsupported (?:optimizer option|glass catalog|glass optimizer option|glass variable key|glass optimization config key)|Duplicate (?:variable target|pickup target|glass variable surface): |Current glass at surface \d+ is outside its candidate pool|merit_function\.operands must |(?:surface_index|coefficient_index|wavelength index) \d+ is out of range)/.test(
      message,
    )
  )
    return { message: VALIDATION_MESSAGE, business: true };
  return { message: CALCULATION_FAILED_MESSAGE, business: false };
}

/** Returns approved text without logging; local input validation stays with its owner. */
export function getPyodideErrorMessage(error: unknown): string {
  if (
    record(error)?.message === INITIALIZATION_FAILED_MESSAGE ||
    error === INITIALIZATION_FAILED_MESSAGE
  )
    return INITIALIZATION_FAILED_MESSAGE;
  return classify(error).message;
}

/** Recognizes only our names and approved messages after Comlink reconstructs the Error. */
function isNormalized(error: unknown): error is Error {
  const value = record(error);
  return (
    (value?.name === "PyodideBusinessError" &&
      businessMessages.has(value.message as string)) ||
    (value?.name === "PyodideFatalError" &&
      [CALCULATION_FAILED_MESSAGE, INITIALIZATION_FAILED_MESSAGE].includes(
        value.message as string,
      ))
  );
}

function safeError(name: string, message: string): Error {
  const error = new Error(message);
  error.name = name;
  delete error.stack;
  return error;
}

/** Logs originals once at the owning boundary; returned errors contain no stack or cause. */
export function normalizePyodideError(
  error: unknown,
  operation: string,
  source: FailureSource = "worker",
): Error {
  if (isNormalized(error)) {
    delete error.stack;
    delete error.cause;
    return error;
  }
  if (record(error)?.name === "AbortError")
    return safeError("AbortError", CANCELLED_MESSAGE);
  const classified =
    operation === "init"
      ? { message: INITIALIZATION_FAILED_MESSAGE, business: false }
      : source === "transport"
        ? { message: CALCULATION_FAILED_MESSAGE, business: false }
        : classify(error, operation);
  console[classified.business ? "warn" : "error"](
    `[Pyodide:${operation}]`,
    error,
  );
  return safeError(
    classified.business ? "PyodideBusinessError" : "PyodideFatalError",
    classified.message,
  );
}

/**
 * Removes Python-only diagnostic metadata without changing state, counters or numerical data.
 * Failure reports log their original payload; non-convergence warns and stopping stays silent.
 */
export function normalizeOptimizationReport<T>(
  report: T,
  operation: string,
): T {
  const value = record(report);
  if (
    !value ||
    typeof value.success !== "boolean" ||
    typeof value.message !== "string" ||
    !(
      typeof value.status === "number" ||
      ["evaluated", "optimized", "no_variables", "stopped", "error"].includes(
        value.status as string,
      )
    )
  ) {
    throw new Error("Malformed optimization report", { cause: report });
  }
  const { diagnostic, ...safe } = value;
  if (value.status === "error") {
    const classified = classify(diagnostic ?? value.message, operation);
    console[classified.business ? "warn" : "error"](
      `[Pyodide:${operation}]`,
      report,
    );
    safe.message = classified.message;
  } else if (!value.success && value.status !== "stopped") {
    console.warn(`[Pyodide:${operation}]`, report);
    safe.message = OPTIMIZATION_DID_NOT_CONVERGE_MESSAGE;
  } else if (value.status === "stopped") {
    safe.message = "Optimization stopped.";
  }
  return safe as T;
}

/** Wraps an RPC including synchronous setup, JSON parsing and resolved failure reports. */
export async function runPyodideOperation<T>(
  operation: string,
  run: () => T | Promise<T>,
  source: FailureSource = "worker",
): Promise<T> {
  try {
    const result = await run();
    return source === "worker" &&
      [
        "evaluateOptimizationProblem",
        "optimizeOpm",
        "optimizeGlasses",
      ].includes(operation)
      ? normalizeOptimizationReport(result, operation)
      : result;
  } catch (error) {
    throw normalizePyodideError(error, operation, source);
  }
}

/**
 * Sanitizes Comlink rejections without logging worker-normalized errors again.
 * Worker error/messageerror events reject pending and future RPCs with one logged
 * failure, including startup failures. Symbols and thenability pass through.
 */
export function withPyodideErrorHandling<T extends object>(
  api: T,
  endpoint?: Pick<EventTarget, "addEventListener">,
): T {
  let initialized = false;
  let transportFailure: Error | undefined;
  const pending = new Set<(error: Error) => void>();
  const onFailure = (event: Event) => {
    if (transportFailure !== undefined) return;
    transportFailure = normalizePyodideError(
      event instanceof ErrorEvent ? (event.error ?? event) : event,
      initialized ? "transport" : "init",
      "transport",
    );
    for (const reject of pending) reject(transportFailure);
    pending.clear();
  };
  endpoint?.addEventListener("error", onFailure);
  endpoint?.addEventListener("messageerror", onFailure);
  return new Proxy(api, {
    get(target, property, receiver) {
      const value: unknown = Reflect.get(target, property, receiver);
      if (
        typeof property !== "string" ||
        property === "then" ||
        typeof value !== "function"
      )
        return value;
      return (...args: unknown[]) =>
        runPyodideOperation(
          property,
          async () => {
            if (transportFailure !== undefined) throw transportFailure;
            let rejectPending: (error: Error) => void = () => {};
            const transport = new Promise<never>((_resolve, reject) => {
              rejectPending = reject;
            });
            pending.add(rejectPending);
            try {
              const result: unknown = await Promise.race([
                Reflect.apply(value, target, args),
                transport,
              ]);
              if (property === "init") initialized = true;
              return result;
            } finally {
              pending.delete(rejectPending);
            }
          },
          "transport",
        );
    },
  });
}
