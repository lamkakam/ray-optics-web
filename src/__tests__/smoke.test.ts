import { describe, it, expect } from "@jest/globals";

describe("smoke test", () => {
  it("should pass a trivial assertion", () => {
    expect(1 + 1).toBe(2);
  });
});
