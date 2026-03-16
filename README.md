# ray-optics-web

A web-based GUI for [RayOptics](https://github.com/mjhoptics/ray-optics) that runs entirely in the browser — no backend server required. Python computations execute client-side via [Pyodide](https://pyodide.org/) (WebAssembly).

> **Note:** Many RayOptics functionalities are not yet included in this interface.

## Disclaimer

This tool is provided for **educational and exploratory purposes only**. No guarantee of accuracy is made. It is not intended for production or professional optical design use.

## Features

- **17 built-in example systems** — Sasian Triplet, Schmidt Camera, achromats, reflectors, APO designs, eyepieces, and more
- **System specs editor** — aperture (EPD), field (angle or image height, multiple field points), wavelengths (Fraunhofer lines or custom nm)
- **Prescription editor** (AG Grid) — per-surface radius of curvature, thickness, glass/medium, aperture stop
  - Aspherical surfaces: conic constant and polynomial coefficients
  - Decenter/tilt: coordinate system strategies (bend, decenter, dec and return, reverse)
  - Reflective surfaces (mirrors)
- **Lens layout** — SVG diagram of the optical system
- **Analysis plots** — ray fan, OPD fan, spot diagram
- **3rd-order Seidel aberrations** — surface-by-surface breakdown (transverse, wavefront, field curvature)
- **First-order properties** — EFL, BFD, and more
- **Import / export** JSON configuration files
- **Light / dark theme**

## Usage

### Loading an example

1. Open the app in a browser and wait for the "Initializing Ray Optics" overlay to disappear
2. Select an example from the dropdown (e.g. "1: Sasian Triplet")
3. Confirm the overwrite dialog → click **Update System**
4. The lens layout diagram and first-order properties appear

### Editing a prescription manually

1. Open the **Prescription** tab in the bottom drawer
2. Double-click a cell to edit radius or thickness; click to select a medium from the glass catalog
3. Use **Insert Row** to add surfaces
4. In the **System Specs** tab, configure aperture, fields, and wavelengths
5. Click **Update System**

### Importing / Exporting a config

- **Load Config**: click the import button in the Prescription tab and select a JSON file
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
