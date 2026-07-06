# `features/import-custom-glass`

## Purpose
Feature module for managing user-defined tabulated glass in the client-only app.

## Contents
- `ImportCustomGlassPage.tsx` - route-level coordinator for import, add, edit, download, delete, and confirmation state.
- `components/` - composed React UI for the toolbar, readonly table, and add/edit modal.
- `lib/` - pure helpers and worker/browser orchestration for custom glass import/export and save flows.
- `types/` - feature-local import/export, row, modal, and worker orchestration types.
