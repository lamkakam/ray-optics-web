# ray-optics-web

A web-based GUI for [RayOptics v0.9.4](https://github.com/mjhoptics/ray-optics) that runs entirely in the browser — no backend server required (except for serving the static assets). Python computations execute client-side via [Pyodide](https://pyodide.org/) (WebAssembly).

> **Note:** Many RayOptics functionalities are not yet included in this interface.

## Disclaimer

This tool is provided for **educational and exploratory purposes only**. No guarantee of accuracy is made. It is not intended for production or professional optical design use.

## Features

- **Example systems** — including Schmidt Camera, reflectors, achromats, apochromats, eyepiece, etc.
- **System specs editor** — aperture, fields, wavelengths (Fraunhofer lines or custom)
- **Prescription editor** per-surface radius of curvature, thickness, glass/reflective surface/air/fluorite, aperture stop
  - Aspherical surfaces: conic constant and polynomial coefficients for even aspheric surfaces
  - Decenter/tilt
  - Reflective surfaces (mirrors)
  - Semi-diameter of each surface: can be set automatically or manually
- **Lens layout** — SVG diagram of the optical system
- **Analysis plots** — ray fan, OPD fan, spot diagram, surface-by-surface 3rd-order Seidel aberration breakdown
- **3rd-order Seidel aberrations** — surface-by-surface breakdown, transverse, wavefront (in waves of reference wavelength set in System Specs), field curvature
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
3. Double-click a cell to edit radius or thickness; click to select a medium from the glass catalog
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

## License

See [LICENSE](./LICENSE).
