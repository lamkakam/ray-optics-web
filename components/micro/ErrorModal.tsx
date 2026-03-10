"use client";

import React from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/components/ui/modalTokens";
import { Button } from "@/components/micro/Button";
import { Modal } from "@/components/micro/Modal";

interface ErrorModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function ErrorModal({ isOpen, onClose }: ErrorModalProps) {
  return (
    <Modal isOpen={isOpen} title="Error" maxWidth="max-w-md">
      <p className={clsx("mb-6 text-sm", cx.text.color.bodyTextColor)}>
        The input parameters are invalid. Please check your specifications and
        prescription.
      </p>
      <div className="flex justify-end">
        <Button variant="primary" onClick={onClose}>OK</Button>
      </div>
    </Modal>
  );
}
