"use client";

import React from "react";
import { Modal } from "@/components/micro/Modal";
import { Button } from "@/components/micro/Button";

interface PythonScriptModalProps {
  readonly isOpen: boolean;
  readonly script: string;
  readonly onClose: () => void;
}

export function PythonScriptModal({ isOpen, script, onClose }: PythonScriptModalProps) {
  return (
    <Modal isOpen={isOpen} title="Python Script" size="4xl">
      <div className="overflow-auto max-h-[60vh] w-full mb-4">
        <pre className="text-xs font-mono whitespace-pre w-full"><code>{script}</code></pre>
      </div>
      <div className="flex justify-end">
        <Button variant="primary" onClick={onClose}>Ok</Button>
      </div>
    </Modal>
  );
}
