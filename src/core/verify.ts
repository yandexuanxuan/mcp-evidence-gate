import { REGISTRY_PR_1404_PROFILE } from "../profiles/registry-pr-1404.js";
import { verifyArtifactBinding } from "./digest.js";
import { evaluateFreshness } from "./freshness.js";
import { validateInconclusiveReason } from "./inconclusive.js";
import { validateScanScope } from "./scope.js";
import { validateReceiptStructure } from "./structural.js";
import type { FreshnessOptions } from "./freshness.js";
import type { ReceiptInput, VerificationResult } from "./types.js";

export async function verifyReceiptEvidence(
  receipt: ReceiptInput,
  artifactPath: string,
  now: Date,
  freshnessOptions: Omit<FreshnessOptions, "now"> = {}
): Promise<VerificationResult> {
  return {
    profile: REGISTRY_PR_1404_PROFILE.id,
    checks: [
      await verifyArtifactBinding(receipt.scanned_artifact_digest, artifactPath),
      evaluateFreshness(receipt.freshness_expires_at, {
        now,
        scannedAt: receipt.scanned_at,
        ...freshnessOptions
      }),
      validateScanScope(receipt.scan_scope),
      validateInconclusiveReason(receipt.verdict, receipt.inconclusive_reason)
    ]
  };
}

export async function verifyReceipt(
  receipt: ReceiptInput,
  artifactPath: string,
  now: Date,
  freshnessOptions: Omit<FreshnessOptions, "now"> = {}
): Promise<VerificationResult> {
  const structure = validateReceiptStructure(receipt);
  if (structure.status !== "pass") {
    return {
      profile: REGISTRY_PR_1404_PROFILE.id,
      checks: [structure]
    };
  }
  const evidence = await verifyReceiptEvidence(receipt, artifactPath, now, freshnessOptions);
  return {
    profile: evidence.profile,
    checks: [structure, ...evidence.checks]
  };
}
