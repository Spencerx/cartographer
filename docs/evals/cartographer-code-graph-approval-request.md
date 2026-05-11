# Cartographer Code Graph Eval Approval Request

Status: awaiting explicit approval
Date: 2026-05-11

This is the approval request for the next `$evals` step. It is not approval by itself and it does not scaffold the runner.

## Decision Summary

TL;DR: approve a deterministic smoke runner that turns the existing Cartographer graph contract, navigation-slice checks, and trace-adoption classifiers into append-only JSON reports. This first batch will measure local graph correctness, focused validation-command recall, preflight context quality, and enough trajectory evidence to avoid mistaking graph-command adoption for codebase understanding. It will not make model-quality or live Codex lift claims.

Clarified scope: the first runner scores the deterministic graph with semantic overlays disabled or treated as informational. Tree-sitter-style syntax, package/task, IaC/data, git, and precision-provider facts are the base layer; Codex/OpenRouter/human annotations remain reviewable overlay guidance and cannot rescue missing deterministic graph recall.

Tier breakdown:

- Tier 1 deterministic: graph contract checks, preflight/context shape checks, focused validation-command recall, no hallucinated paths, and smoke task recall for `CG-SMOKE-001` and `CG-SMOKE-002`.
- Tier 2 judge: deferred. Semantic-overlay scoring needs human calibration before it is trusted.
- Tier 3 human review: deferred to the calibration/gold-label batch after the deterministic smoke report exists.

Cost profile:

- Smoke runner: local Bun process only, no model calls, expected to finish in minutes.
- Baseline runner: package-script wrapper can exist, but should initially run deterministic checks only until more fixture/task records are approved.
- Live Codex: opt-in only, provider and host dependent, no default smoke usage.
- Calibration: not part of this batch; future semantic-overlay scoring needs 20-50 human-labeled examples and agreement tracking.

Goodhart shield:

- Do not optimize edge count alone; score recall, precision, hallucinated paths, and slice size together.
- Do not count final-answer validation advice as executed validation; use `--expect-executed-command` or the equivalent trace classifier evidence.
- Do not treat graph-command adoption as understanding. A run that uses the graph but edits the wrong module, drops an earlier correct package hypothesis, or skips required validation must fail the relevant understanding check.
- Do not import public benchmark speed, cost, or quality numbers into Cartographer success claims unless the same benchmark is rerun locally with pinned model, host, prompt, and report metadata.
- Do not compare live Codex runs across hosts, credentials, prompts, models, or runner versions without labeling them non-comparable.
- Do not claim codebase-understanding lift until repeated baseline-vs-graph distributions exist.

## Approval Evidence Snapshot

This is the decision baseline for approving the first deterministic smoke runner. Historical traces remain useful research, but these are the pinned numbers for the current approval ask.

