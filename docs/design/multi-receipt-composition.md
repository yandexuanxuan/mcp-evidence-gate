# Multi-receipt composition — P2-003

Status: experimental project-defined downstream composition contract.

This design adds composition to the **admission layer**, not to the scanner or MCP Registry receipt schema.

## Decision objective

Evaluate multiple independent `SecurityScanReceipt` inputs against one exact artifact, one local policy, and one evaluation clock while preserving every receipt's own verification evidence.

```text
receipt A -> verify -> policy evaluation --\
receipt B -> verify -> policy evaluation ----> aggregate admission decision
receipt C -> verify -> policy evaluation --/
                    same artifact / policy / clock
```

The output is **not** a new `SecurityScanReceipt`. Scanner verdicts are never rewritten or merged.

## Invariants

1. Every receipt is structurally validated and evidence-checked independently through the existing `verifyReceipt()` path.
2. Every receipt is evaluated independently through the existing `evaluatePolicy()` path.
3. One receipt set has one shared artifact path, one policy, and one immutable evaluation time. The artifact's SHA-256 is frozen before the first receipt and rechecked after every receipt evaluation; persistent drift aborts the set with `receipt_set_artifact_drift`.
4. Optional evidence files are bound independently per receipt.
5. A bad receipt cannot be hidden by a good receipt.
6. The aggregate decision uses the established downstream severity order:

   ```text
   pass < warn < inconclusive < fail
   ```

7. Input ordering cannot improve or worsen the aggregate decision. Per-receipt output order remains the input order for auditability.
8. An empty set is invalid input. Absence of evidence is never interpreted as `PASS`.
9. A one-receipt set must preserve the same verification and policy decision as the existing single-receipt path.
10. Composition does not create quorum, voting, majority, scanner-reputation, or trust-weight semantics.

Duplicate scanner names or duplicate receipts are not interpreted as additional trust. They are simply independent input entries. Future policy may define scanner-diversity or quorum requirements, but P2-003 deliberately does not.

The artifact recheck is a drift guard, not a filesystem snapshot or locking protocol. It prevents ordinary persistent cross-receipt artifact changes from being silently composed as one set; P2-003 does not claim transactional filesystem isolation against an adversarial change-and-restore race.

## Core API

`evaluateReceiptSet(entries, artifactPath, now, policy)` accepts already parsed receipt objects plus optional per-receipt local evidence paths.

It returns:

- the pinned profile;
- policy name;
- one `evaluatedAt` value;
- the frozen set-level `artifactDigest`;
- receipt count;
- aggregate decision;
- each receipt's scanner label, verification checks, receipt verdict, policy decision, and policy reasons.

The function stops on set-level invariant violations such as an empty set, evaluation/profile drift, or persistent artifact drift. Receipt-level invalidity remains a receipt-level policy result so the full set can still be inspected.

## CLI consumer contract

P2-003 adds a new command without changing the existing `verify` command:

```text
mcp-evidence-gate verify-set \
  --set <receipt-set.json> \
  --artifact <artifact> \
  --policy <policy> \
  [--format text|json] \
  [--now RFC3339]
```

The set manifest is explicitly project-defined:

```json
{
  "schema_version": "project-defined-receipt-set-v1",
  "receipts": [
    {
      "id": "optional-audit-label",
      "receipt": "trivy/receipt.json",
      "evidence": "trivy/evidence.json"
    },
    {
      "id": "osv",
      "receipt": "osv/receipt.json",
      "evidence": "osv/evidence.json"
    }
  ]
}
```

`receipt` and `evidence` paths are resolved relative to the manifest file. The artifact is intentionally supplied once at the command level so all receipts are checked against the same consumer-owned artifact. Machine-readable and text output expose the frozen artifact digest.

Exit codes preserve the existing CLI contract:

| Aggregate decision | Exit code |
| --- | ---: |
| `pass` | 0 |
| `warn` | 0 |
| `fail` | 1 |
| `inconclusive` | 2 |
| CLI/input/runtime error | 3 |

Malformed/unsupported set schema, empty set, missing receipt files, artifact drift, or invalid CLI arguments are input/runtime errors. A structurally invalid but parseable receipt is still evaluated as a receipt and drives the aggregate decision to `FAIL` through the existing policy path.

## Boundaries

P2-003 does **not**:

- change `SecurityScanReceipt`;
- compose several scanners into one synthetic receipt;
- modify Trivy or OSV producer semantics;
- change the existing GitHub Action input surface or its checked-in bundle;
- introduce scanner quorum, majority voting, trust weights, or minimum scanner counts;
- claim atomic filesystem snapshots or locking;
- fetch `evidence_ref` over the network;
- implement OCI identity resolution;
- implement provenance/custody enforcement;
- authenticate `attestation` cryptographically;
- implement signatures or PKI;
- change Registry #1404.

## Claim–Evidence Matrix

| Claim | Direct evidence |
| --- | --- |
| single-item composition preserves existing decision | equivalence test against `verifyReceipt()` + `evaluatePolicy()` |
| warning cannot be hidden by pass | `pass + warn -> warn` test |
| uncertainty cannot be hidden by pass/warn | digest/evidence mismatch composition tests |
| findings cannot be hidden | `pass + findings -> fail` test |
| malformed receipt cannot be hidden | structural-invalid composition test |
| aggregate is order-independent | reversed-input decision test |
| set uses one evaluation clock | per-receipt evaluatedAt equality test |
| set exposes one frozen artifact identity | set `artifactDigest` assertions + per-receipt rehash guard |
| no-receipt input cannot pass | empty-set rejection test |
| existing single-receipt consumer is unchanged | existing CLI suite + Action bundle zero-drift CI gate |
| consumer can compose real independent producer outputs | downstream Dogfood real Trivy + OSV composition runtime |

The last row is Consumer Acceptance and must be demonstrated outside the Core implementation repository before P2-003 is considered fully closed.
