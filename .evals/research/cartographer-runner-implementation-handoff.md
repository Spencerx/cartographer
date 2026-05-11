# Cartographer Eval Runner Implementation Handoff

Date: 2026-05-11
Status: implementation handoff, not scaffolded code

This note describes how to implement the Cartographer eval runner after explicit approval. It is based on the existing ARK scale runner (`scripts/ark-scale-evals.ts`) and the integrity policy in `docs/evals/eval-integrity.md`.

Do not treat this as approval to create the runner. The `$evals` gate still requires explicit approval before adding `scripts/cartographer-code-graph-evals.ts`, package scripts, fixture snapshots, judge prompts, or Cartographer eval reports.

The Exa refresh in `.evals/research/cartographer-exa-research-refresh.md` adds runner requirements: score edge-weighted impact precision, record hybrid graph/search fallback evidence, persist trajectory-level graph-adoption fields rather than only final answers, distinguish useful exploration from correct state-changing action, preserve belief-durability probes when present, track parser-vs-compiler provenance and precision-provider fallback receipts, score deterministic graph recall separately from semantic overlay usefulness, separate live graph mode from persisted graph mode, and keep external benchmark numbers out of Cartographer success claims unless rerun locally with pinned metadata.

## Target Files After Approval

```text
scripts/cartographer-code-graph-evals.ts
docs/evals/cartographer-code-graph-eval-suites.md
docs/reports/cartographer-code-graph-<profile>-<timestamp>.json
package.json
```

Optional later files:

```text
eval-fixtures/cartographer/**
docs/evals/judges/cartographer-semantic-overlay.md
docs/evals/calibration/cartographer-semantic-overlay.jsonl
```

## Package Scripts After Approval

```json
{
  "eval:cartographer": "bun run scripts/cartographer-code-graph-evals.ts",
  "eval:cartographer:smoke": "bun run scripts/cartographer-code-graph-evals.ts --profile smoke",
  "eval:cartographer:baseline": "bun run scripts/cartographer-code-graph-evals.ts --profile baseline",
  "eval:cartographer:codex": "bun run scripts/cartographer-code-graph-evals.ts --profile codex"
}
```

The `codex` profile must be opt-in and must not run from normal CI unless explicitly configured.

## Report Contract

Use the same top-level shape as `scripts/ark-scale-evals.ts`:

```ts
type CheckStatus = "passed" | "failed" | "skipped" | "informational";

interface EvalReport {
  schemaVersion: 1;
  runId: string;
  profile: "smoke" | "baseline" | "codex" | "axia-live";
  status: CheckStatus;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  options: Record<string, unknown>;
  environment: Record<string, unknown>;
  researchGrounding: Array<{ title: string; url: string; lesson: string }>;
  suites: EvalSuite[];
}

interface EvalSuite {
  id: string;
  title: string;
  status: CheckStatus;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  checks: EvalCheck[];
  metrics?: Record<string, unknown>;
  notes?: string[];
}

interface EvalCheck {
  id: string;
  status: CheckStatus;
  summary: string;
  metrics?: Record<string, unknown>;
  evidence?: Record<string, unknown>;
}
```

Report requirements:

- Include `gitSha`, `gitDirty`, Bun version, platform, CPU count, and memory in `environment`.
- Include runner argv and profile options in `options`.
- Include graph mode for each graph sample: `live`, `persisted`, or `fixture`.
- Include precision provider receipts when compiler-backed edges are claimed: provider id, version when available, availability, stale/skipped reason, and supported edge classes.
- Include fixture/task source file paths and hashes when fixtures exist.
- Include research grounding entries for Codebase-Memory, CodeCompass, CodeScaleBench, Code Rosetta, Code Atlas, CodeTracer, Theory of Code Space, Codemap, Codemesh, AgenticCodebase, Memtrace, and ARK eval integrity.
- For any agent-harness suite, include stage summaries or trace references sufficient to distinguish useful exploration from correct action.
- For any belief-durability task, include retained architectural belief snapshots or structured follow-up probe outputs.
- Never write reports by hand.
- Never compare reports from different profiles as equivalent.
- Never treat third-party benchmark speed, cost, or quality claims as Cartographer evidence unless the same benchmark was run by this runner under pinned local metadata.

## Profiles

### Smoke

Purpose: fast local health check.

Inputs:

- ARK repo live graph via `buildCodeGraph({ root: "." })`
- small in-memory or temp fixture repos
- candidate tasks from `.evals/research/cartographer-gold-task-candidates.md`

