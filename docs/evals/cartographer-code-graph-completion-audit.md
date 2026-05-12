# Cartographer Code Graph Completion Audit

Status: partial - deterministic smoke runner implemented, live agent eval still missing
Last updated: 2026-05-12

## Objective

Strengthen the standalone Cartographer CLI with `$evals`, using `/Users/saint/dev/agent-runtime-kernel` as a read-only test target, and measure whether agent workflows can navigate codebases faster and more durably.

The objective is complete only when Cartographer itself has:

- a standalone graph CLI and library in this repo
- a master PRD for Cartographer v2
- documented eval targets for graph correctness, speed, navigation, and agent adoption
- read-only external target evidence from ARK
- runnable eval commands that emit append-only JSON reports
- at least one generated report proving the smoke profile actually ran
- a clear boundary between deterministic graph facts and agent semantic overlay guidance

## Prompt-To-Artifact Checklist

| Requirement | Evidence | Status |
| --- | --- | --- |
| Focus only on Cartographer/tooling | Core code now lives in this repo under `src/code-graph`, `src/cli`, `src/core/types.ts`, and `src/shared`. ARK is not the implementation home. | Done |
| Standalone CLI tool | `package.json` exposes `cartographer` plus `cartographer:index`, `view`, `slice`, `impact`, `context`, `preflight`, `adoption`, `annotate`, and `annotations`. | Done |
| Master PRD focused on Cartographer v2 | `docs/prds/cartographer-v2-code-graph.md` is now scoped to standalone Cartographer, with ARK and Axia treated only as test repositories. | Done |
| Include eval targets | `docs/prds/cartographer-v2-code-graph.md` and `docs/evals/cartographer-code-graph-eval-suites.md` define graph correctness, navigation, adoption, task outcome, monorepo, IaC, and semantic overlay targets. | Done as plan |
| Use ARK as test target base | On 2026-05-12, the standalone CLI indexed `/Users/saint/dev/agent-runtime-kernel` read-only and wrote artifacts to `/tmp/cartographer-ark-codegraph`. No graph artifacts were written inside ARK. | Done as read-only evidence |
| Measure graph speed | ARK index: 0.41s wall time, 227,573,760 bytes max RSS. ARK live preflight: 368ms total, 353ms graph load, 13ms context build, 2ms prompt render. | Partial - manual evidence only |
| Measure codebase understanding | ARK preflight for `src/code-graph/commands.ts` surfaced 17 primary paths, 2 focused test paths, 0 findings, and a compact 11-command validation list led by `builder.test.ts`, `commands.test.ts`, and module-level `bun test ./src/code-graph`. The compact payload also records `limits.validationCommands: 20` and `omissions.validationCommands: 103` so evals know broader command data was intentionally withheld. | Partial - one manual target only |
| Use coding-agent harnesses such as Codex | Existing docs describe adoption and trace checks, and `cartographer adoption` can score runtime traces. There is no standalone repeatable Codex eval profile in this repo yet. | Partial |
| Produce runnable eval reports | `scripts/cartographer-code-graph-evals.ts` exists, `package.json` exposes `eval:cartographer`, `eval:cartographer:smoke`, and `eval:cartographer:baseline`, and `docs/reports/cartographer-code-graph-smoke-2026-05-12T00-18-52-454Z.json` records a passing smoke run. | Done for deterministic smoke |
| Keep deterministic graph separate from semantic overlay | CLI supports deterministic graph artifacts plus candidate/reviewed overlay annotations. PRD and feature docs state that overlays cannot rescue missing graph facts. | Done |
| Verify current implementation | `bun run typecheck`, `bun test src/code-graph --timeout 120000`, and standalone self-index passed after the repo split. | Done |

## Current Read-Only ARK Evidence

Command:

```bash
/usr/bin/time -l bun run cartographer:index -- \
  --root /Users/saint/dev/agent-runtime-kernel \
  --out /tmp/cartographer-ark-codegraph \
  --max-file-bytes 500000
```

Result:

- root: `/Users/saint/dev/agent-runtime-kernel`
- output: `/tmp/cartographer-ark-codegraph`
- git: dirty at `02e1d424803e`
- files: 669
- nodes: 4,620
- edges: 10,049
- findings: 0
- wall time: 0.41s
- max RSS: 227,573,760 bytes

