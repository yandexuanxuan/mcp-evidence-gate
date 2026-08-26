# Contributing

Thanks for helping improve MCP Evidence Gate. Changes should preserve the
distinction between scanner verdicts and release admission decisions.

## Development

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
```

The build regenerates `dist/action/index.cjs`. Include that generated bundle in
the same pull request as source changes; CI rejects a dirty generated tree.

## Pull requests

- Keep changes focused and explain the policy or compatibility impact.
- Add regression fixtures for new decisions and edge cases.
- Do not include secrets, private reports, or unauthorized artifacts.
- Do not change the pinned upstream profile silently; add a versioned profile
  when the upstream contract changes.
- Use an immutable Action commit when testing cross-repository integration.

All pull requests must pass typecheck, tests, build, generated-bundle
verification, and the CLI smoke test.
