/**
 * @jest-environment node
 *
 * Server-render coverage for sanitizing React's colon-delimited `useId` output before it is used in native list attributes.
 */
jest.mock("react", () => {
  const actualReact = jest.requireActual<typeof import("react")>("react");
  return {
    ...actualReact,
    useId: jest.fn(() => ":r0:"),
  };
});

import { renderToString } from "react-dom/server";
import { Datalist } from "@/shared/components/primitives/Datalist";

describe("Datalist server rendering", () => {
  it("sanitizes the React server-generated list ID consistently", () => {
    const markup = renderToString(
      <Datalist
        aria-label="Glass"
        options={[{ value: "N-BK7", label: "N-BK7" }]}
        value=""
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('list="datalist-r0"');
    expect(markup).toContain('id="datalist-r0"');
  });
});
