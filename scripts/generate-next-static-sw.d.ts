export function buildNextStaticManifest(
  outDir: string,
  basePath: string
): Promise<string[]>;

export function generateNextStaticServiceWorker(
  outDir: string,
  basePath: string
): Promise<void>;
