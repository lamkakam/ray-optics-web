import {
  toWebMcpErrorPayload,
  toWebMcpRejection,
  WebMcpToolError,
} from "@/shared/lib/webMcpErrors";

function named(name: string, message: string): Error {
  const error = new Error(message);
  error.name = name;
  return error;
}

describe("WebMcpToolError", () => {
  it("carries a code, path, hint, and details", () => {
    const error = new WebMcpToolError("invalid_input", "Bad row", {
      path: "/row",
      hint: "Use object.",
      details: { valid: ["object"] },
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("WebMcpToolError");
    expect(error).toMatchObject({
      code: "invalid_input",
      message: "Bad row",
      path: "/row",
      hint: "Use object.",
      details: { valid: ["object"] },
    });
  });
});

describe("toWebMcpErrorPayload", () => {
  it("preserves typed tool error fields", () => {
    expect(
      toWebMcpErrorPayload(
        "update_lens_row",
        new WebMcpToolError("invalid_input", "Bad row", {
          path: "/row",
          hint: "Use object.",
          details: { surfaceCount: 3 },
        }),
      ),
    ).toEqual({
      error: {
        tool: "update_lens_row",
        code: "invalid_input",
        message: "Bad row",
        path: "/row",
        hint: "Use object.",
        details: { surfaceCount: 3 },
      },
    });
  });

  it("omits absent optional fields", () => {
    expect(
      toWebMcpErrorPayload("tool", new WebMcpToolError("not_ready", "Wait")),
    ).toEqual({ error: { tool: "tool", code: "not_ready", message: "Wait" } });
  });

  it.each([
    [new DOMException("Tool execution was cancelled", "AbortError")],
    [named("AbortError", "The calculation was cancelled.")],
  ])("maps cancellation to cancelled", (error) => {
    expect(toWebMcpErrorPayload("tool", error)).toEqual({
      error: { tool: "tool", code: "cancelled", message: error.message },
    });
  });

  it.each(["PyodideBusinessError", "PyodideFatalError"])(
    "maps %s to calculation_failed",
    (name) => {
      expect(
        toWebMcpErrorPayload("tool", named(name, "Calculation failed.")),
      ).toEqual({
        error: {
          tool: "tool",
          code: "calculation_failed",
          message: "Calculation failed.",
        },
      });
    },
  );

  it("maps missing prescription glass to invalid_state with a hint", () => {
    const payload = toWebMcpErrorPayload(
      "recompute_optical_system",
      named("MissingPrescriptionGlassError", "Unknown glass Schott: N-XYZ"),
    );

    expect(payload.error).toMatchObject({
      tool: "recompute_optical_system",
      code: "invalid_state",
      message: "Unknown glass Schott: N-XYZ",
    });
    expect(payload.error.hint).toContain("update_lens_row");
    expect(payload.error.hint).toContain("get_all_glasses");
  });

  it("maps other errors to internal_error with their message", () => {
    expect(toWebMcpErrorPayload("tool", new Error("Boom"))).toEqual({
      error: { tool: "tool", code: "internal_error", message: "Boom" },
    });
  });

  it("maps non-error values to an unknown internal error", () => {
    expect(toWebMcpErrorPayload("tool", { reason: "x" })).toEqual({
      error: { tool: "tool", code: "internal_error", message: "Unknown error" },
    });
  });

  it("uses a string rejection as the message", () => {
    expect(toWebMcpErrorPayload("tool", "Plain failure")).toEqual({
      error: { tool: "tool", code: "internal_error", message: "Plain failure" },
    });
  });
});

describe("toWebMcpRejection", () => {
  it("returns an Error whose message is the JSON payload", () => {
    const rejection = toWebMcpRejection(
      "set_active_page",
      new WebMcpToolError("precondition_failed", 'Apply "it" first'),
    );

    expect(rejection).toBeInstanceOf(Error);
    expect(JSON.parse(rejection.message)).toEqual({
      error: {
        tool: "set_active_page",
        code: "precondition_failed",
        message: 'Apply "it" first',
      },
    });
  });

  it("keeps cancellation recognizable as an AbortError", () => {
    const rejection = toWebMcpRejection(
      "tool",
      new DOMException("Tool execution was cancelled", "AbortError"),
    );

    expect(rejection.name).toBe("AbortError");
    expect(JSON.parse(rejection.message)).toEqual({
      error: {
        tool: "tool",
        code: "cancelled",
        message: "Tool execution was cancelled",
      },
    });
  });
});
