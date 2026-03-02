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
      expect(updated?.curvatureRadius).toBe(100);
    });

    it("does not modify other rows", () => {
      const store = makeStore();
      store.getState().setRows(makeTestRows());
      store.getState().updateRow("s1", { curvatureRadius: 100 });
      const s2 = store.getState().rows.find((r) => r.id === "s2");
      expect(s2?.curvatureRadius).toBe(-30);
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

  describe("addRowAfterSelected", () => {
    it("adds a new surface row after the selected surface row", () => {
      const store = makeStore();
      store.getState().setRows(makeTestRows());
      store.getState().setSelectedRowId("s1");
      store.getState().addRowAfterSelected();

      const rows = store.getState().rows;
      expect(rows).toHaveLength(5);
      expect(rows[2].kind).toBe("surface");
      expect(rows[2].label).toBe("Default");
      expect(rows[2].curvatureRadius).toBe(0);
      expect(rows[2].thickness).toBe(0);
      expect(rows[2].medium).toBe("air");
      expect(rows[2].manufacturer).toBe("air");
      expect(rows[2].semiDiameter).toBe(1);
      expect(rows[2].aspherical).toBeUndefined();
    });

    it("does nothing when no row is selected", () => {
      const store = makeStore();
      store.getState().setRows(makeTestRows());
      store.getState().addRowAfterSelected();
      expect(store.getState().rows).toHaveLength(4);
    });

    it("does nothing when object row is selected", () => {
      const store = makeStore();
      store.getState().setRows(makeTestRows());
      store.getState().setSelectedRowId(OBJECT_ROW_ID);
      store.getState().addRowAfterSelected();
      expect(store.getState().rows).toHaveLength(4);
    });

    it("does nothing when image row is selected", () => {
      const store = makeStore();
      store.getState().setRows(makeTestRows());
      store.getState().setSelectedRowId(IMAGE_ROW_ID);
      store.getState().addRowAfterSelected();
      expect(store.getState().rows).toHaveLength(4);
    });

    it("assigns a unique id to the new row", () => {
      const store = makeStore();
      store.getState().setRows(makeTestRows());
      store.getState().setSelectedRowId("s1");
      store.getState().addRowAfterSelected();
      const rows = store.getState().rows;
      const ids = rows.map((r) => r.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("deleteSelectedRow", () => {
    it("deletes the selected surface row", () => {
      const store = makeStore();
      store.getState().setRows(makeTestRows());
      store.getState().setSelectedRowId("s1");
      store.getState().deleteSelectedRow();

      const rows = store.getState().rows;
      expect(rows).toHaveLength(3);
      expect(rows.find((r) => r.id === "s1")).toBeUndefined();
    });

    it("clears selectedRowId after deletion", () => {
      const store = makeStore();
      store.getState().setRows(makeTestRows());
      store.getState().setSelectedRowId("s1");
      store.getState().deleteSelectedRow();
      expect(store.getState().selectedRowId).toBeUndefined();
    });

    it("does not delete object row", () => {
      const store = makeStore();
      store.getState().setRows(makeTestRows());
      store.getState().setSelectedRowId(OBJECT_ROW_ID);
      store.getState().deleteSelectedRow();
      expect(store.getState().rows).toHaveLength(4);
    });

    it("does not delete image row", () => {
      const store = makeStore();
      store.getState().setRows(makeTestRows());
      store.getState().setSelectedRowId(IMAGE_ROW_ID);
      store.getState().deleteSelectedRow();
      expect(store.getState().rows).toHaveLength(4);
    });

    it("does nothing when no row selected", () => {
      const store = makeStore();
      store.getState().setRows(makeTestRows());
      store.getState().deleteSelectedRow();
      expect(store.getState().rows).toHaveLength(4);
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
