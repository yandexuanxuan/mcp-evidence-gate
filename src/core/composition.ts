import {
  evaluatePolicy,
  highestPolicyDecision,
  type PolicyConfig,
  type PolicyDecision,
  type PolicyEvaluation
} from "./policy.js";
import { verifyReceipt } from "./verify.js";
import type { ReceiptInput, VerificationResult } from "./types.js";

export interface ReceiptSetEntryInput {
  receipt: ReceiptInput;
  evidencePath?: string;
  id?: string;
}

export interface ReceiptSetEntryEvaluation {
  index: number;
  id?: string;
  scanner: string;
  verification: VerificationResult;
  evaluation: PolicyEvaluation;
}

export interface ReceiptSetEvaluation {
  profile: VerificationResult["profile"];
  policy: string;
  evaluatedAt: string;
  receiptCount: number;
  decision: PolicyDecision;
  receipts: ReceiptSetEntryEvaluation[];
}

/**
 * Verify and evaluate independent receipts against one shared artifact and one
 * policy, then compose only their downstream admission decisions.
 *
 * Composition never rewrites scanner verdicts and never creates a synthetic
 * SecurityScanReceipt. Each receipt keeps its complete verification and policy
 * evidence, while the aggregate decision uses the same severity ordering as
 * single-receipt policy evaluation.
 */
export async function evaluateReceiptSet(
  entries: readonly ReceiptSetEntryInput[],
  artifactPath: string,
  now: Date,
  policy: PolicyConfig
): Promise<ReceiptSetEvaluation> {
  if (entries.length === 0) {
    throw new Error("receipt_set_empty");
  }

  const evaluatedAt = now.toISOString();
  const receipts: ReceiptSetEntryEvaluation[] = [];

  for (const [index, entry] of entries.entries()) {
    const verification = await verifyReceipt(entry.receipt, artifactPath, now, {
      maxScanAgeMs: policy.maxScanAgeMs,
      clockSkewMs: policy.clockSkewMs,
      evidencePath: entry.evidencePath
    });
    if (verification.evaluatedAt !== evaluatedAt) {
      throw new Error("receipt_set_evaluation_time_drift");
    }

    receipts.push({
      index,
      ...(entry.id ? { id: entry.id } : {}),
      scanner: typeof entry.receipt.scanner === "string" ? entry.receipt.scanner : "unknown",
      verification,
      evaluation: evaluatePolicy(entry.receipt, verification, policy, now)
    });
  }

  const profiles = new Set(receipts.map((entry) => entry.verification.profile));
  if (profiles.size !== 1) {
    throw new Error("receipt_set_profile_mismatch");
  }

  return {
    profile: receipts[0].verification.profile,
    policy: policy.name,
    evaluatedAt,
    receiptCount: receipts.length,
    decision: highestPolicyDecision(receipts.map((entry) => entry.evaluation.decision)),
    receipts
  };
}