| Item | Current evidence |
| --- | --- |
| ARK package-dependency evidence baseline | `79af608` (`feat: link workspace package dependencies`) |
| ARK durable-harness evidence baseline | `e58c4bc` (`refactor: extract runtime session bindings`) plus `ef97302` (`docs: record runtime session binding audit`) |
| ARK runtime navigability baseline | Runtime helper extraction now reaches `a346b06` (`refactor: extract runtime completion`): `runtime.ts` is 897 lines, `runtime/completion.ts` is 271 lines, and the focused runtime completion/session tests plus full `src/core` suite pass. |
| ARK kernel graph-preflight baseline | The current docs refresh includes `src/kernel/graph-preflight-events.ts`, which isolates prompt append and synthetic graph event wrapping from `KernelTurnExecutor`; focused kernel/runtime graph-preflight tests pass with 31 pass, 0 fail, 124 assertions. |
| ARK annotation-boundary baseline | Annotation review hardening now reaches `afac872` (`fix: drop unanchored OpenRouter annotations`) after `aab00c5` (`fix: require annotation target evidence anchors`): generated and hand-written notes must cite evidence anchored to the target node. |
| ARK graph-quality planning baseline | Planning and audit receipts are tracked in the graph-quality docs commits on 2026-05-11, including the master refactor plan, provenance model, live-mode docs, runner handoff, plan-integrity audit, completion audit, and this approval request. Use `git log --oneline -- docs/evals .evals/research .garden/master-refactor-plan.md` for the exact latest receipt commit rather than editing this table after every receipt refresh. |
| ARK current worktree state | Before scaffolding or source movement, verify `git status --short --branch` directly. This approval request intentionally does not chase live commit hashes or preflight timings because that makes the document self-invalidating after every receipt commit. No runner, package scripts, fixture snapshots, or reports have been scaffolded for this approval request. |
| ARK prior clean worktree baseline | Clean at `a346b068ff997ddcb31df4af28f49428985b4976` with `git status --short --branch --untracked-files=all` reporting `main...origin/main` and no modified or untracked files before this docs refresh. |
| ARK live preflight baseline | `bun run cartographer:preflight -- --root . --live --path src/core/runtime/session-bindings.ts --json`: 648 files, 4,512 nodes, 9,715 edges, 0 findings; 27 slice nodes, 48 slice edges, 29 impact nodes, 46 impact edges; 372 ms total, 357 ms graph load, 13 ms context build, 2 ms prompt render |
| Current approval-request preflight | Re-run `bun run cartographer:preflight -- --root . --live --path docs/evals/cartographer-code-graph-approval-request.md --json` when a fresh timing receipt is needed. The tracked approval evidence requires 0 findings and a primary path matching this file; exact timing and dirty-state metadata are run-specific. |
| Current docs-audit preflight | Re-run `bun run cartographer:preflight -- --root . --live --path docs/evals/cartographer-code-graph-completion-audit.md --json` when a fresh timing receipt is needed. |
| Current plan-integrity preflight | Re-run `bun run cartographer:preflight -- --root . --live --path docs/evals/cartographer-code-graph-plan-integrity-audit.md --json` when a fresh timing receipt is needed. |
| Current handoff preflight | Re-run `bun run cartographer:preflight -- --root . --live --path .evals/research/cartographer-runner-implementation-handoff.md --json` when a fresh timing receipt is needed. |
| ARK validation-command baseline | Same preflight surfaced focused commands for `src/core/__tests__/runtime-session-restore.test.ts`, `src/core/__tests__/runtime-compact.test.ts`, `src/core/__tests__/runtime-session-fallback.test.ts`, API/e2e session coverage, module command `bun test ./src/core`, and root `bun run typecheck` |
| Axia read-only stress baseline | `/usr/bin/time -l bun run cartographer:index -- --root /Users/saint/dev/axia-os --out /tmp/ark-axia-codegraph-approval-snapshot`: dirty at `4a6ccfa`, 1,106 files, 5,093 nodes, 11,523 edges, 0 findings, 424 `TESTS`, 1 `GENERATED_BY`, 228 `SERVICE_QUERIES_TABLE`, 9 `SERVICE_CALLS_RPC`, 88 `TABLE_REFERENCES_TABLE`; 0.76s wall time, 309,837,824 bytes max RSS |
| First smoke candidates | `CG-SMOKE-001` and `CG-SMOKE-002` only, as defined in the runner handoff; deterministic local graph checks first |
| Explicit non-claims | No adoption-rate claim, no live Codex quality-lift claim, no calibrated semantic-overlay judge claim, and no deterministic Axia fixture claim until those profiles produce append-only reports |

## Current Evidence

