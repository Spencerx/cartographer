# Cartographer Code Graph Eval Completion Audit

Status: incomplete pending explicit eval implementation approval
Last updated: 2026-05-11

## Objective

Strengthen Cartographer v2 with evals and Codex-style coding-agent harness workflows that measure:

- graph build and query speed
- codebase understanding quality
- graph-command adoption by agents
- durable navigation workflows for large repos, monorepos, and IaC
- safe separation between deterministic graph facts and Codex-style semantic overlay guidance

## Completion Criteria

This objective is complete only when all of the following are true:

- Cartographer has a written eval plan grounded in real traces and monorepo/IaC stress evidence.
- The graph exposes machine-readable context suitable for agents and eval runners.
- Codex-style harnesses can emit raw traces that show whether graph commands were used before source reads.
- There is repeatable evidence for graph speed, graph-command adoption, and codebase-understanding quality.
- Deterministic graph recall/precision is scored independently before semantic overlay usefulness is reported.
- Runnable Cartographer eval commands write structured JSON reports under `docs/reports`.
- The report evidence covers deterministic graph contract checks, navigation gold tasks, and opt-in live Codex adoption profiles.
- Judge-based semantic overlay scoring, if enabled, has binary criteria, separate-family judging, structured output, human calibration, and recorded agreement.

## Prompt-To-Artifact Checklist

