"use client";

import React from "react";
import { Header } from "@/shared/components/primitives/Header";
import { Paragraph } from "@/shared/components/primitives/Paragraph";

export default function PrivacyPolicyPage() {
  return (
    <div className="p-6 overflow-y-auto">
      <Header level={2} className="mb-4">Privacy Policy</Header>
      <div className="space-y-4">
        <section>
          <Paragraph variant="subheading" className="mb-1">Overview</Paragraph>
          <Paragraph>
            Ray Optics Web is a fully client-side application. All computation runs
            in your browser using Pyodide (a Python runtime compiled to WebAssembly)
            and RayOptics (a Python geometrical optics and image forming optics library).
          </Paragraph>
        </section>

        <section>
          <Paragraph variant="subheading" className="mb-1">Third-Party CDNs</Paragraph>
          <Paragraph className="mb-2">
            Your browser fetches the following resources directly from third-party CDNs
            when you first visit this application. These requests are subsequently
            served from a local browser cache (via a Service Worker) on subsequent visits.
          </Paragraph>
          <ul className="list-disc list-inside space-y-1">
            <li><code>cdn.jsdelivr.net</code> - Pyodide WebAssembly runtime and standard libraries</li>
            <li><code>files.pythonhosted.org</code> - RayOptics and its Python dependencies (wheel files)</li>
            <li><code>pypi.org</code> - PyPI package metadata used to resolve RayOptics dependencies</li>
          </ul>
        </section>

        <section>
          <Paragraph variant="subheading" className="mb-1">IP Addresses</Paragraph>
          <Paragraph>
            When your browser contacts these CDNs, your IP address may be visible to
            them and may be logged for security, abuse prevention, and operational
            purposes. Please review the privacy policies of jsDelivr, Python Hosted,
            and PyPI for details on how they handle this data.
          </Paragraph>
        </section>

        <section>
          <Paragraph variant="subheading" className="mb-1">We may make changes to these terms</Paragraph>
          <Paragraph>
            We may update this Privacy Policy from time to time. Every time you wish to use our site,
            please check these terms to ensure you understand the terms that apply at that time.
          </Paragraph>
        </section>
      </div>
    </div>
  );
}