- The eval plan exists in `docs/evals/cartographer-code-graph-eval-suites.md`.
- The completion audit exists in `docs/evals/cartographer-code-graph-completion-audit.md`.
- The plan-integrity audit exists in `docs/evals/cartographer-code-graph-plan-integrity-audit.md` and currently scores 21 pass, 11 fail, 6 n/a; the added passes are graph-quality and Codex annotation-contract plan controls, not runner evidence.
- Trace and stress research exists under `.evals/research/*cartographer*`.
- `cartographer preflight`, `context --json`, `slice --json`, `impact --json`, and `adoption --json` are implemented and tested.
- `cartographer annotations --live --root <repo>` can audit semantic overlay JSONL against an in-memory graph without requiring or writing `docs/codegraph/graph.json`, so agents can review notes on dirty worktrees before indexing.
- OpenRouter-generated candidate annotations now inherit current graph evidence hashes when the slice provides them, so later overlay audits can detect source drift without requiring humans to hand-stamp hashes. Provider notes that do not cite at least one evidence path for their target node are dropped before they enter the overlay.
- `cartographer annotations --accept <id> --reviewer <name>` promotes only audit-clean candidates to human-reviewed accepted notes, while `--retire <id>` can retire stale or unsafe notes with the same reviewer stamp.
- `TurnInput.graphPreflight` injects compact graph context before adapter execution and emits adoption-compatible runtime events.
- Runtime session binding state now lives behind `src/core/runtime/session-bindings.ts`, covering active kernel switching, active runtime/model restore, legacy/v2 adapter binding persistence, and compacted-session binding refresh for durable coding-agent harness turns.
- Manual Codex evidence exists: one graph-prompted trace, one graph-first understanding trace, one graph-first facade-test trace, one graph-first runtime graph-preflight runner trace, one paired graph-first/baseline-direct builder-flow contrast, and one baseline-direct trace.
- A new graph-first facade-test Codex trace validates the `__tests__` naming-convention edge path: Codex used `cartographer preflight` before source reads, surfaced `src/core/__tests__/harness-tool-packs.test.ts`, and ran `bun test src/core/__tests__/harness-tool-packs.test.ts`.
- A new graph-first runtime runner Codex trace validates the committed runtime graph-preflight boundary: Codex used `cartographer preflight` before source reads, surfaced `src/core/runtime/graph-preflight-runner.ts` and `src/core/__tests__/runtime-graph-preflight-runner.test.ts`, and ran `bun test ./src/core/__tests__/runtime-graph-preflight-runner.test.ts --timeout 120000`.
- Dirty-worktree preflight evidence exists in `.evals/research/cartographer-dirty-worktree-preflight.md`; it shows live graph context can include untracked in-progress source/test files and now derive pasteable focused commands such as `bun test ./src/core/__tests__/harness-policy-api.test.ts`.
- Harness preflight prompts now include a capped human-readable navigation brief before the JSON payload, with focused validation commands prioritized before broad package commands in both the prompt brief and the machine-readable preflight JSON, explicit context JSON truncation metadata, and a full-context follow-up command when truncation happens.
- Validation command summaries now preserve raw package-script bodies as `command` and expose pasteable root-run invocations as `runCommand`, so agents and eval runners can prefer `bun run typecheck` or `cd apps/web && bun run typecheck` without losing package metadata.
- Monorepo package graphs now emit local package-to-package `DEPENDS_ON` edges when a package depends on another package name in the same repo, including `workspace:*` references, so impact from a shared package can surface dependent app packages and their validation scripts.
- Preflight JSON now includes command/timestamp metadata and phase timings for graph load, context build, and prompt render work, so speed can be scored without scraping shell wall time.
- Adoption summaries now extract successful preflight result durations and phase timings from runtime traces, so live Codex reports can separate graph-load cost from model/tool exploration latency.
- Adoption expectation checks now separate final-answer validation-command mentions from actual validation execution with `--expect-executed-command`, so future reports can distinguish "agent recommended the test" from "agent ran the test."
- Cartographer now infers deterministic `TESTS` edges from conservative `__tests__` naming conventions, so facade-style tests such as `src/core/__tests__/harness-tool-packs.test.ts` surface for `src/core/harness/tool-packs.ts` even when the test imports the public harness facade instead of the private helper directly.
- Cartographer now keeps `import type` and `export type` relationships as `TYPE_IMPORTS` only, avoiding false runtime `IMPORTS` edges while preserving type-impact traversal.
- The runner handoff now includes a calibrated pre-approval smoke blueprint: hard checks for graph contract, provenance-confidence validity, precision-provider receipts, `CG-SMOKE-001` and `CG-SMOKE-002` focused/module validation recall, impacted-dependent test recall, graph-mode receipts for live/persisted/fixture samples, temporal graph-diff targets, and the facade-test preflight surface.
- The eval plan now includes the latest Exa research implications: CodeTracer-style trajectory evidence, Theory-of-Code-Space-style belief durability, stale-anchor/writeback trust checks, semantic-vs-parser graph provenance, scoped context tools, multi-repo and temporal graph pressure, and hook measurement as behavior evidence rather than assumption.
- The PRD/eval/feature docs now explicitly separate inventory, syntax, precision, repo-workflow, IaC/data, agent-inferred, and human-reviewed layers; call out parser-lite `syntax` provenance as distinct from Tree-sitter, TypeScript, SCIP, and LSP; require provider fallback receipts for precision graph inputs; and distinguish live graph mode from persisted graph mode.
- The latest Cartographer overlay-boundary docs commit, `77f1749`, records the current product contract: structural graph first, Codex-style semantic overlay second, deterministic navigation scoring before overlay-assisted scoring, and precision-edge/provider terminology instead of ambiguous "semantic-edge" wording. Later annotation hardening in `aab00c5` and `afac872` enforces the target-evidence anchor rule in the audit path and the OpenRouter provider path.
- Current command audit still confirms `scripts/cartographer-code-graph-evals.ts` is missing, `package.json` has no `eval:cartographer:*` scripts, and no `docs/reports/cartographer-code-graph-*.json` reports exist.
- Dirty-worktree preflight against the then-untracked Harness worker-workspaces extraction confirms live graph context can include in-progress source, report dirty-state metadata, surface relevant worker/harness tests, and expose phase timings without writing repo graph artifacts. That non-eval extraction has since landed in `370f992`.
- Dirty-worktree preflight against the then-untracked Runtime session-selection extraction confirms live graph context can orient on `src/core/runtime/session-selection.ts`, include its focused test `src/core/__tests__/runtime-session-selection.test.ts`, surface broader runtime/session/e2e impact tests, and preserve the graph-load/context-build/render timing split without writing repo graph artifacts. That non-eval extraction has since landed in `1ee67c6`.
- Clean-tree preflight against the landed Runtime session-binding extraction confirms live graph context can orient on `src/core/runtime/session-bindings.ts`, include restore/compact/session/fallback/API/e2e test paths, and preserve phase timings without writing repo graph artifacts.

