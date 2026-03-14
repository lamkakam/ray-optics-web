"use client";

import React from "react";
import { Modal } from "@/components/micro/Modal";
import { Button } from "@/components/micro/Button";
import { Paragraph } from "@/components/micro/Paragraph";

interface PrivacyPolicyModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  return (
    <Modal isOpen={isOpen} title="Privacy Policy" size="lg">
      <div className="space-y-4 mb-6">
        <section>
          <Paragraph variant="subheading" className="mb-1">Overview</Paragraph>
          <Paragraph>
            Ray Optics Web is a fully client-side application. All computation runs
            in your browser using Pyodide (a Python runtime compiled to WebAssembly).
            This application does not operate any backend server and does not collect,
            store, or transmit any personal information.
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
            <li><code>cdn.jsdelivr.net</code> — Pyodide WebAssembly runtime and standard libraries</li>
            <li><code>files.pythonhosted.org</code> — rayoptics and its Python dependencies (wheel files)</li>
            <li><code>pypi.org</code> — PyPI package metadata used to resolve rayoptics dependencies</li>
          </ul>
        </section>

        <section>
          <Paragraph variant="subheading" className="mb-1">IP Addresses</Paragraph>
          <Paragraph>
            When your browser contacts these CDNs, your IP address may be visible to
            them and may be logged for security, abuse prevention, and operational
            purposes. This is beyond the control of Ray Optics Web. Please review
            the privacy policies of jsDelivr, Python Hosted, and PyPI for details on
            how they handle this data.
          </Paragraph>
        </section>
      </div>

      <div className="flex justify-end">
        <Button variant="primary" onClick={onClose} aria-label="Close">
          Close
        </Button>
      </div>
    </Modal>
  );
}
