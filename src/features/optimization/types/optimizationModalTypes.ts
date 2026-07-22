/** Mode values mirrored by `MODAL_MODE_OPTIONS`. */
export type ModalModeChoice = "constant" | "variable" | "pickup";

/** One numeric source-surface choice and its user-facing label. */
export type SourceSurfaceSelectOption = {
  readonly value: number;
  readonly label: string;
};
