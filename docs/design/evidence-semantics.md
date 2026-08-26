# Evidence semantics

This document records the stable semantics behind the gate. It is a product
design note, not an application or review log.

## Current semantics

- `scanned_at` is parsed with the same strict RFC3339 rules as expiry values.
- A scan more than five minutes in the future is invalid.
- `freshness_expires_at` earlier than `scanned_at` is invalid.
- Policies may set a consumer-side `maxScanAgeMs`; the strict example uses
  seven days. A publisher-selected far-future expiry cannot bypass that limit.
- Artifact hashing uses a read stream, so package and bundle size do not scale
  memory usage linearly.
- README terminology now says evidence metadata conformance. `evidence_digest`
  is not presented as a hash binding until a separate evidence report input is
  implemented.
- Attestation values are documented as declarative metadata. This verifier does
  not authenticate an issuer, signature, certificate, or OIDC identity.
- Dogfood permanently exercises PASS, expected INCONCLUSIVE, and expected FAIL
  decisions, including a malformed receipt.

## Deliberate non-goals for this profile

- Multiple-receipt aggregation: the current CLI and Action remain single-receipt
  consumers until the upstream array contract and maintainer expectations are
  stable.
- Cryptographic attestation verification: requires a trusted issuer and key
  distribution contract that this pinned profile does not define.
- Evidence-report digest binding: requires an explicit report input and
  canonical byte representation.

These boundaries preserve the distinction between scanner verdict, evidence
quality, and release policy decision.
