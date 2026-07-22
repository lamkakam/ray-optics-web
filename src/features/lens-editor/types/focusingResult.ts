/**
# `features/lens-editor/types/focusingResult.ts`
*/
/**
## Purpose

Defines the focusing result payload returned by the lens editor focusing actions.

## Usage

```ts
import type { FocusingResult } from "@/features/lens-editor/types/focusingResult";
```*/
export interface FocusingResult {
  delta_thi: number;
  metric_value: number;
}