Expected runtime: under 10 minutes.

Must not require live model calls.

### Baseline

Purpose: stronger deterministic measurement.

Inputs:

- frozen fixture repos
- 75 to 150 task records
- repeated timing samples
- comparison against prior baseline when available

Expected runtime: under 90 minutes unless marked extended.

### Codex

Purpose: graph-adoption and codebase-understanding traces from a live Codex harness.

Inputs:

- small task set
- full command/file-read trajectory
- model and prompt revision metadata

Requirements:

- Use `graphPreflight: { path: <target> }` for `graph-mandated` turns when the runner executes through ARK's harness. This runs compact Cartographer context before adapter execution and emits adoption-compatible graph-command events without relying on prompt compliance.
- Fail `graph-mandated` tasks if Codex reads source before graph context.
- Record graph commands invoked, source reads before graph use, first correct file, final context list, redundant reads, and hallucinated paths.
- Record whether direct source reads or search filled known graph gaps after graph orientation; hybrid fallback is allowed only after graph context in graph-mandated tasks.
- Record evidence-to-action conversion: whether the trace uses retrieved graph/source evidence to choose the correct edit, explanation, or validation action.
- Record belief durability for follow-up probes: package/module hypotheses, dependency-closure claims, and risk notes should remain coherent after new evidence is introduced.
- Treat runtime workspace-turn lifecycle health as prerequisite harness substrate evidence, not as a Cartographer eval outcome. `src/core/runtime/workspace-turns.ts` makes workspace materialization, branch validation, pre/post snapshots, turn-workspace linking, and release handling easier to verify, but a passing runtime substrate check cannot substitute for graph speed, recall, adoption, or understanding reports.
- Separate provider/model latency from local graph command latency.

### Axia Live

Purpose: dirty monorepo/Supabase/workbench stress profile.

Inputs:

- `/Users/saint/dev/axia-os`
- output graph path under `/tmp`
- no writes into Axia by default

Requirements:

- Treat as live stress evidence, not deterministic fixture evidence.
- Record dirty state, ignored-path contamination, package/script coverage, generated-artifact gaps, and slice precision probes.
- Record local package-to-package dependency coverage separately from external dependency references. `DEPENDS_ON` package edges should count only when the dependency name resolves to another package in the same repo.

## Suite IDs

### `graph-contract`

Checks:

- `schema-valid`
- `stable-node-ids`
- `edge-endpoints-exist`
- `evidence-paths-exist`
- `no-secret-values`
- `no-default-ignored-paths`
- `provenance-confidence-valid`
- `precision-provider-receipt`
- `status-vocabulary-valid`

Hard failures:

- schema invalid
- dangling edge
- ignored path included
- raw secret value detected
- parser-lite or Tree-sitter fact claims `compiler-backed`
- agent annotation claims `deterministic`
- compiler-backed edge lacks a TypeScript, SCIP, or LSP provider receipt

### `extraction-gold-fixtures`

Checks:

- `file-inclusion-recall`
- `generated-vendor-exclusion-precision`
- `import-edge-f1`
- `export-symbol-f1`
- `package-workspace-f1`
- `local-package-dependency-edge-f1`
- `external-dependency-false-positive-count`
- `sql-resource-f1`
- `iac-resource-f1`
- `precision-edge-availability`
- `generated-artifact-classification-f1`
- `dirty-deleted-mode-accuracy`
- `temporal-graph-diff-recall`
- `runtime-distribution`

Smoke targets:

- schema-valid: 100%
- dangling edges: 0
- ignored-path precision: 100%
- import edge F1: >=90%
- SQL/IaC extraction F1: >=85%

Baseline targets:

- file inclusion recall: >=99%
- generated/vendor exclusion precision: >=99%
- import edge F1: >=95%
- package/workspace detection F1: >=98%
- local package dependency edge F1: >=95%
- external dependency false positives: 0
- SQL/IaC extraction F1: >=90%
- precision-edge provenance: 100% of compiler-backed edges cite a provider receipt
- generated-artifact classification F1: >=95%
- temporal graph-diff recall: >=90% on baseline snapshot-pair fixtures

### `navigation-slices`

Checks:

- `top-10-gold-file-recall`
- `top-20-gold-file-recall`
- `slice-precision`
- `hallucinated-path-count`
- `dependency-closure-coverage`
- `edge-weighted-impact-precision`
- `affected-dependent-package-recall`
- `hybrid-fallback-evidence`
- `test-command-recall`
- `slice-size-budget`
- `slice-latency`

