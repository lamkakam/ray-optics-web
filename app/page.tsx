"use client";

import dynamic from "next/dynamic";
import type { Surfaces, OpticalSpecs } from "@/lib/opticalModel";

const SpecsConfigurerContainer = dynamic(
  () =>
    import("@/components/container/SpecsConfigurerContainer").then(
      (mod) => mod.SpecsConfigurerContainer
    ),
  { ssr: false }
);

const LensPrescriptionContainer = dynamic(
  () =>
    import("@/components/container/LensPrescriptionContainer").then(
      (mod) => mod.LensPrescriptionContainer
    ),
  { ssr: false }
);

const DEMO_SURFACES: Surfaces = {
  object: { distance: 1e10 },
  image: { curvatureRadius: 0 },
  surfaces: [
    {
      label: "Default",
      curvatureRadius: 26.777,
      thickness: 6.0,
      medium: "SK16",
      manufacturer: "Schott",
      semiDiameter: 12.5,
    },
    {
      label: "Default",
      curvatureRadius: -200.0,
      thickness: 3.0,
      medium: "air",
      manufacturer: "",
      semiDiameter: 12.5,
    },
    {
      label: "Stop",
      curvatureRadius: -35.0,
      thickness: 2.0,
      medium: "F2",
      manufacturer: "Schott",
      semiDiameter: 10.0,
    },
    {
      label: "Default",
      curvatureRadius: 35.0,
      thickness: 3.0,
      medium: "air",
      manufacturer: "",
      semiDiameter: 10.0,
    },
    {
      label: "Default",
      curvatureRadius: 200.0,
      thickness: 6.0,
      medium: "SK16",
      manufacturer: "Schott",
      semiDiameter: 12.5,
    },
    {
      label: "Default",
      curvatureRadius: -26.777,
      thickness: 68.0,
      medium: "air",
      manufacturer: "",
      semiDiameter: 12.5,
    },
  ],
};

const DEMO_SPECS: OpticalSpecs = {
  pupil: { space: "object", type: "epd", value: 25 },
  field: {
    space: "object",
    type: "angle",
    maxField: 20,
    fields: [0, 0.7, 1],
    isRelative: true,
  },
  wavelengths: {
    weights: [
      [486.133, 1],
      [587.562, 1],
      [656.273, 1],
    ],
    referenceIndex: 1,
  },
};

export default function Home() {
  return (
    <main className="min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">Ray Optics Web</h1>
      <SpecsConfigurerContainer
        initialSpecs={DEMO_SPECS}
        onSpecsChange={(specs) => {
          console.log("Specs changed:", specs);
        }}
      />
      <LensPrescriptionContainer
        initialSurfaces={DEMO_SURFACES}
        onSurfacesChange={(surfaces) => {
          console.log("Surfaces changed:", surfaces);
        }}
      />
    </main>
  );
}
