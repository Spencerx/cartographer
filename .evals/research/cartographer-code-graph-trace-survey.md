# Cartographer Code Graph Trace Survey

Date: 2026-05-11
Scope: Cartographer v2 code graph CLI and agent navigation workflow.

## Local Outputs Reviewed

- `docs/prds/cartographer-v2-code-graph.md`
- `docs/features/cartographer-code-graph.md`
- `.evals/research/cartographer-axia-stress-run.md`
- `.evals/research/cartographer-gold-task-candidates.md`
- `.evals/research/cartographer-runner-implementation-handoff.md`
- `.evals/research/cartographer-dirty-worktree-preflight.md`
- `.evals/research/cartographer-manual-contract-checks.md`
- `src/code-graph/**`
- `src/code-graph/__tests__/**`
- Existing ARK eval docs and scale runner:
  - `docs/EVALS.md`
  - `docs/evals/ark-scale-eval-suites.md`
  - `docs/evals/eval-integrity.md`
  - `scripts/ark-scale-evals.ts`

## Current CLI Trace

Command:

```bash
bun run cartographer:index -- --root . --out docs/codegraph
```

Observed on ARK repo:

- Initial wall time: 0.31s
- Initial max resident set size: 220,463,104 bytes
- Initial graph: 545 files, 3,496 nodes, 7,633 edges, 0 findings
- Initial git state: clean at `e0c48f51a4af`
- Latest doc-update verification: 550 files, 3,536 nodes, 7,696 edges, 0 findings, dirty at `8718b55dc625`

Read commands after graph build:

| Command | Wall time | Output shape |
| --- | ---: | --- |
| `cartographer:view` | 0.10s | repo summary, node-kind counts, edge-kind counts |
| `cartographer:slice --selector path:src/code-graph/builder.ts` | 0.09s | 35 nodes, 68 edges |
| `cartographer:impact --path src/code-graph/builder.ts` | 0.10s | 8 nodes, 8 edges |
| `cartographer context --live --root . --path src/code-graph/commands.ts --depth 1 --json` | 0.31s, 183 MB max RSS | builds live graph and returns manifest plus compact preflight summary plus slice/impact JSON; 60 slice nodes, 90 slice edges, 17 impact nodes, 16 impact edges |
| `cartographer context --live --root . --path src/code-graph/commands.ts --depth 1 --compact --json` | 0.32s, 185 MB max RSS | builds live graph and returns manifest, compact preflight summary, and totals only; no nested slice/impact payloads; 63 slice nodes, 93 slice edges, 16 impact nodes, 15 impact edges |

## Existing Codex And Worker Harness Evidence

Timed command:

```bash
bun test src/adapters/codex
```

Observed result:

- 20 pass, 1 skipped live Codex test, 0 fail
- Wall time: 0.36s
- Max resident set size: 107,413,504 bytes
- Coverage: fake Codex app-server client, JSON-RPC parsing, adapter event mapping, command timeout policy, warm owner lifecycle, and one skipped live Codex app-server E2E.

Timed command:

```bash
bun test src/core/__tests__/worker-runs.test.ts
```

Observed result:

- 26 pass, 0 fail
- Wall time: 3.60s
- Max resident set size: 159,170,560 bytes
- Coverage: command worker runs, agent worker snapshots, workspace patches, auth profile resolution, runtime/model policy, broker credentials, network policy evidence, and failed agent worker handling.

Live Codex entry points already exist but are opt-in:

- `LIVE_CODEX_E2E=1 bun test src/adapters/codex/__tests__/runner-live.test.ts --timeout 120000`
- `LIVE_WORKSPACE_HARNESS_E2E=1 LIVE_WORKSPACE_CASES=codex bun run scripts/live-workspace-checkpoint-harnesses.ts`

These prove that ARK has a Codex harness surface and existing tests for adapter/runtime mechanics. They do not prove that Codex agents use Cartographer graph commands before source reads.