Hard failures:

- hallucinated path count > 0
- missing required primary file
- slice precision below profile threshold
- edge-weighted impact precision below profile threshold
- graph returns a broad containment-only slice without dependency evidence for required context
- shared-package impact misses a known local dependent package or includes an external dependency as an affected package

### `agent-harness-navigation`

Checks:

- `graph-adoption-rate`
- `source-reads-before-graph`
- `first-graph-command-latency`
- `first-correct-file-step`
- `context-list-validity`
- `validation-command-recall`
- `evidence-to-action-conversion`
- `belief-durability`
- `writeback-source-anchor-freshness`
- `trajectory-recorded`

Hard failures:

- `graph-mandated` source read before graph use
- hallucinated path
- graph adoption without correct action when the task has deterministic gold evidence
- stale or unsupported semantic writeback used as accepted fact
- missing full trajectory
- unrecorded model/runtime metadata

### `semantic-overlay-quality`

Keep skipped until judge calibration exists.

Checks:

- `human-calibration-present`
- `judge-output-schema-valid`
- `grounded-evidence-paths`
- `deterministic-vs-inferred-separated`
- `unsupported-claim-rate`
- `risk-recall`

Hard failures:

- no human calibration when claiming semantic quality
- unsupported claim rate above threshold
- deterministic graph contradiction

### `axia-live-stress`

Checks:

- `axia-index-speed`
- `axia-ignored-path-contamination`
- `axia-package-script-coverage`
- `axia-supabase-fact-coverage`
- `axia-dirty-artifact-coverage`
- `axia-generated-ownership-gap`
- `axia-test-edge-gap`
- `axia-slice-precision-probe`
- `axia-live-mode-receipt`

This suite can be informational in smoke until frozen fixtures cover the same requirements.

## Task Data Shape

After approval, convert `.evals/research/cartographer-gold-task-candidates.md` into structured records:

```ts
interface NavigationTask {
  id: string;
  repoProfile: "ark" | "axia-live" | "fixture";
  graphMode: "persisted" | "live" | "fixture";
  prompt: string;
  startSelector: string;
  goldFiles: string[];
  goldNodes: string[];
  expectedValidationCommands: string[];
  mustMentionRisks: string[];
  forbiddenClaims: string[];
  expectedDependencyEdges?: string[];
  allowedContextFiles?: string[];
  expectedHybridFallbacks?: string[];
  expectedPrecisionProviders?: Array<{
    source: "typescript" | "scip" | "lsp";
    required: boolean;
    allowedFallbackReason?: string;
  }>;
  expectedActions?: string[];
  beliefDurabilityProbes?: Array<{
    prompt: string;
    expectedRetainedClaims: string[];
    forbiddenRegressions: string[];
  }>;
  writebackExpectations?: Array<{
    targetNodeId: string;
    evidencePaths: string[];
    mustRemainReviewable: boolean;
  }>;
  currentGraphEvidence?: Record<string, unknown>;
  knownCurrentFailures?: string[];
}
```

The runner should fail a task if any `goldFiles` entry is missing from the graph, unless the task is explicitly marked as an expected-current-failure probe.

Graph mode rules:

- `live` samples may include modified and untracked present files and must report dirty metadata. They are current-work evidence, not proof that committed graph artifacts are fresh.
- `persisted` samples must load the indexed snapshot and report the snapshot commit/scanner version.
- `fixture` samples must report fixture source paths and content hashes.
- Deleted files should be evaluated through manifest/deleted-path metadata and stale-evidence findings, not as normal file nodes unless a temporal fixture explicitly requests deleted-node history.
- Baseline temporal fixtures should use snapshot pairs for package/task graph evolution, migration history versus generated types, and plan/state or observed runtime drift when safe local data exists.

Use `cartographer preflight --path <target>` as the default graph-first runner query for file or node tasks when the harness only needs a preflight. It returns compact context with `manifest`, top-level `summary`, slice/impact totals, and a `preflight` metadata block containing command, timestamps, total duration, and phase timings. When executing through ARK turns, prefer `graphPreflight: { path: <target> }` so the runtime can inject the same compact context, expose the same timing breakdown, and emit graph-command trace events before adapter execution. The synthetic `cartographer.preflight` `tool_result` event includes both total duration and phase timings, so live Codex traces can score graph-load speed without scraping shell output. Use full `cartographer context --json` when a suite needs the same `selector`, `title`, `nodes`, `edges`, `annotations`, `findings`, and nested `summary` fields for scoring. Use the top-level `summary.primaryPaths`, `summary.impactPaths`, `summary.testPaths`, `summary.annotationNotes`, `summary.affectedPackages`, `summary.validationCommands`, and `preflight.timings` for the fast pass; drill into `slice` and `impact` when a suite needs to isolate local-neighborhood recall from blast-radius recall.