| Requirement | Evidence | Status |
| --- | --- | --- |
| Use `$evals` discipline | `docs/evals/cartographer-code-graph-eval-suites.md` is a plan-first eval document with deterministic, live-agent, and judge tiers. | Partial |
| Audit eval-plan integrity before scaffolding | `docs/evals/cartographer-code-graph-plan-integrity-audit.md` scores the plan as 21 pass, 11 fail, 6 n/a after adding graph-quality checks for provenance, precision-provider receipts, graph modes, temporal/dirty/deleted behavior, and Codex annotation-contract controls. Failures remain concentrated in the intentionally missing runner/report/calibration layer. | Done |
| Survey real traces before designing evals | `.evals/research/cartographer-code-graph-trace-survey.md` records current CLI timings, graph size, Codex adapter tests, worker-run tests, and observed gaps. | Done |
| Survey monorepo/IaC stress case | `.evals/research/cartographer-axia-stress-run.md` records a read-only Axia OS run with package, script, Supabase, dirty-state, ignored-path, slice, historical edge-gap evidence, current app-to-data evidence, and SQL table-reference evidence. | Done |
| Draft gold navigation task candidates | `.evals/research/cartographer-gold-task-candidates.md` lists candidate ARK, Axia, and live Codex tasks with prompts, start selectors, gold files, validation commands, and known current failures. | Done |
| Draft runner implementation handoff | `.evals/research/cartographer-runner-implementation-handoff.md` maps the approved future runner to ARK's report contract, profile names, suite IDs, task-data shape, metrics, integrity rules, and first implementation batch, including provenance-confidence validity, precision-provider receipts, live/persisted/fixture graph modes, temporal graph-diff targets, evidence-to-action conversion, belief durability, writeback source-anchor freshness, and local-only benchmark claim rules. | Done |
| Verify graph contract manually | `.evals/research/cartographer-manual-contract-checks.md` records fresh ARK and Axia schema/ID/dangling-edge/ignored-path/env-metadata/evidence checks. | Done |
| Refresh external code-graph and agent-eval grounding | `.evals/research/cartographer-exa-research-refresh.md` now records 2026 evidence from CodeTracer, Theory of Code Space, AgenticCodebase, Memtrace, Codemap, Codemesh, Sourcegraph SCIP/precise navigation, Synapps, Context Master, repository-map patterns, CodeGraph, graphify-ts, RANGER, and RepoGraph. The added findings reinforce graph-first/source-second agent workflows, hybrid graph/search retrieval, reusable repo-graph modules, overlay anti-corruption rules, and local-only benchmark claims. | Done |
| Separate deterministic graph scoring from semantic overlay scoring | `docs/prds/cartographer-v2-code-graph.md`, `docs/features/cartographer-code-graph.md`, `docs/evals/cartographer-code-graph-eval-suites.md`, `.evals/research/cartographer-exa-research-refresh.md`, and `.evals/research/cartographer-runner-implementation-handoff.md` now state that the structural graph must work without annotations, that Codex/OpenRouter/human notes are reviewable overlay guidance, and that the first smoke runner must pass or fail deterministic graph/navigation checks without relying on accepted overlay notes. | Done as plan |
| Provide machine-readable graph context for eval/harness consumers | `cartographer preflight --path <target>` emits the default graph-first preflight shape with manifest, summary, `summary.testPaths`, `summary.annotationNotes`, slice/impact totals, and a `preflight` metadata block with command, timestamps, total duration, and phase timings. `cartographer context --json`, `slice --json`, and `impact --json` provide nested graph payloads for scoring, including accepted/stale semantic overlay annotations. Accepted notes with missing evidence or changed evidence hashes are downgraded to `stale` and surfaced as findings. `src/code-graph/__tests__/commands.test.ts` parses the real CLI JSON paths. `src/code-graph/__tests__/preflight.test.ts` covers direct live and persisted-artifact preflight behavior plus structured failure context for harness consumers. | Done |
| Expose ranked affected-package and validation-command summaries | `GraphSlice.summary` ranks package context, emits raw package-script metadata plus root-executable `runCommand` values for slice/impact consumers, derives focused Bun test commands from direct source-to-test edges, derives module-level Bun test commands such as `bun test ./src/code-graph`, and includes direct tests for bounded impacted dependents when the package test script is compatible. Focused path arguments use exact Bun path syntax such as `./src/...` and `./tests/...` so commands are pasteable for test files outside `src`. Top-level agent context prioritizes focused and module-level validation commands before broad package scripts in machine-readable preflight JSON. Local package-to-package `DEPENDS_ON` edges are emitted when one package depends on another package name in the same repo, including `workspace:*` references, so shared-package impact can surface dependent app packages and scripts. `TESTS` edges now come from explicit imports plus conservative `__tests__` naming conventions, so facade-style tests can still surface as focused validation when the target source path exists. `TYPE_IMPORTS` edges remain separate from runtime `IMPORTS` for type-only relationships while still participating in impact traversal. `src/code-graph/__tests__/builder.test.ts` covers root, nested monorepo, safe DB, unsafe/runtime script filtering, type-only import separation, naming-convention test edges, impacted-dependent tests, exact Bun path arguments for tests outside `src`, module-level test commands, local workspace package dependencies, and package `runCommand` generation; `src/code-graph/__tests__/commands.test.ts` covers focused preflight test-command output and order. | Done |
| Provide graph-first agent preflight command | `cartographer preflight --path <file-or-node-id>` is the default agent preflight command and returns the compact context equivalent of `cartographer context --path <target> --depth 1 --compact --json` plus preflight timing metadata. It returns graph manifest, compact preflight summary, package ranking, validation commands, and slice/impact totals. Full `context --json` remains available when eval scoring needs selected slice and impact view payloads. `src/code-graph/__tests__/commands.test.ts` covers both real CLI JSON paths. | Done |
| Provide exact graph node selectors for agent/eval tasks | Node-id selectors such as `env:DATABASE_URL`, `dbtable:public.accounts`, `script:.:test`, `symbol:src/index.ts:main`, and `iacresource:...` now resolve by exact node id instead of broad text fallback; `path:<file>` also works consistently for both context slice and impact. `package:<path-or-name>` keeps package slices bounded to the exact package path/name and no longer pulls in prefix siblings such as `apps/web-admin` when selecting `apps/web`; package names such as `@fixture/web` resolve to the same bounded package contents as package paths. `src/code-graph/__tests__/builder.test.ts` covers `env:DATABASE_URL` not pulling in `env:DATABASE_URL_READONLY`, Terraform `RESOURCE_DEPENDS_ON` impact traversal, and package selector path/name prefix-sibling isolation; `src/code-graph/__tests__/commands.test.ts` covers symbol node ids, `path:` selectors through the real context CLI, and `cartographer slice --selector package:<path-or-name> --json` package-selector isolation through the real CLI. | Done |
| Keep agent annotations reviewable | `cartographer annotations --json` audits `docs/codegraph/overlays/agent-notes.jsonl` against the current graph before agents trust semantic overlay notes. `cartographer annotations --live --root <repo> --json` audits the same overlay against an in-memory graph without requiring or writing persisted graph artifacts, which keeps dirty-worktree annotation review usable for agents. OpenRouter-generated candidate annotations inherit current graph evidence hashes when available, so source-anchor drift can be detected later instead of relying on manual hash stamping, and provider notes that do not cite target-node evidence are dropped before they enter the overlay. `cartographer annotations --accept <id> --reviewer <name>` promotes only audit-clean candidates to human-reviewed accepted notes, and `--retire <id>` marks stale or unsafe notes as retired with reviewer identity. The audit reports JSONL/schema parse issues, duplicate annotation IDs, missing target nodes, evidence that does not anchor to the target node, missing evidence paths, evidence hash drift, review-ready candidates, usable accepted notes, and notes that should be marked stale. `src/code-graph/__tests__/commands.test.ts` covers persisted/live audit, target-evidence anchor rejection, duplicate-ID rejection, and accept/reject/retire review flows; `src/code-graph/__tests__/openrouter.test.ts` covers hash-stamped candidate normalization and provider-side unanchored note rejection. | Done |
| Measure speed | Trace survey records `cartographer:index`, `view`, `slice`, `impact`, Axia stress index, Codex adapter test, worker-run test, and focused combined verification timings. CLI `cartographer preflight --json` now carries `preflight.durationMs` plus `preflight.timings.loadGraphMs`, `buildContextMs`, and `renderPromptMs`; runtime `TurnInput.graphPreflight` receives the same timing breakdown and emits it in the synthetic `cartographer.preflight` `tool_result` event. Repeatable report aggregation is still gated on the eval runner. | Partial |
| Measure codebase understanding | Eval plan defines gold navigation tasks, top-k file recall, precision, dependency closure, validation-command recall, and hallucinated path count. `checkTraceExpectations` and repeatable `cartographer adoption --expect-text/--expect-path/--expect-command/--expect-executed-command` flags now provide manual expectation gates for live understanding traces with multiple expected files or commands. `finalResponseExpectation.metrics` reports aggregate hit counts for expected text, paths, commands, and executed commands. Expected-path checks report final-response, tool-command, and direct source-read evidence per path. Expected-command checks report final-response and tool-command-presence evidence per command; executed-command checks require a matching tool command. The live graph-first understanding trace passes expected marker, implementation file, and validation command checks. No repeatable task distribution, recall/precision report, or quality-lift measurement exists yet. | Partial |
| Use Codex-style coding agent harnesses | Eval plan defines `baseline-direct`, `graph-prompted`, and `graph-mandated` Codex harness conditions. Existing fake Codex tests, live Codex adapter test, live Codex workspace checkpoint harness, and durable runtime session-binding coverage are recorded as prerequisite evidence. The live Codex adapter test also has opt-in raw event capture through `CODEX_E2E_TRACE_OUT` plus custom prompt/cwd environment variables for graph-prompted research runs. | Partial |
| Provide harness-level graph preflight hook | `TurnInput.graphPreflight` lets a turn request compact Cartographer preflight before adapter execution. The runtime attaches the result to `TurnRunContext`; the kernel injects the preflight prompt context and emits `tool_use`/`tool_result` events recognized by `analyzeGraphCommandAdoption`, including preflight duration and phase timings for trace-level speed scoring. `src/core/runtime/graph-preflight-runner.ts` now isolates runtime metadata parsing, workspace-root selection, optional failure handling, and Cartographer preflight execution. `src/kernel/graph-preflight-events.ts` isolates prompt append and synthetic graph event wrapping while preserving event order before adapter events. `src/core/__tests__/runtime-graph-preflight-runner.test.ts`, `src/core/__tests__/runtime.test.ts`, `src/kernel/__tests__/turn-executor.test.ts`, and `src/kernel/__tests__/graph-preflight-events.test.ts` cover the deterministic hook with fake adapters, including mandatory failure, optional-skip behavior, workspace-root preference, prompt append behavior, synthetic event order, and structured `graphPreflight` error event evidence. | Done |
| Test graph-command adoption | Eval plan defines graph adoption rate, first graph command latency, source reads before graph use, preflight failure triage, and graph-mandated failure rules. `analyzeGraphCommandAdoption` now provides a tested trace classifier for `RuntimeEvent[]` streams, including `cartographer preflight`, `cartographer context --json` follow-up commands, trace duration, first graph command offset, successful preflight result count, preflight durations, first preflight phase timings, shell-wrapped source-read detection, skill-instruction read exclusions, source-read-before-graph counts, and structured `graphPreflight` error events. `checkGraphFirstAdoption` and `cartographer adoption --require-graph-first` expose a strict manual gate for missing graph use, graph preflight failures, or repo source reads before graph context. `cartographer adoption --trace <runtime-events.json> --json` exposes the deterministic summary for manual trace research. One graph-prompted live Codex trace shows `adopted: true` with 0 source reads before graph use; one graph-first understanding trace shows `adopted: true` with 0 repo source reads before graph and a correct implementation file plus validation command; one graph-first facade-test trace shows `adopted: true`, graph-first gate passed, 0 source reads before graph, and the focused harness test was both named and executed; one graph-first runtime graph-preflight runner trace shows `adopted: true`, graph-first gate passed, 0 source reads before graph, and the exact focused runner test was both named and executed; one paired builder-flow contrast shows graph-first passed with 0 source reads before graph and 34,486 ms trace duration while baseline-direct had `adopted: false`, 35 source reads before graph, and 94,959 ms trace duration; one earlier baseline-direct trace shows `adopted: false` with 2 source reads before graph. No repeatable eval profile or adoption-rate report exists yet. | Partial |
| Test durable workflows | Eval plan defines smoke, baseline, and live Codex profiles plus report shape and Goodhart controls. | Planned |
| Generate runnable eval report | No `scripts/cartographer-code-graph-evals.ts` exists yet. No Cartographer eval JSON report exists under `docs/reports`. | Missing |
| Wire package scripts | No `eval:cartographer:*` scripts exist in `package.json`. | Missing |
| Build fixture repos/snapshots | Fixture families and gold task candidates are named, but fixture files/snapshots are not scaffolded. | Missing |
| Add judge prompt and calibration | Judge requirements are documented, but no judge prompt, gold labels, or calibration set exists. | Missing |

Completeness verdict: incomplete. The plan, graph-first command surface, deterministic adoption classifier, and manual live traces exist. The executable eval suite, fixture data, persisted Cartographer reports, repeatable adoption-rate profile, and calibrated semantic judge layer do not.

## Current State Audit