Latest verification:

- Focused pre-runner harness dependency check: `bun test src/code-graph/__tests__/adoption.test.ts src/code-graph/__tests__/preflight.test.ts src/core/__tests__/runtime-graph-preflight-runner.test.ts src/kernel/__tests__/turn-executor.test.ts --timeout 120000` passed with 34 pass, 0 fail, 174 assertions across 4 files. This verifies the deterministic adoption classifier, graph preflight prompt/context generation, runtime graph-preflight request handling, and kernel preflight event injection that the future runner will depend on; it is not a generated Cartographer eval report.
- Focused adoption gate: `bun test src/code-graph/__tests__/adoption.test.ts src/code-graph/__tests__/commands.test.ts --timeout 120000` passed with 36 pass, 0 fail, 820 assertions.
- Monorepo package dependency and selector check: `bun test ./src/code-graph/__tests__/builder.test.ts --timeout 120000` passed with 11 pass, 0 fail, 98 assertions, including local workspace `DEPENDS_ON` impact behavior and package selector behavior that works by exact path or package name without pulling in prefix siblings.
- Package selector CLI regression: `bun test ./src/code-graph/__tests__/commands.test.ts --timeout 120000` passed with 24 pass, 0 fail, 1,102 assertions, including both `package:apps/web` and `package:@fixture/web` selectors excluding prefix sibling `apps/web-admin`.
- Current full graph suite: `bun test ./src/code-graph --timeout 120000` passed with 63 pass, 0 fail, 1,403 assertions.
- Current gate audit: `.evals/approval.md` is missing, `scripts/cartographer-code-graph-evals.ts` is missing, `package.json` has no `eval:cartographer:*` scripts, and `docs/reports/cartographer-code-graph-*.json` is empty.
- Current PRD live preflight after the overlay-boundary docs commit: `bun run cartographer:preflight -- --live --root . --path docs/prds/cartographer-v2-code-graph.md` passed with 0 findings and surfaced `docs/prds/cartographer-v2-code-graph.md` as the primary path. The point-in-time run reported 652 files, 4,536 nodes, 9,793 edges, and 411 ms total duration; rerun for fresh dirty-state metadata.
- Broader Cartographer/runtime check: `bun test src/code-graph src/kernel/__tests__/turn-executor.test.ts src/core/__tests__/runtime.test.ts --timeout 120000` passed with 82 pass, 0 fail, 1,106 assertions.
- Agent annotation hash-stamping check: `bun test ./src/code-graph/__tests__/openrouter.test.ts --timeout 120000` passed with 1 pass, 0 fail, 8 assertions; Biome and ESLint passed on the annotation normalizer.
- Command-surface check: `bun test ./src/code-graph/__tests__/commands.test.ts --timeout 120000` passed with 24 pass, 0 fail, 1,102 assertions, including package selector CLI isolation, accept, stale-evidence rejection, and retire paths.
- Live annotation audit check: `bun run cartographer:annotations -- --root . --live --json` passed without persisted `docs/codegraph/graph.json`.
- Runtime session-selection dirty-preflight follow-up: `bun test ./src/core/__tests__/runtime-session-selection.test.ts ./src/core/__tests__/runtime.test.ts --timeout 120000` passed with 28 pass, 0 fail, 93 assertions; Biome, ESLint, typecheck, and `git diff --check` passed afterward.
- Runtime session-binding extraction check: `bun test ./src/core/__tests__/runtime-session-restore.test.ts ./src/core/__tests__/runtime-compact.test.ts --timeout 120000` passed with 8 pass, 0 fail, 79 assertions; `bun test ./src/core --timeout 120000` passed with 203 pass, 0 fail, 972 assertions; full `bun test --timeout 120000` passed with 826 pass, 8 skip, 0 fail, 4,993 assertions.
- Runtime workspace-turns extraction check: `d2895d6` landed `src/core/runtime/workspace-turns.ts`; `bun run typecheck`, `bun test ./src/core --timeout 120000`, `bun run lint`, `bun run lint:eslint`, `bun run knip`, `bun run fallow:audit:head`, and `git diff --check` passed. Clean-tree live preflight for `src/core/runtime/workspace-turns.ts` reported 653 files, 4,543 nodes, 9,812 edges, 0 findings, 39 slice nodes, 63 slice edges, 29 impact nodes, 46 impact edges, and 429 ms total.
- Runtime turn-preparation extraction check: `e930763` landed `src/core/runtime/turn-preparation.ts`; it owns runtime/model/session selection, artifact materialization, graph preflight, and effective config shaping. This is harness substrate evidence, not runnable Cartographer eval scaffolding.
- Runtime completion extraction check: `a346b06` landed `src/core/runtime/completion.ts`; it owns terminal claim completion, active runtime persistence, completed-session persistence, terminal event persistence, sink completion, and turn telemetry. `runtime.ts` is 897 lines and `runtime/completion.ts` is 271 lines. Focused runtime completion/session tests passed with 50 pass, 0 fail, 271 assertions; `bun test ./src/core --timeout 120000` passed with 208 pass, 0 fail, 989 assertions; broad gates passed with `bun run typecheck`, `bun run lint`, `bun run lint:eslint`, `bun run knip`, `bun run fallow:audit:head`, and `git diff --check`.
- Kernel graph-preflight event extraction check: `src/kernel/graph-preflight-events.ts` now owns graph preflight prompt append and synthetic `cartographer.preflight` trace events before adapter events. `bun test src/kernel/__tests__/graph-preflight-events.test.ts src/kernel/__tests__/turn-executor.test.ts src/core/__tests__/runtime.test.ts --timeout 120000` passed with 31 pass, 0 fail, 124 assertions.
- OpenRouter target-evidence filter check: `afac872` landed provider-side rejection for unanchored annotation candidates. `bun test ./src/code-graph --timeout 120000` passed with 63 pass, 0 fail, 1,403 assertions, and focused OpenRouter coverage proves the provider drops notes that cite real slice evidence unrelated to the target node.
- Biome, ESLint, typecheck, and `git diff --check` passed on the touched surfaces.

