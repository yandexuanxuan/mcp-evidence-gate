# mcp-evidence-gate

Experimental downstream verifier and CI policy gate for evidence-scoped MCP security scan receipts.

This project is **not** an MCP Registry implementation, an official MCP project, or a scanner. It initially targets the experimental receipt proposal in [modelcontextprotocol/registry#1404](https://github.com/modelcontextprotocol/registry/pull/1404).

`mcp-evidence-gate` is a downstream release admission controller: it turns scanner-neutral MCP security receipts into deterministic, auditable release decisions without conflating evidence quality with server safety.

The first compatibility profile is pinned to:

```text
registry-pr-1404@20747d3253ba8638161dd95f1cec70df02993c22
```

The verifier answers whether a receipt is still eligible to support a release by checking artifact binding, freshness, non-empty scope, evidence metadata conformance, inconclusive reasons, and local attestation policy. It will not discover vulnerabilities or claim that a server is globally safe.

`evidence_digest` can optionally be bound to a local evidence report with the CLI `--evidence` option or Action `evidence` input; no network download is performed. Artifact and evidence digest binding are independent axes. The `attestation` value is declarative metadata, not a cryptographically authenticated issuer identity or signature.

The pinned profile follows the proposal's current schema boundary: `scanner`, `scanned_artifact_digest`, `scan_scope`, `verdict`, `scanned_at`, and `attestation` are required; `freshness_expires_at` is optional; `inconclusive_reason` is required only when `verdict` is `inconclusive`. Digest parsing currently supports lowercase `sha256:<64-hex>` values. Other well-formed algorithms are reported as unsupported by this verifier, not as malformed receipts. Scope values remain open strings so future upstream values are accepted.

The pinned structural schema is stored at `src/profiles/registry-pr-1404/security-scan-receipt.schema.json` with provenance in the adjacent `profile.json`. `verifyReceipt()` runs structural conformance first and then evidence-specific checks. `verifyReceiptEvidence()` remains the partial invariant layer for callers that already performed structural validation.

## Policy layer

`evaluatePolicy()` produces a project-defined release decision without changing the input receipt. It keeps the scanner's `verdict` separate from the gate decision and uses deterministic precedence: `fail > inconclusive > warn > pass`. The verifier carries one immutable `evaluatedAt` clock into policy evaluation, so historical replay does not drift with wall-clock time. Warning admission is explicit: `permissive` allows warnings as `WARN`, while strict policies block them as a policy `FAIL` (`receipt_warnings_blocked`).

Two built-in policies are included:

- `permissive`: freshness is optional, no scope is required, and all three attestation values are allowed.
- `strict-release-example`: a project-defined metadata policy that requires freshness, `package` plus `handler-validation`, `third-party-attested`, and a maximum scan age of seven days. It does not authenticate the attestation value.
- `strict-evidence-example`: the strict example plus a required local evidence report digest binding.

The strict policy is a project-defined example, not an MCP Registry requirement or trust hierarchy. Policy is local and deterministic; it does not contact the Registry, download evidence, run scanners, or modify receipts.

## Status

Phase 1 / experimental. The profile is deliberately pinned to an open, unmerged proposal. If the proposal changes, a new profile will be added instead of silently changing existing behavior.

## Development

```bash
pnpm install
pnpm build
pnpm test
```

No external repository, scanner, or endpoint is contacted by the current CLI or core verifier.

## CLI

Build the executable package and run the only command:

```bash
pnpm build
node dist/cli.js verify \
  --receipt fixtures/valid/complete-clean.json \
  --artifact fixtures/artifacts/current-artifact.bin \
  --policy permissive \
  --now 2026-08-25T00:00:00Z
```

Use `--format json` for machine-readable output. Exit codes are stable: `0` means PASS or WARN, `1` means FAIL, `2` means INCONCLUSIVE, and `3` means CLI/input/runtime error. The policy must be explicit; no MCP Registry policy is implied.

## GitHub Action

The experimental Action is a thin wrapper around the same verifier and policy layer. It runs on the Node 24 GitHub Actions runtime, requires receipt, artifact, and policy inputs, and accepts an optional local `evidence` path. It does not install dependencies or download `evidence_ref` in the consuming repository:

```yaml
- uses: yandexuanxuan/mcp-evidence-gate@<immutable-commit-sha>
  with:
    receipt: fixtures/valid/complete-clean.json
    artifact: fixtures/artifacts/current-artifact.bin
    policy: permissive
```

It emits `decision`, `receipt-verdict`, and `profile`. PASS and policy-allowed WARN succeed; FAIL and INCONCLUSIVE fail the step. INCONCLUSIVE means the evidence does not support the release, not that the server was proven unsafe. The checked-in `dist/action/index.cjs` is a self-contained Node 24 bundle matching the declared Action runtime.

## Tested downstream integration

The companion [mcp-evidence-gate-dogfood](https://github.com/yandexuanxuan/mcp-evidence-gate-dogfood) repository runs the Action at immutable release commit `b8cacb5eadca53c8b9a1e8d5c8ac956fd579238d` (`v0.1.0-alpha.2`) and asserts both the decision and Action outcome for each case:

- matching-clean: `PASS` / successful step;
- digest-mismatch: `INCONCLUSIVE` / failed step;
- stale: `INCONCLUSIVE` / failed step;
- findings: `FAIL` / failed step;
- malformed: `FAIL` / failed step.

Consumers should pin a full commit SHA rather than a moving branch.
