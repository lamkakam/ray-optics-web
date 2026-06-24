"use client";

import React from "react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import Link from "next/link";

interface InlineLinkProps {
  readonly href: string;
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly "aria-label"?: string;
  readonly onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}

export function InlineLink({
  href,
  children,
  className,
  onClick,
  "aria-label": ariaLabel,
}: InlineLinkProps) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      onClick={onClick}
      className={twMerge(
        clsx(
          "text-sm font-medium text-blue-600 underline decoration-blue-300 underline-offset-2 transition hover:text-blue-700 dark:text-blue-400 dark:decoration-blue-500 dark:hover:text-blue-300",
          className,
        ),
      )}
    >
      {children}
    </Link>
  );
}
