import type { RegistryPr1404Profile } from "../profiles/registry-pr-1404.js";

export type CheckStatus = "pass" | "mismatch" | "inconclusive" | "invalid";

export interface Finding {
  id: "artifact_binding" | "freshness";
  status: CheckStatus;
  reason?: string;
  expected?: string;
  actual?: string;
}

export interface ReceiptInput {
  scanned_artifact_digest?: unknown;
  freshness_expires_at?: unknown;
}

export interface VerificationResult {
  profile: RegistryPr1404Profile["id"];
  checks: Finding[];
}