Audit date: 2026-05-11
Latest clean evidence baseline inspected: use `git log --oneline -- docs/evals .evals/research .garden/master-refactor-plan.md` for the current planning-doc receipt history.
Latest annotation review workflow inspected: `72fc410`
Latest Cartographer command fix inspected: `0bb6b94`
Latest Harness command-worker extraction inspected: `8f5c52b`
Latest Harness agent-worker extraction inspected: `8c09808`
Latest Runtime metadata/control extraction inspected: `a9e3463`
Latest Runtime event-helper extraction inspected: `55262b7`
Latest Runtime graph-preflight runner extraction inspected: `4b8e6c1`
Latest Runtime session-selection extraction inspected: `1ee67c6`
Latest Runtime session-binding extraction inspected: `e58c4bc`
Latest Runtime workspace-turns extraction inspected: `d2895d6`
Latest Runtime turn-preparation extraction inspected: `e930763`
Latest Runtime completion extraction inspected: `a346b06`
Latest Kernel graph-preflight event extraction inspected: current docs refresh
Latest live annotation audit coverage inspected: `a5da2e5`
Latest annotation evidence hash stamping inspected: `0c2af87`
Latest graph-preflight/eval evidence docs refresh inspected: `b583cd7`
Latest graph-preflight audit docs refresh inspected: `ea8ad88`
Latest preflight rerun while docs were dirty: `6c5e355`
Latest Cartographer adoption gate commit: `4f3bdca`
Latest eval plan integrity audit commit: `428faf9`
Latest graph-quality research refresh inspected: `ed91206`
Latest provenance PRD refresh inspected: `20acff1`
Latest eval provenance criteria refresh inspected: `4b50f86`
Latest provenance audit refresh inspected: `9c9ff0c`
Latest live-mode feature-doc refresh inspected: `e5b1576`
Latest overlay-boundary docs refresh inspected: `77f1749`
Latest annotation target-evidence audit inspected: `aab00c5`
Latest OpenRouter target-evidence filter inspected: `afac872`
Latest planning-doc receipt refreshes inspected: see `git log --oneline -- docs/evals .evals/research .garden/master-refactor-plan.md`.
Current working-tree state: verify directly with `git status --short --branch`; this audit intentionally does not chase live dirty-state metadata.

The previous dirty-worktree evidence was captured while the non-eval Harness worker-workspaces extraction was in progress. That extraction landed in `370f992`; later code/docs refresh commits improve command-worker extraction evidence, agent-worker extraction evidence, pasteable Bun validation-command generation, runtime helper structure, runtime graph-preflight runner structure, session-selection structure, live annotation audit coverage, annotation source-anchor hash preservation, annotation accept/retire review workflow, local package-to-package graph dependency edges, parser-vs-semantic provenance planning, reviewable annotation metadata, live-mode docs, audit receipts, the approval baseline, and the stabilized approval request. They still do not create the missing eval runner. A live dirty-worktree preflight was also captured during the Wave 4n-f agent-worker extraction; that Harness work later landed in `8c09808`. The Wave 5a-c Runtime graph-preflight runner extraction landed in `4b8e6c1`; it strengthens the graph-preflight hook implementation but is not runnable Cartographer eval scaffolding. The Wave 5d Runtime session-selection extraction landed in `1ee67c6`; it is runtime refactor state, not Cartographer eval scaffolding. The Wave 5b-a Runtime session-binding extraction landed in `e58c4bc`; it moves session restore, active runtime/model metadata, active kernel switching, adapter binding persistence, and compacted-session binding refresh behind `src/core/runtime/session-bindings.ts`; it strengthens durable coding-agent harness sessions, but it is not runnable Cartographer eval scaffolding. The Runtime workspace-turns extraction landed in `d2895d6`; it moves workspace materialization, branch validation, pre/post snapshots, turn-workspace linking, and release handling behind `src/core/runtime/workspace-turns.ts`; it improves harness navigability and keeps the worktree clean, but it is not runnable Cartographer eval scaffolding. The Runtime turn-preparation extraction landed in `e930763`; it moves runtime/model/session choice, artifact materialization, graph preflight, and effective config shaping behind `src/core/runtime/turn-preparation.ts`. The Runtime completion extraction landed in `a346b06`; it moves claim completion, terminal event persistence, session persistence, sink completion, and turn telemetry behind `src/core/runtime/completion.ts`. Both improve harness navigability, but neither is runnable Cartographer eval scaffolding. The live annotation audit coverage landed in `a5da2e5`; it is a non-eval command test for existing `annotations --live` behavior, not runnable Cartographer eval scaffolding. The annotation review workflow landed in `72fc410`; it adds first-class accept/retire review actions but is not runnable Cartographer eval scaffolding. The package-dependency graph edge work landed in `79af608`; it is Cartographer graph functionality and coverage, not runnable eval scaffolding. Annotation evidence hardening landed through `afac872`; it protects semantic overlays but is not a repeatable eval report. The graph-quality docs refreshes are PRD/eval/feature/research documentation, not runnable eval scaffolding. The eval suite itself is still incomplete because the runner, scripts, fixtures, reports, and approval receipt are missing.

Prompt-to-artifact audit against the user request:

| Explicit requirement | Current artifact/evidence | Verdict |
| --- | --- | --- |
| Build a more functional, scalable Cartographer v2 | `docs/prds/cartographer-v2-code-graph.md` defines the graph, semantic overlay, monorepo/IaC model, agent workflow, phases, risks, and exit criteria. | Done as PRD |
| Include variations | `docs/prds/cartographer-v2-code-graph.md` includes six variations: single TS package, Bun workspace monorepo, web/API/Supabase product, IaC-heavy platform repo, polyglot monorepo, and very large monorepo. | Done as PRD |
| Use `~/dev/agent-runtime-kernel` as starter base | Current implementation and tests live in this repo under `src/code-graph`, `src/core/runtime-options/graph-preflight.ts`, `src/core/runtime/graph-preflight-runner.ts`, `src/core/runtime/session-bindings.ts`, `src/core/runtime/workspace-turns.ts`, `src/core/runtime/turn-preparation.ts`, `src/core/runtime/completion.ts`, `src/kernel/graph-preflight-events.ts`, and related runtime/kernel hook tests. | Partial implementation |
| Use Axia OS as monorepo pattern example | `.evals/research/cartographer-axia-stress-run.md` and `.evals/research/cartographer-gold-task-candidates.md` record Axia stress evidence and candidate tasks. | Done as research |
| Add code graphs beyond a normal file tree | `cartographer index/view/slice/impact/context/preflight` exist, with schema, graph store, package/script facts, runtime imports, type-only imports, env vars, SQL/IaC facts, generated ownership, tests, slices, and impact summaries. | Partial implementation |
| Account for what Tree-sitter cannot infer | PRD and overlay design separate inventory, syntax, precision, repo-workflow, IaC/data, agent-inferred, and human-reviewed layers. The PRD now calls out parser-lite provenance, precision-provider fallback receipts, review-decision metadata for accepted annotations, and overlay anti-duplication. `cartographer annotations --json` audits semantic overlay freshness and evidence. | Partial implementation |
| Let agents annotate safely | `cartographer annotate` and `cartographer annotations` exist with OpenRouter request-shape tests and stale/missing evidence handling. Human calibration and production review workflow are not complete. | Partial |
| Use Codex-style harnesses | Live Codex adapter tests, trace capture env vars, manual graph-prompted traces, graph-first understanding trace, builder-flow paired contrast, workspace checkpoint harness evidence, durable runtime session-binding coverage, cleaned-up runtime workspace-turn lifecycle coverage, isolated runtime turn-preparation coverage, and isolated runtime completion coverage exist. | Partial |
| Measure speed and understanding | Manual timings and trace summaries exist. `checkTraceExpectations` can score expected text/path/command evidence and separately gate executed validation commands. No repeatable distribution or persisted Cartographer eval report exists. | Partial |
| Include `$evals` targets | `docs/evals/cartographer-code-graph-eval-suites.md` defines deterministic, navigation, live-agent, semantic-overlay, and Axia stress suites with targets and Goodhart controls. | Done as plan |
| Produce runnable `$evals` reports | `scripts/cartographer-code-graph-evals.ts` is absent; `package.json` has no `eval:cartographer:*` scripts; no `docs/reports/cartographer-code-graph-*.json` report exists. | Missing |

Fresh command evidence from this audit:

```text
approval=missing
runner=missing
eval:cartographer=missing
eval:cartographer:smoke=missing
eval:cartographer:baseline=missing
eval:cartographer:codex=missing
reports=none
```

Latest clean-head verification:

