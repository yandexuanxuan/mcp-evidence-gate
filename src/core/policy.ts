import { REGISTRY_PR_1404_PROFILE } from "../profiles/registry-pr-1404.js";
import { evaluateFreshness } from "./freshness.js";
import type { ReceiptInput, VerificationResult } from "./types.js";

export type PolicyDecision = "pass" | "warn" | "inconclusive" | "fail";
export type Attestation = (typeof REGISTRY_PR_1404_PROFILE.attestations)[number];

export interface PolicyConfig {
  name: string;
  requireFreshness: boolean;
  requiredScopes: readonly string[];
  allowedAttestations: readonly Attestation[];
  maxScanAgeMs?: number;
  clockSkewMs?: number;
  warningDisposition: "allow" | "block";
  requireEvidenceBinding: boolean;
}

export interface PolicyReason {
  code: string;
  decision: PolicyDecision;
  detail: string;
}

export interface PolicyEvaluation {
  policy: string;
  profile: typeof REGISTRY_PR_1404_PROFILE.id;
  decision: PolicyDecision;
  reasons: PolicyReason[];
  receiptVerdict: string;
}

export const PERMISSIVE_POLICY: PolicyConfig = {
  name: "permissive",
  requireFreshness: false,
  requiredScopes: [],
  allowedAttestations: REGISTRY_PR_1404_PROFILE.attestations,
  clockSkewMs: 5 * 60 * 1000,
  warningDisposition: "allow",
  requireEvidenceBinding: false
};

export const STRICT_RELEASE_EXAMPLE_POLICY: PolicyConfig = {
  name: "strict-release-example",
  requireFreshness: true,
  requiredScopes: ["package", "handler-validation"],
  allowedAttestations: ["third-party-attested"],
  maxScanAgeMs: 7 * 24 * 60 * 60 * 1000,
  clockSkewMs: 5 * 60 * 1000,
  warningDisposition: "block",
  requireEvidenceBinding: false
};

export const STRICT_EVIDENCE_EXAMPLE_POLICY: PolicyConfig = {
  ...STRICT_RELEASE_EXAMPLE_POLICY,
  name: "strict-evidence-example",
  requireEvidenceBinding: true
};

export function policyByName(name: string): PolicyConfig {
  if (name === PERMISSIVE_POLICY.name) return PERMISSIVE_POLICY;
  if (name === STRICT_RELEASE_EXAMPLE_POLICY.name) return STRICT_RELEASE_EXAMPLE_POLICY;
  if (name === STRICT_EVIDENCE_EXAMPLE_POLICY.name) return STRICT_EVIDENCE_EXAMPLE_POLICY;
  throw new Error(`unknown policy: ${name}`);
}

const RANK: Record<PolicyDecision, number> = {
  pass: 0,
  warn: 1,
  inconclusive: 2,
  fail: 3
};

function highestDecision(reasons: readonly PolicyReason[]): PolicyDecision {
  return reasons.reduce<PolicyDecision>(
    (current, reason) => (RANK[reason.decision] > RANK[current] ? reason.decision : current),
    "pass"
  );
}