## Current Code State

The non-eval Harness worker-workspaces extraction referenced by earlier dirty-preflight evidence has landed in `370f992` on `main`. The non-eval Runtime session-selection extraction has landed in `1ee67c6` on `main`. The non-eval Runtime session-binding extraction has landed in `e58c4bc` on `main`, with audit evidence refreshed in `ef97302`. The non-eval Runtime workspace-turns extraction has landed in `d2895d6` on `main`; it strengthens workspace lifecycle navigability for harness turns, but it is not runnable Cartographer eval scaffolding. The non-eval Runtime turn-preparation extraction landed in `e930763` and isolates per-turn runtime/model/session selection, artifact materialization, graph preflight, and effective config shaping. The non-eval Runtime completion extraction landed in `a346b06` and isolates terminal completion, session persistence, sink completion, and telemetry. The current kernel graph-preflight event extraction isolates prompt append and synthetic adoption events from `KernelTurnExecutor`. These runtime/kernel slices strengthen harness navigability, but they are not runnable Cartographer eval scaffolding. The non-eval graph-quality/provenance planning refresh has landed through `e5b1576` on `main`, and annotation evidence hardening has landed through `afac872`. The current blocker is still process approval for `$evals` scaffolding: the graph-preflight, durable-session, workspace-turn, turn-preparation, completion, kernel event-shaping, annotation-evidence, and provenance evidence strengthens the harness case, but it is not the runnable Cartographer eval suite.

