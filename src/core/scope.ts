import type { Finding } from "./types.js";

export function validateScanScope(value: unknown): Finding {
  if (!Array.isArray(value)) {
    return { id: "scan_scope", status: "invalid", reason: "scan_scope_not_array" };
  }
  if (value.length === 0) {
    return { id: "scan_scope", status: "invalid", reason: "scan_scope_empty" };
  }
  if (value.some((item) => typeof item !== "string")) {
    return { id: "scan_scope", status: "invalid", reason: "scan_scope_item_not_string" };
  }
  return { id: "scan_scope", status: "pass" };
}
