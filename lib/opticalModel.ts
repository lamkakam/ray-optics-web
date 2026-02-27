/** Represents a single optical surface in the sequential model. */
export interface Surface {
  index: number;
  label: string;
  surfaceType: string;
  curvatureRadius: number; // 0 means flat (infinite radius)
  thickness: number;
  material: string;
  semiDiameter: number;
}

/** Optical system specifications. */
export interface OpticalSpecs {
  pupil: {
    type: string;
    value: number;
  };
  field: {
    type: string;
    values: number[];
  };
  wavelengths: {
    values: number[];
    referenceIndex: number;
  };
}

/** Complete optical model returned from the worker. */
export interface OpticalModel {
  id: string;
  surfaces: Surface[];
  specs: OpticalSpecs;
}

/** A single element in the lens layout drawing. */
export interface LensElement {
  type: "lens" | "mirror" | "stop" | "image";
  points: [number, number][];
}

/** A ray path through the system. */
export interface RayPath {
  wavelength: number;
  points: [number, number][];
}

/** Data for rendering a 2D lens layout. */
export interface LensLayoutData {
  elements: LensElement[];
  rays: RayPath[];
}

/** Available analysis types. */
export type AnalysisType =
  | "transverse_ray_aberration"
  | "spot_diagram"
  | "wavefront";

/** Transverse ray aberration data. */
export interface TransverseRayAberrationData {
  type: "transverse_ray_aberration";
  fans: Array<{
    field: number;
    wavelength: number;
    direction: "tangential" | "sagittal";
    pupilCoords: number[];
    aberration: number[];
  }>;
}

/** Spot diagram data. */
export interface SpotDiagramData {
  type: "spot_diagram";
  spots: Array<{
    field: number;
    wavelength: number;
    x: number[];
    y: number[];
  }>;
}

/** Wavefront map data. */
export interface WavefrontData {
  type: "wavefront";
  maps: Array<{
    field: number;
    wavelength: number;
    grid: number[][];
    peakToValley: number;
    rms: number;
  }>;
}

/** Discriminated union for analysis results. */
export type AnalysisResult =
  | TransverseRayAberrationData
  | SpotDiagramData
  | WavefrontData;
