import type { ErrorObject, ValidateFunction } from "ajv";
import { Ajv2020 } from "ajv/dist/2020.js";
import * as addFormatsModule from "ajv-formats";
import { SECURITY_SCAN_RECEIPT_SCHEMA } from "../profiles/registry-pr-1404/security-scan-receipt.schema.js";
import type { Finding, ReceiptInput } from "./types.js";

const addFormats: any = (addFormatsModule as any).default ?? addFormatsModule;
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv, { mode: "full" });
const validate = ajv.compile(SECURITY_SCAN_RECEIPT_SCHEMA) as ValidateFunction<ReceiptInput>;

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
