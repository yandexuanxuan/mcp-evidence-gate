import { createRequire } from "node:module";
import type { ErrorObject, ValidateFunction } from "ajv";
import type { Finding, ReceiptInput } from "./types.js";

const require = createRequire(import.meta.url);
const Ajv2020: any = require("ajv/dist/2020.js").default;
const addFormats: any = require("ajv-formats").default;
const schema = require("../profiles/registry-pr-1404/security-scan-receipt.schema.json") as object;
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv, { mode: "full" });
const validate = ajv.compile(schema) as ValidateFunction<ReceiptInput>;

function formatErrors(errors: ErrorObject[] | null | undefined): string[] {
  return (errors ?? []).map((error) => {
    const path = error.instancePath || "/";
    return `${path} ${error.message ?? error.keyword}`;
  });
}

export function validateReceiptStructure(receipt: unknown): Finding {
  if (validate(receipt)) {
    return { id: "receipt_structure", status: "pass" };
  }
  return {
    id: "receipt_structure",
    status: "invalid",
    reason: "schema_validation_failed",
    details: formatErrors(validate.errors)
  };
}
