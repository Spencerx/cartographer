# Cartographer Dirty Worktree Preflight

Date: 2026-05-11
Status: read-only workflow evidence, not a runnable eval report; targeted validation gap fixed after observation

This note records how Cartographer behaves on an active dirty worktree with unrelated harness policy refactor files. It tests the workflow Saint wants: agents should be able to orient on a changing codebase without waiting for a clean committed graph.

## Worktree

Command:

```bash
git status --short
```

Observed:

```text
M .garden/master-refactor-plan.md
M src/core/harness.ts
?? src/core/__tests__/harness-policy-api.test.ts
?? src/core/harness/policy-api.ts
?? src/core/harness/policy-network.ts
?? src/core/harness/policy-report.ts
?? src/core/harness/policy-rules.ts
```

These files are unrelated to Cartographer/eval runner scaffolding and were not edited.

## Harness Surface Preflight

Command:

```bash
bun run cartographer:preflight -- --root . --live --path src/core/harness.ts --json
```

Observed:

- Git: dirty at `e5abec3f323fabb9ddf16edffcb37190a2cda111`
- Manifest totals: 618 files, 4,091 nodes, 9,555 edges, 0 findings
- Dirty state: 613 tracked files, 5 untracked files, 2 modified files, 0 deleted files
- Slice: 131 nodes, 730 edges, 0 findings
- Impact: 27 nodes, 33 edges, 0 findings
- Test paths surfaced:
  - `src/adapters/codex/__tests__/warm-owner.test.ts`
  - `src/core/__tests__/harness-lifecycle.test.ts`
  - `src/core/__tests__/harness-schedules.test.ts`
  - `src/core/__tests__/harness-surface.test.ts`
  - `src/core/__tests__/worker-runs.test.ts`
  - `src/core/__tests__/workspace-import-export.test.ts`
  - `tests/e2e/compaction.test.ts`
  - `tests/e2e/full-stack.test.ts`

Interpretation:

- The graph can orient an agent on the broad harness boundary.
- The slice is intentionally broad because `src/core/harness.ts` is a central file.
- This is a good candidate for edge-weighted impact precision: containment and central-export edges should not make a broad slice pass unless dependency evidence explains the fan-out.

## Untracked Policy API Preflight

Command:

```bash
bun run cartographer:preflight -- --root . --live --path src/core/harness/policy-api.ts --json
```

Observed:

- Manifest totals: 618 files, 4,091 nodes, 9,555 edges, 0 findings
- Slice: 25 nodes, 56 edges, 0 findings
- Impact: 17 nodes, 16 edges, 0 findings
- Primary paths:
  - `src/core/__tests__/harness-policy-api.test.ts`
  - `src/core/harness.ts`
  - `src/core/harness/policy-api.ts`
  - `src/core/harness/policy-report.ts`
  - `src/policies/types.ts`
  - `src/shared/errors.ts`
  - `src/shared/result.ts`
  - `src/workers/types.ts`
- Impact paths:
  - `src/core/__tests__/harness-policy-api.test.ts`
  - `src/core/harness.ts`
  - `src/core/harness/policy-api.ts`
- Test paths:
  - `src/core/__tests__/harness-policy-api.test.ts`

Interpretation:

- Live preflight includes untracked source and untracked tests, which is important for agent work in progress.
- The graph gives a compact and useful first read set for the new policy module.
- At observation time, the validation command summary returned broad package scripts such as `bun test`, `typecheck`, `lint`, and `verify`; it did not synthesize the obvious targeted command `bun test ./src/core/__tests__/harness-policy-api.test.ts` even though the test path was present. The follow-up below records the fix.

## Eval Implications

Add these as future runner concerns after approval:

- Dirty worktree profile: graph context should include untracked source and test files without writing to the repo.
- Targeted validation synthesis: when `summary.testPaths` contains a focused test file, future evals should preserve focused command derivation and extend coverage beyond compatible root `bun test` scripts.
- Central-file precision: broad harness files should be scored with edge-weighted impact precision rather than raw slice size.
- Hybrid fallback: when the graph surfaces a likely test path but not an exact command, an agent may use package scripts plus direct source reads after graph orientation.

## Follow-Up Fix

After this observation, Cartographer was updated so focused test commands are derived from direct source-to-test `TESTS` relationships for the original focus node.

Verification:

```bash
bun test src/code-graph
bun run src/cli/index.ts cartographer preflight --root . --live --path src/core/harness/policy-api.ts --json
```

Observed after the fix:

- The code-graph suite passes: 45 pass, 0 fail, 839 assertions.
- The policy API preflight still surfaces `src/core/__tests__/harness-policy-api.test.ts`.
- `summary.validationCommands` now includes:
  - `scriptId`: `script:.:test#src/core/__tests__/harness-policy-api.test.ts`
  - `name`: `test:src/core/__tests__/harness-policy-api.test.ts`
  - `command`: `bun test ./src/core/__tests__/harness-policy-api.test.ts`
