import type { RegistryPr1404Profile } from "../profiles/registry-pr-1404.js";

export type CheckStatus =
  | "pass"
  | "mismatch"
  | "inconclusive"
  | "invalid"
  | "not_present"
  | "unsupported";

export interface Finding {
  id: "artifact_binding" | "freshness" | "scan_scope" | "inconclusive_reason";
  status: CheckStatus;
  reason?: string;
  expected?: string;
  actual?: string;
}

export interface ReceiptInput {
  scanned_artifact_digest?: unknown;
  freshness_expires_at?: unknown;
  scan_scope?: unknown;
  verdict?: unknown;
  inconclusive_reason?: unknown;
}

export interface VerificationResult {
  profile: RegistryPr1404Profile["id"];
  checks: Finding[];
}