The live Codex adapter test can also write raw events for research with `CODEX_E2E_TRACE_OUT=/tmp/codex-runtime-events.json`. `CODEX_E2E_PROMPT`, `CODEX_E2E_EXPECT_TEXT`, and `CODEX_E2E_CWD` allow a graph-prompted Cartographer turn without adding an eval runner or report.

Live Codex adapter check run on 2026-05-11:

```bash
LIVE_CODEX_E2E=1 bun test src/adapters/codex/__tests__/runner-live.test.ts --timeout 120000
```

Observed result:

- 1 pass, 0 fail
- 5 assertions
- Real Codex app-server response received
- Wall time: 5.31s

Interpretation:

- Codex is available on this machine for live harness work.
- This is prerequisite evidence only. The test does not create a Cartographer task, does not force graph commands, and does not score codebase understanding.

Live Codex graph-prompted trace run on 2026-05-11:

```bash
LIVE_CODEX_E2E=1 \
CODEX_E2E_CWD=/Users/saint/Dev/agent-runtime-kernel \
CODEX_E2E_EXPECT_TEXT=CODEX_GRAPH_OK \
CODEX_E2E_TRACE_OUT=/tmp/ark-codex-cartographer-adoption-trace.json \
CODEX_E2E_PROMPT=$'Before reading source files or running source-search commands, run this exact command first:\n\nbun run cartographer:preflight -- --root . --live --path src/code-graph/commands.ts\n\nAfter that command completes, reply exactly CODEX_GRAPH_OK and nothing else.' \
bun test src/adapters/codex/__tests__/runner-live.test.ts --timeout 120000

bun run cartographer:adoption -- --trace /tmp/ark-codex-cartographer-adoption-trace.json --json
```

Observed result:

- Live Codex test: 1 pass, 0 fail, 5 assertions, 13.69s wall time.
- Adoption summary: `adopted: true`, first graph command was `/bin/zsh -lc 'bun run cartographer:preflight -- --root . --live --path src/code-graph/commands.ts'`.
- Trace events: 9.
- Trace duration: 1,855 ms.
- First graph command offset: 139 ms.
- Tool command count: 1.
- Source reads before graph: 0.
- Captured trace size: 10,399 bytes under `/tmp`.
- Preflight output in the trace reported 580 files, 3,793 nodes, 8,825 edges, 73 slice nodes, 108 slice edges, 17 impact nodes, and 16 impact edges.

Interpretation:

- This is the first positive live graph-prompted adoption trace for the ARK Codex adapter.
- It is still research evidence only. It does not establish an adoption rate, compare baseline-direct versus graph-prompted runs, or score codebase-understanding quality.

Live Codex baseline-direct trace run on 2026-05-11:

```bash
LIVE_CODEX_E2E=1 \
CODEX_E2E_CWD=/Users/saint/Dev/agent-runtime-kernel \
CODEX_E2E_EXPECT_TEXT=CODEX_BASELINE_OK \
CODEX_E2E_TRACE_OUT=/tmp/ark-codex-cartographer-baseline-trace.json \
CODEX_E2E_PROMPT=$'Identify the file that implements the Cartographer CLI subcommands in this repo. You may inspect the repo normally. After inspection, reply exactly CODEX_BASELINE_OK and nothing else.' \
bun test src/adapters/codex/__tests__/runner-live.test.ts --timeout 120000

bun run cartographer:adoption -- --trace /tmp/ark-codex-cartographer-baseline-trace.json --json
```

Observed result:

- Live Codex test: 1 pass, 0 fail, 5 assertions, 32.90s wall time.
- Adoption summary: `adopted: false`.
- Trace events: 205.
- Trace duration: 22,517 ms.
- Tool command count: 10.
- Source reads before graph: 2.
- First source read before graph offset: 14,775 ms.
- Source read commands before graph:
  - `/bin/zsh -lc "nl -ba src/cli/index.ts | sed -n '1,120p'"`
  - `/bin/zsh -lc "nl -ba src/code-graph/commands.ts | sed -n '1,90p'"`
