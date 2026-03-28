"use client";

import React from "react";
import { Header } from "@/components/micro/Header";
import { Paragraph } from "@/components/micro/Paragraph";

export function AboutView() {
  return (
    <div className="p-6">
      <Header level={2} className="mb-4">About</Header>
      <div className="space-y-4">
        <Paragraph>
          Ray Optics Web is a browser-based graphical interface for optical system design and analysis.
          It uses RayOptics, a Python library for geometrical and image-forming optics, running entirely
          in your browser via Pyodide (Python compiled to WebAssembly).
        </Paragraph>
        <Paragraph>
          No data is sent to any server — all computation happens locally in your browser.
        </Paragraph>
      </div>
    </div>
  );
}
