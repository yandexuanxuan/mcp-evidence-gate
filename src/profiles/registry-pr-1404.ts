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
  digestHexCase: "case-insensitive-canonicalize",
  staleAtExpiry: true,
  requiredFields: [
    "scanner",
    "scanner_version",
    "scanned_artifact_ref",
    "scanned_artifact_digest",
    "scan_scope",
    "verdict",
    "scanned_at",
    "freshness_expires_at",
    "attestation"
  ] as const,
  verdicts: ["clean", "warnings", "findings", "inconclusive"] as const,
  attestations: ["publisher-asserted", "registry-attested", "third-party-attested"] as const
} as const;

export type RegistryPr1404Profile = typeof REGISTRY_PR_1404_PROFILE;
