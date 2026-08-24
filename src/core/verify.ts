import { REGISTRY_PR_1404_PROFILE } from "../profiles/registry-pr-1404.js";
import { verifyArtifactBinding } from "./digest.js";
import { evaluateFreshness } from "./freshness.js";
import { validateInconclusiveReason } from "./inconclusive.js";
import { validateScanScope } from "./scope.js";
import type { ReceiptInput, VerificationResult } from "./types.js";

export async function verifyReceiptEvidence(
  receipt: ReceiptInput,
  artifactPath: string,
  now: Date
): Promise<VerificationResult> {
  return {
    profile: REGISTRY_PR_1404_PROFILE.id,
    checks: [
      await verifyArtifactBinding(receipt.scanned_artifact_digest, artifactPath),
      evaluateFreshness(receipt.freshness_expires_at, { now }),
      validateScanScope(receipt.scan_scope),
      validateInconclusiveReason(receipt.verdict, receipt.inconclusive_reason)
    ]
  };
}
