import type { IncomingMessage, ServerResponse } from "node:http";
import { withCrossOriginIsolationHeaders } from "../scripts/dev-server";

describe("development server", () => {
  it("sets cross-origin isolation headers before delegating to Next", async () => {
    const request = {} as IncomingMessage;
    const response = {
      setHeader: jest.fn(),
    } as unknown as ServerResponse;
    const nextHandler = jest.fn().mockResolvedValue(undefined);

    await withCrossOriginIsolationHeaders(nextHandler)(request, response);

    expect(response.setHeader).toHaveBeenNthCalledWith(
      1,
      "Cross-Origin-Opener-Policy",
      "same-origin",
    );
    expect(response.setHeader).toHaveBeenNthCalledWith(
      2,
      "Cross-Origin-Embedder-Policy",
      "require-corp",
    );
    expect(nextHandler).toHaveBeenCalledTimes(1);
    expect(nextHandler).toHaveBeenCalledWith(request, response);
  });
});
