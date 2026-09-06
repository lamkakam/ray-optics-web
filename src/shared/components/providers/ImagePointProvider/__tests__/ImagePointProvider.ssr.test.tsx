/**
 * @jest-environment node
 *
 * Server-render coverage for the image-point provider's browser capability guard.
 */
import { renderToString } from "react-dom/server";
import { ImagePointProvider, useImagePoint } from "@/shared/components/providers/ImagePointProvider";

/** Reads the provider's initial value without requiring browser storage. */
function ImagePointText() {
  return <span>{useImagePoint().imagePoint}</span>;
}

describe("ImagePointProvider server rendering", () => {
  it("uses the chief_ray default without browser globals", () => {
    const markup = renderToString(
      <ImagePointProvider>
        <ImagePointText />
      </ImagePointProvider>,
    );

    expect(markup).toContain("chief_ray");
  });
});