- `git status --short --branch --untracked-files=all`: clean at `main...origin/main` before this docs refresh, HEAD `a346b068ff997ddcb31df4af28f49428985b4976`
- gate audit: approval false, runner false, all `eval:cartographer:*` scripts false, reports empty
- `bun test ./src/code-graph --timeout 120000`: 63 pass, 0 fail, 1,403 assertions
- `bun test ./src/core --timeout 120000`: 208 pass, 0 fail, 989 assertions
- focused runtime completion/session tests: 50 pass, 0 fail, 271 assertions
- focused kernel/runtime graph-preflight tests: 31 pass, 0 fail, 124 assertions
- broad gates: `bun run typecheck`, `bun run lint`, `bun run lint:eslint`, `bun run knip`, `bun run fallow:audit:head`, and `git diff --check` passed
- live preflight for `src/core/runtime/completion.ts`: 0 findings, 656 files, 4,572 nodes, 9,886 edges, 378 ms total in the dirty pre-commit point-in-time run
- live preflight for `src/code-graph/openrouter.ts`: 0 findings, 656 files, 4,572 nodes, 9,886 edges, 376 ms total in the dirty pre-commit point-in-time run

Latest docs-update live preflight receipt:

This receipt verifies the planning docs with the live graph. Exact commit hashes and timings are intentionally treated as point-in-time evidence; run `git status --short --branch` and the preflight command again before implementation work that depends on current dirty-state metadata.

- command: `bun run cartographer:preflight -- --root . --live --path docs/evals/cartographer-code-graph-completion-audit.md --json`
- graph metadata: rerun the command to inspect the current commit, dirty state, and file count.
- focused context: primary path `docs/evals/cartographer-code-graph-completion-audit.md`, 0 findings
- timing: point-in-time only; rerun the command when a fresh timing receipt is needed.
- diff check: `git diff --check` passed for this docs update
- approval-request preflight: rerun `bun run cartographer:preflight -- --root . --live --path docs/evals/cartographer-code-graph-approval-request.md --json` for current metadata.
- plan-integrity preflight: rerun `bun run cartographer:preflight -- --root . --live --path docs/evals/cartographer-code-graph-plan-integrity-audit.md --json` for current metadata.
- runner-handoff preflight: rerun `bun run cartographer:preflight -- --root . --live --path .evals/research/cartographer-runner-implementation-handoff.md --json` for current metadata.

Committed Wave 5a-c clean-tree graph preflight for the runtime graph-preflight runner extraction:

- command: `bun run cartographer:preflight -- --root . --live --path src/core/runtime/graph-preflight-runner.ts --json`
- graph metadata: commit `4b8e6c13f10f688d13e4168aa8d72e7aaea82f43`, dirty `false`, 645 tracked files, 0 untracked files, 0 modified files, 0 deleted files
- graph totals: 645 files, 4,465 nodes, 9,634 edges, 0 findings
- focused context: 28 slice nodes, 47 slice edges, 30 impact nodes, 49 impact edges
- timing: 377 ms total, 357 ms graph load, 17 ms context build, 3 ms prompt render
- surfaced primary paths include `src/code-graph/preflight.ts`, `src/core/__tests__/runtime-graph-preflight-runner.test.ts`, `src/core/runtime-options/graph-preflight.ts`, `src/core/runtime.ts`, `src/core/runtime/graph-preflight-runner.ts`, `src/core/runtime/metadata-control.ts`, `src/core/types.ts`, `src/shared/errors.ts`, `src/shared/result.ts`, and `src/state/types.ts`
- surfaced focused tests include `src/core/__tests__/runtime-graph-preflight-runner.test.ts`, `src/core/__tests__/runtime.test.ts`, `src/core/__tests__/runtime-compact.test.ts`, `src/core/__tests__/runtime-session.test.ts`, `src/core/__tests__/runtime-session-fallback.test.ts`, `src/core/__tests__/runtime-session-restore.test.ts`, `src/core/__tests__/send-replay.test.ts`, `src/core/__tests__/turn-supervisor-deadlines.test.ts`, `src/core/__tests__/turn-supervisor-dispatch.test.ts`, `tests/e2e/compaction.test.ts`, and `tests/e2e/full-stack.test.ts`

Wave 5d dirty-worktree graph preflight captured during the runtime session-selection extraction:

- command: `bun run cartographer:preflight -- --root . --live --path src/core/runtime/session-selection.ts --json`
- graph metadata: commit `ea8ad8818ba4ff7c4aa18b16e7dda590ed5f4610`, dirty `true`, 645 tracked files, 2 untracked files, 6 modified files, 0 deleted files
- graph totals: 647 files, 4,484 nodes, 9,671 edges, 0 findings
- focused context: 29 slice nodes, 50 slice edges, 31 impact nodes, 50 impact edges
- timing: 365 ms total, 350 ms graph load, 12 ms context build, 3 ms prompt render
- surfaced primary paths include `src/core/__tests__/runtime-session-selection.test.ts`, `src/core/runtime-selection.ts`, `src/core/runtime.ts`, `src/core/runtime/metadata-control.ts`, `src/core/runtime/session-selection.ts`, `src/harness/types.ts`, `src/shared/errors.ts`, `src/shared/result.ts`, and `src/state/types.ts`
- surfaced focused tests include `src/core/__tests__/runtime-session-selection.test.ts`, `src/core/__tests__/runtime.test.ts`, `src/core/__tests__/runtime-session.test.ts`, `src/core/__tests__/runtime-session-fallback.test.ts`, `src/core/__tests__/runtime-session-restore.test.ts`, `src/core/__tests__/runtime-compact.test.ts`, `src/core/__tests__/send-replay.test.ts`, `src/core/__tests__/turn-supervisor-deadlines.test.ts`, `src/core/__tests__/turn-supervisor-dispatch.test.ts`, `tests/e2e/compaction.test.ts`, and `tests/e2e/full-stack.test.ts`

Wave 4n-f dirty-worktree graph preflight for the agent-worker extraction:

- command: `bun run cartographer:preflight -- --root . --live --path src/core/harness/agent-worker.ts --json`
- graph metadata: commit `64233a41af4f177c19a8ba1a9717b096b54aea69`, dirty `true`, 634 tracked files, 2 untracked files, 3 modified files, 0 deleted files
- graph totals: 636 files, 4,358 nodes, 9,390 edges, 0 findings
- focused context: 44 slice nodes, 94 slice edges, 25 impact nodes, 32 impact edges
- timing: 330 ms total, 317 ms graph load, 10 ms context build, 3 ms prompt render
- surfaced primary paths include `src/core/harness.ts`, `src/core/harness/agent-worker.ts`, `src/core/harness/errors.ts`, `src/core/harness/network-policy.ts`, `src/core/harness/policy-network.ts`, `src/core/harness/policy-report.ts`, `src/core/harness/worker-artifacts.ts`, `src/core/harness/worker-events.ts`, `src/core/harness/worker-workspaces.ts`, `src/core/runtime.ts`, `src/core/types.ts`, `src/env/profile.ts`, `src/env/types.ts`, `src/shared/errors.ts`, `src/shared/result.ts`, and `src/workers/types.ts`
- surfaced focused tests include `src/adapters/codex/__tests__/warm-owner.test.ts`, `src/core/__tests__/harness-lifecycle.test.ts`, `src/core/__tests__/harness-schedules.test.ts`, `src/core/__tests__/harness-surface.test.ts`, `src/core/__tests__/harness-tool-packs.test.ts`, `src/core/__tests__/worker-runs.test.ts`, `src/core/__tests__/workspace-import-export.test.ts`, `tests/e2e/compaction.test.ts`, and `tests/e2e/full-stack.test.ts`

During the worker-workspaces extraction, `cartographer preflight --root . --live --path src/core/harness/worker-workspaces.ts --json` succeeded on the dirty worktree and emitted a compact graph-first context with:

- 633 files, 4,326 nodes, 9,319 edges, 0 findings for the live graph
- dirty-state metadata: 632 tracked files, 1 untracked file, 4 modified files, 0 deleted files
- 47 slice nodes, 76 slice edges, 28 impact nodes, and 39 impact edges
- preflight timing metadata: 351 ms total, 335 ms graph load, 12 ms context build, 2 ms prompt render
- primary paths including `src/core/harness.ts`, `src/core/harness/worker-workspaces.ts`, `src/core/harness/worker-artifacts.ts`, `src/core/harness/worker-artifact-helpers.ts`, and `src/core/harness/worker-events.ts`
- focused and impact test paths including `src/core/__tests__/harness-worker-artifacts.test.ts`, `src/core/__tests__/worker-runs.test.ts`, `src/core/__tests__/harness-surface.test.ts`, `src/core/__tests__/workspace-import-export.test.ts`, and `src/core/__tests__/harness-lifecycle.test.ts`

