/**
# `shared/components/primitives/Header/Header.tsx`
*/
"use client";
import React from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";

export type HeaderLevel = 1 | 2 | 3 | 4 | 5 | 6;

/**
## Props

```ts
type HeaderLevel = 1 | 2 | 3 | 4 | 5 | 6;

interface HeaderProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level: HeaderLevel;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `level` | `HeaderLevel` | Yes | Determines which `<h*>` tag is rendered and which font-size token is applied |
*/
interface HeaderProps extends React.HTMLAttributes<HTMLHeadingElement> {
  readonly level: HeaderLevel;
}

const levelFontSizes: Record<HeaderLevel, string> = {
  1: cx.header.size.h1FontSize,
  2: cx.header.size.h2FontSize,
  3: cx.header.size.h3FontSize,
  4: cx.header.size.h4FontSize,
  5: cx.header.size.h5FontSize,
  6: cx.header.size.h6FontSize,
};

/**
## Purpose

Polymorphic heading component that renders an `h1`–`h6` tag with a consistent font weight and per-level font size drawn from style tokens.

## Key Behaviors

- Tag is derived dynamically from `level`: `` `h${level}` ``.
- Font sizes: h1 = xl, h2 = lg, h3 = base, h4/h5/h6 = sm/xs/xs.

## Usages

```tsx
// Page title (h1)
<Header level={1}>
  Ray Optics Web
</Header>

// Modal title (h2)
<Modal isOpen={isOpen} title="Select Medium">
  {/* Title is rendered as h2 internally *\/}
</Modal>

// Section heading (h3)
<div>
  <Header level={3} className="mb-2">
    System Aperture
  </Header>
  <div className="space-y-2">
    {/* Form controls *\/}
  </div>
</div>

// Subsection heading (h4)
<Header level={4}>
  Advanced Options
</Header>
```
*/
export function Header({ level, className, children, ...rest }: HeaderProps) {
  const Tag = `h${level}` as `h${HeaderLevel}`;
  return (
    <Tag
      className={clsx(
        cx.header.style.fontWeight,
        cx.header.color.textColor,
        levelFontSizes[level],
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
