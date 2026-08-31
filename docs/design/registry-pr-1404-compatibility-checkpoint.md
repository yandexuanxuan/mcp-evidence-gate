# Registry PR #1404 compatibility checkpoint

Status: project evidence checkpoint. This is a downstream compatibility
record, not an upstream adoption or review record.

## Snapshot

- Source PR: [`modelcontextprotocol/registry#1404`](https://github.com/modelcontextprotocol/registry/pull/1404)
- Observed at: `2026-08-30T17:15:48Z`
- Upstream state: `open`, unmerged; `mergeable=true`, `mergeable_state=blocked`
- Current observed HEAD: `9c9b76e102e43fe8f7bee1ba3e5f4f1c6a9a3ee6`
- PR `updated_at`: `2026-08-30T04:35:22Z`
- PR author: `eeee2345`
- Formal reviews: none (`reviews=[]`)
- Requested reviewers: none (`users=[]`, `teams=[]`)
- Latest relevant signal: PR author `eeee2345` wrote
  “+1 to @yandexuanxuan's consumer-side invariants upthread.” This is a
  positive discussion signal only; it is not maintainer approval, a formal
  review, a merge, or an invitation to submit an upstream change.

## Delta from the pinned profile

Pinned compatibility identity:

```text
registry-pr-1404@20747d3253ba8638161dd95f1cec70df02993c22
```

The GitHub compare API reports one commit and two changed files between the
pinned SHA and the current HEAD:

- `docs/reference/server-json/CHANGELOG.md`
- `docs/reference/server-json/generic-server-json.md`

The change documents a name-custody boundary for content/digest-scoped
receipts. It does not add a receipt field, required field, enum, or conditional
constraint. The SHA-256 of both consumed source files is identical at the
pinned SHA and current HEAD:

| File | Pinned SHA-256 | Current SHA-256 |
| --- | --- | --- |
| `docs/reference/api/openapi.yaml` | `4c6e550be16b154c9e3790eb9f9cb82a5ff78848f4a7a0cf66bcccd1d5b934ef` | same |
| `docs/reference/server-json/draft/server.schema.json` | `06ae66de74a6e72bcb4dd5bd623c676140d8b19f78f76ec409f5a9dc3d8dab66` | same |

Classification: **B — `DOC_SEMANTIC_CHANGE_ONLY`**.

The profile was re-evaluated against the current upstream HEAD. No structural
`SecurityScanReceipt` change was observed, so **the existing immutable profile
remains the compatibility identity**. The observation SHA must not replace the
pinned profile SHA, and no new profile is required for this docs-only delta.

## Downstream boundary and provenance gate

`mcp-evidence-gate` continues to keep these axes separate:

```text
artifact digest / scan scope / freshness / scanner verdict
!= provenance or name-custody observation
!= downstream policy decision
```

The matching artifact digest proves byte identity only. It does not prove
package-name custody, ownership continuity, or repository continuity. No
`drift`/custody field, provenance input, new scan scope, or scanner-verdict
mutation is introduced by this checkpoint.

The ownership/source event series is now publicly available at
`https://pulsefeed.dev/evidence/name-custody.json`. A reproducibility review on
2026-08-31 independently parsed the raw event list and recomputed 177 custody
events, 172 distinct packages, 82 without a same-day UTC version, 95 with one,
and type counts `repo_changed=68`, `unpublished=50`, `maintainer_changed=38`,
`repo_removed=21`. This confirms the published summary is recomputable, but does
not establish event correctness or authoritative coverage: the producer is an
interested party, coverage is limited to the stated registry/npm surfaces, and
OpenTimestamps proves manifest existence timing rather than correctness.

Accordingly `PROVENANCE_IMPLEMENTATION_GATE=PROTOTYPE_READY`: a downstream
prototype/evaluator is justified, while production trusted provenance remains
out of scope. The existing artifact-evidence dogfood remains the supported
consumer contract.

## Evidence references

- Upstream PR snapshot, comments, reviews, requested reviewers, commits, and
  checks were queried through the GitHub API at the observation time above.
- Compare range:
  `20747d3253ba8638161dd95f1cec70df02993c22...9c9b76e102e43fe8f7bee1ba3e5f4f1c6a9a3ee6`
- Local semantic boundary: [`evidence-semantics.md`](./evidence-semantics.md)
- Local provenance boundary: [`provenance-drift-follow-up.md`](./provenance-drift-follow-up.md)
- Downstream consumer: `yandexuanxuan/mcp-evidence-gate-dogfood`, whose Action
  remains pinned to immutable release SHA
  `7b1569284e321976b4b61378c223ce6a28fbdb9b` and covers matching-clean,
  digest-mismatch, stale, findings, and malformed-receipt cases. Its latest
  remote run ([`32941665676`](https://github.com/yandexuanxuan/mcp-evidence-gate-dogfood/actions/runs/32941665676)) completed all five matrix jobs successfully.
- A separate real-artifact external Action run ([`33036548697`](https://github.com/yandexuanxuan/mcp-use/actions/runs/33036548697)) completed the matching-clean, digest-mismatch, and findings cases successfully.

## Unknowns and reopen conditions

Known unknowns are whether a Registry maintainer will formally review or merge
#1404, whether the PR will receive additional schema changes, and whether the
ownership/source dataset will become independently reproducible. Re-open the
compatibility review if the PR schema changes substantively, the PR is merged
or closed, a maintainer explicitly asks for consumer fixtures/profile/dogfood
work, or a reproducible provenance dataset appears. Until then this checkpoint
requires no upstream comment or PR.
