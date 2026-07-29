import jestConfig from "../jest.config";

describe("jestConfig", () => {
  it("excludes generated static exports from canonical test discovery", () => {
    expect(jestConfig.testPathIgnorePatterns).toContain("<rootDir>/out/");
  });
});
