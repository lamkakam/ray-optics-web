---
name: frontend-coding-standard
description: Frontend coding standard for React + TypeScript + Tailwind CSS
---

## Props
- Must be `readonly`.
- A component should have less than 15 props. If it has more, it should be divided into smaller components.

## Component Structure
- Micro components: Minimal components, not relying on other React components. Single responsibility.
- Composite components: Composed with micro-components.
- Container components: Containers for state management and logics.

## Styling
- Use Tailwind CSS. Define and reuse theme variables for unified look and feel.
- Component must be ready for theme switching (light/dark/system). Use the following for smooth theme switching:
```css
:root {
  transition: background-color 0.3s ease, color 0.3s ease;
}
```
- For animations, define and reuse animation variables for unified look and feel.
- Use `will-change` to hint browsers about upcoming changes.

## Accessibility
- All interactive elements must have aria-label.
- All images must have alt text.

## Typing
- Never use `any` type.
- Use `undefined` instead of `null` whenever possible.