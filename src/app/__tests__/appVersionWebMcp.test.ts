/** Verifies the global version descriptor's bundled value, strict input, and cancellation. */
import { getAppVersionTool } from "@/app/appVersionWebMcp";
import packageJson from "../../../package.json";

describe("get_app_version", () => {
  const signal = new AbortController().signal;

  it("returns the bundled package version as a plain string", async () => {
    const result = await getAppVersionTool.execute({}, { signal });

    expect(result).toBe(packageJson.version);
    expect(typeof result).toBe("string");
    expect(getAppVersionTool.name).toBe("get_app_version");
    expect(getAppVersionTool.annotations?.readOnlyHint).toBe(true);
  });

  it.each([undefined, null, [], 42, { extra: true }])(
    "rejects invalid input %p",
    (input) => {
      expect(() =>
        getAppVersionTool.execute(input as Record<string, unknown>, { signal }),
      ).toThrow(/Invalid input at/);
    },
  );

  it("rejects a cancelled call", () => {
    const controller = new AbortController();
    controller.abort();

    expect(() =>
      getAppVersionTool.execute({}, { signal: controller.signal }),
    ).toThrow(expect.objectContaining({ name: "AbortError" }));
  });
});