After the extraction landed, the same preflight command was rerun against the current docs-dirty tree at `6c5e355` and emitted:

- 633 files, 4,322 nodes, 9,315 edges, 0 findings for the live graph
- dirty-state metadata: 633 tracked files, 0 untracked files, 1 modified docs file, 0 deleted files
- 46 slice nodes, 75 slice edges, 27 impact nodes, and 38 impact edges
- preflight timing metadata: 376 ms total, 360 ms graph load, 13 ms context build, 3 ms prompt render
- the same primary paths, test paths, and focused validation commands

This proves the graph-first command works both against untracked in-progress source and against the committed worker-workspaces extraction while docs are dirty. The clean contract baseline remains the committed refresh above: 612 files, 4,046 nodes, 9,408 edges, 629 `TESTS`, and 0 findings.

## Verified Evidence

Commands already run successfully:

```bash
bun run lint
bun run lint:eslint
bun run typecheck
bun test src/code-graph src/adapters/codex src/core/__tests__/worker-runs.test.ts src/state/__tests__/store.test.ts src/state/__tests__/session-tuples.test.ts
bun test
git diff --check
```

Latest focused pre-runner dependency verification:

- `bun test src/code-graph/__tests__/adoption.test.ts src/code-graph/__tests__/preflight.test.ts src/core/__tests__/runtime-graph-preflight-runner.test.ts src/kernel/__tests__/turn-executor.test.ts --timeout 120000`

Result: passed with 34 pass, 0 fail, 174 assertions across 4 files. This verifies the deterministic adoption classifier, graph preflight prompt/context generation, runtime graph-preflight request handling, and kernel preflight event injection that the future Cartographer runner will depend on. It is dependency evidence only, not a generated Cartographer eval report.

Latest focused Cartographer verification after the executed-command adoption gate:

- `bun test src/code-graph/__tests__/adoption.test.ts src/code-graph/__tests__/commands.test.ts --timeout 120000`
- `bunx biome check src/code-graph/adoption.ts src/code-graph/commands.ts src/code-graph/__tests__/adoption.test.ts src/code-graph/__tests__/commands.test.ts`
- `bunx eslint src/code-graph/adoption.ts src/code-graph/commands.ts src/code-graph/__tests__/adoption.test.ts src/code-graph/__tests__/commands.test.ts`
- `bun run typecheck`

Result: focused checks passed; adoption and command tests passed with 36 pass, 0 fail, 820 assertions; Biome passed; ESLint passed; typecheck passed. The latest adoption tests cover `--expect-executed-command`, including a pass case where the trace actually ran `bun test src/code-graph` and a failure case where the final answer only recommended the command.

Latest runtime graph-preflight runner extraction verification:

- `bun test ./src/core/__tests__/runtime-graph-preflight-runner.test.ts --timeout 120000`
- `bun test ./src/core/__tests__/runtime.test.ts ./src/kernel/__tests__/turn-executor.test.ts --timeout 120000`
- `bunx biome check src/core/runtime.ts src/core/runtime/graph-preflight-runner.ts src/core/__tests__/runtime-graph-preflight-runner.test.ts`
- `bunx eslint src/core/runtime.ts src/core/runtime/graph-preflight-runner.ts src/core/__tests__/runtime-graph-preflight-runner.test.ts`
- `bun run typecheck`
- `bun test ./src/core --timeout 120000`
- `git diff --check`
- `bun test --timeout 120000`

Result: new graph-preflight runner tests passed with 4 pass, 0 fail, 8 assertions; nearby runtime/kernel graph-preflight tests passed with 29 pass, 0 fail, 118 assertions; full `src/core` tests passed with 193 pass, 0 fail, 908 assertions; Biome passed; ESLint passed; typecheck passed; diff whitespace check passed; full suite passed with 810 pass, 8 skip, 0 fail, 4,568 assertions across 165 files.

Latest runtime session-binding extraction verification:

- `bun test ./src/core/__tests__/runtime-session-restore.test.ts ./src/core/__tests__/runtime-compact.test.ts --timeout 120000`
- `bun run cartographer:preflight -- --root . --live --path src/core/runtime/session-bindings.ts --json`
- `bun test ./src/core --timeout 120000`
- `bunx biome check src/core/runtime.ts src/core/runtime/session-bindings.ts src/core/__tests__/runtime-compact.test.ts src/core/__tests__/runtime-session-restore.test.ts .garden/master-refactor-plan.md`
- `bunx eslint src/core/runtime.ts src/core/runtime/session-bindings.ts src/core/__tests__/runtime-compact.test.ts src/core/__tests__/runtime-session-restore.test.ts`
- `bun run typecheck`
- `bun run lint`
- `bun run lint:eslint`
- `bun run knip`
- `bun run fallow:audit:head`
- `git diff --check`
- `bun test --timeout 120000`

Result: focused session restore/compact tests passed with 8 pass, 0 fail, 79 assertions; clean-tree live preflight for `src/core/runtime/session-bindings.ts` at `ef973020be11cb5985d9dc27b32f4ae2a19e8ffe` reported 648 files, 4,512 nodes, 9,715 edges, 0 findings, 27 slice nodes, 48 slice edges, 29 impact nodes, 46 impact edges, and 372 ms total preflight time; full `src/core` tests passed with 203 pass, 0 fail, 972 assertions; Biome, ESLint, typecheck, Knip, and diff whitespace check passed; Fallow audit passed with 0 newly introduced dead code, complexity, or duplication; full suite passed with 826 pass, 8 skip, 0 fail, 4,993 assertions across 166 files.

Latest runtime workspace-turns extraction verification:

- commit: `d2895d6`
- `bun run typecheck`
- `bun test ./src/core/__tests__/runtime-session-restore.test.ts ./src/core/__tests__/runtime-compact.test.ts ./src/core/__tests__/runtime.test.ts --timeout 120000`
- `bun test ./src/core --timeout 120000`
- `bun run lint`
- `bun run lint:eslint`
- `bun run knip`
- `bun run fallow:audit:head`
- `git diff --check`
- `bun run cartographer:preflight -- --live --root . --path src/core/runtime/workspace-turns.ts`

Result: focused runtime/session tests passed with 30 pass, 0 fail, 158 assertions; full `src/core` tests passed with 206 pass, 0 fail, 979 assertions; Biome, ESLint, typecheck, Knip, Fallow, and diff whitespace checks passed; clean-tree live preflight for `src/core/runtime/workspace-turns.ts` reported 653 files, 4,543 nodes, 9,812 edges, 0 findings, 39 slice nodes, 63 slice edges, 29 impact nodes, 46 impact edges, and 429 ms total preflight time.

Latest broader Cartographer/runtime verification after the executed-command adoption gate:

- `bun test src/code-graph src/kernel/__tests__/turn-executor.test.ts src/core/__tests__/runtime.test.ts --timeout 120000`
- `bunx biome check src/code-graph src/kernel src/core/__tests__/runtime.test.ts`
- `bunx eslint src/code-graph src/kernel src/core/__tests__/runtime.test.ts`
- `bun run typecheck`
- `git diff --check`

Result: relevant broader checks passed; code graph plus runtime/kernel tests passed with 82 pass, 0 fail, 1,106 assertions; Biome passed; ESLint passed; typecheck passed; diff whitespace check passed. The commit hook for `4f3bdca` also passed Biome, ESLint, and typecheck.

Latest Cartographer validation-command verification after pasteable Bun path generation:

