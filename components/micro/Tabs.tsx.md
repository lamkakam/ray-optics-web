# `components/micro/Tabs.tsx`

## Purpose

Accessible tabbed panel component. Renders a tab bar with ARIA roles and a content panel for the active tab. Supports an optional action slot beside the tabs and a collapsible panel.

## Props

```ts
interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: readonly TabItem[];
  actions?: React.ReactNode;
  showPanel?: boolean;
  panelClassName?: string;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `tabs` | `readonly TabItem[]` | Yes | Tab definitions — id, label, and content node |
| `actions` | `React.ReactNode` | No | Extra element rendered at the far-right of the tab bar (e.g. collapse button) |
| `showPanel` | `boolean` | No | When `false` the content panel is hidden. Defaults to `true` |
| `panelClassName` | `string` | No | Applied to the `role="tabpanel"` div |

## Internal State

- `activeTab: string` — id of the currently selected tab, initialized to `tabs[0]?.id`.

## Key Behaviors

- Tab buttons carry `role="tab"`, `aria-selected`, and `aria-label`.
- The content area carries `role="tabpanel"`.
- Tab bar scrolls horizontally when tabs overflow.

## Usages

- Used directly in `BottomDrawer` (with the collapse toggle as `actions`), and `SeidelAberrModal`.