- The derivation is scoped to the original focus node so central impact expansion through `src/core/harness.ts` does not add every harness-adjacent test command.
- Later command-synthesis work changed focused Bun test path arguments to start with `./` so exact files under roots such as `tests/e2e` are pasteable Bun paths instead of non-matching filters.

## Worker Workspaces Dirty Preflight Refresh

Command:

```bash
/usr/bin/time -l bun run cartographer:preflight -- --root . --live --path src/core/harness/worker-workspaces.ts --json > /tmp/ark-cartographer-worker-workspaces-preflight.json
```

Worktree at refresh:

```text
M .garden/master-refactor-plan.md
M src/core/harness.ts
M src/core/harness/worker-artifact-helpers.ts
M src/core/harness/worker-artifacts.ts
?? src/core/harness/worker-workspaces.ts
```

Observed:

- Git: dirty at `4a284d8b5f5921f5121a1ca575baa5cf829e40ae`
- Manifest totals: 633 files, 4,326 nodes, 9,319 edges, 0 findings
- Dirty state: 632 tracked files, 1 untracked file, 4 modified files, 0 deleted files
- Slice: 47 nodes, 76 edges, 0 findings
- Impact: 28 nodes, 39 edges, 0 findings
- Preflight runtime: 0.44s wall time, 195,510,272 bytes max RSS
- Preflight phase timings: 351 ms total, 335 ms graph load, 12 ms context build, 2 ms prompt render
- Primary paths include:
  - `src/core/harness.ts`
  - `src/core/harness/worker-workspaces.ts`
  - `src/core/harness/worker-artifacts.ts`
  - `src/core/harness/worker-artifact-helpers.ts`
  - `src/core/harness/worker-events.ts`
  - `src/core/harness/path-safety.ts`
  - `src/shared/errors.ts`
  - `src/shared/result.ts`
- Test paths include:
  - `src/core/__tests__/harness-worker-artifacts.test.ts`
  - `src/core/__tests__/worker-runs.test.ts`
  - `src/core/__tests__/harness-surface.test.ts`
  - `src/core/__tests__/workspace-import-export.test.ts`
  - `src/core/__tests__/harness-lifecycle.test.ts`
  - `src/adapters/codex/__tests__/warm-owner.test.ts`

Interpretation:

- Live preflight can orient on an untracked in-progress worker module without writing graph artifacts into the repo.
- The graph surfaced both direct worker-artifact characterization tests and broader harness/runtime impact tests, which matches the verification set used after the extraction.
- The timing block is suitable for the future deterministic smoke runner's graph-load/context-build/render split.
- Follow-up: the worker-workspaces extraction captured by this dirty-preflight evidence landed in `370f992`.

After the worker-workspaces extraction was committed as `370f992`, the same command was rerun against the current docs-dirty tree:

- Git: dirty at `370f992e9a874f7db2b34f8193b4d9b73e8bf3f0`
- Dirty state: 633 tracked files, 0 untracked files, 3 modified docs/research files, 0 deleted files
- Manifest totals: 633 files, 4,324 nodes, 9,317 edges, 0 findings
- Slice: 46 nodes, 75 edges, 0 findings
- Impact: 27 nodes, 38 edges, 0 findings
- Preflight runtime: 0.45s wall time, 191,152,128 bytes max RSS
- Preflight phase timings: 363 ms total, 348 ms graph load, 13 ms context build, 2 ms prompt render
- The same primary paths, test paths, and focused validation commands were still present.

## Command Worker Dirty Preflight Refresh

Command:

```bash
bun run cartographer:preflight -- --root . --live --path src/core/harness/command-worker.ts --json
```

Worktree at refresh:

```text
M .evals/research/cartographer-exa-research-refresh.md
M .evals/research/cartographer-runner-implementation-handoff.md
M .garden/master-refactor-plan.md
M docs/evals/cartographer-code-graph-approval-request.md
M docs/evals/cartographer-code-graph-completion-audit.md
M docs/evals/cartographer-code-graph-eval-suites.md
M src/core/harness.ts
?? src/core/harness/command-worker.ts
```

Observed:

- Git: dirty at `ba14ec74e66f92408d8e95b97fe027ba21f2e7be`
- Manifest totals: 634 files, 4,337 nodes, 9,354 edges, 0 findings
- Dirty state: 633 tracked files, 1 untracked file, 7 modified files, 0 deleted files
- Slice: 50 nodes, 141 edges, 0 findings
- Impact: 25 nodes, 32 edges, 0 findings
- Preflight phase timings: 344 ms total, 332 ms graph load, 9 ms context build, 3 ms prompt render
- Primary paths include:
  - `src/core/harness.ts`
  - `src/core/harness/command-worker.ts`
  - `src/core/harness/command-artifacts.ts`
  - `src/core/harness/network-policy.ts`
  - `src/core/harness/policy-network.ts`
  - `src/core/harness/worker-artifacts.ts`
  - `src/core/harness/worker-events.ts`
  - `src/core/harness/worker-workspaces.ts`
  - `src/runner/local-process-executor.ts`
  - `src/runner/process-executor.ts`
  - `src/runner/sandbox-process-executor.ts`
