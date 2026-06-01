# Contributing to splitjar

Thanks for your interest! splitjar is intentionally small — bug fixes, small features, polish, docs, and screenshots are all welcome. Big feature proposals: open an issue first so we can talk scope.

## Ground rules

- Stay aligned with the [Roadmap](ROADMAP.md). Out-of-scope items (auth, multi-currency conversion, mobile apps) won't be accepted.
- Be kind. See the [Code of Conduct](CODE_OF_CONDUCT.md).
- One change per PR. Easier to review, easier to revert.

## Local setup

See the **Development** section in [README.md](README.md).

## Running tests

```bash
docker build --target test -t splitjar-test .
docker run --rm splitjar-test
```

CI runs the same tests on every PR.

## Style

- Python: type-hinted, no `eval`, prefer pure functions in `services/`.
- TypeScript: strict mode, no `any` unless commented why.
- Keep dependencies few. If you're adding one, justify it in the PR.

## Submitting

1. Fork & branch.
2. Make the change with a test.
3. `docker compose up --build` and click through your change.
4. Open a PR with a clear description.

Reports of security issues: see [SECURITY.md](SECURITY.md).
