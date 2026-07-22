/**
Compatibility re-export for the shared example-system overwrite modal.

The implementation now lives at `shared/components/primitives/ConfirmOverwriteModal/ConfirmOverwriteModal.tsx` so the `/example-systems` route can use it outside Lens Editor ownership.
*/
export { ConfirmOverwriteModal } from "@/shared/components/primitives/ConfirmOverwriteModal";
