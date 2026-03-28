import { createStore } from "zustand/vanilla";
import {
  createLensLayoutImageSlice,
  type LensLayoutImageState,
} from "@/store/lensLayoutImageStore";

function makeStore() {
  return createStore<LensLayoutImageState>(createLensLayoutImageSlice);
}

describe("lensLayoutImageStore", () => {
  describe("initial state", () => {
    it("has layoutImage as undefined", () => {
      const store = makeStore();
      expect(store.getState().layoutImage).toBeUndefined();
    });

    it("has layoutLoading as false", () => {
      const store = makeStore();
      expect(store.getState().layoutLoading).toBe(false);
    });
  });

  describe("setLayoutImage", () => {
    it("sets layoutImage to a string", () => {
      const store = makeStore();
      store.getState().setLayoutImage("base64data");
      expect(store.getState().layoutImage).toBe("base64data");
    });

    it("clears layoutImage with undefined", () => {
      const store = makeStore();
      store.getState().setLayoutImage("base64data");
      store.getState().setLayoutImage(undefined);
      expect(store.getState().layoutImage).toBeUndefined();
    });
  });

  describe("setLayoutLoading", () => {
    it("sets layoutLoading to true", () => {
      const store = makeStore();
      store.getState().setLayoutLoading(true);
      expect(store.getState().layoutLoading).toBe(true);
    });

    it("sets layoutLoading back to false", () => {
      const store = makeStore();
      store.getState().setLayoutLoading(true);
      store.getState().setLayoutLoading(false);
      expect(store.getState().layoutLoading).toBe(false);
    });
  });
});
