# `shared/components/primitives/Tabs.tsx`

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
  activeTabId?: string;
  onTabChange?: (tabId: string) => void;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `tabs` | `readonly TabItem[]` | Yes | Tab definitions — id, label, and content node |
| `actions` | `React.ReactNode` | No | Extra element rendered at the far-right of the tab bar (e.g. collapse button) |
| `showPanel` | `boolean` | No | When `false` the content panel is hidden. Defaults to `true` |
| `panelClassName` | `string` | No | Applied to the `role="tabpanel"` div |
| `activeTabId` | `string` | No | Controlled active tab id. When omitted, `Tabs` manages its own internal selection state |
| `onTabChange` | `(tabId: string) => void` | No | Called whenever the user clicks a tab, in both controlled and uncontrolled modes |

## Internal State

- `internalActiveTabId: string` — uncontrolled active tab id, initialized to `tabs[0]?.id`.

## Key Behaviors

- Tab buttons carry `role="tab"`, `aria-selected`, and `aria-label`.
- The content area carries `role="tabpanel"`.
- Tab bar scrolls horizontally when tabs overflow.
- In controlled mode, `activeTabId` decides the selected tab and clicks only emit `onTabChange`.
- If `activeTabId` or the uncontrolled state points to a tab id that is no longer present, `Tabs` safely falls back to the first tab in `tabs`.

## Usages

```tsx
// Analysis results tabs in BottomDrawer
const tabs = [
  {
    id: "ray-fan",
    label: "Ray Fan",
    content: <RayFanPlot data={plotData} />,
  },
  {
    id: "spot-diagram",
    label: "Spot Diagram",
    content: <SpotDiagramPlot data={plotData} />,
  },
  {
    id: "wavefront",
    label: "Wavefront",
    content: <WavefrontPlot data={plotData} />,
  },
];

<Tabs
  tabs={tabs}
  actions={<collapseButton />}
  showPanel={true}
/>

// Tabs with custom panel styling
<Tabs
  tabs={configTabs}
  panelClassName="p-6 bg-gray-50"
/>
```
