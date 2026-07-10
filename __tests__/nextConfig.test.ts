import nextConfig from "../next.config";

describe("nextConfig", () => {
  it("does not define custom route headers for the static export", () => {
    expect(nextConfig.headers).toBeUndefined();
  });
});
