"use client";

import React, { useState } from "react";
import { Modal } from "@/components/micro/Modal";
import { Button } from "@/components/micro/Button";
import { Tooltip } from "@/components/micro/Tooltip";


interface PythonScriptModalProps {
  readonly isOpen: boolean;
  readonly script: string;
  readonly onClose: () => void;
}

export function PythonScriptModal({ isOpen, script, onClose }: PythonScriptModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(script).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Modal isOpen={isOpen} title="Python Script" size="4xl">
      <div className="relative w-full mb-4">
        <div className="overflow-auto max-h-[60vh] w-full">
          <pre className="text-xs font-mono whitespace-pre w-full"><code>{script}</code></pre>
        </div>
        <div className="absolute right-6 top-6">
          <Tooltip text="Copy to clipboard" portal noTouch>
            <Button variant="floating" aria-label="Copy to clipboard" onClick={handleCopy}>
              {copied ? "Copied!" : "Copy"}
            </Button>
          </Tooltip>
        </div>
      </div>
      <div className="flex justify-end">
        <Button variant="primary" onClick={onClose}>Ok</Button>
      </div>
    </Modal>
  );
}