- Captured trace size: 184,623 bytes under `/tmp`.

Interpretation:

- This single baseline trace did not discover or use Cartographer graph context on its own.
- The trace is useful contrast for the graph-prompted trace, but it is not a statistically meaningful comparison and should not be used as a performance or quality claim.

Live Codex graph-first understanding trace run on 2026-05-11:

```bash
LIVE_CODEX_E2E=1 \
CODEX_E2E_CWD=/Users/saint/Dev/agent-runtime-kernel \
CODEX_E2E_EXPECT_TEXT=CODEX_UNDERSTANDING_OK \
CODEX_E2E_TRACE_OUT=/tmp/ark-codex-cartographer-understanding-trace.json \
CODEX_E2E_PROMPT='Use the graph-first Cartographer workflow...'
bun test src/adapters/codex/__tests__/runner-live.test.ts --timeout 120000

bun run cartographer:adoption -- --trace /tmp/ark-codex-cartographer-understanding-trace.json --json
```

Observed result:

- Live Codex test: 1 pass, 0 fail, 5 assertions, 37.70s wall time.
- Trace file: `/tmp/ark-codex-cartographer-understanding-trace.json`, 88 KB.
- Adoption summary: `adopted: true`.
- Trace events: 200.
- Trace duration: 24,630 ms.
- First graph command: `/bin/zsh -lc 'bun run cartographer:preflight -- --root . --live --path src/code-graph/adoption.ts'`.
- First graph command offset: 6,735 ms.
- Tool command count: 5.
- Graph preflight failures: 0.
- Repo source reads before graph: 0.
- Final answer named `src/code-graph/adoption.ts`, validation command `bun test`, and marker `CODEX_UNDERSTANDING_OK`.

Interpretation:

- This is a stronger manual trace than the marker-only graph-prompted run because Codex had to identify a relevant implementation file and validation command.
- Codex read skill instruction files before graph preflight. The adoption classifier now treats shell-wrapped repo reads such as `zsh -lc "nl -ba src/..."` as source reads while ignoring skill-instruction reads under `.codex/skills`, `.agents/skills`, and `.claude/skills`.
- The same trace can now be checked with `cartographer adoption --trace /tmp/ark-codex-cartographer-understanding-trace.json --require-graph-first --expect-text CODEX_UNDERSTANDING_OK --expect-path src/code-graph/adoption.ts --expect-command "bun test"` as a strict manual graph-first and final-response gate.
- This is still research evidence only. It is one live trace, not a repeatable adoption-rate or understanding-quality profile.

Live Codex graph-first builder-flow trace run on 2026-05-11:

```bash
LIVE_CODEX_E2E=1 \
CODEX_E2E_CWD=/Users/saint/Dev/agent-runtime-kernel \
CODEX_E2E_EXPECT_TEXT=CODEX_BUILDER_OK \
CODEX_E2E_TRACE_OUT=/tmp/ark-codex-cartographer-builder-trace.json \
CODEX_E2E_PROMPT='Use the graph-first Cartographer workflow...'
bun test src/adapters/codex/__tests__/runner-live.test.ts --timeout 120000

bun run cartographer:adoption -- --trace /tmp/ark-codex-cartographer-builder-trace.json --json --require-graph-first --expect-text CODEX_BUILDER_OK --expect-path src/code-graph/builder.ts --expect-path src/code-graph/extractors.ts --expect-path src/code-graph/graph-store.ts --expect-command "bun test src/code-graph/__tests__/builder.test.ts" --expect-executed-command "bun test src/code-graph/__tests__/builder.test.ts"
```

Observed result:

