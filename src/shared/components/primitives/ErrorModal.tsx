"use client";

import React from "react";
import { Button } from "@/shared/components/primitives/Button";
import { Modal } from "@/shared/components/primitives/Modal";
import { Paragraph } from "@/shared/components/primitives/Paragraph";

interface ErrorModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly message?: string;
}

export function ErrorModal({ isOpen, onClose, message }: ErrorModalProps) {
  return (
    <Modal isOpen={isOpen} title="Error" size="md">
      <Paragraph className="mb-6">
        {message ?? "The input parameters are invalid. Please check your specifications and prescription."}
      </Paragraph>
      <div className="flex justify-end">
        <Button variant="primary" onClick={onClose}>OK</Button>
      </div>
    </Modal>
  );
}
