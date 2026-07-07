# `features/import-custom-glass`

## Purpose
Feature module for managing user-defined tabulated glass in the client-only app.

## Contents
- `ImportCustomGlassPage.tsx` - route-level coordinator for import, add, edit, download, delete, and confirmation state.
- `components/` - composed React UI for the toolbar, readonly table, and add/edit modal.
- `lib/` - pure helpers and worker/browser orchestration for custom glass import/export and save flows.
- `providers/` - React provider for the feature-local Import Custom Glass store.
- `stores/` - feature-local Zustand slice for readonly table sort/filter state.
- `types/` - feature-local import/export, row, modal, and worker orchestration types.
