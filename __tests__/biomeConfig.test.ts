import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const projectRoot = join(__dirname, "..");

describe("Biome lint configuration", () => {
  it("replaces ESLint with the pinned Biome lint contract", () => {
    const packageJson = JSON.parse(
      readFileSync(join(projectRoot, "package.json"), "utf8"),
    );
    const biomeConfig = JSON.parse(
      readFileSync(join(projectRoot, "biome.json"), "utf8"),
    );

    expect(packageJson.devDependencies["@biomejs/biome"]).toBe("2.5.11");
    expect(packageJson.devDependencies.eslint).toBeUndefined();
    expect(packageJson.devDependencies["eslint-config-next"]).toBeUndefined();
    expect(packageJson.scripts.lint).toBe(
      "biome lint . --error-on-warnings",
    );
    expect(existsSync(join(projectRoot, "eslint.config.mjs"))).toBe(false);

    expect(biomeConfig.formatter.enabled).toBe(false);
    expect(biomeConfig.css.parser.tailwindDirectives).toBe(true);
    expect(biomeConfig.linter.rules.preset).toBe("recommended");
    expect(biomeConfig.linter.domains).toMatchObject({
      next: "recommended",
      playwright: "recommended",
      react: "recommended",
      test: "recommended",
    });
    expect(biomeConfig.vcs).toMatchObject({
      clientKind: "git",
      enabled: true,
      useIgnoreFile: true,
    });
    expect(biomeConfig.files.includes).toEqual(
      expect.arrayContaining([
        "!!src/python",
        "!!scripts",
        "!!src/shared/lib/utils/generated",
      ]),
    );
  });
});