- Live Codex test: 1 pass, 0 fail, 5 assertions, 46.67s wall time.
- Trace file: `/tmp/ark-codex-cartographer-builder-trace.json`.
- Adoption summary: `adopted: true`.
- Graph-first gate: passed.
- Trace events: 292.
- Trace duration: 34,486 ms.
- First graph command: `/bin/zsh -lc 'bun run cartographer:preflight -- --root . --live --path src/code-graph/builder.ts'`.
- First graph command offset: 1,336 ms.
- Tool command count: 9.
- Graph preflight failures: 0.
- Repo source reads before graph: 0.
- Final-response expectation passed for marker `CODEX_BUILDER_OK`, paths `src/code-graph/builder.ts`, `src/code-graph/extractors.ts`, `src/code-graph/graph-store.ts`, and command `bun test src/code-graph/__tests__/builder.test.ts`.
- Path evidence showed all three expected files in the final response, tool commands, and direct source-read commands.
- Command evidence showed the expected builder test command in the final response; executed-command evidence showed it ran as an actual tool command.

Interpretation:

- This is the strongest manual codebase-understanding trace so far because Codex used graph preflight first, then verified expected source files, then ran the targeted builder test.
- It is still not a generated Cartographer eval report and should not be reported as an adoption rate or quality-lift measurement.

Live Codex graph-first facade-test trace run on 2026-05-11:

```bash
LIVE_CODEX_E2E=1 \
CODEX_E2E_CWD=/Users/saint/Dev/agent-runtime-kernel \
CODEX_E2E_EXPECT_TEXT=CODEX_TOOLPACKS_OK \
CODEX_E2E_TRACE_OUT=/tmp/ark-codex-cartographer-tool-packs-trace.json \
CODEX_E2E_PROMPT='Read-only task. Do not edit files. First run graph orientation before reading repo source...'
bun test src/adapters/codex/__tests__/runner-live.test.ts --timeout 120000

bun run cartographer:adoption -- --trace /tmp/ark-codex-cartographer-tool-packs-trace.json --json --require-graph-first --expect-text CODEX_TOOLPACKS_OK --expect-path src/core/__tests__/harness-tool-packs.test.ts --expect-command "bun test src/core/__tests__/harness-tool-packs.test.ts" --expect-executed-command "bun test src/core/__tests__/harness-tool-packs.test.ts"
```

Observed result:

- Live Codex test: 1 pass, 0 fail, 5 assertions, 30.54s wall time.
- Trace file: `/tmp/ark-codex-cartographer-tool-packs-trace.json`.
- Adoption summary: `adopted: true`.
- Graph-first gate: passed.
- Trace events: 212.
- Trace duration: 19,113 ms.
- First graph command: `/bin/zsh -lc 'bun run cartographer:preflight -- --root . --live --path src/core/harness/tool-packs.ts --json'`.
- First graph command offset: 3,299 ms.
- Tool command count: 5.
- Graph preflight failures: 0.
- Repo source reads before graph: 0.
- Final-response expectation passed for marker `CODEX_TOOLPACKS_OK`, path `src/core/__tests__/harness-tool-packs.test.ts`, and command `bun test src/core/__tests__/harness-tool-packs.test.ts`.
- Path evidence showed the expected test file in the final response, tool commands, and direct source-read commands.
- Command evidence showed the expected focused harness test in the final response; executed-command evidence showed it ran as an actual tool command.

Interpretation:

- This validates the new deterministic `__tests__` naming-convention `TESTS` edge in a live graph-first Codex workflow.
- The source file under test, `src/core/harness/tool-packs.ts`, is exercised through the public harness facade, so the graph would miss the focused test if it only used direct test imports.
- It is still one manual trace. It strengthens runner-design evidence but does not replace a repeatable eval profile.

Live Codex graph-first runtime graph-preflight runner trace run on 2026-05-11:

