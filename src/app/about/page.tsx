/**
# `app/about/page.tsx`

## Behaviour
- Renders the About heading and explanatory text inline in the route file
- Describes Ray Optics Web as a browser-based optical design GUI
- Mentions the RayOptics library and Pyodide (Python to WebAssembly)
- Notes that all computation is local and no server-side processing occurs
- Renders the current root `LICENSE` contents verbatim in a whitespace-preserving `<pre><code>` block
- Includes a `Third-Party License` section with vertically grouped `ExternalLink`s:
  - `View Third-Party Licenses` links to `https://redirect.github.com/lamkakam/ray-optics-web/blob/main/THIRD-PARTY-LICENSES.md`
  - `View Python Third-Party Licenses` links to `https://redirect.github.com/lamkakam/ray-optics-web/blob/main/THIRD-PARTY-PYTHON-LICENSES.md`
- Keeps the About content vertically scrollable within the app shell
*/
"use client";

import { ExternalLink } from "@/shared/components/primitives/ExternalLink";
import { Header } from "@/shared/components/primitives/Header";
import { Paragraph } from "@/shared/components/primitives/Paragraph";

const LICENSE_TEXT = `BSD 3-Clause License

Copyright (c) 2026, Ka Kam Lam

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
`;

/**
## Purpose
About route page (`/about`).
*/
export default function AboutPage() {
  return (
    <div className="p-6 overflow-y-auto">
      <Header level={2} className="mb-4">About</Header>
      <div className="space-y-4">
        <Paragraph>
          Ray Optics Web is a browser-based graphical interface for optical system design and analysis.
          It uses RayOptics, a Python library for geometrical and image-forming optics, running entirely
          in your browser via Pyodide (Python compiled to WebAssembly).
        </Paragraph>
        <Paragraph>
          No data is sent to any server - all computation happens locally in your browser.
        </Paragraph>
        <section>
          <Header level={3} className="mb-2">License</Header>
          <pre className="overflow-x-auto rounded bg-gray-100 p-4 text-sm dark:bg-gray-800">
            <code>{LICENSE_TEXT}</code>
          </pre>
        </section>
        <section>
          <Header level={3} className="mb-2">Third-Party License</Header>
          <div className="flex flex-col gap-2">
            <ExternalLink
              href="https://redirect.github.com/lamkakam/ray-optics-web/blob/main/THIRD-PARTY-LICENSES.md"
              aria-label="View List of Third-Party TypeScript and JavaScript Packages Licenses"
            >
              View List of Third-Party TypeScript and JavaScript Packages Licenses
            </ExternalLink>
            <ExternalLink
              href="https://redirect.github.com/lamkakam/ray-optics-web/blob/main/THIRD-PARTY-PYTHON-LICENSES.md"
              aria-label="View List of Third-Party Python Package Licenses"
            >
              View List of Third-Party Python Package Licenses
            </ExternalLink>
          </div>
        </section>
      </div>
    </div>
  );
}
