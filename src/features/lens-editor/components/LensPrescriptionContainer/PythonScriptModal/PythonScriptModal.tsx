"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Modal } from "@/shared/components/primitives/Modal";
import { Button } from "@/shared/components/primitives/Button";
import { Tooltip } from "@/shared/components/primitives/Tooltip";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";

interface PythonScriptModalProps {
  /** Controls visibility */
  readonly isOpen: boolean;
  /** Self-contained custom-glass loader source to display first */
  readonly userDefinedMaterials: string;
  /** Remaining standalone-export source to display second */
  readonly remainingScript: string;
  /** Called when the OK button is clicked */
  readonly onClose: () => void;
}

interface CopyButtonProps {
  /** Source text sent to the Clipboard API after a successful click. */
  readonly script: string;
  /** Distinct accessible name and tooltip text for this copy action. */
  readonly label: string;
  /** Visible action label shown before and after successful copying. */
  readonly idleLabel: "Copy" | "Copy all";
  /** Button styling appropriate to the action's placement. */
  readonly variant: "secondary" | "floating";
}

/**
 * Copy control with its own transient success state and timer.
 *
 * @remarks
 * Clipboard failures intentionally leave the button in its current state because feedback is only shown from the fulfilled `writeText` promise.
 */
function CopyButton({ script, label, idleLabel, variant }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => {
    if (timeoutRef.current !== undefined) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(script).then(() => {
      if (timeoutRef.current !== undefined) {
        clearTimeout(timeoutRef.current);
      }
      setCopied(true);
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = undefined;
        setCopied(false);
      }, 2000);
    });
  };

  return (
    <Tooltip text={label} portal noTouch>
      <Button variant={variant} aria-label={label} onClick={handleCopy}>
        {copied ? "Copied!" : idleLabel}
      </Button>
    </Tooltip>
  );
}

/**
 * Modal that displays the standalone Python export as two code blocks. The first block keeps bounded scrolling, while the second expands vertically with the modal body and only scrolls horizontally. It provides a right-aligned `Copy all` action and a floating `Copy` action for each block; every action uses the Clipboard API and shows its own transient `Copied!` confirmation.
 *
 * @remarks
 * ## Key Behaviors
 *
 * - The first `<pre><code>` block displays `userDefinedMaterials`, after an instruction to replace `<PATH TO CUSTOM GLASS JSON FILE>` with the real custom-glass JSON path.
 * - The second `<pre><code>` block displays `remainingScript`.
 * - Both block-code regions use `componentTokens.code.color.bgColor`; the path placeholder is an inline `<code>` element with the same background, monospace text, compact padding, and rounded corners.
 * - The two code sections are separated by a `gap-4` layout gap.
 * - The first code section retains its `max-h-[60vh]` bounded `overflow-auto` container. The second code section uses horizontal-only `overflow-x-auto` with no maximum height, leaving the modal body as its sole vertical scrollbar for that content.
 * - The `Copy all` action writes the exact two-section combination, joined with two newline characters, while each floating `Copy` action writes only its own section.
 * - The caller computes both sections lazily only when `isOpen` is `true` (performance optimization).
 * - Each copy action has distinct tooltip and ARIA text and independent two-second feedback.
 *
 *
 *
 * ## Modal Footer
 *
 * - The Ok action is passed to `Modal.footer` so it remains fixed while script content scrolls.
 */
export function PythonScriptModal({
  isOpen,
  userDefinedMaterials,
  remainingScript,
  onClose,
}: PythonScriptModalProps) {
  const combinedScript = [userDefinedMaterials, remainingScript].join("\n\n");

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
      <div className="w-full">
        <p className="mb-3">
          Replace{" "}
          <code className={clsx(cx.code.color.bgColor, "rounded px-1 py-0.5 font-mono")}>
            {"<PATH TO CUSTOM GLASS JSON FILE>"}
          </code>{" "}
          with the real path to your custom glass JSON file before running the script.
        </p>
        <div className="mb-3 flex justify-end">
          <CopyButton
            script={combinedScript}
            label="Copy all to clipboard"
            idleLabel="Copy all"
            variant="secondary"
          />
        </div>
        <div className="flex w-full flex-col gap-4">
          <div className="relative w-full">
            <div className="max-h-[60vh] w-full overflow-auto">
              <pre className={clsx("w-full whitespace-pre font-mono text-xs", cx.code.color.bgColor)}><code>{userDefinedMaterials}</code></pre>
            </div>
            <div className="absolute right-6 top-6">
              <CopyButton
                script={userDefinedMaterials}
                label="Copy user-defined materials to clipboard"
                idleLabel="Copy"
                variant="floating"
              />
            </div>
          </div>
          <div className="relative w-full">
            <div className="w-full overflow-x-auto">
              <pre className={clsx("w-full whitespace-pre font-mono text-xs", cx.code.color.bgColor)}><code>{remainingScript}</code></pre>
            </div>
            <div className="absolute right-6 top-6">
              <CopyButton
                script={remainingScript}
                label="Copy remaining script to clipboard"
                idleLabel="Copy"
                variant="floating"
              />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