```bash
LIVE_CODEX_E2E=1 \
CODEX_E2E_CWD=/Users/saint/Dev/agent-runtime-kernel \
CODEX_E2E_EXPECT_TEXT=CODEX_GRAPH_PREFLIGHT_RUNNER_OK \
CODEX_E2E_TRACE_OUT=/tmp/ark-codex-runtime-graph-preflight-runner-trace.json \
CODEX_E2E_PROMPT='You are testing Cartographer graph-first navigation for agent-runtime-kernel...'
bun test src/adapters/codex/__tests__/runner-live.test.ts --timeout 120000

bun run cartographer:adoption -- --trace /tmp/ark-codex-runtime-graph-preflight-runner-trace.json --json --require-graph-first --expect-text CODEX_GRAPH_PREFLIGHT_RUNNER_OK --expect-path src/core/runtime/graph-preflight-runner.ts --expect-path src/core/__tests__/runtime-graph-preflight-runner.test.ts --expect-command "bun test ./src/core/__tests__/runtime-graph-preflight-runner.test.ts --timeout 120000" --expect-executed-command "bun test ./src/core/__tests__/runtime-graph-preflight-runner.test.ts --timeout 120000"
```

Observed result:

- Live Codex test: 1 pass, 0 fail, 5 assertions, 27.27s wall time.
- Trace file: `/tmp/ark-codex-runtime-graph-preflight-runner-trace.json`.
- Adoption summary: `adopted: true`.
- Graph-first gate: passed.
- Trace events: 231.
- Trace duration: 13,222 ms.
- First graph command: `/bin/zsh -lc 'bun run cartographer:preflight -- --root . --live --path src/core/runtime/graph-preflight-runner.ts --json'`.
- First graph command offset: 6,724 ms.
- Successful graph preflight result count: 1.
- First graph preflight result offset: 7,169 ms.
- Tool command count: 4.
- Graph preflight failures: 0.
- Repo source reads before graph: 0.
- Final-response expectation passed for marker `CODEX_GRAPH_PREFLIGHT_RUNNER_OK`, paths `src/core/runtime/graph-preflight-runner.ts` and `src/core/__tests__/runtime-graph-preflight-runner.test.ts`, and command `bun test ./src/core/__tests__/runtime-graph-preflight-runner.test.ts --timeout 120000`.
- Path evidence showed both expected files in the final response and tool commands, with no direct source-read evidence before graph context.
- Command evidence showed the expected focused runner test in the final response; executed-command evidence showed it ran as an actual tool command.

Interpretation:

- This validates graph-first Codex navigation on the newly extracted runtime graph-preflight runner boundary.
- It confirms the graph can point a live Codex turn from the runtime hook implementation to the focused runner test and that Codex can execute the exact focused test command.
- It is still one manual trace. It strengthens harness-workflow evidence but does not establish adoption rate, recall, precision, or quality lift.

Live Codex baseline-direct builder-flow trace run on 2026-05-11:

```bash
LIVE_CODEX_E2E=1 \
CODEX_E2E_CWD=/Users/saint/Dev/agent-runtime-kernel \
CODEX_E2E_EXPECT_TEXT=CODEX_BUILDER_BASELINE_OK \
CODEX_E2E_TRACE_OUT=/tmp/ark-codex-cartographer-builder-baseline-trace.json \
CODEX_E2E_PROMPT='Explain the code graph builder flow and list the files an agent should read before editing extraction behavior...'
bun test src/adapters/codex/__tests__/runner-live.test.ts --timeout 120000

bun run cartographer:adoption -- --trace /tmp/ark-codex-cartographer-builder-baseline-trace.json --json --expect-text CODEX_BUILDER_BASELINE_OK --expect-path src/code-graph/builder.ts --expect-path src/code-graph/extractors.ts --expect-path src/code-graph/graph-store.ts --expect-command "bun test src/code-graph/__tests__/builder.test.ts" --expect-executed-command "bun test src/code-graph/__tests__/builder.test.ts"
```

Observed result:

