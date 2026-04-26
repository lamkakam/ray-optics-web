import type { ReactNode } from "react";

export interface SeidelSurfaceBySurfaceData {
  aberrTypes: string[];    // ['S-I', 'S-II', 'S-III', 'S-IV', 'S-V']
  surfaceLabels: string[];  // surface labels + 'sum'
  data: number[][];   // 5 x N matrix (row = aberration type, col = surface)
}

export interface SeidelData {
  surfaceBySurface: SeidelSurfaceBySurfaceData;
  transverse: Record<string, number>;  // TSA, TCO, TAS, SAS, PTB, DST
  wavefront: Record<string, number>;   // W040, W131, W222, W220, W311
  curvature: Record<string, number>;   // TCV, SCV, PCV
}

export interface AberrationTypeToLabel extends Record<string, ReactNode> {
  TSA: ReactNode;
  TCO: ReactNode;
  TAS: ReactNode;
  SAS: ReactNode;
  PTB: ReactNode;
  DST: ReactNode;
  W040: ReactNode;
  W131: ReactNode;
  W222: ReactNode;
  W220: ReactNode;
  W311: ReactNode;
  TCV: ReactNode;
  SCV: ReactNode;
  PCV: ReactNode;
}
