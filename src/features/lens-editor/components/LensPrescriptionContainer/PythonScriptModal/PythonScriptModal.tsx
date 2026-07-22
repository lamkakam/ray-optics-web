/**
## Internal State

- `copied: boolean` — `true` for 2 seconds after a successful clipboard write, then reset to `false`.

## Modal Footer

- The Ok action is passed to `Modal.footer` so it remains fixed while script content scrolls.
*/
"use client";

import { useState } from "react";
import { Modal } from "@/shared/components/primitives/Modal";
import { Button } from "@/shared/components/primitives/Button";
import { Tooltip } from "@/shared/components/primitives/Tooltip";

interface PythonScriptModalProps {
  /** Controls visibility */
  readonly isOpen: boolean;
  /** Python script text to display */
  readonly script: string;
  /** Called when the OK button is clicked */
  readonly onClose: () => void;
}

/**
Modal that displays a generated Python script in a scrollable code block with a floating "Copy" button that uses the Clipboard API. The copy button shows a transient "Copied!" confirmation.

## Key Behaviors

- Script is displayed in a `<pre><code>` block with `max-h-[60vh]` overflow scroll.
- Copy button uses `variant="floating"` positioned at top-right of the code block.
- `script` is computed lazily by the caller only when `isOpen` is `true` (performance optimization).
*/
export function PythonScriptModal({ isOpen, script, onClose }: PythonScriptModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(script).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      title="Python Script"
      size="4xl"
      footer={(
        <div className="flex justify-end">
          <Button variant="primary" onClick={onClose}>Ok</Button>
        </div>
      )}
    >
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
    </Modal>
  );
}
