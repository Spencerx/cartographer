# Cartographer Code Graph Plan Integrity Audit

Status: plan audited, runner still blocked on approval
Date: 2026-05-11

## Synthesis

The Cartographer eval plan is trustworthy as a plan, but not yet valid as eval evidence. It is grounded in real traces, names the Goodhart traps, separates deterministic checks from live Codex and judge work, and now defines the Codex annotation run contract as a graph-first, evidence-read, candidate-only, audit-before-review workflow. The single most important fix is still to approve and implement the deterministic smoke runner so the plan can produce append-only JSON reports.

This audit does not approve or scaffold:

- `scripts/cartographer-code-graph-evals.ts`
- `eval:cartographer:*` package scripts
- fixture snapshots
- judge prompts or calibration labels
- `docs/reports/cartographer-code-graph-*.json`

## Score

Pass: 21
Fail: 11
N/A: 6

Most failures are expected because this is a pre-implementation plan audit. They become real invalidators only if someone claims Cartographer eval coverage before the runner, reports, and calibration exist.

The score now includes the graph-quality addendum below. Those addendum passes mean the plan names the required controls; they do not mean a runner enforces them yet.

## Current Verification Snapshot

Last checked on 2026-05-11 against `a346b068ff997ddcb31df4af28f49428985b4976` with a clean worktree before this audit-doc refresh.

- `src/core/runtime.ts`
- `src/core/runtime/workspace-turns.ts`
- `src/core/runtime/turn-preparation.ts`
- `src/core/runtime/completion.ts`
- `docs/features/core.md`
- `.garden/master-refactor-plan.md`

The workspace-turn extraction moves runtime workspace lifecycle into `RuntimeWorkspaceTurns`. The turn-preparation extraction moves runtime/model/session selection, artifact materialization, graph preflight, and effective config shaping into `RuntimeTurnPreparation`. The completion extraction moves terminal claim completion, runtime event persistence, completed-session persistence, sink completion, and telemetry into `RuntimeCompletion`. These strengthen the harness substrate by making turn navigation easier, but they are not Cartographer eval scaffolding.

`package.json` still only exposes the existing `eval:scale*` scripts. The direct gate audit still reports no `.evals/approval.md`, no `scripts/cartographer-code-graph-evals.ts`, no `eval:cartographer:*` package scripts, and no `docs/reports/cartographer-code-graph-*.json` reports.

Recent live preflight for `src/core/runtime/completion.ts` passed with 656 files, 4,572 nodes, 9,886 edges, 0 findings, and 378 ms total preflight time in the pre-commit dirty worktree. Rerun this audit document's own preflight after edits when a fresh planning-doc timing receipt is needed.

## Structural Checks

| # | Check | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Suite has a written plan before code | pass | `docs/evals/cartographer-code-graph-eval-suites.md` exists and is marked `Status: plan pending implementation approval`. |
| 2 | Report shape matches ARK schema | fail | The plan lists the required ARK report fields, but no Cartographer runner or report exists to validate. |
| 3 | Reports land in `docs/reports` | fail | `find docs/reports -maxdepth 1 -name 'cartographer-code-graph-*.json' -print` returned no files. |
| 4 | Run IDs encode profile and iteration/timestamp | fail | Report paths are planned, but there is no generated `runId` to inspect. |
| 5 | Status vocabulary is fixed | fail | The runner handoff references ARK shape, but no Cartographer runner enforces `passed`, `failed`, `skipped`, or `informational`. |
| 6 | Package scripts exist for smoke and baseline | fail | `package.json` has no `eval:cartographer`, `eval:cartographer:smoke`, or `eval:cartographer:baseline` scripts. |

## Graph-Quality Addendum

| # | Check | Status | Evidence |
| --- | --- | --- | --- |
| G1 | Approval boundary is still intact | pass | Direct gate audit still reports no `.evals/approval.md`, no `scripts/cartographer-code-graph-evals.ts`, no `eval:cartographer:*` package scripts, and no `docs/reports/cartographer-code-graph-*.json` reports. |
| G2 | Parser, compiler, agent, and human provenance are separated | pass | `docs/evals/cartographer-code-graph-eval-suites.md` names `provenance-confidence-valid`; the handoff makes parser-lite or Tree-sitter facts claiming `compiler-backed`, and agent annotations claiming `deterministic`, hard failures. |
| G3 | Precision-provider receipts are required | pass | The eval plan and handoff require TypeScript, SCIP, or LSP provider receipts before claiming compiler-backed semantic edges, including stale/skipped fallback reasons. |
| G4 | Graph mode is explicit | pass | The handoff requires every graph sample to report `live`, `persisted`, or `fixture`; live mode is current-work evidence, persisted mode must cite snapshot commit/scanner version, and fixture mode must cite source paths and hashes. |
| G5 | Temporal, dirty, and deleted-path behavior is in scope | pass | The handoff adds dirty/deleted mode accuracy and temporal graph-diff recall for package/task graph evolution, migration history versus generated types, and safe IaC/resource drift evidence. |
| G6 | Codex annotation runs are constrained | pass | `docs/prds/cartographer-v2-code-graph.md` defines the Codex annotation run contract: graph preflight first, deterministic slice read, direct evidence reads, candidate-only writeback, explicit inference labels, and `cartographer annotations --json` before review. |
| G7 | Annotation usefulness cannot substitute for graph correctness | pass | `docs/evals/cartographer-code-graph-eval-suites.md` requires semantic overlay scoring to add evidence-backed guidance absent from the deterministic graph, and to include trace evidence that the annotator used graph preflight plus direct source reads before writeback. |

