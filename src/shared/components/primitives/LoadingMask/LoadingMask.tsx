import { Paragraph } from "@/shared/components/primitives/Paragraph";

interface LoadingMaskProps {
  readonly message?: string;
}

export function LoadingMask({ message = "Loading…" }: LoadingMaskProps) {
  return (
    <div
      data-testid="loading-mask"
      className="absolute inset-0 flex items-center justify-center rounded bg-gray-900/60"
    >
      <Paragraph variant="placeholder">{message}</Paragraph>
    </div>
  );
}
