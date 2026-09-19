import type { StoreApi } from "zustand";
import type { GlassMapStore } from "@/features/glass-map/stores/glassMapStore";
import {
  CATALOG_NAMES,
  type CatalogName,
} from "@/features/glass-map/types/glassMap";
import { createPrescriptionAjv } from "@/shared/lib/schemas/prescriptionSchema";
import {
  assertWebMcpInput,
  assertWebMcpNotCancelled,
} from "@/shared/lib/webMcpValidation";

/** Canonical glass identity and full-precision optical properties; `P_Fe` exposes internal `P_fe`. */
export interface GlassProperties {
  glass: string;
  catalog: CatalogName;
  nd: number;
  vd: number;
  ne: number;
  ve: number;
  P_gF: number;
  P_Fe: number;
  P_Fd: number;
}

/** Fresh catalog/name lookup objects, including `{}` for every empty canonical catalog. */
export type GetAllGlassesResponse = Record<
  CatalogName,
  Record<string, GlassProperties>
>;

/** The global catalog query accepts only an empty object. */
const getAllGlassesInputSchema = {
  type: "object",
  additionalProperties: false,
} as const;
const validateInput = createPrescriptionAjv().compile(getAllGlassesInputSchema);

/**
 * Creates the read-only app-wide glass query. Each invocation reads all current
 * preset and custom entries, independently of Glass Map visibility. Returns a
 * JavaScript object for direct lookup such as `ret['Schott']['N-BK7']`, without
 * JSON parsing. Catalogs (including empty ones) and property objects are fresh,
 * isolating response mutations from store data and other invocations. Catalog
 * and glass names remain exact, with no aliases or whitespace normalization.
 * Some Ohara glasses, but not all, ending in a single digit require whitespace:
 * S-BSL7, S-FSL5, and S-NBH5 use S-BSL 7, S-FSL 5, and S-NBH 5, respectively.
 * Water (`Water`), fluorite/fluorspar (`CaF2`), fused silica (`Fused Silica`), and
 * Schott D263 T eco (`D263TECO`) are under `"Special"`.
 * Unloaded catalogs produce an actionable error; cancellation prevents reads.
 */
export function createGetAllGlassesTool(
  store: StoreApi<GlassMapStore>,
): WebMCP.ModelContextTool {
  return {
    name: "get_all_glasses",
    description:
      "Read all preset and custom glasses from every catalog, including catalogs hidden in Glass Map. Returns a JavaScript object keyed by catalog and canonical glass name for direct lookup, e.g. ret['Schott']['N-BK7'], without JSON parsing. Every catalog is included, with {} for empty catalogs. Each glass has glass, catalog, nd, vd, ne, ve, P_gF, P_Fe, and P_Fd without rounding. Names are exact, with no aliases or whitespace normalization. Some Ohara glasses, but not all, ending in a single digit require canonical names with whitespace: S-BSL7, S-FSL5, and S-NBH5 use 'S-BSL 7', 'S-FSL 5', and 'S-NBH 5', respectively. Water ('Water'), fluorite/fluorspar ('CaF2'), fused silica ('Fused Silica'), and Schott D263 T eco ('D263TECO') are under \"Special\".",
    inputSchema: getAllGlassesInputSchema,
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute: (input, { signal }): GetAllGlassesResponse => {
      assertWebMcpInput(validateInput, input);
      assertWebMcpNotCancelled(signal);
      const { catalogsData } = store.getState();
      if (catalogsData === undefined) {
        throw new Error(
          "Glass catalogs are not loaded. Wait for app initialization to finish, then retry get_all_glasses.",
        );
      }
      return Object.fromEntries(
        CATALOG_NAMES.map((catalog) => [
          catalog,
          Object.fromEntries(
            Object.entries(catalogsData[catalog]).map(([glass, data]) => [
              glass,
              {
                glass,
                catalog,
                nd: data.refractiveIndexD,
                vd: data.abbeNumberD,
                ne: data.refractiveIndexE,
                ve: data.abbeNumberE,
                P_gF: data.partialDispersions.P_gF,
                P_Fe: data.partialDispersions.P_fe,
                P_Fd: data.partialDispersions.P_Fd,
              } satisfies GlassProperties,
            ]),
          ),
        ]),
      ) as GetAllGlassesResponse;
    },
  };
}