## Tier 1 Deterministic Checks

| # | Check | Status | Evidence |
| --- | --- | --- | --- |
| 7 | Tier 1 exists and does cheap checks | fail | Graph-contract and navigation checks are planned, but not runnable as a Cartographer eval suite. |
| 8 | Zero LLM calls in Tier 1 | pass | Smoke profile explicitly excludes live model calls by default. |
| 9 | Tier 1 failures block before Tier 2 | fail | No runner exists to enforce fail-fast ordering. |

## Tier 2 Judge Checks

| # | Check | Status | Evidence |
| --- | --- | --- | --- |
| 10 | Rubric is binary decomposed | pass | Semantic overlay rubric is listed as binary checks, not a 1-5 scale. |
| 11 | Judge uses a different model family | pass | Judge requirements state the judge must use a different model family from the annotator. |
| 12 | Judge output is structured JSON | pass | Judge requirements state output must be structured JSON and schema-validated. |
| 13 | Full trace is passed to judge where trajectory matters | pass | Agent-harness scoring stores raw `RuntimeEvent[]` evidence; semantic-overlay judging sees graph slice, candidate annotations, and gold records. |
| 14 | Pairwise comparisons swap order and average | n/a | The current semantic-overlay plan is not pairwise. |
| 15 | Calibration gold set exists | fail | The plan requires calibration, but no gold labels or calibration records exist. |
| 16 | Judge-human agreement is documented above threshold | fail | No judge prompt, calibration run, Cohen's kappa, or agreement report exists. |

## Tier 3 Human Review

| # | Check | Status | Evidence |
| --- | --- | --- | --- |
| 17 | Human review cadence exists | fail | Human calibration is deferred; no cadence file or owner loop exists yet. |
| 18 | New failures feed back into Tier 1 or Tier 2 | fail | The plan describes eval evolution, but no runner/report/failure queue exists to close the loop. |

## Integrity Invalidators

| # | Check | Status | Evidence |
| --- | --- | --- | --- |
| 19 | No easier flag is used for safety or scale claims | pass | The plan separates deterministic smoke, baseline, and opt-in live Codex profiles. |
| 20 | Mandatory live suites are not silently skipped | n/a | Live Codex is explicitly opt-in, not mandatory smoke coverage. |
| 21 | Safety checks are not downgraded to informational | pass | The plan says hallucinated paths are failures and graph-mandated violations fail. |
| 22 | Sample counts and concurrency match documented defaults | pass | Smoke and baseline sample ranges are documented; no runner can weaken them yet. |
| 23 | Image changes are scoped in the claim | n/a | Cartographer eval plan is local graph/navigation first, not container-image performance. |
| 24 | Reports are not manually edited | n/a | No Cartographer reports exist. |
| 25 | Failed, slow, and retried samples are recorded | pass | Goodhart controls explicitly ban hiding failed, slow, or retried samples. |
| 26 | Production code does not special-case eval labels or run IDs | pass | `rg` found Cartographer eval markers only in tests/docs/research; the only production `ark.eval` usage is the existing scale runner metadata in `scripts/ark-scale-evals.ts`. |
| 27 | Optimization does not weaken production behavior in same PR | n/a | Current work is plan/audit work, not a Cartographer optimization claim. |
| 28 | Claims do not rely on stubbed provider metrics | pass | Plan separates local graph timings from live Codex/model/provider latency. |

## Lifecycle And Saturation Checks

| # | Check | Status | Evidence |
| --- | --- | --- | --- |
| 29 | Pass rate is not saturated at 100% | n/a | No Cartographer eval report exists yet. |
| 30 | Suite changes over time | pass | The plan and audit docs have changed across recent commits as new trace evidence landed. |
| 31 | Single-signal optimization risk is addressed | pass | Plan scores recall, precision, hallucinated paths, slice size, adoption, validation recall, timings, and Goodhart controls together. |

## Hard Findings

- HARD GAP: There is no runnable Cartographer eval suite. A plan cannot support a claim that Cartographer evals pass.
- HARD GAP: There are no Cartographer eval reports under `docs/reports`, so there is no append-only receipt for graph speed, navigation recall, or adoption-rate claims.
- HARD GAP: Semantic-overlay judging is correctly deferred, but any usefulness claim about annotations remains unsupported until gold labels, judge prompts, and agreement metrics exist.
- HARD GAP: Provenance, precision-provider, graph-mode, and temporal-diff controls are now planned, but there is no runner enforcement or report evidence for them.
- HARD GAP: The Codex annotation contract is documented, but there is no repeatable harness report proving agents followed graph preflight, direct evidence reads, candidate-only writeback, and audit-before-review across samples.
- HARD GAP: Runtime workspace-turn extraction improves codebase navigability for harness work, but it does not produce speed, adoption, or understanding reports.

## Anti-Pattern Findings

- No mock-echo pattern found in the plan. The smoke runner is planned to call real graph APIs, not assert on mocked outputs.
- No numeric rubric found for semantic overlay scoring. The rubric is binary decomposed.
- No same-family judge usage found. The plan requires a different model family.
- No trace-opaque agent scoring found. The plan requires raw trajectory evidence.
- No single-signal optimization found. The plan explicitly rejects edge-count-only and final-answer-only scoring.

## Current Gate

The approval gate remains valid. The next implementation step is to approve the deterministic smoke runner, then create the runner, package scripts, structured smoke tasks, and first JSON report. Until that approval exists, planning/audit work can continue, but no eval runner, fixture snapshots, judge prompt, package scripts, approval receipt, or Cartographer eval report should be scaffolded.
