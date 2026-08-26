# MCP Registry #1404 downstream comment draft

状态：已按审阅原文发布

核对/发布日期：2026-08-26

PR 状态：open，未合并

当前 head SHA：`20747d3253ba8638161dd95f1cec70df02993c22`

已发布评论：[issuecomment-5420763601](https://github.com/modelcontextprotocol/registry/pull/1404#issuecomment-5420763601)

## Proposed comment

Hi maintainers — I’m building an independent downstream consumer for the experimental security-scan receipt shape in this PR: [mcp-evidence-gate](https://github.com/yandexuanxuan/mcp-evidence-gate).

I pinned a compatibility profile to the current PR head SHA (`20747d3253ba8638161dd95f1cec70df02993c22`) and implemented a local verifier plus a self-contained GitHub Action. The consumer currently:

- validates the pinned receipt structure;
- binds `scanned_artifact_digest` to the exact artifact under review;
- treats digest mismatch and policy-configured staleness as `inconclusive`, rather than rewriting the scanner verdict or making a server-level safety claim;
- requires a machine-readable reason when the receipt verdict is `inconclusive`.

The Action is currently referenced at immutable release SHA `13bd12875a2d9381b518c0b543549ca89cbc42b8` and has been exercised from a separate dogfood repository with both PASS and expected INCONCLUSIVE runs. This is a downstream consumer experiment, not an official Registry implementation.

Could you confirm whether these are still the intended consumer-facing invariants for v1?

1. Should digest binding and non-empty `scan_scope` remain the minimum conditions for interpreting a `clean` receipt?
2. Should digest mismatch or stale evidence remain a consumer/policy-level `inconclusive` outcome rather than a mutation of the receipt’s original verdict?
3. If the proposal changes after this PR, would a versioned compatibility profile be the preferred way for downstream clients to track the change?

I’m happy to adjust the consumer or add focused fixtures based on maintainer feedback.

## Posting checklist

- Confirm the repository link and PR head SHA are still current immediately before posting.
- Keep the wording as consumer feedback; do not describe the project as an official Registry component.
- Do not claim external adoption; the dogfood repository is self-owned.
- Do not include the Codex for Open Source application or promotion context in the upstream comment.