- `bun test ./src/code-graph/__tests__/builder.test.ts --timeout 120000`
- `bun test ./src/code-graph --timeout 120000`
- `bun test src/code-graph --timeout 120000`
- `bunx biome check src/code-graph/query.ts src/code-graph/__tests__/builder.test.ts src/code-graph/__tests__/preflight.test.ts src/code-graph/__tests__/commands.test.ts`
- `bunx eslint src/code-graph/query.ts src/code-graph/__tests__/builder.test.ts src/code-graph/__tests__/preflight.test.ts src/code-graph/__tests__/commands.test.ts`
- `bun run typecheck`

Result: exact generated builder command passed with 9 pass, 0 fail, 85 assertions; exact generated module command passed with 54 pass, 0 fail, 989 assertions; full code-graph suite passed with 54 pass, 0 fail, 989 assertions; Biome, ESLint, and typecheck passed. Live preflight for `src/code-graph/builder.ts` and `src/code-graph/types.ts` emits focused and module validation commands with exact Bun path arguments such as `bun test ./src/code-graph/__tests__/builder.test.ts` and `bun test ./src/code-graph`.

Latest package-selector CLI regression verification:

- `bun test ./src/code-graph/__tests__/commands.test.ts --timeout 120000`
- `bun test ./src/code-graph --timeout 120000`
- `bunx biome check src/code-graph/query.ts src/code-graph/__tests__/builder.test.ts src/code-graph/__tests__/commands.test.ts docs/evals/cartographer-code-graph-completion-audit.md`
- `bunx eslint src/code-graph/query.ts src/code-graph/__tests__/builder.test.ts src/code-graph/__tests__/commands.test.ts`
- `bun run typecheck`
- `git diff --check`

Result: command tests passed with 24 pass, 0 fail, 1,102 assertions; full code-graph suite passed with 61 pass, 0 fail, 1,353 assertions; Biome passed after formatting the new test; ESLint, typecheck, and diff whitespace check passed. The new CLI regression covers both `cartographer slice --selector package:apps/web --json` and `cartographer slice --selector package:@fixture/web --json`, and asserts that the prefix sibling package `apps/web-admin` is excluded from nodes and affected-package summaries.

Focused combined test result:

- 104 pass
- 1 skipped live Codex test
- 0 fail
- 1,213 assertions

Full repository test result:

- 796 pass
- 8 skipped
- 0 fail
- 4,527 assertions

Latest non-eval Harness worker-workspaces extraction verification:

- `bun run lint` - pass
- `bun run lint:eslint` - pass
- `bun run typecheck` - pass
- `bun run knip` - pass
- `bun run fallow:audit:head` - pass, with new-only attribution at 0 introduced dead code, 0 introduced complexity, and 0 introduced duplication
- `bun test src/core/__tests__/harness-worker-artifacts.test.ts src/core/__tests__/worker-runs.test.ts src/core/__tests__/runtime.test.ts --timeout 120000` - 58 pass, 0 fail, 320 assertions
- `bun test --timeout 120000` - 796 pass, 8 skip, 0 fail, 4,527 assertions
- `git diff --check` - pass

Live Codex adapter result:

- Command: `LIVE_CODEX_E2E=1 bun test src/adapters/codex/__tests__/runner-live.test.ts --timeout 120000`
- 1 pass
- 0 fail
- 5 assertions
- 5.31s wall time
- Scope: proves this machine can run a real Codex app-server adapter turn; does not yet prove Cartographer graph-command adoption.
- Trace capture: the same test can write raw events with `CODEX_E2E_TRACE_OUT=/tmp/codex-runtime-events.json`; graph-prompted research can set `CODEX_E2E_PROMPT`, `CODEX_E2E_EXPECT_TEXT`, and `CODEX_E2E_CWD`.

Live Codex workspace checkpoint harness result:

- Command: `LIVE_WORKSPACE_HARNESS_E2E=1 LIVE_WORKSPACE_CASES=codex bun run scripts/live-workspace-checkpoint-harnesses.ts`
- Report: `docs/reports/workspace-checkpoint-2026-05-11T10-31-47-611Z.json`
- Result: `codex` passed
- Evidence: two live turns, workspace post snapshots, a two-file diff, checkpoint revert, and 1 expired adapter session
- Scope: proves Codex workspace snapshot/diff/revert durability; does not yet prove Cartographer graph-command adoption.

Live Codex graph-prompted adoption trace:

- Command: `LIVE_CODEX_E2E=1 CODEX_E2E_CWD=/Users/saint/Dev/agent-runtime-kernel CODEX_E2E_EXPECT_TEXT=CODEX_GRAPH_OK CODEX_E2E_TRACE_OUT=/tmp/ark-codex-cartographer-adoption-trace.json CODEX_E2E_PROMPT=... bun test src/adapters/codex/__tests__/runner-live.test.ts --timeout 120000`
- Result: 1 pass, 0 fail, 5 assertions, 13.69s wall time
- Summary command: `bun run cartographer:adoption -- --trace /tmp/ark-codex-cartographer-adoption-trace.json --json`
- Adoption summary: `adopted: true`; first graph command was `bun run cartographer:preflight -- --root . --live --path src/code-graph/commands.ts`; `eventCount: 9`; `traceDurationMs: 1855`; `firstGraphCommandOffsetMs: 139`; `toolCommandCount: 1`; `sourceReadBeforeGraphCount: 0`
- Scope: proves one graph-prompted live Codex turn can use Cartographer before direct source reads; does not prove adoption rate, baseline comparison, or codebase-understanding quality.

Live Codex baseline-direct contrast trace:

- Command: `LIVE_CODEX_E2E=1 CODEX_E2E_CWD=/Users/saint/Dev/agent-runtime-kernel CODEX_E2E_EXPECT_TEXT=CODEX_BASELINE_OK CODEX_E2E_TRACE_OUT=/tmp/ark-codex-cartographer-baseline-trace.json CODEX_E2E_PROMPT=... bun test src/adapters/codex/__tests__/runner-live.test.ts --timeout 120000`
- Result: 1 pass, 0 fail, 5 assertions, 32.90s wall time
- Summary command: `bun run cartographer:adoption -- --trace /tmp/ark-codex-cartographer-baseline-trace.json --json`
- Adoption summary: `adopted: false`; `eventCount: 205`; `traceDurationMs: 22517`; `toolCommandCount: 10`; `sourceReadBeforeGraphCount: 2`; `firstSourceReadBeforeGraphOffsetMs: 14775`
- Scope: provides one manual contrast trace where Codex inspected source without graph context; does not establish a baseline distribution.

Live Codex graph-first understanding trace:

- Command: `LIVE_CODEX_E2E=1 CODEX_E2E_CWD=/Users/saint/Dev/agent-runtime-kernel CODEX_E2E_EXPECT_TEXT=CODEX_UNDERSTANDING_OK CODEX_E2E_TRACE_OUT=/tmp/ark-codex-cartographer-understanding-trace.json CODEX_E2E_PROMPT=... bun test src/adapters/codex/__tests__/runner-live.test.ts --timeout 120000`
- Result: 1 pass, 0 fail, 5 assertions, 37.70s wall time
- Summary command: `bun run cartographer:adoption -- --trace /tmp/ark-codex-cartographer-understanding-trace.json --json --require-graph-first --expect-text CODEX_UNDERSTANDING_OK --expect-path src/code-graph/adoption.ts --expect-command "bun test"`
- Adoption summary: `adopted: true`; `eventCount: 200`; `traceDurationMs: 24630`; first graph command was `bun run cartographer:preflight -- --root . --live --path src/code-graph/adoption.ts`; `firstGraphCommandOffsetMs: 6735`; `toolCommandCount: 5`; `graphPreflightFailureCount: 0`; `sourceReadBeforeGraphCount: 0`
- Final answer evidence: final-response expectation passed; Codex named `src/code-graph/adoption.ts`, validation command `bun test`, and marker `CODEX_UNDERSTANDING_OK`.
- Scope: proves one graph-first live Codex turn can use preflight context for a simple codebase-understanding answer; does not establish adoption rate, recall, precision, or quality lift.