## Remaining Gap

The objective is not complete because these artifacts do not exist yet:

- `scripts/cartographer-code-graph-evals.ts`
- `eval:cartographer:*` package scripts
- structured fixture and task records converted from `.evals/research/cartographer-gold-task-candidates.md`
- generated Cartographer eval JSON reports under `docs/reports`
- repeatable adoption-rate and baseline-vs-graph reports
- calibrated semantic-overlay judge prompt and gold labels

## Approval Requested

Approve the first implementation batch:

- Add `scripts/cartographer-code-graph-evals.ts`.
- Add `eval:cartographer`, `eval:cartographer:smoke`, and `eval:cartographer:baseline` package scripts.
- Implement a deterministic smoke profile first.
- Convert `CG-SMOKE-001` and `CG-SMOKE-002` into structured task records.
- Score deterministic graph recall, precision, validation-command recall, and hallucinated paths before any overlay-assisted usefulness metric.
- Persist stage summaries or trace references sufficient to distinguish useful exploration from correct action for any agent-harness profile.
- Emit the first smoke report under `docs/reports`.
- Update `docs/evals/cartographer-code-graph-completion-audit.md` with the report path and result.

## Explicitly Deferred

- Do not run live Codex evals from default smoke.
- Do not add semantic-overlay judge scoring until human calibration exists.
- Do not freeze Axia as a deterministic fixture yet; keep it as live stress evidence.
- Do not claim codebase-understanding lift until there is a repeated baseline-vs-graph distribution.

## Approval Language

Any of these is enough to proceed:

```text
approve
go
ship it
yes scaffold it
```

Without that explicit approval, the correct next state is still plan and audit only.
