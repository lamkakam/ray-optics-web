"use client";

import React from "react";
import { Modal } from "@/components/micro/Modal";
import { Button } from "@/components/micro/Button";
import { Select } from "@/components/micro/Select";

interface SettingsModalProps {
  readonly isOpen: boolean;
  readonly theme: "light" | "dark";
  readonly onThemeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  readonly onClose: () => void;
}

const themeOptions = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function SettingsModal({ isOpen, theme, onThemeChange, onClose }: SettingsModalProps) {
  return (
    <Modal isOpen={isOpen} title="Settings">
      <div className="mb-6">
        <label htmlFor="theme-select" className="block text-sm font-medium mb-2">
          Theme
        </label>
        <Select
          id="theme-select"
          aria-label="Theme"
          options={themeOptions}
          value={theme}
          onChange={onThemeChange}
        />
      </div>
      <div className="flex justify-end">
        <Button variant="primary" onClick={onClose}>
          Ok
        </Button>
      </div>
    </Modal>
  );
}
