import { createStore } from "zustand/vanilla";
import {
  createLensEditorSlice,
  type LensEditorState,
} from "@/store/lensEditorStore";
import { OBJECT_ROW_ID, IMAGE_ROW_ID, type GridRow } from "@/lib/gridTypes";

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

  describe("exportToJson", () => {
    it("returns JSON string of current rows converted to Surfaces", () => {
      const store = makeStore();
      store.getState().setRows(makeTestRows());
      const json = store.getState().exportToJson();
      const parsed = JSON.parse(json);

      expect(parsed.object.distance).toBe(1e10);
      expect(parsed.image.curvatureRadius).toBe(0);
      expect(parsed.surfaces).toHaveLength(2);
      expect(parsed.surfaces[0].medium).toBe("BK7");
    });
  });
});
