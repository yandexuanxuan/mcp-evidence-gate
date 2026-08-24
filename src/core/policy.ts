import { REGISTRY_PR_1404_PROFILE } from "../profiles/registry-pr-1404.js";
import type { ReceiptInput, VerificationResult } from "./types.js";

export type PolicyDecision = "pass" | "warn" | "inconclusive" | "fail";
export type Attestation = (typeof REGISTRY_PR_1404_PROFILE.attestations)[number];

export interface PolicyConfig {
  name: string;
  requireFreshness: boolean;
  requiredScopes: readonly string[];
  allowedAttestations: readonly Attestation[];
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
  allowedAttestations: REGISTRY_PR_1404_PROFILE.attestations
};

export const STRICT_RELEASE_EXAMPLE_POLICY: PolicyConfig = {
  name: "strict-release-example",
  requireFreshness: true,
  requiredScopes: ["package", "handler-validation"],
  allowedAttestations: ["third-party-attested"]
};

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
  policy: PolicyConfig
): PolicyEvaluation {
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
      add("stale_scan", "inconclusive", "Receipt freshness has expired and cannot support a clean claim.");
    }
    if (check.status === "invalid" && check.id !== "receipt_structure") {
      add("evidence_check_invalid", "fail", `${check.id} evidence check is invalid.`);
    }
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
    add("receipt_warnings", "warn", "Receipt verdict reports warnings.");
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