Use `analyzeGraphCommandAdoption(events)` from `src/code-graph/adoption.ts` for baseline agent-harness trace scoring. It accepts ARK `RuntimeEvent[]` streams, recognizes `cartographer preflight` plus `cartographer context --json` follow-up commands, counts source-reading shell commands before graph use, records structured graph preflight failures, and reports trace/first-command/failure offsets when timestamps are present. It also summarizes successful `cartographer.preflight` `tool_result` events with `graphPreflightResultCount`, `graphPreflightDurationsMs`, `firstGraphPreflightDurationMs`, and `firstGraphPreflightTimings`, so live harness reports can separate graph-load cost from model/tool exploration latency.

For graph-mandated tasks, use `checkGraphFirstAdoption(summary)` as the strict gate. It fails when the trace has no graph command, any graph preflight failure, or any repo source read before graph context. The CLI already exposes this through `cartographer adoption --trace <runtime-events.json> --json --require-graph-first`, including a `graphFirstAdoption` JSON object for manual report capture. For task-level answer checks, use `checkTraceExpectations(events, expectations)` so the runner can verify required final-response markers, cited paths, recommended validation commands, and actually executed validation commands without a judge. The CLI exposes these manual gates through repeatable `--expect-text <text>`, `--expect-path <path>`, `--expect-command <cmd>`, and `--expect-executed-command <cmd>` flags for tasks with multiple gold files or commands. `finalResponseExpectation.metrics` returns aggregate expected/hit counts for text, path, command, and executed-command checks. Expected-path checks return per-path evidence for final-response mention, any tool-command mention, and direct source-read mention, which should feed first-correct-file and read-coverage metrics. Expected-command checks return per-command final-response and tool-command evidence, while executed-command checks fail unless a matching tool command ran; together they should feed validation-command recall and validation-execution metrics.

The runner should still persist the raw trace as evidence; the classifier, strict gate, expectation check, and CLI are deterministic summary layers, not substitutes for the trace.

## Metric Definitions

- `goldFileRecall`: matched gold files divided by total gold files.
- `slicePrecision`: matched gold files divided by returned path-bearing nodes, excluding explicitly allowed context files.
- `hallucinatedPathCount`: output paths that do not exist in the repo.
- `dependencyClosureCoverage`: required upstream/downstream files present in the slice.
- `edgeWeightedImpactPrecision`: matched gold files and required dependency nodes divided by path-bearing impact nodes reached through dependency edges. Structural containment edges can seed context but do not justify blast-radius fan-out by themselves.
- `hybridFallbackCoverage`: known graph gaps that are later recovered through direct source reads or search after the graph-first step.
- `testCommandRecall`: expected validation commands present in the output.
- `affectedPackageAccuracy`: expected affected package ids present in `summary.affectedPackages` with acceptable rank.
- `graphAdoptionRate`: graph-command-using live runs divided by total live runs.
- `sourceReadsBeforeGraph`: count of source reads before required graph command in trajectory.
- `firstCorrectFileStep`: first trace step where a gold primary file appears.
- `evidenceToActionConversion`: pass/fail or ratio showing whether retrieved graph/source evidence led to the expected edit, explanation, validation command, or risk callout instead of stopping at discovery.
- `beliefDurability`: retained expected architectural claims divided by expected retained claims across follow-up probes, with any forbidden regression counted as a failure.
- `writebackSourceAnchorFreshness`: suggested or accepted semantic notes with fresh source anchors divided by semantic notes evaluated.

## Integrity Rules For This Runner

- Do not pass by returning huge slices.
- Do not treat `docs/CODEBASE_MAP.md` as gold truth.
- Do not use Axia live stress as deterministic fixture evidence.
- Do not trust semantic overlay judge scores without human calibration.
- Do not run live Codex profiles silently from smoke.
- Do not hide failed/slow/retried live runs.
- Do not special-case eval run IDs, labels, report paths, or task IDs in `src/`.
- Do not treat graph-command adoption as codebase understanding by itself.
- Do not import external benchmark claims into report verdicts without rerunning the benchmark locally with pinned model, host, prompt, and runner metadata.