export function evaluatePolicy(
  receipt: ReceiptInput,
  verification: VerificationResult,
  policy: PolicyConfig,
  _now?: Date
): PolicyEvaluation {
  const now = new Date(verification.evaluatedAt);
  if (Number.isNaN(now.getTime())) throw new Error("invalid_evaluated_at");
  const reasons: PolicyReason[] = [];
  const add = (code: string, decision: PolicyDecision, detail: string) =>
    reasons.push({ code, decision, detail });
  const structure = verification.checks.find((check) => check.id === "receipt_structure");

  if (structure?.status === "invalid") {
    add("receipt_structure_invalid", "fail", "Receipt failed the pinned structural conformance profile.");
    return {
      policy: policy.name,
      profile: REGISTRY_PR_1404_PROFILE.id,
      decision: "fail",
      reasons,
      receiptVerdict: typeof receipt.verdict === "string" ? receipt.verdict : "unknown"
    };
  }

  for (const check of verification.checks) {
    if (check.id === "artifact_binding" && check.status === "mismatch") {
      add("artifact_digest_mismatch", "inconclusive", "Receipt digest does not bind to the current artifact.");
    }
    if (check.id === "artifact_binding" && check.status === "unsupported") {
      add("unsupported_digest_algorithm", "inconclusive", "The receipt digest algorithm is not supported by this verifier.");
    }
    if (check.id === "freshness" && check.status === "inconclusive") {
      add(
        check.reason === "scan_too_old" ? "scan_too_old" : "stale_scan",
        "inconclusive",
        check.reason === "scan_too_old"
          ? "Receipt scanned_at exceeds the maximum age allowed by policy."
          : "Receipt freshness has expired and cannot support a clean claim."
      );
    }
    if (check.status === "invalid" && check.id !== "receipt_structure") {
      add("evidence_check_invalid", "fail", `${check.id} evidence check is invalid.`);
    }
  }

  // A policy owns its max-age rule. This second evaluation closes the library
  // two-step API gap when callers do not forward policy freshness options to
  // verifyReceipt(). Avoid adding a duplicate reason when verification already
  // evaluated the same max-age constraint.
  if (
    policy.maxScanAgeMs !== undefined &&
    !reasons.some((reason) => reason.code === "scan_too_old")
  ) {
    const policyFreshness = evaluateFreshness(receipt.freshness_expires_at, {
      now,
      scannedAt: receipt.scanned_at,
      maxScanAgeMs: policy.maxScanAgeMs,
      clockSkewMs: policy.clockSkewMs
    });
    if (policyFreshness.reason === "scan_too_old") {
      add("scan_too_old", "inconclusive", "Receipt scanned_at exceeds the maximum age allowed by policy.");
    }
  }

  const evidence = verification.checks.find((check) => check.id === "evidence_binding");
  if (policy.requireEvidenceBinding) {
    if (!evidence || evidence.status === "not_present") add("evidence_binding_required", "inconclusive", "This policy requires a locally provided evidence report bound by digest.");
    else if (evidence.status === "mismatch") add("evidence_digest_mismatch", "inconclusive", "Evidence report digest does not bind to the receipt.");
    else if (evidence.status === "unsupported") add("unsupported_evidence_digest_algorithm", "inconclusive", "The evidence digest algorithm is not supported by this verifier.");
    else if (evidence.status === "invalid") add("evidence_binding_invalid", "fail", "Evidence digest binding is invalid.");
  }
  if (!policy.requireEvidenceBinding && evidence?.status === "not_present" && evidence.reason === "evidence_file_missing") {
    add("evidence_file_missing", "inconclusive", "An explicitly supplied evidence report could not be read.");
  }

  const freshness = verification.checks.find((check) => check.id === "freshness");
  if (policy.requireFreshness && freshness?.status === "not_present") {
    add("freshness_required", "fail", "This policy requires freshness_expires_at to be declared.");
  }

  const scope = Array.isArray(receipt.scan_scope) ? receipt.scan_scope : [];
  for (const requiredScope of policy.requiredScopes) {
    if (!scope.includes(requiredScope)) {
      add("required_scope_missing", "inconclusive", `Required scan scope is missing: ${requiredScope}.`);
    }
  }

  if (typeof receipt.attestation === "string" && !policy.allowedAttestations.includes(receipt.attestation as Attestation)) {
    add("attestation_not_allowed", "fail", `Attestation is not allowed by policy: ${receipt.attestation}.`);
  }

  const verdict = typeof receipt.verdict === "string" ? receipt.verdict : "unknown";
  if (verdict === "findings") {
    add("receipt_findings", "fail", "Receipt verdict reports findings.");
  } else if (verdict === "warnings") {
    add(policy.warningDisposition === "block" ? "receipt_warnings_blocked" : "receipt_warnings", policy.warningDisposition === "block" ? "fail" : "warn", policy.warningDisposition === "block" ? "Policy blocks receipt warnings." : "Receipt verdict reports warnings.");
  } else if (verdict === "inconclusive") {
    add("receipt_inconclusive", "inconclusive", "Receipt verdict is inconclusive.");
  }

  reasons.sort((left, right) => RANK[right.decision] - RANK[left.decision]);
  return {
    policy: policy.name,
    profile: REGISTRY_PR_1404_PROFILE.id,
    decision: highestDecision(reasons),
    reasons,
    receiptVerdict: verdict
  };
}
