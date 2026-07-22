# `shared/components/primitives/`

Generic, single-responsibility UI primitives. These are the base building blocks used throughout the app — no domain knowledge, no store dependencies.

## Components

- [Button.tsx](./Button/Button.tsx) — Themed button with variants (primary, secondary, toggle, danger, floating) and sizes
- [CheckboxInput.tsx](./CheckboxInput/CheckboxInput.tsx) — Compact labelled checkbox row with shared styling
- [Chip.tsx](./Chip/Chip.tsx) — Small, compact tag/badge component
- [ConfirmOverwriteModal.tsx](./ConfirmOverwriteModal/ConfirmOverwriteModal.tsx) — Confirmation modal for loading an example system over the current configuration
- [DescriptionContainer.tsx](./DescriptionContainer/DescriptionContainer.tsx) — Tokenized description panel
- [Datalist.tsx](./Datalist/Datalist.tsx) — Searchable native datalist with Select-equivalent styling
- [ErrorModal.tsx](./ErrorModal/ErrorModal.tsx) — Modal for displaying error messages
- [ExternalLink.tsx](./ExternalLink/ExternalLink.tsx) — Plain external anchor that always opens safely in a new tab
- [Header.tsx](./Header/Header.tsx) — Top navigation header
- [InlineLink.tsx](./InlineLink/InlineLink.tsx) — Inline text-style navigation link
- [Input.tsx](./Input/Input.tsx) — Styled text input field
- [Label.tsx](./Label/Label.tsx) — Form label for inputs
- [LoadingMask.tsx](./LoadingMask/LoadingMask.tsx) — Mask component for loading states
- [LoadingOverlay.tsx](./LoadingOverlay/LoadingOverlay.tsx) — Overlay with loading spinner
- [MenuContainer.tsx](./MenuContainer/MenuContainer.tsx) — Semantic scrollable menu container
- [Modal.tsx](./Modal/Modal.tsx) — Modal dialog backdrop and container
- [NavLink.tsx](./NavLink/NavLink.tsx) — Navigation link with active state styling
- [Paragraph.tsx](./Paragraph/Paragraph.tsx) — Styled text paragraph
- [Progress.tsx](./Progress/Progress.tsx) — Determinate linear progress bar with optional status text
- [RadioInput.tsx](./RadioInput/RadioInput.tsx) — Radio button for mutually exclusive selections
- [Select.tsx](./Select/Select.tsx) — Dropdown select with native or custom options
- [Switch.tsx](./Switch/Switch.tsx) — Controlled switch primitive with checked/unchecked content
- [Table.tsx](./Table/Table.tsx) — HTML table with styled rows and cells
- [Tabs.tsx](./Tabs/Tabs.tsx) — Tab switcher for section navigation
- [Tooltip.tsx](./Tooltip/Tooltip.tsx) — Floating tooltip on hover
