"use client";
/**
 * Reusable prescription grid cell UI that is safe for `shared/` because it depends only on shared primitives.
 *
 * @remarks
 * ## Behavior
 *
 * - `SurfacePropertyCell` renders every modal-backed surface property (medium, aperture, asphere, tilt and decenter, diffraction grating). Its label, accessible name, and tooltip come from the property's UI descriptor, so a new property needs no new cell component.
 * - Tooltips use `portal` and `noTouch` for AG Grid compatibility, and their trigger fills the cell action area (`triggerClassName="flex h-full w-full"`).
 * - Action cells do not apply `touch-action: none`, so native touch scrolling can start over them in iOS Safari.
 * - Action cell text renders on a single line and uses an ellipsis when it exceeds the available cell width.
 */

import type React from "react";
import { Tooltip } from "@/shared/components/primitives/Tooltip";

interface ActionWrapperProps {
  readonly children: React.ReactNode;
  readonly onAction: () => void;
}

/** Wraps an interactive grid cell action with consistent keyboard and pointer behavior. */
export function LensPrescriptionActionWrapper({
  children,
  onAction,
}: ActionWrapperProps) {
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (
      (event.target as HTMLElement).closest(
        "button,a,input,select,textarea",
      ) !== null
    ) {
      return;
    }

    onAction();
  };

  return (
    <div
      data-cell-wrapper
      className="flex h-full w-full cursor-pointer items-center"
      onClick={handleClick}
    >
      {children}
    </div>
  );
}

interface TextActionButtonProps {
  readonly ariaLabel: string;
  readonly children: React.ReactNode;
  readonly onClick: () => void;
}

function TextActionButton({
  ariaLabel,
  children,
  onClick,
}: TextActionButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="h-full w-full cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap text-left"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

interface SurfacePropertyCellProps {
  /** Text shown in the cell, already formatted by the property's UI descriptor. */
  readonly label: string;
  /** Accessible name of the action button. */
  readonly ariaLabel: string;
  readonly tooltipText: string;
  readonly onOpenModal: () => void;
}

/** Renders a modal-backed surface-property summary and opens its modal. */
export function SurfacePropertyCell({
  label,
  ariaLabel,
  tooltipText,
  onOpenModal,
}: SurfacePropertyCellProps) {
  return (
    <Tooltip
      text={tooltipText}
      position="top"
      portal
      noTouch
      triggerClassName="flex h-full w-full"
    >
      <TextActionButton ariaLabel={ariaLabel} onClick={onOpenModal}>
        {label}
      </TextActionButton>
    </Tooltip>
  );
}