Edge highlights:

- `TESTS`: 835
- `IMPORTS`: 2,000
- `TYPE_IMPORTS`: 1,177
- `EXPORTS`: 1,351
- `USES_ENV`: 111
- `TABLE_REFERENCES_TABLE`: 37

Latest compact live preflight command:

```bash
bun run cartographer:preflight -- \
  --root /Users/saint/dev/agent-runtime-kernel \
  --live \
  --path src/code-graph/commands.ts \
  --out /tmp/cartographer-ark-codegraph \
  --json
```

Result after compact validation-command filtering:

- duration: 340ms
- graph load: 327ms
- context build: 12ms
- prompt render: 1ms
- primary paths: 17
- test paths: 2
- validation commands: 11, down from the earlier 114-command compact list
- validation command limit: 20
- omitted validation commands: 103
- findings: 0

Focused paths surfaced:

- `src/code-graph/commands.ts`
- `src/code-graph/builder.ts`
- `src/code-graph/context.ts`
- `src/code-graph/preflight.ts`
- `src/code-graph/query.ts`
- `src/code-graph/types.ts`
- `src/code-graph/__tests__/commands.test.ts`
- `src/code-graph/__tests__/builder.test.ts`

Focused validation commands surfaced first:

- `bun test ./src/code-graph/__tests__/builder.test.ts`
- `bun test ./src/code-graph/__tests__/commands.test.ts`
- `bun test ./src/code-graph`

Safe broad validation commands retained:

- `bun run test`
- `bun run typecheck`
- `bun run lint`
- `bun run lint:eslint`
- `bun run verify`

Long-running or environment-heavy broad commands such as watch/live variants are omitted from compact preflight context. Full context still retains complete command data for tooling that needs it.

Important note: ARK was already dirty on branch `garden/wave-2e-broker-context` before and after this read-only test-target run. The Cartographer command wrote to `/tmp`, not to the ARK repo.

## Current Cartographer Verification

Latest verified commands in the standalone Cartographer repo:

```bash
bun run typecheck
bun test src/code-graph --timeout 120000
bun run cartographer:index -- --root . --out /tmp/cartographer-plugin-codegraph --max-file-bytes 500000
bun run eval:cartographer:smoke
```

Results:

- TypeScript typecheck passed.
- Graph tests passed: 63 pass, 0 fail, 1,418 assertions.
- Self-index passed: 64 files, 791 nodes, 1,118 edges, 0 findings.
- Smoke eval passed and wrote `docs/reports/cartographer-code-graph-smoke-2026-05-12T00-18-52-454Z.json`.

## Current Smoke Eval Evidence

Report:

- path: `docs/reports/cartographer-code-graph-smoke-2026-05-12T00-18-52-454Z.json`
- status: `passed`
- duration: 844ms
- failures: 0

Suites:

- `graph-contract:self`: 63 files, 789 nodes, 1,116 edges, 0 findings, no duplicate IDs, no dangling edges, ignored paths excluded, no raw env values.
- `graph-contract:ark`: 669 files, 4,620 nodes, 10,049 edges, 0 findings, no duplicate IDs, no dangling edges, ignored paths excluded, no raw env values.
- `ark-preflight`: target path present, focused tests present, focused validation commands first, compact validation command limit recorded as 20 with 103 omitted commands, timing phases recorded.

The ARK target run remained read-only. Graph artifacts were written under `/tmp/cartographer-code-graph-evals`, not inside `/Users/saint/dev/agent-runtime-kernel`.

## Missing Work

The objective is not complete. The deterministic smoke runner now exists, but the strongest remaining gaps are:

- structured task fixtures converted from `.evals/research/cartographer-gold-task-candidates.md`
- baseline profile semantics beyond the current deterministic contract checks
- repeatable Codex/adoption profile for graph-first codebase-understanding traces
- calibrated judge prompt and human labels for semantic overlay usefulness

## Completion Verdict

Partial.

The standalone CLI, PRD, deterministic smoke eval runner, package scripts, and first smoke report are in place. The CLI has proven it can index ARK as a read-only external test target and write an append-only report from this repo.

The remaining completion gap is the live agent layer: repeatable Codex-style traces that compare baseline-direct, graph-prompted, and graph-mandated workflows without making unsupported quality-lift claims.
