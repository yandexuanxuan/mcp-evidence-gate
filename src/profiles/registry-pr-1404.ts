/**
 * Compatibility profile, not an official MCP Registry standard.
 * Pinned to the current head observed on 2026-08-25.
 */
export const REGISTRY_PR_1404_PROFILE = {
  id: "registry-pr-1404@20747d3253ba8638161dd95f1cec70df02993c22",
  experimental: true,
  upstream: "modelcontextprotocol/registry#1404",
  headSha: "20747d3253ba8638161dd95f1cec70df02993c22",
  pullRequest: "https://github.com/modelcontextprotocol/registry/pull/1404",
  status: "open-unmerged",
  receiptMetaKey: "io.modelcontextprotocol.registry/security-scan",
  digestAlgorithm: "sha256",
  digestHexCase: "lowercase-only",
  staleAtExpiry: true,
  requiredFields: [
    "scanner",
    "scanned_artifact_digest",
    "scan_scope",
    "verdict",
    "scanned_at",
    "attestation"
  ] as const,
  conditionalRequiredFields: {
    inconclusive: ["inconclusive_reason"]
  } as const,
  optionalFields: [
    "scanner_version",
    "rule_set_ref",
    "policy_profile",
    "scanned_artifact_ref",
    "freshness_expires_at",
    "evidence_ref",
    "evidence_digest"
  ] as const,
  verdicts: ["clean", "warnings", "findings", "inconclusive"] as const,
  inconclusiveReasons: [
    "artifact_digest_mismatch",
    "unsupported_package_type",
    "scope_excludes_handler_validation",
    "evidence_unavailable",
    "stale_scan"
  ] as const,
  attestations: ["publisher-asserted", "registry-attested", "third-party-attested"] as const
} as const;

export type RegistryPr1404Profile = typeof REGISTRY_PR_1404_PROFILE;
