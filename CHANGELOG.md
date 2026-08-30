# Changelog

All notable changes to this project are documented here.

## [Unreleased]

- Future changes will be recorded before release tagging.

## [0.1.0-alpha.2] - 2026-08-31

- Closed the strict-policy max-age library-call bypass by making policy
  evaluation enforce its own `maxScanAgeMs`.
- Added regression coverage for direct two-step library usage without
  duplicated freshness forwarding.
- Hardened GitHub Action consumer verification so dogfood asserts both the
  decision output and Action step outcome.
- Updated the real `mcp-use` fork evidence trial to verify PASS,
  INCONCLUSIVE, and FAIL outcome behavior against a packed artifact.
- Preserved the Registry #1404 compatibility profile at
  `20747d3253ba8638161dd95f1cec70df02993c22`.

## [0.1.0-alpha.1] - 2026-08-26

- Added consumer-side freshness invariants and a seven-day strict-policy scan
  age limit.
- Switched artifact hashing to streaming reads.
- Documented declarative attestation and metadata-only evidence digest limits.
- Added executable dogfood coverage for PASS, INCONCLUSIVE, and FAIL decisions.
- Pinned the compatibility profile to MCP Registry PR #1404 head
  `20747d3253ba8638161dd95f1cec70df02993c22`.
