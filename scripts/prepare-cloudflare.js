const { writeFile } = require("node:fs/promises");
const path = require("node:path");
const {
  currentWheelFromPyproject,
  prepareRelease,
} = require("./prepare-release");

const CLOUDFLARE_HEADERS = `/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  Permissions-Policy: tools=(self)
`;

async function prepareCloudflarePages(outDir, destinationDir, currentWheel) {
  await prepareRelease(outDir, destinationDir, currentWheel);
  await writeFile(path.join(destinationDir, "_headers"), CLOUDFLARE_HEADERS, "utf8");
}

if (require.main === module) {
  const projectRoot = process.cwd();
  currentWheelFromPyproject(
    path.resolve(projectRoot, "src/python/pyproject.toml"),
  )
    .then((currentWheel) =>
      prepareCloudflarePages(
        path.resolve(projectRoot, "out"),
        path.resolve(projectRoot, "cloudflare-pages"),
        currentWheel,
      ),
    )
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}

module.exports = { CLOUDFLARE_HEADERS, prepareCloudflarePages };