Live Codex paired builder-flow traces:

- Graph-first command: `LIVE_CODEX_E2E=1 CODEX_E2E_CWD=/Users/saint/Dev/agent-runtime-kernel CODEX_E2E_EXPECT_TEXT=CODEX_BUILDER_OK CODEX_E2E_TRACE_OUT=/tmp/ark-codex-cartographer-builder-trace.json CODEX_E2E_PROMPT=... bun test src/adapters/codex/__tests__/runner-live.test.ts --timeout 120000`
- Graph-first result: 1 pass, 0 fail, 5 assertions, 46.67s wall time
- Graph-first adoption summary: `adopted: true`; graph-first gate passed; `eventCount: 292`; `traceDurationMs: 34486`; first graph command was `bun run cartographer:preflight -- --root . --live --path src/code-graph/builder.ts`; `firstGraphCommandOffsetMs: 1336`; `toolCommandCount: 9`; `graphPreflightFailureCount: 0`; `sourceReadBeforeGraphCount: 0`
- Baseline-direct command: `LIVE_CODEX_E2E=1 CODEX_E2E_CWD=/Users/saint/Dev/agent-runtime-kernel CODEX_E2E_EXPECT_TEXT=CODEX_BUILDER_BASELINE_OK CODEX_E2E_TRACE_OUT=/tmp/ark-codex-cartographer-builder-baseline-trace.json CODEX_E2E_PROMPT=... bun test src/adapters/codex/__tests__/runner-live.test.ts --timeout 120000`
- Baseline-direct result: 1 pass, 0 fail, 5 assertions, 105.37s wall time
- Baseline-direct adoption summary: `adopted: false`; `eventCount: 269`; `traceDurationMs: 94959`; `toolCommandCount: 38`; `sourceReadBeforeGraphCount: 35`; first source read before graph was `rg --files .`; `firstSourceReadBeforeGraphOffsetMs: 2375`
- Final answer evidence: both traces passed expected marker, expected paths `src/code-graph/builder.ts`, `src/code-graph/extractors.ts`, `src/code-graph/graph-store.ts`, and expected command `bun test src/code-graph/__tests__/builder.test.ts`; both traces actually ran the expected builder test.
- Scope: provides same-task manual contrast for runner design; does not establish a repeatable distribution or quality lift.

Live Codex graph-first facade-test trace:

- Command: `LIVE_CODEX_E2E=1 CODEX_E2E_CWD=/Users/saint/Dev/agent-runtime-kernel CODEX_E2E_EXPECT_TEXT=CODEX_TOOLPACKS_OK CODEX_E2E_TRACE_OUT=/tmp/ark-codex-cartographer-tool-packs-trace.json CODEX_E2E_PROMPT=... bun test src/adapters/codex/__tests__/runner-live.test.ts --timeout 120000`
- Result: 1 pass, 0 fail, 5 assertions, 30.54s wall time
- Summary command: `bun run cartographer:adoption -- --trace /tmp/ark-codex-cartographer-tool-packs-trace.json --json --require-graph-first --expect-text CODEX_TOOLPACKS_OK --expect-path src/core/__tests__/harness-tool-packs.test.ts --expect-command "bun test src/core/__tests__/harness-tool-packs.test.ts" --expect-executed-command "bun test src/core/__tests__/harness-tool-packs.test.ts"`
- Adoption summary: `adopted: true`; graph-first gate passed; `eventCount: 212`; `traceDurationMs: 19113`; first graph command was `bun run cartographer:preflight -- --root . --live --path src/core/harness/tool-packs.ts --json`; `firstGraphCommandOffsetMs: 3299`; `toolCommandCount: 5`; `graphPreflightFailureCount: 0`; `sourceReadBeforeGraphCount: 0`
- Final answer evidence: final-response expectation passed; Codex named `src/core/__tests__/harness-tool-packs.test.ts`, named `bun test src/core/__tests__/harness-tool-packs.test.ts`, and actually ran that focused command.
- Scope: proves one graph-first live Codex turn can use the newly inferred facade-test edge to navigate from `src/core/harness/tool-packs.ts` to its focused harness test; does not establish adoption rate, recall, precision, or quality lift.

Live Codex graph-first runtime graph-preflight runner trace:

- Command: `LIVE_CODEX_E2E=1 CODEX_E2E_CWD=/Users/saint/Dev/agent-runtime-kernel CODEX_E2E_EXPECT_TEXT=CODEX_GRAPH_PREFLIGHT_RUNNER_OK CODEX_E2E_TRACE_OUT=/tmp/ark-codex-runtime-graph-preflight-runner-trace.json CODEX_E2E_PROMPT=... bun test src/adapters/codex/__tests__/runner-live.test.ts --timeout 120000`
- Result: 1 pass, 0 fail, 5 assertions, 27.27s wall time
- Summary command: `bun run cartographer:adoption -- --trace /tmp/ark-codex-runtime-graph-preflight-runner-trace.json --json --require-graph-first --expect-text CODEX_GRAPH_PREFLIGHT_RUNNER_OK --expect-path src/core/runtime/graph-preflight-runner.ts --expect-path src/core/__tests__/runtime-graph-preflight-runner.test.ts --expect-command "bun test ./src/core/__tests__/runtime-graph-preflight-runner.test.ts --timeout 120000" --expect-executed-command "bun test ./src/core/__tests__/runtime-graph-preflight-runner.test.ts --timeout 120000"`
- Adoption summary: `adopted: true`; graph-first gate passed; `eventCount: 231`; `traceDurationMs: 13222`; first graph command was `bun run cartographer:preflight -- --root . --live --path src/core/runtime/graph-preflight-runner.ts --json`; `firstGraphCommandOffsetMs: 6724`; `graphPreflightResultCount: 1`; `firstGraphPreflightResultOffsetMs: 7169`; `toolCommandCount: 4`; `graphPreflightFailureCount: 0`; `sourceReadBeforeGraphCount: 0`
- Final answer evidence: final-response expectation passed; Codex named `src/core/runtime/graph-preflight-runner.ts`, named `src/core/__tests__/runtime-graph-preflight-runner.test.ts`, named `bun test ./src/core/__tests__/runtime-graph-preflight-runner.test.ts --timeout 120000`, and actually ran that focused command.
- Scope: proves one graph-first live Codex turn can navigate the newly committed runtime graph-preflight runner boundary and execute the focused runner test; does not establish adoption rate, recall, precision, or quality lift.

Existing measured local Cartographer timings:

| Command | Result |
| --- | --- |
| `bun run cartographer:index -- --root . --out docs/codegraph` | 0.31s wall time, 220 MB max RSS |
| `bun run cartographer:view -- --out docs/codegraph` | 0.10s wall time |
| `bun run cartographer:slice -- --out docs/codegraph --selector path:src/code-graph/builder.ts` | 0.09s wall time |
| `bun run cartographer:impact -- --out docs/codegraph --path src/code-graph/builder.ts` | 0.10s wall time |
| `bun run src/cli/index.ts cartographer context --live --root . --path src/code-graph/commands.ts --depth 1 --json` | 0.31s wall time, 183 MB max RSS; live graph build plus context JSON |
| `bun run src/cli/index.ts cartographer context --live --root . --path src/code-graph/commands.ts --depth 1 --compact --json` | 0.32s wall time, 185 MB max RSS; live graph build plus summary/totals-only context JSON |

Machine-readable graph context evidence:

