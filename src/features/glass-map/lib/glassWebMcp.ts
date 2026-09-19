import type { StoreApi } from "zustand";
import type { GlassMapStore } from "@/features/glass-map/stores/glassMapStore";
import { CATALOG_NAMES } from "@/features/glass-map/types/glassMap";
import { createPrescriptionAjv } from "@/shared/lib/schemas/prescriptionSchema";
import {
  assertWebMcpInput,
  assertWebMcpNotCancelled,
} from "@/shared/lib/webMcpValidation";

/** The global catalog query accepts only an empty object. */
const getAllGlassesInputSchema = {
  type: "object",
  additionalProperties: false,
} as const;
const validateInput = createPrescriptionAjv().compile(getAllGlassesInputSchema);

/**
 * Creates the read-only app-wide glass query. Each invocation reads all current
 * preset and custom entries, independently of Glass Map visibility. The JSON
 * result is `{ glasses: [...] }`, with catalog identity retained for duplicate
 * names, full numeric precision, and internal `P_fe` exposed as `P_Fe`.
 * Unloaded catalogs produce an actionable error; cancellation prevents reads.
 */
export function createGetAllGlassesTool(
  store: StoreApi<GlassMapStore>,
): WebMCP.ModelContextTool {
  return {
    name: "get_all_glasses",
    description:
      "Read all preset and custom glasses from every catalog, including catalogs hidden in Glass Map. Returns glass, catalog, nd, vd, ne, ve, P_gF, P_Fe, and P_Fd without rounding.",
    inputSchema: getAllGlassesInputSchema,
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute: (input, { signal }) => {
      assertWebMcpInput(validateInput, input);
      assertWebMcpNotCancelled(signal);
      const { catalogsData } = store.getState();
      if (catalogsData === undefined) {
        throw new Error(
          "Glass catalogs are not loaded. Wait for app initialization to finish, then retry get_all_glasses.",
        );
      }
      const glasses = CATALOG_NAMES.flatMap((catalog) =>
        Object.entries(catalogsData[catalog]).map(([glass, data]) => ({
          glass,
          catalog,
          nd: data.refractiveIndexD,
          vd: data.abbeNumberD,
          ne: data.refractiveIndexE,
          ve: data.abbeNumberE,
          P_gF: data.partialDispersions.P_gF,
          P_Fe: data.partialDispersions.P_fe,
          P_Fd: data.partialDispersions.P_Fd,
        })),
      );
      return JSON.stringify({ glasses });
    },
  };
}
