import { createStore } from "zustand/vanilla";
import {
  createLensEditorSlice,
  type LensEditorState,
} from "@/features/lens-editor/stores/lensEditorStore";
import { OBJECT_ROW_ID, IMAGE_ROW_ID, type GridRow } from "@/shared/lib/types/gridTypes";
import type { OpticalModel, OpticalSpecs } from "@/shared/lib/types/opticalModel";


const testSpecs: OpticalSpecs = {
  pupil: { space: "object", type: "epd", value: 25 },
  field: { space: "object", type: "angle", maxField: 20, fields: [0, 0.7, 1], isRelative: true },
  wavelengths: { weights: [[587.6, 1]], referenceIndex: 0 },
};

const testModel: OpticalModel = {
  setAutoAperture: "manualAperture",
  object: { distance: 1e10 },
  image: { curvatureRadius: 0 },
  surfaces: [],
  specs: testSpecs,
};

function makeStore() {
  return createStore<LensEditorState>(createLensEditorSlice);
}

function makeTestRows(): GridRow[] {
  return [
    { id: OBJECT_ROW_ID, kind: "object", objectDistance: 1e10 },
    {
      id: "s1",
      kind: "surface",
      label: "Default",
      curvatureRadius: 50,
      thickness: 5,
      medium: "BK7",
      manufacturer: "Schott",
      semiDiameter: 10,
    },
    {
      id: "s2",
      kind: "surface",
      label: "Stop",
      curvatureRadius: -30,
      thickness: 3,
      medium: "F2",
      manufacturer: "Schott",
      semiDiameter: 8,
    },
    { id: IMAGE_ROW_ID, kind: "image", curvatureRadius: 0 },
  ];
}