- Test paths include:
  - `src/adapters/codex/__tests__/warm-owner.test.ts`
  - `src/core/__tests__/harness-lifecycle.test.ts`
  - `src/core/__tests__/harness-schedules.test.ts`
  - `src/core/__tests__/harness-surface.test.ts`
  - `src/core/__tests__/harness-tool-packs.test.ts`
  - `src/core/__tests__/worker-runs.test.ts`
  - `src/core/__tests__/workspace-import-export.test.ts`
  - `tests/e2e/compaction.test.ts`
  - `tests/e2e/full-stack.test.ts`

Interpretation:

- Live preflight can orient on a second untracked in-progress worker extraction without writing graph artifacts into the repo.
- The graph surfaced the new command worker module, the facade file that imports it, executor/network/artifact/workspace dependencies, and both focused harness tests and broader e2e impact tests.
- The phase timing split stayed in the same range as the worker-workspaces evidence, which gives the future runner another dirty-worktree speed datapoint.
- Follow-up: focused validation commands now use exact Bun path arguments:
  - `bun test ./src/core/__tests__/harness-tool-packs.test.ts`
  - `bun test ./src/core/__tests__/worker-runs.test.ts`
  - `bun test ./tests/e2e/compaction.test.ts`
  - `bun test ./tests/e2e/full-stack.test.ts`

## Runtime Session Selection Dirty Preflight Refresh

Command:

```bash
bun run cartographer:preflight -- --root . --live --path src/core/runtime/session-selection.ts --json
```

Worktree at refresh:

```text
M .evals/research/cartographer-code-graph-trace-survey.md
M .garden/master-refactor-plan.md
M docs/evals/cartographer-code-graph-approval-request.md
M docs/evals/cartographer-code-graph-completion-audit.md
M docs/evals/cartographer-code-graph-eval-suites.md
M src/core/runtime.ts
?? src/core/__tests__/runtime-session-selection.test.ts
?? src/core/runtime/session-selection.ts
```

Observed:

- Git: dirty at `ea8ad8818ba4ff7c4aa18b16e7dda590ed5f4610`
- Manifest totals: 647 files, 4,484 nodes, 9,671 edges, 0 findings
- Dirty state: 645 tracked files, 2 untracked files, 6 modified files, 0 deleted files
- Slice: 29 nodes, 50 edges, 0 findings
- Impact: 31 nodes, 50 edges, 0 findings
- Preflight phase timings: 365 ms total, 350 ms graph load, 12 ms context build, 3 ms prompt render
- Primary paths include:
  - `src/core/__tests__/runtime-session-selection.test.ts`
  - `src/core/runtime-selection.ts`
  - `src/core/runtime.ts`
  - `src/core/runtime/metadata-control.ts`
  - `src/core/runtime/session-selection.ts`
  - `src/harness/types.ts`
  - `src/shared/errors.ts`
  - `src/shared/result.ts`
  - `src/state/types.ts`
- Test paths include:
  - `src/core/__tests__/runtime-session-selection.test.ts`
  - `src/core/__tests__/runtime.test.ts`
  - `src/core/__tests__/runtime-session.test.ts`
  - `src/core/__tests__/runtime-session-fallback.test.ts`
  - `src/core/__tests__/runtime-session-restore.test.ts`
  - `src/core/__tests__/runtime-compact.test.ts`
  - `src/core/__tests__/send-replay.test.ts`
  - `src/core/__tests__/turn-supervisor-deadlines.test.ts`
  - `src/core/__tests__/turn-supervisor-dispatch.test.ts`
  - `tests/e2e/compaction.test.ts`
  - `tests/e2e/full-stack.test.ts`

Focused verification:

```bash
bun test ./src/core/__tests__/runtime-session-selection.test.ts ./src/core/__tests__/runtime.test.ts --timeout 120000
bunx biome check src/core/runtime.ts src/core/runtime/session-selection.ts src/core/__tests__/runtime-session-selection.test.ts
bunx eslint src/core/runtime.ts src/core/runtime/session-selection.ts src/core/__tests__/runtime-session-selection.test.ts
bun run typecheck
git diff --check
```

Observed verification result:

- Runtime session-selection plus runtime tests passed: 28 pass, 0 fail, 93 assertions.
- Biome passed.
- ESLint passed.
- Typecheck passed.
- Diff whitespace check passed.

Interpretation:

- Live preflight can orient on an untracked in-progress runtime helper extraction and its focused test.
- The graph surfaced the newly extracted helper, direct focused session-selection tests, broader runtime/session coverage, and e2e impact tests.
- The timing split remains stable against other dirty-worktree preflight runs, which gives the future runner another graph-load/context-build/render datapoint.

## Gate Status

This is research evidence only. It does not approve or create:

- `scripts/cartographer-code-graph-evals.ts`
- `eval:cartographer:*` package scripts
- fixture/task records
- generated Cartographer eval reports
- judge prompts or calibration files
