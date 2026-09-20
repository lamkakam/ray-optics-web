export const CLOUDFLARE_HEADERS: string;

export function prepareCloudflarePages(
  outDir: string,
  destinationDir: string,
  currentWheel: string,
): Promise<void>;
