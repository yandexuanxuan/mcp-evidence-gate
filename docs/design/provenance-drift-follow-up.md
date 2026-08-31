# Provenance drift follow-up

Status: downstream design note. This document does not propose a Registry schema
change and does not redefine scanner receipt verdicts.

## Problem statement

The current receipt model binds scanner output to the exact bytes identified by
`scanned_artifact_digest`. That is the correct boundary for evidence produced by
scanning an artifact. It does not cover events that can change who controls a
package name or source repository while the already-scanned bytes remain
unchanged.

Examples include maintainer-set changes, repository removal or relocation,
unpublish/republish events, and other custody transitions. A matching artifact
digest can therefore remain valid while provenance relevant to future release
trust has changed.

This is not a bug in artifact digest binding. It is a separate evidence axis.

## Separation of concerns

### Artifact evidence

Artifact evidence answers questions about the bytes that were scanned:

- artifact digest and binding;
- scanner verdict;
- scan scope;
- scan time and freshness;
- evidence metadata declared by the receipt.

The original scanner verdict is immutable input to downstream policy. A
provenance event must not rewrite `clean`, `warnings`, `findings`, or
`inconclusive` in the source receipt.

### Provenance observations and events

Provenance observations answer time-indexed questions about package custody and
source lineage, for example:

- package or registry identity;
- maintainer/owner set;
- repository origin or source reference;
- unpublish/republish state;
- observation time;
- observation publisher/source;
- previous and current normalized values when an event is derived from a diff.

`drift` is therefore better treated downstream as an event derived from one or
more observations, not as a point-in-time property added to the current receipt.

### Local policy

Local release policy combines independent evidence without changing either
source:

```text
artifact evidence       -> digest, scan_scope, freshness, scanner verdict
provenance observations -> custody/source state and time-indexed events
local policy            -> PASS / WARN / INCONCLUSIVE / FAIL
```

## Decision semantics

The following default semantics keep evidence quality separate from policy
violation:

- no provenance evidence under a permissive policy: preserve current behavior;
- provenance required but missing, stale, conflicting, or not sufficiently
  attributable: `INCONCLUSIVE`;
- a material custody/source event supported by acceptable evidence: a local
  policy may return `WARN` or `FAIL` according to an explicit rule;
- a provenance event never becomes a scanner `FAIL` and never mutates the
  receipt's original `verdict`;
- artifact digest mismatch remains an artifact-evidence `INCONCLUSIVE`, not a
  provenance result.

A strict policy must define which event types are material and how evidence is
qualified before using `FAIL`. This avoids treating every legitimate maintainer
or repository migration as a compromise.

## Candidate downstream evidence shape

A future experiment may start with a deliberately small, verifier-local object:

```json
{
  "package_ref": "pkg:npm/example/server@1.0.0",
  "observed_at": "2026-08-27T00:00:00Z",
  "source": "external-registry-diff",
  "event_type": "maintainer_set_changed",
  "previous": ["maintainer-a"],
  "current": ["maintainer-a", "maintainer-b"],
  "evidence_ref": "https://example.invalid/event.json"
}
```

This is only a downstream sketch. Before implementation, the prototype must
specify normalization, source attribution, freshness, conflict handling, and a
stable identifier for the package or registry object being observed.

## False-positive and reproducibility controls

A provenance signal is not automatically a security incident. A useful
prototype must account for at least:

- canonical repository URLs and redirects before calling a move;
- maintainer sets as unordered normalized sets;
- legitimate ownership transfer and organization migration;
- registry observation lag and day-boundary effects;
- unpublish/republish identity semantics;
- source attribution and observation timestamp;
- conflicting observations from different publishers.

Community-reported counts can motivate the experiment but must not be presented
as compromise prevalence or attack probability. The ownership/source event
series discussed in Registry PR #1404 is now publicly available at
https://pulsefeed.dev/evidence/name-custody.json. A 2026-08-31 reproducibility
review parsed its raw events and recomputed 177 events across 172 distinct
packages: 82 without a same-calendar-day UTC version (46.3%) and 95 with one;
type counts were repo_changed 68, unpublished 50, maintainer_changed 38, and
repo_removed 21. This confirms the summary is recomputable, but not event
correctness or authoritative coverage: the producer is an interested party,
coverage is limited to the stated registry/npm surfaces, and OpenTimestamps
proves manifest existence timing rather than correctness. The implementation
gate is therefore `PROTOTYPE_READY`, suitable for a downstream evaluator but
not a production trusted provenance source.

## Relationship to `scan_scope`

The pinned Registry proposal intentionally keeps `scan_scope` values open. A
future upstream design could document a provenance-related scope value, and that
would not contradict this downstream experiment.

For this project, the first prototype should keep provenance observations
separate because custody/source drift is time-indexed and can occur without any
change to the bytes named by `scanned_artifact_digest`. This is an implementation
choice for a downstream verifier, not a claim that it is the only valid upstream
model.

## Upstream boundary

Do not add a Registry `drift` field and do not submit an upstream schema PR from
this experiment.

An upstream contribution should be considered only after all of the following:

1. public or otherwise reproducible provenance data is available;
2. a minimal downstream policy experiment has executable fixtures and documented
   decision semantics;
3. the experiment leaves the current receipt schema and original scanner verdict
   unchanged;
4. maintainers explicitly indicate that documentation, fixtures, a documented
   scope value, or a Draft PR would be useful.

Community interest alone is sufficient to continue downstream research, but not
to infer upstream adoption.
