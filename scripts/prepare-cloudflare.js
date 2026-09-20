const { cp, rm, writeFile } = require("node:fs/promises");
const path = require("node:path");

const CLOUDFLARE_HEADERS = `/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  Permissions-Policy: tools=(self)
`;

async function prepareCloudflarePages(outDir, destinationDir) {
  await rm(destinationDir, { force: true, recursive: true });
  await cp(outDir, destinationDir, { recursive: true });
  await writeFile(path.join(destinationDir, "_headers"), CLOUDFLARE_HEADERS, "utf8");
}

if (require.main === module) {
  prepareCloudflarePages(
    path.resolve(process.cwd(), "out"),
    path.resolve(process.cwd(), "cloudflare-pages")
  ).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { CLOUDFLARE_HEADERS, prepareCloudflarePages };
