# ray-optics-web

A web-based GUI for [RayOptics v0.9.4](https://github.com/mjhoptics/ray-optics) that runs entirely in the browser — no backend server required (except for serving the static assets). Python computations execute client-side via [Pyodide](https://pyodide.org/) (WebAssembly). Pyodide is served from [jsDelivr](https://www.jsdelivr.com/); RayOptics and its dependencies are served from [Python Hosted](https://pythonhosted.org/).

> **Note:** Many RayOptics functionalities are not yet included in this interface.

## Disclaimer

This tool is provided for **educational and exploratory purposes only**. **NO GUARANTEE OF ACCURACY - USE AT YOUR OWN RISK.** It is not intended for production or professional optical design use.

## Non-Affiliation Notice

This project is not affiliated with, endorsed by, or in any way officially connected with RayOptics, Pyodide, telescope-optics.net, the University of Arizona, or any other organization, institution, or individual mentioned in this project.

## Features

- **Example systems** — including Schmidt Camera, reflectors, achromats, apochromats, an eyepiece, etc.
- **System specs editor** — aperture, fields, wavelengths (Fraunhofer lines or custom)
- **Prescription editor** — per-surface radius of curvature, thickness, glass/reflective surface/air/fluorite, aperture stop
  - Aspherical surfaces: conic constant and polynomial coefficients for even aspheric surfaces
  - Decenter/tilt
  - Reflective surfaces (mirrors)
  - Semi-diameter of each surface: can be set automatically or manually
- **Lens layout** — PNG diagram of the optical system
- **Analysis plots** — ray fan, OPD fan, spot diagram, surface-by-surface 3rd-order Seidel aberration breakdown
- **3rd-order Seidel aberrations** — surface-by-surface breakdown, transverse ray aberrations, wavefront aberrations (in waves of reference wavelength set in System Specs), field curvature
- **First-order properties** — EFL, BFD, image height, f/#, NA at object and image space
- **Import / export** JSON configuration files for this web app

## Usage

### Loading an example

1. Open the app in a browser and wait for the initialization to complete
2. Select an example from the dropdown (e.g. "Sasian Triplet")
3. Confirm the overwrite dialog → click **Update System**
4. The lens layout diagram and first-order properties appear

### Entering a prescription manually
1. In the **System Specs** tab, configure aperture, fields, and wavelengths
2. Click the **Prescription** tab, add or remove surfaces as needed
3. Double-click a cell to edit radius or thickness; click a cell to select a medium from the glass catalog
4. Configure aspherical surfaces, decenter/tilt as needed
5. Click **Update System**

### Importing / Exporting a config

- **Load Config**: click the import button in the Prescription tab and select a JSON file previously exported from this web app
- **Download Config**: download the current design as a JSON file

## Development Setup

```bash
# Install dependencies
npm install

# Run dev server (http://localhost:3000)
npm run dev

# Type check
npm run type-check

# Lint
npm run lint

# Unit tests (Jest)
npm run test

# E2E tests (Playwright)
npm run test:e2e

# Build the app
npm run build

# Serve the built app locally
npm run serve
```

## Architecture

RayOptics computations are CPU-intensive. The app runs the Python runtime ([Pyodide v0.27.7](https://pyodide.org/)) inside a **Web Worker** so the main thread (and the UI) stays responsive. Communication between the React frontend and the worker uses [Comlink](https://github.com/GoogleChromeLabs/comlink) for typed async RPC — raw `postMessage` is never used directly.

```
Browser
├── Main thread (Next.js / React)
│   └── Comlink proxy → Web Worker
└── Web Worker
    └── Pyodide → rayoptics (Python)
```

## Third-Party Data

### Fluorite (CaF2) refractive index data

The refractive index data for fluorite used in this app is sourced from [refractiveindex.info](https://refractiveindex.info/?shelf=main&book=CaF2&page=Malitson) and is self-hosted at `public/database/data/main/CaF2/nk/Malitson.yml`.

- Source file: https://refractiveindex.info/database/data/main/CaF2/nk/Malitson.yml
- License: [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) — this file is **not** subject to the license of this repository.

**Citations:**

- I. H. Malitson. A redetermination of some optical properties of calcium fluoride. [*Appl. Opt.* **2**, 1103–1107 (1963)](https://opg.optica.org/ao/abstract.cfm?uri=ao-2-11-1103).
- M. N. Polyanskiy. Refractiveindex.info database of optical constants. *Sci. Data* **11**, 94 (2024). https://doi.org/10.1038/s41597-023-02898-2

### Example Optical Systems

The bundled example optical systems are derived or adapted from the following sources:

- **Sasian Triplet** — from the [RayOptics example gallery](https://ray-optics.readthedocs.io/en/latest/examples/SasianTriplet/SasianTriplet.html), which cites Prof. Jose Sasian's OPTI 517 course at the University of Arizona (https://wp.optics.arizona.edu/jsasian/courses/opti-517/).
- **Newtonian Reflector with Optical Window** — [telescope-optics.net: Reflecting telescopes](https://www.telescope-optics.net/reflecting.htm)
- **Herschel's 40-foot Reflector** — [telescope-optics.net: Early telescopes](https://www.telescope-optics.net/early%20telescopes.htm)
- **Mike I. Jones's Improved Herschel Reflector** — [telescope-optics.net: Early telescopes](https://www.telescope-optics.net/early%20telescopes.htm)
- **Tilted Houghton-Herschel 150mm f/8** — [telescope-optics.net: Miscellaneous optics](https://www.telescope-optics.net/miscellaneous_optics.htm)
- **Terry Platt's 318mm f/21 Buchroeder "Quad-Schiefspiegler"** — [telescope-optics.net: ATM telescopes](https://www.telescope-optics.net/ATM_telescopes.htm)
- **Clyde Bone Jr. 30-inch f/5 Mersenne** — [telescope-optics.net: ATM telescopes](https://www.telescope-optics.net/ATM_telescopes.htm)
- **Schmidt Camera 200mm f/5** — [telescope-optics.net: Schmidt camera aberrations](https://telescope-optics.net/schmidt_camera_aberrations.htm)
- **Ortho-APO 130mm f/7.7** (Example #57) — [telescope-optics.net: Commercial telescopes](https://www.telescope-optics.net/commercial_telescopes.htm)
- **Fluorite Doublet APO 130mm f/8** (Example #27) — [telescope-optics.net: Commercial telescopes](https://www.telescope-optics.net/commercial_telescopes.htm)
- **Fraunhofer Achromat 120mm f/23.6** and **f/7.5** — derived from [telescope-optics.net: Achromats](https://telescope-optics.net/achromats.htm)
- **APO Doublet (S-FPL53/N-ZK7) 120mm f/7.5** (Example #19) — [telescope-optics.net: Commercial telescopes](https://www.telescope-optics.net/commercial_telescopes.htm)
- **APO Petzval 140mm f/7** (Design 11.24, and variant with rear lenses removed) — [telescope-optics.net: Miscellaneous optics](https://telescope-optics.net/miscellaneous_optics.htm)
- **Reversed Modified Imaizumi Eyepiece** — eyepiece design by Imaizumi M., US Patent 5,557,464 (1996); modified configuration from [telescope-optics.net: Eyepiece raytrace](https://telescope-optics.net/eyepiece_raytrace.htm)

## License

See [LICENSE](./LICENSE).
