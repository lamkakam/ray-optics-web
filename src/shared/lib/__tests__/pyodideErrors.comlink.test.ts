/** Real Comlink serialization must retain safe classification without diagnostic stacks or causes. */
import { MessageChannel } from "node:worker_threads";
import { expose, wrap, releaseProxy } from "comlink/dist/umd/comlink";
import nodeEndpoint from "comlink/dist/umd/node-adapter";
import {
  normalizePyodideError,
  withPyodideErrorHandling,
} from "../pyodideErrors";

it.each([
  "ProjectedPupilGeometryError: Projected-pupil mapping contains a fold or orientation reversal.",
  "RuntimeError: private failure",
])("serializes safe errors through Comlink: %s", async (message) => {
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  const error = jest.spyOn(console, "error").mockImplementation(() => {});
  const { port1, port2 } = new MessageChannel();
  const original = new Error(
    `Traceback (most recent call last):\n  File "/private/path.py", line 2\n${message}`,
    { cause: new Error("private cause") },
  );
  const safe = normalizePyodideError(original, "getWavefrontData");
  const api = {
    async calculate(): Promise<void> {
      throw safe;
    },
  };
  expose(api, nodeEndpoint(port1));
  const remote = wrap<typeof api>(nodeEndpoint(port2));
  try {
    const received = await withPyodideErrorHandling(remote)
      .calculate()
      .catch((reason: Error) => reason);
    expect(received).toBeInstanceOf(Error);
    if (!(received instanceof Error)) throw new Error("Expected a rejection");
    expect(received.name).toBe(safe.name);
    expect(received.message).toBe(safe.message);
    expect(received.stack).toBeUndefined();
    expect(received.cause).toBeUndefined();
    expect(warn.mock.calls.length + error.mock.calls.length).toBe(1);
  } finally {
    remote[releaseProxy]();
    port1.close();
    port2.close();
    jest.restoreAllMocks();
  }
});
