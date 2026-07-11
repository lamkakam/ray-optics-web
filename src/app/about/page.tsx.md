# `app/about/page.tsx`

## Purpose
About route page (`/about`).

## Behaviour
- Renders the About heading and explanatory text inline in the route file
- Describes Ray Optics Web as a browser-based optical design GUI
- Mentions the RayOptics library and Pyodide (Python to WebAssembly)
- Notes that all computation is local and no server-side processing occurs
- Renders the current root `LICENSE` contents verbatim in a whitespace-preserving `<pre><code>` block
- Includes a `Third-Party License` section with an `ExternalLink` labeled `View Third-Party Licenses` to `https://redirect.github.com/lamkakam/ray-optics-web/blob/main/THIRD-PARTY-LICENSES.md`
- Keeps the About content vertically scrollable within the app shell
