import React from "react";

export function ParentSize({
  children,
}: {
  children: (size: { width: number; height: number }) => React.ReactNode;
}) {
  return <>{children({ width: 800, height: 600 })}</>;
}