- `cartographer preflight --path <target>` is covered by `src/code-graph/__tests__/commands.test.ts` as the default graph-first preflight path for harness consumers.
- `runCartographerPreflight` is covered by `src/code-graph/__tests__/preflight.test.ts` for live graph builds, persisted graph artifact reads, compact summary/totals output, validation-command exposure, prompt rendering, live/offline command evidence, and structured failure context.
- `cartographer context --json`, `cartographer slice --json`, and `cartographer impact --json` are covered by the same test for nested scoring payloads and secondary direct graph queries.
- `cartographer adoption --trace <runtime-events.json> --json` is covered by the same test as the manual trace-summary path for graph-command adoption research, including shell-wrapped repo source reads, skill-instruction read exclusions, and structured preflight failure summaries for distinguishing non-adoption from graph-unavailable runs. `--require-graph-first` is covered as a strict manual gate for graph-mandated traces and now emits `graphFirstAdoption` in JSON output. Repeatable `--expect-text`, `--expect-path`, `--expect-command`, and `--expect-executed-command` flags are covered as manual expectation checks for codebase-understanding traces. `finalResponseExpectation.metrics` summarizes expected/hit counts for deterministic scoring. Expected-path evidence now distinguishes final-response mention, tool-command mention, and direct source-read mention; expected-command evidence distinguishes final-response mention from tool-command presence; executed-command evidence requires that the trace actually ran the command.
- `graphPreflight: { path }` on a turn is covered by `src/core/__tests__/runtime.test.ts` and `src/kernel/__tests__/turn-executor.test.ts`; the tests prove runtime preflight preparation, prompt injection, synthetic graph-command events, adoption-classifier compatibility, required preflight failure before executor start, optional preflight skip on missing persisted graph artifacts, and streamed `graphPreflight` error details for future eval triage.
- The tests run the real CLI process, parse stdout as JSON, and assert package/script context plus command metadata is present for harness consumers.
- `GraphSlice.summary.affectedPackages` ranks owning packages; `GraphSlice.summary.validationCommands` exposes package id, script id, script name, raw package-script body as `command`, root-executable command as `runCommand`, and source `package.json` path, including focused commands such as `bun test ./src/core/__tests__/harness-tool-packs.test.ts` when a focused `TESTS` edge and compatible package test script are present. It also emits module-level Bun test commands such as `bun test ./src/code-graph` or `bun test ./src/core` for selected source modules, and direct tests for bounded impacted dependents. Focused and module path arguments use exact Bun path syntax with `./` so commands under `tests/e2e` are pasteable paths rather than substring filters. Top-level context summaries prioritize focused and module-level validation commands before broad package scripts so agents and eval runners see the narrowest useful commands first, while package scripts now surface pasteable Bun invocations such as `bun run typecheck` and `cd apps/web && bun run typecheck` without losing raw script bodies.
- Full `cartographer context --json` wraps `manifest`, compact `summary`, `slice`, and `impact` into one scoring payload when nested graph detail is required.

Axia OS read-only stress timing:

| Command | Result |
| --- | --- |
| `bun run cartographer:index -- --root /Users/saint/dev/axia-os --out /tmp/ark-axia-codegraph` | 0.50s wall time, 310 MB max RSS, 1,106 files, 5,093 nodes, 12,261 edges, 0 findings |

Axia stress evidence now captured as eval targets:

- `GENERATED_BY` edges: 1, linking `apps/api/src/types/database.types.ts` to root `db:types`
- `TESTS` edges: 400 in the fresh Axia graph
- app-to-data edges: 228 `SERVICE_QUERIES_TABLE` and 9 `SERVICE_CALLS_RPC`
- table-to-table SQL reference edges: 88 `TABLE_REFERENCES_TABLE`
- bounded DB impact probe: `dbtable:public.agent_runs --depth 1` returns 38 nodes and 60 edges with owner/ancestor validation scripts and safe DB schema/type/status scripts, versus 431 nodes and 1,310 edges unbounded
- combined Axia context probe: `dbtable:public.agent_runs --depth 1 --json` returns a 48-node/111-edge selected slice and 38-node/60-edge impact view with `package:apps/api` ranked first and root ranked second
- slice precision needs explicit measurement on chat/workbench tasks

Manual graph contract evidence:

| Snapshot | Result |
| --- | --- |
| ARK current `/tmp` graph | schema valid; 612 files; 4,046 nodes; 9,408 edges; 629 `TESTS`; 0 `GENERATED_BY`; 0 `SERVICE_QUERIES_TABLE`; 0 `SERVICE_CALLS_RPC`; 37 `TABLE_REFERENCES_TABLE`; duplicate node IDs 0; duplicate edge IDs 0; dangling edges 0; ignored-path contamination 0; env-var metadata payloads 0; missing evidence 0 |
| Axia fresh `/tmp` graph | schema valid; 1,106 files; 5,093 nodes; 12,261 edges; 400 `TESTS`; 1 `GENERATED_BY`; 228 `SERVICE_QUERIES_TABLE`; 9 `SERVICE_CALLS_RPC`; 88 `TABLE_REFERENCES_TABLE`; duplicate node IDs 0; duplicate edge IDs 0; dangling edges 0; ignored-path contamination 0; env-var metadata payloads 0; missing evidence 0 |

## Why This Is Not Complete

The current artifacts define the eval system and record baseline evidence, but they do not yet execute Cartographer evals. The active objective asks to strengthen the tool with evals and Codex-style harness workflows. That requires code and reports, not only a plan.

Missing implementation:

- `scripts/cartographer-code-graph-evals.ts`
- `eval:cartographer`, `eval:cartographer:smoke`, `eval:cartographer:baseline`, and optional `eval:cartographer:codex` package scripts
- fixture repo snapshots and gold task definitions
- conversion of `.evals/research/cartographer-gold-task-candidates.md` into executable fixture/task records
- generated reports under `docs/reports`
- repeatable live Codex graph-adoption profile runs with persisted reports and baseline-vs-graph comparisons

Latest audit command:

```bash
bun -e 'const pkg = await Bun.file("package.json").json(); for (const entry of [["approval", await Bun.file(".evals/approval.md").exists() ? "present" : "missing"], ["runner", await Bun.file("scripts/cartographer-code-graph-evals.ts").exists() ? "present" : "missing"], ["eval:cartographer", pkg.scripts?.["eval:cartographer"] ?? "missing"], ["eval:cartographer:smoke", pkg.scripts?.["eval:cartographer:smoke"] ?? "missing"], ["eval:cartographer:baseline", pkg.scripts?.["eval:cartographer:baseline"] ?? "missing"], ["eval:cartographer:codex", pkg.scripts?.["eval:cartographer:codex"] ?? "missing"]]) console.log(`${entry[0]}=${entry[1]}`);'
find docs/reports -maxdepth 1 -name 'cartographer-code-graph-*.json' -print
```

Observed result:

- `.evals/approval.md` is absent.
- `scripts/cartographer-code-graph-evals.ts` is absent.
- `eval:cartographer:*` scripts are absent from `package.json`.
- `docs/reports/workspace-checkpoint-2026-05-11T10-31-47-611Z.json` exists and is a workspace checkpoint report, not a Cartographer eval report.
- There are no `docs/reports/cartographer-code-graph-*.json` reports.
- Runtime workspace-turns extraction is committed and verified, but it is substrate cleanup only; it does not create a Cartographer eval report or adoption-rate profile.
- Graph-adoption has a deterministic classifier, manual trace CLI, strict `--require-graph-first` gate, repeatable final-response expectation checks, executed-command expectation checks, aggregate expectation metrics, expected-path evidence for tool/source-read navigation, expected-command evidence for validation recommendation versus execution, shell-wrapped source-read handling, skill-instruction read exclusions, preflight-result timing summaries, preflight-failure triage, one `/tmp` graph-prompted live Codex trace, one `/tmp` graph-first understanding trace, one `/tmp` graph-first facade-test trace, one `/tmp` graph-first runtime graph-preflight runner trace, one paired `/tmp` builder-flow graph-first/baseline-direct contrast, and one earlier `/tmp` baseline-direct live Codex trace, but no generated Cartographer eval report or adoption-rate profile.

## Approval Gate

The `$evals` workflow requires explicit approval before scaffolding the runner, package scripts, judge prompts, calibration files, or generated reports.

Approval language examples:

```text
approve
ship it
yes scaffold it
go
```

After approval, the next concrete implementation step is to scaffold the deterministic smoke runner and fixture definitions before adding live Codex or judge profiles.