- Live Codex test: 1 pass, 0 fail, 5 assertions, 105.37s wall time.
- Trace file: `/tmp/ark-codex-cartographer-builder-baseline-trace.json`.
- Adoption summary: `adopted: false`.
- Trace events: 269.
- Trace duration: 94,959 ms.
- Tool command count: 38.
- Graph preflight failures: 0.
- Source reads before graph: 35.
- First source read before graph: `/bin/zsh -lc 'rg --files .'`.
- First source read before graph offset: 2,375 ms.
- Final-response expectation passed for marker `CODEX_BUILDER_BASELINE_OK`, paths `src/code-graph/builder.ts`, `src/code-graph/extractors.ts`, `src/code-graph/graph-store.ts`, and command `bun test src/code-graph/__tests__/builder.test.ts`.
- Path evidence showed all three expected files in the final response, tool commands, and direct source-read commands.
- Command evidence showed the expected builder test command in the final response; executed-command evidence showed it ran as an actual tool command.

Interpretation:

- This is the first same-task manual contrast for `CG-SMOKE-002`.
- The baseline-direct run still produced a correct concise answer and ran the focused builder test, but it needed many more source-read commands and did not discover or use the graph workflow.
- The paired graph-first and baseline-direct builder traces are useful runner-design evidence only. They are not a repeatable distribution and cannot support a lift claim until the approved eval runner records multiple comparable runs.

Live Codex workspace checkpoint harness run on 2026-05-11:

```bash
LIVE_WORKSPACE_HARNESS_E2E=1 LIVE_WORKSPACE_CASES=codex bun run scripts/live-workspace-checkpoint-harnesses.ts
```

Observed result:

- Report: `docs/reports/workspace-checkpoint-2026-05-11T10-31-47-611Z.json`
- Selected case: `codex`
- Result: passed
- Turn 1 created `notes/plan.md`.
- Turn 2 modified `notes/plan.md` and created `notes/second.md`.
- Workspace diff recorded 2 files changed.
- Revert returned the branch to the turn 1 checkpoint and expired 1 adapter session.

Interpretation:

- Codex workspace snapshot, diff, and rollback mechanics work on this machine.
- This is durable harness evidence, but still not a Cartographer graph-adoption trace.

Focused verification command:

```bash
bun test src/code-graph src/adapters/codex src/core/__tests__/worker-runs.test.ts src/state/__tests__/store.test.ts src/state/__tests__/session-tuples.test.ts
```

Observed result:

- 104 pass, 1 skipped live Codex test, 0 fail, 1,213 assertions
- Coverage: code graph command/extraction tests, Codex adapter tests, worker-run harness tests, and StateStore session/session-tuple tests.
- Remaining gap: no Cartographer-specific agent-navigation runner, adoption-rate report, or repeated baseline-vs-graph comparison yet. A deterministic classifier, manual trace CLI, strict graph-first gate, final-response expectation checks, executed-command expectation checks, aggregate expectation metrics, expected-path tool/source-read evidence, expected-command final/tool evidence, preflight-failure triage, one positive live graph-prompted Codex trace, one graph-first understanding trace, one graph-first facade-test trace, one graph-first runtime graph-preflight runner trace, one paired builder-flow graph-first/baseline-direct contrast, one earlier baseline-direct contrast trace, and an opt-in `TurnInput.graphPreflight` harness hook now exist.

## Failure Modes Already Visible

1. Missing-artifact first-run race.
   - When `view`, `slice`, or `impact` run before the first `index` completes, they fail with `ENOENT` for `docs/codegraph/graph.json`.
   - This is expected for a cold repo, but the eval runner should record it as a workflow precondition and should separately test update-mode reader behavior once a previous graph exists.

