"use client";

import React from "react";
import { Button } from "@/components/micro/Button";
import { Modal } from "@/components/micro/Modal";
import { Paragraph } from "@/components/micro/Paragraph";

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