describe("lensEditorStore", () => {
  describe("initial state", () => {
    it("has an object row and an image row", () => {
      const store = makeStore();
      const rows = store.getState().rows;
      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({ id: OBJECT_ROW_ID, kind: "object", objectDistance: 0 });
      expect(rows[1]).toMatchObject({ id: IMAGE_ROW_ID, kind: "image", curvatureRadius: 0 });
    });

    it('defaults the active bottom drawer tab to "specs"', () => {
      const store = makeStore();
      expect(store.getState().activeBottomDrawerTabId).toBe("specs");
    });
  });

  describe("setRows", () => {
    it("sets rows", () => {
      const store = makeStore();
      const rows = makeTestRows();
      store.getState().setRows(rows);
      expect(store.getState().rows).toEqual(rows);
    });
  });

  describe("updateRow", () => {
    it("updates a single row by id", () => {
      const store = makeStore();
      store.getState().setRows(makeTestRows());
      store.getState().updateRow("s1", { curvatureRadius: 100 });
      const updated = store.getState().rows.find((r) => r.id === "s1");
      expect(updated).toMatchObject({ curvatureRadius: 100 });
    });

    it("does not modify other rows", () => {
      const store = makeStore();
      store.getState().setRows(makeTestRows());
      store.getState().updateRow("s1", { curvatureRadius: 100 });
      const s2 = store.getState().rows.find((r) => r.id === "s2");
      expect(s2).toMatchObject({ curvatureRadius: -30 });
    });

    it("ignores update for non-existent id", () => {
      const store = makeStore();
      const rows = makeTestRows();
      store.getState().setRows(rows);
      store.getState().updateRow("nonexistent", { curvatureRadius: 999 });
      expect(store.getState().rows).toEqual(rows);
    });
  });

  describe("setSelectedRowId", () => {
    it("sets the selected row id", () => {
      const store = makeStore();
      store.getState().setSelectedRowId("s1");
      expect(store.getState().selectedRowId).toBe("s1");
    });

    it("clears selected row id with undefined", () => {
      const store = makeStore();
      store.getState().setSelectedRowId("s1");
      store.getState().setSelectedRowId(undefined);
      expect(store.getState().selectedRowId).toBeUndefined();
    });
  });

  describe("activeBottomDrawerTabId", () => {
    it("updates the active bottom drawer tab id", () => {
      const store = makeStore();
      store.getState().setActiveBottomDrawerTabId("focusing");
      expect(store.getState().activeBottomDrawerTabId).toBe("focusing");
    });
  });

  describe("modal toggles", () => {
    it("opens and closes medium modal", () => {
      const store = makeStore();
      store.getState().openMediumModal("s1");
      expect(store.getState().mediumModal).toEqual({
        open: true,
        rowId: "s1",
      });

      store.getState().closeMediumModal();
      expect(store.getState().mediumModal).toEqual({ open: false, rowId: "" });
    });

    it("opens and closes aspherical modal", () => {
      const store = makeStore();
      store.getState().openAsphericalModal("s2");
      expect(store.getState().asphericalModal).toEqual({
        open: true,
        rowId: "s2",
      });

      store.getState().closeAsphericalModal();
      expect(store.getState().asphericalModal).toEqual({
        open: false,
        rowId: "",
      });
    });

    it("opens and closes decenter modal", () => {
      const store = makeStore();
      store.getState().openDecenterModal("s1");
      expect(store.getState().decenterModal).toEqual({
        open: true,
        rowId: "s1",
      });

      store.getState().closeDecenterModal();
      expect(store.getState().decenterModal).toEqual({
        open: false,
        rowId: "",
      });
    });

    it("initializes decenterModal as closed", () => {
      const store = makeStore();
      expect(store.getState().decenterModal).toEqual({ open: false, rowId: "" });
    });
  });

  describe("addRowAfter", () => {
    it("adds a new surface row after the specified row", () => {
      const store = makeStore();
      store.getState().setRows(makeTestRows());
      store.getState().addRowAfter("s1");

      const rows = store.getState().rows;
      expect(rows).toHaveLength(5);
      const newRow = rows[2];
      expect(newRow.kind).toBe("surface");
      if (newRow.kind === "surface") {
        expect(newRow.label).toBe("Default");
        expect(newRow.medium).toBe("air");
        expect(newRow.manufacturer).toBe("");
      }
    });

    it("adds a row after the object row", () => {
      const store = makeStore();
      store.getState().setRows(makeTestRows());
      store.getState().addRowAfter(OBJECT_ROW_ID);

      const rows = store.getState().rows;
      expect(rows).toHaveLength(5);
      expect(rows[0].kind).toBe("object");
      const newRow = rows[1];
      expect(newRow.kind).toBe("surface");
      if (newRow.kind === "surface") {
        expect(newRow.medium).toBe("air");
        expect(newRow.manufacturer).toBe("");
      }
    });

    it("does not add a row after the image row", () => {
      const store = makeStore();
      store.getState().setRows(makeTestRows());
      store.getState().addRowAfter(IMAGE_ROW_ID);
      expect(store.getState().rows).toHaveLength(4);
    });

    it("does nothing for non-existent id", () => {
      const store = makeStore();
      store.getState().setRows(makeTestRows());
      store.getState().addRowAfter("nonexistent");
      expect(store.getState().rows).toHaveLength(4);
    });
  });

  describe("deleteRow", () => {
    it("deletes the specified surface row", () => {
      const store = makeStore();
      store.getState().setRows(makeTestRows());
      store.getState().deleteRow("s1");

      const rows = store.getState().rows;
      expect(rows).toHaveLength(3);
      expect(rows.find((r) => r.id === "s1")).toBeUndefined();
    });

    it("does not delete the object row", () => {
      const store = makeStore();
      store.getState().setRows(makeTestRows());
      store.getState().deleteRow(OBJECT_ROW_ID);
      expect(store.getState().rows).toHaveLength(4);
    });

    it("does not delete the image row", () => {
      const store = makeStore();
      store.getState().setRows(makeTestRows());
      store.getState().deleteRow(IMAGE_ROW_ID);
      expect(store.getState().rows).toHaveLength(4);
    });

    it("does nothing for non-existent id", () => {
      const store = makeStore();
      store.getState().setRows(makeTestRows());
      store.getState().deleteRow("nonexistent");
      expect(store.getState().rows).toHaveLength(4);
    });
  });

  describe("committedOpticalModel", () => {
    it("is undefined by default", () => {
      const store = makeStore();
      expect(store.getState().committedOpticalModel).toBeUndefined();
    });

    it("setCommittedOpticalModel stores the model", () => {
      const store = makeStore();
      store.getState().setCommittedOpticalModel(testModel);
      expect(store.getState().committedOpticalModel).toEqual(testModel);
    });

    it("setCommittedOpticalModel can be called multiple times to overwrite", () => {
      const store = makeStore();
      store.getState().setCommittedOpticalModel(testModel);
      const updatedModel: OpticalModel = { ...testModel, setAutoAperture: "autoAperture" };
      store.getState().setCommittedOpticalModel(updatedModel);
      expect(store.getState().committedOpticalModel).toEqual(updatedModel);
    });
  });

  describe("setAutoAperture", () => {
    it("defaults to false", () => {
      const store = makeStore();
      expect(store.getState().autoAperture).toBe(false);
    });

    it("sets autoAperture to true", () => {
      const store = makeStore();
      store.getState().setAutoAperture(true);
      expect(store.getState().autoAperture).toBe(true);
    });

    it("sets autoAperture back to false", () => {
      const store = makeStore();
      store.getState().setAutoAperture(true);
      store.getState().setAutoAperture(false);
      expect(store.getState().autoAperture).toBe(false);
    });
  });

});
