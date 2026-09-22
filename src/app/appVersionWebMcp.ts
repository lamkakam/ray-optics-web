/** Read-only WebMCP descriptor for the version bundled into the open application. */
import { APP_VERSION } from "@/shared/lib/appVersion";
import { createPrescriptionAjv } from "@/shared/lib/schemas/prescriptionSchema";
import {
  assertWebMcpInput,
  assertWebMcpNotCancelled,
} from "@/shared/lib/webMcpValidation";

/** Only an empty object is accepted by the version query. */
const getAppVersionInputSchema = {
  type: "object",
  additionalProperties: false,
} as const;

const validateInput = createPrescriptionAjv().compile(getAppVersionInputSchema);

/** Returns the About page's bundled version as a plain string on every route. */
export const getAppVersionTool: WebMCP.ModelContextTool = {
  name: "get_app_version",
  description: "Read the version of the currently open Ray Optics Web app.",
  inputSchema: getAppVersionInputSchema,
  annotations: { readOnlyHint: true, untrustedContentHint: false },
  execute: (input, { signal }): string => {
    assertWebMcpInput(validateInput, input);
    assertWebMcpNotCancelled(signal);
    return APP_VERSION;
  },
};