## First Implementation Batch After Approval

1. Add `scripts/cartographer-code-graph-evals.ts` with smoke and baseline profiles.
2. Add `eval:cartographer:*` package scripts.
3. Implement `graph-contract` over ARK live graph and small temp fixtures.
4. Convert two smoke tasks:
   - `CG-SMOKE-001`
   - `CG-SMOKE-002`
5. Emit the first smoke report under `docs/reports/`.
6. Run `bun run eval:cartographer:smoke`.
7. Update `docs/evals/cartographer-code-graph-completion-audit.md` with report path and pass/fail summary.

Defer live Codex graph-adoption and semantic judge scoring until deterministic smoke is stable.

## Pre-Approval Implementation Blueprint

This section is a blueprint only. It is not runner code, task fixture data, package-script wiring, or report output.

The first approved runner should stay intentionally small and reuse the same report lifecycle as `scripts/ark-scale-evals.ts`: parse args, capture `startedAt`, run suites, create `docs/reports`, write one append-only JSON report, print the report path/status, and exit non-zero only when the top-level report status is `failed`.

Recommended imports after approval:

```ts
import { mkdir, writeFile } from "node:fs/promises";
import { arch, cpus, freemem, platform, release, totalmem } from "node:os";
import { join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import {
  buildCodeGraph,
  buildGraphContext,
  compactGraphContext,
  contextSelectorFor,
  runCartographerPreflight,
  type CodeGraphSnapshot,
  type GraphContextCompact,
} from "../src/code-graph/index.ts";
```

Do not shell out to `bun run cartographer:*` inside the deterministic smoke runner unless a check specifically needs CLI coverage. Use the TypeScript APIs for deterministic suites and reserve CLI shell traces for live-agent or manual-adoption evidence.

First runner structure:

```text
parseArgs(argv)
run(options, startedAt)
  runEvalSystemContractSuite(options)
  build ARK graph once with buildCodeGraph({ root })
  runGraphContractSuite(options, graph)
  runNavigationSmokeSuite(options, graph)
write docs/reports/<runId>.json
```

The smoke profile should build the ARK graph once and pass that snapshot into deterministic checks. Navigation-task scoring should use the same compact context shape agents receive, but it should derive those contexts from the shared snapshot instead of rebuilding the graph for every task.

For the first implementation, avoid rebuilding the graph per navigation task. Build task contexts from the shared snapshot:

```text
context = compactGraphContext(
  buildGraphContext(graph, {
    path: task.startSelector,
    selector: contextSelectorFor(task.startSelector),
    depth: 1,
  })
)
```

Add one separate `agent-preflight-surface` smoke check with `runCartographerPreflight({ root, path: "src/core/harness/tool-packs.ts", live: true, depth: 1 })` to prove the agent-facing hook still emits the focused facade-test path and command. That check may rebuild the graph once because it is intentionally testing the runtime-facing preflight surface, not bulk navigation scoring.

Initial smoke checks:

| Suite | Check | Pass rule |
| --- | --- | --- |
| `eval-system-contract` | `requested-suites-covered` | Report includes `graph-contract` and `navigation-slices`. |
| `eval-system-contract` | `report-shape` | Report has `schemaVersion: 1`, fixed status vocabulary, `options`, `environment`, `researchGrounding`, `suites[]`, and `checks[]`. |
| `graph-contract` | `schema-valid-enough-for-runner` | Graph has manifest, nodes, edges, and findings arrays. |
| `graph-contract` | `edge-endpoints-exist` | Every edge endpoint resolves to an existing node id. |
| `graph-contract` | `no-default-ignored-paths` | No node evidence path starts with ignored outputs such as `node_modules/`, `dist/`, `.git/`, `.bun-tmp/`, `docs/codegraph/`, or `e2e/test-results/`. |
| `graph-contract` | `no-secret-values` | Env-var nodes may expose keys but must not expose raw values in metadata. |
| `navigation-slices` | `cg-smoke-001-gold-file-recall` | `summary.primaryPaths`, `summary.impactPaths`, and `summary.testPaths` include 100% of current gold files for `CG-SMOKE-001`; fail below the plan target of 85%. |
| `navigation-slices` | `cg-smoke-001-validation-command-recall` | `summary.validationCommands` includes `runCommand: "bun test ./src/code-graph"` and `runCommand: "bun run typecheck"` for the root package. |
| `navigation-slices` | `cg-smoke-002-gold-file-recall` | `summary.primaryPaths`, `summary.impactPaths`, and `summary.testPaths` include at least 85% of gold files for `CG-SMOKE-002`. |
| `navigation-slices` | `cg-smoke-002-validation-command-recall` | `summary.validationCommands` includes `bun test ./src/code-graph/__tests__/builder.test.ts` and `bun test ./src/code-graph`. |
| `navigation-slices` | `hallucinated-path-count` | Every emitted path exists in the built graph or on disk under the repo root. |
| `navigation-slices` | `slice-size-budget` | Compact preflight emitted paths stay small enough for prompt use; record counts and keep this check informational until a stable threshold is chosen. |
| `navigation-slices` | `agent-preflight-surface` | `runCartographerPreflight` for `src/core/harness/tool-packs.ts` includes `src/core/__tests__/harness-tool-packs.test.ts` and returns `bun test ./src/core/__tests__/harness-tool-packs.test.ts` as the first validation command. |

