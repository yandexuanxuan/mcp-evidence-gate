# mcp-evidence-gate

Experimental downstream verifier and CI policy gate for evidence-scoped MCP security scan receipts.

This project is **not** an MCP Registry implementation, an official MCP project, or a scanner. It initially targets the experimental receipt proposal in [modelcontextprotocol/registry#1404](https://github.com/modelcontextprotocol/registry/pull/1404).

The first compatibility profile is pinned to:

```text
registry-pr-1404@20747d3253ba8638161dd95f1cec70df02993c22
```

The verifier will answer whether a receipt is still eligible to support a release by checking artifact binding, freshness, non-empty scope, evidence integrity, inconclusive reasons, and attestation policy. It will not discover vulnerabilities or claim that a server is globally safe.

The pinned profile follows the proposal's current schema boundary: `scanner`, `scanned_artifact_digest`, `scan_scope`, `verdict`, `scanned_at`, and `attestation` are required; `freshness_expires_at` is optional; `inconclusive_reason` is required only when `verdict` is `inconclusive`. Digest parsing currently supports lowercase `sha256:<64-hex>` values. Other well-formed algorithms are reported as unsupported by this verifier, not as malformed receipts. Scope values remain open strings so future upstream values are accepted.

## Status

Phase 1 / experimental. The profile is deliberately pinned to an open, unmerged proposal. If the proposal changes, a new profile will be added instead of silently changing existing behavior.

## Development

```bash
pnpm install
pnpm build
pnpm test
```

No external repository, scanner, or endpoint is contacted by the current skeleton.
