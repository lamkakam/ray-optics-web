import { useReducer } from "react";

export function useForceUpdate(): [number, () => void] {
  return useReducer((a: number) => a + 1, 0);
}
