/**
 * @jest-environment node
 *
 * Verifies the breakpoint hook's server-rendered default before browser effects run.
 */

import { renderToString } from "react-dom/server";
import { useScreenBreakpoint } from "../useScreenBreakpoint";

/** Renders the hook result during server rendering. */
function ScreenProbe() {
  return <span>{useScreenBreakpoint()}</span>;
}

describe("useScreenBreakpoint during server rendering", () => {
  it("renders the large-screen default without browser APIs", () => {
    expect(renderToString(<ScreenProbe />)).toBe("<span>screenLG</span>");
  });
});
