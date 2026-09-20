export function shouldCopy(
  relativePath: string,
  currentWheel: string,
): boolean;

export function prepareRelease(
  outDir: string,
  destinationDir: string,
  currentWheel: string,
): Promise<void>;

export function currentWheelFromPyproject(
  pyprojectPath: string,
): Promise<string>;
