const { cp, readFile, rm } = require("node:fs/promises");
const path = require("node:path");

const TEST_FILE_PATTERN = /\.(?:test|spec)\./i;
const SPECIFICATION_SIDECAR_PATTERN =
  /\.(?:[cm]?js|tsx?|json|sh|py)\.md$/i;

function shouldCopy(relativePath, currentWheel) {
  const segments = relativePath.split(path.sep);
  const basename = segments.at(-1) ?? "";

  if (segments.includes("__tests__") || TEST_FILE_PATTERN.test(basename)) {
    return false;
  }
  if (SPECIFICATION_SIDECAR_PATTERN.test(basename)) {
    return false;
  }
  if (basename.endsWith(".whl")) {
    return basename === currentWheel;
  }
  return true;
}

async function prepareRelease(outDir, destinationDir, currentWheel) {
  await rm(destinationDir, { force: true, recursive: true });
  await cp(outDir, destinationDir, {
    recursive: true,
    filter: (sourcePath) =>
      shouldCopy(path.relative(outDir, sourcePath), currentWheel),
  });
}

async function currentWheelFromPyproject(pyprojectPath) {
  const pyproject = await readFile(pyprojectPath, "utf8");
  const version = pyproject.match(/^version\s*=\s*"([^"]+)"\s*$/m)?.[1];
  if (!version) {
    throw new Error(`Unable to read project version from ${pyprojectPath}`);
  }
  return `rayoptics_web_utils-${version}-py3-none-any.whl`;
}

if (require.main === module) {
  const projectRoot = process.cwd();
  const pyprojectPath = path.resolve(projectRoot, "src/python/pyproject.toml");
  currentWheelFromPyproject(pyprojectPath)
    .then((currentWheel) =>
      prepareRelease(
        path.resolve(projectRoot, "out"),
        path.resolve(projectRoot, "release-dist"),
        currentWheel,
      ),
    )
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}

module.exports = { currentWheelFromPyproject, prepareRelease, shouldCopy };