The initial smoke runner should treat missing focused/module-level Bun test commands and missing package `runCommand` values as failures when the command is already produced by current graph context. For example, `CG-SMOKE-002` should fail if `bun test ./src/code-graph/__tests__/builder.test.ts` or `bun test ./src/code-graph` disappears because the current graph derives both commands. `CG-SMOKE-001` should fail if `bun test ./src/code-graph` or `bun run typecheck` disappears from the `runCommand` surface.

Navigation scoring helper sketch:

```text
scoreNavigationTask(task, context)
  emittedPaths = primaryPaths + impactPaths + testPaths
  goldHits = task.goldFiles where emittedPaths includes file
  goldFileRecall = goldHits / task.goldFiles.length
  validationHits = task.expectedValidationCommands where validationCommands includes command
  hallucinatedPathCount = emittedPaths that do not exist in graph nodes or filesystem
  return one check per metric plus evidence with missingGoldFiles and missingValidationCommands
```

The report evidence for each navigation task should include:

- `taskId`
- `startSelector`
- `preflightCommand`
- `graphTotals`
- `sliceTotals`
- `impactTotals`
- `emittedPaths`
- `goldFiles`
- `missingGoldFiles`
- `validationCommands`
- `missingValidationCommands`
- `knownCurrentFailures`

Smoke report status rules:

- `failed` if any hard graph-contract check fails.
- `failed` if either approved smoke task misses its required primary file or emits a hallucinated path.
- `failed` if required focused validation command recall regresses for `CG-SMOKE-002`.
- `passed` if all hard checks pass.
- `informational` checks must not hide a known hard failure.

The first approved commit should not add baseline fixtures, Axia writes, live Codex execution, judge prompts, calibration labels, or semantic-overlay scoring. Those remain second-batch work after the deterministic smoke report exists.

The first smoke runner must pass or fail deterministic graph and navigation checks without relying on accepted overlay notes. It may record overlay availability as informational evidence, but semantic overlay scoring belongs after the graph contract and navigation-slice reports are stable.

Current sanity check on 2026-05-11 before scaffolding:

```text
CG-SMOKE-001:
  goldFileRecall: 1
  missingGoldFiles: none
  surfaced additional impacted-dependent tests:
    - src/code-graph/__tests__/builder.test.ts
    - src/code-graph/__tests__/commands.test.ts
  matchedCommands:
    - bun test ./src/code-graph/__tests__/builder.test.ts
    - bun test ./src/code-graph/__tests__/commands.test.ts
    - bun test ./src/code-graph
  missing informational command:
    - bun run typecheck
  hallucinatedPathCount: 0

CG-SMOKE-002:
  slice: 90 nodes, 137 edges
  impact: 19 nodes, 25 edges
  goldFileRecall: 1
  matchedCommands:
    - bun test ./src/code-graph/__tests__/builder.test.ts
    - bun test ./src/code-graph
  hallucinatedPathCount: 0

agent-preflight-surface:
  runCartographerPreflight succeeded
  surfaced src/core/__tests__/harness-tool-packs.test.ts
  surfaced bun test ./src/core/__tests__/harness-tool-packs.test.ts as the first validation command
```

This sanity check is why the first smoke report should separate hard regressions from current improvement targets. Otherwise the first approved runner would fail on known gaps instead of creating a stable measurement loop.