2. Graph adoption is not proven by the CLI existing.
   - The current unit tests prove commands work and that raw `RuntimeEvent[]` traces can be summarized for source-reads-before-graph, shell-wrapped source reads, instruction-read exclusions, and structured graph preflight failures.
   - One graph-prompted live Codex trace proves the adapter can call `cartographer preflight` before source reads for a simple prompted run.
   - One graph-first understanding trace proves Codex can use preflight context to name the adoption implementation file and a validation command in a simple task.
   - One graph-first builder-flow trace proves Codex can use preflight context, verify expected implementation files, and run the expected focused builder test command.
   - One graph-first facade-test trace proves Codex can use the inferred `__tests__` edge to find and run `src/core/__tests__/harness-tool-packs.test.ts` for `src/core/harness/tool-packs.ts`.
   - One graph-first runtime graph-preflight runner trace proves Codex can use graph context to navigate from `src/core/runtime/graph-preflight-runner.ts` to its focused runner test and execute the exact focused command.
   - One baseline-direct builder-flow trace solves the same task without graph adoption, after 35 source reads before graph and a 94,959 ms trace duration.
   - One baseline-direct live Codex trace shows no graph adoption and two source reads before any graph context.
   - Together, those traces are useful research evidence, but they do not prove durable adoption across tasks, adoption rate, or codebase-understanding lift.

3. Current tests cover small fixture extraction, not gold task navigation.
   - Existing tests verify imports, symbols, SQL, IaC facts, schema, command output, and OpenRouter request shape.
   - They do not score file recall, precision, first-correct-context latency, tool adoption, or human usefulness.

4. Semantic overlay has request-shape tests, but no live or calibrated semantic eval.
   - Non-dry-run annotation requires `OPENROUTER_API_KEY`.
   - There is no gold set for grounded semantic notes yet.

5. Existing Codex harness tests are necessary but insufficient for Cartographer.
   - They verify Codex adapter and worker-run mechanics.
   - They now include a deterministic graph preflight hook, but they do not define Cartographer navigation tasks, gold files, adoption-rate profiles, or architectural coverage metrics.

## External Research Grounding

- CodeCompass / Navigation Paradox: graph navigation improved hidden-dependency coverage, but the largest bottleneck was tool adoption. The eval should measure graph-call adoption, first correct file, and architectural coverage, not only final answers.
- Tree-sitter official docs frame it as a fast, robust incremental parser that builds concrete syntax trees. That supports broad syntax extraction, but Cartographer still needs compiler-backed edges and semantic overlays for ownership, workflow, runtime, and IaC meaning.
- SCIP and Sourcegraph precise navigation distinguish search/tree-sitter style navigation from compiler-backed symbol indexes. Cartographer should label those provenance classes separately.
- Terraform/infra graph tooling shows the same pattern for IaC: desired config, dependency edges, blast radius, drift, and policy need graph queries, not raw file dumps.
- ContextBench: process-level context recall, precision, efficiency, redundancy, and evidence drop are better signals than pass/fail alone for codebase-understanding systems.
- CodeScaleBench: large-codebase agent evals should keep auditable traces, task taxonomies, timing, cost, and MCP/tool usage evidence.
- The 2026 Exa refresh in `.evals/research/cartographer-exa-research-refresh.md` adds concrete support for persistent graph memory, hybrid graph/search fallback, cross-language IaC graph edges, and edge-weighted impact scoring.

## Evaluation Implication

Cartographer evals need three layers:

1. Deterministic graph correctness and runtime.
2. Navigation-quality tasks with gold expected files/resources/tests.
3. Agent-harness traces that compare baseline Codex exploration against graph-mandated workflows.

The first runner should be deterministic and local. Live Codex/OpenRouter profiles should be opt-in because they depend on credentials, host state, and provider latency.

Axia OS should be treated as a live stress profile first, not a frozen deterministic fixture. It proved that current extraction is fast on a dirty monorepo/Supabase repo. The follow-up edge-improvement passes now emit `GENERATED_BY`, `TESTS`, `SERVICE_QUERIES_TABLE`, `SERVICE_CALLS_RPC`, and `TABLE_REFERENCES_TABLE` edges, while slice precision under noisy chat feature directories remains a concrete eval target.

The first candidate gold tasks now exist as research notes, not fixtures:

- ARK code graph type impact.
- ARK builder flow readiness.
- Axia `DATABASE_URL` usage.
- Axia generated DB type ownership.
- Axia chat message tool-work change.
- Axia web/API type boundary.
- Axia Supabase RLS/migration change.
- Live Codex graph-mandated builder and Axia chat slice tasks.
