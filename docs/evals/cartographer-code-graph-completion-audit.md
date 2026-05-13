# Cartographer v2 Master PRD Completion Audit

Status: complete for `docs/prds/cartographer-v2-master-prd.md`
Last updated: 2026-05-12

## Objective

Implement `docs/prds/cartographer-v2-master-prd.md` in the standalone Cartographer repo.

This objective is complete only if Cartographer v2 now has:

- default SQLite graph artifacts instead of default full `graph.json`
- a simplified agent-facing surface around `index`, `brief`, `audit`, `notes`, and explicit `export`
- bounded briefs with freshness, omissions, validation commands, notes, and source-read guidance
- removal audit ledgers with Supabase-style evidence-class coverage and fail-closed verification
- evidence-backed notes with candidate, accepted, stale, and retired lifecycle
- output brakes for legacy/debug graph commands
- monorepo package/surface handling and incremental index reuse
- evals that verify graph contracts, token budgets, brief precision, removal completeness, drift/staleness, security/privacy, monorepo scale, and recorded Codex-style agent outcomes
- read-only ARK and Axia-style target evidence without writing Cartographer implementation into those repos

## Current Evidence Snapshot

Latest local verification commands:

```bash
git diff --check
bun run typecheck
bun test src/code-graph
bun run eval:cartographer:smoke
bun run eval:cartographer:codex
```

Results:

- `git diff --check`: passed.
- `bun run typecheck`: passed.
- `bun test src/code-graph`: 77 pass, 0 fail, 1,984 assertions.
- `bun run eval:cartographer:smoke`: passed, wrote `docs/reports/cartographer-code-graph-smoke-2026-05-12T23-56-46-019Z.json`.
- `bun run eval:cartographer:codex`: passed, wrote `docs/reports/cartographer-code-graph-codex-2026-05-12T23-56-46-017Z.json`.

Fresh direct CLI audit output:

- `bun run cartographer:index -- --root /Users/saint/Dev/cartographer-plugin --out /tmp/cartographer-self-audit.R8lVr4 --max-file-bytes 500000`
- `bun run cartographer:verify -- --out /tmp/cartographer-self-audit.R8lVr4 --root /Users/saint/Dev/cartographer-plugin --fresh --json`
- `bun run cartographer:brief -- --out /tmp/cartographer-self-audit.R8lVr4 --path src/code-graph/commands.ts --mode implementation --json --budget 8000`
- `bun run cartographer:export -- graph --from /tmp/cartographer-self-audit.R8lVr4 --format jsonl --out /tmp/cartographer-self-audit.R8lVr4/exports`
- `bun run cartographer:audit -- removal --out /tmp/cartographer-self-audit.R8lVr4 --target OPENROUTER --write /tmp/cartographer-self-audit.R8lVr4/audits/openrouter-removal.json --json`
- `bun run cartographer:audit -- verify --ledger /tmp/cartographer-self-audit.R8lVr4/audits/openrouter-removal.json --fail-on-leftovers --json`
- `bun run cartographer:notes -- audit --out /tmp/cartographer-self-audit.R8lVr4 --json`

Direct CLI findings:

- Default index wrote `manifest.json`, `graph.sqlite`, `notes.jsonl`, JSON schemas, and `CODEBASE_MAP.md`; it did not write default `graph.json`.
- SQLite integrity check returned `ok`; table counts included 223 nodes, 511 edges, 1,153 typed symbol rows, 133 file membership rows, and 133 index cache rows.
- `verify --fresh` reported zero node, edge, finding, and annotation drift between persisted and live graph.
- Path brief for `src/code-graph/commands.ts` reported dirty-state freshness, exact anchor, read-first paths, impact paths, tests, validation commands, omissions, source-read-required guidance, and 3,196 estimated tokens under an 8,000-token request.
- Explicit JSONL export wrote `nodes.jsonl` and `edges.jsonl`; explicit debug export wrote `graph.debug.json`.
- Removal audit produced a ledger with evidence classes, replacement requirements, validation receipts, and blockers.
- `audit verify --fail-on-leftovers` failed closed with active leftovers.
- `notes audit` produced a valid empty-note audit with zero issues.

## Prompt-To-Artifact Checklist

| PRD requirement | Concrete evidence | Status |
| --- | --- | --- |
| Master PRD is source of truth | `docs/prds/cartographer-v2-master-prd.md` exists and supersedes `docs/prds/cartographer-v2-code-graph.md`; the older PRD states it is historical context. | Done |
| Product boundary: deterministic evidence compiler, not agent manager | README and `cartographer-v2` skill describe Cartographer as deterministic evidence tooling; no code spawns subagents or owns task plans. | Done |
| Simplified command spine | `package.json` exposes `cartographer:index`, `brief`, `audit`, `notes`, and `export`; README lists these as core commands. | Done |
| Advanced/debug commands demoted | README and help list `slice`, `impact`, `context`, `preflight`, `adoption`, `annotate`, and `annotations` as compatibility/debug/legacy surfaces. | Done |
| `index` writes SQLite by default | Direct `/tmp/cartographer-self-audit.R8lVr4` index wrote `graph.sqlite` and no default `graph.json`; `src/code-graph/__tests__/commands.test.ts` asserts the same. | Done |
| `manifest.json` and schema artifacts | Direct index wrote `manifest.json`, `schema/brief.schema.json`, `schema/audit-ledger.schema.json`, and `schema/notes.schema.json`. | Done |
| `view` reads persisted graph | Direct `cartographer:view --out /tmp/cartographer-self-audit.R8lVr4 --json` returned graph totals from the persisted artifact. | Done |
| `verify` validates SQLite and freshness | Direct `verify --fresh --json` returned `ok: true` and zero live/persisted diff; graph-contract eval includes SQLite artifact compatibility. | Done |
| `brief` is primary agent interface | `src/code-graph/brief.ts`, `src/code-graph/commands.ts`, README, and skill docs make `brief` the normal interface. | Done |
| Brief anchors: path, package, env, DB, IaC, audit, changed | Command tests cover env, DB, IaC, and changed anchors; direct CLI checked path, package, env, and changed; audit-anchor behavior is covered by eval/command tests. | Done |
| Brief modes | `commands.ts` supports `planning`, `implementation`, `review`, and `prd`; direct path/package/env checks exercised multiple modes. | Done |
| Brief budgets and omission metadata | Direct path brief reported `requestedTokens: 8000`, `estimatedTokens: 3196`, `truncated: true`, and readFirst omission metadata. | Done |
| Brief JSON and prompt renderers | Command tests and `brief-packet:self` eval verify JSON; README/help expose prompt/JSON format. | Done |
| Brief includes freshness, dirty state, validation, notes, findings, source-read instruction | Direct path brief included `fresh-with-dirty-worktree`, validation commands, notes, findings, omissions, and `sourceReadRequired: true`. | Done |
| Normal `slice`, `impact`, `context`, `preflight` are bounded | `cli-output-brakes:ark` passed: default ARK impact 4,107 estimated tokens, default context 3,897 estimated tokens, depth above 2 fails without explicit escape hatch. | Done |
| Full nested graph payload requires debug intent | `commands.ts` gates debug graph payloads behind `--debug-graph`; explicit export is required for debug JSON/JSONL. | Done |
| `export graph` explicit debug JSON/JSONL | Direct export with `--from /tmp/cartographer-self-audit.R8lVr4` wrote `nodes.jsonl`, `edges.jsonl`, and `graph.debug.json`. | Done |
| Removal audit ledger | Direct `audit removal --target OPENROUTER` produced `cartographer.audit-ledger.v1`; Supabase fixture eval verifies the target workflow. | Done |
| Removal evidence classes | Latest `removal-audit:fixture` seeds and finds 21 Supabase-style classes with 1.0 recall. | Done |
| Removal replacement requirements and validation receipts | `removal-audit:fixture` verifies auth/database replacement requirements plus discovered validation receipts. | Done |
| `audit verify --live`/fresh default and fail-closed behavior | Command tests verify live-by-default behavior; direct `audit verify --fail-on-leftovers` exited 1 with active blockers. | Done |
| Notes ingest/audit/accept/retire | `notes-lifecycle:fixture` and command tests cover ingest, audit, accept, stale-after-drift, and retire paths. | Done |
| Accepted notes in briefs, stale notes as warnings | Command tests assert accepted notes appear in `brief`, then evidence drift moves them to stale. | Done |
| Symbols are typed records, not graph nodes | `graph-contract:self` and `graph-contract:ark` include `symbols-are-typed-facts`: 0 symbol graph nodes, 0 `DEFINES` edges, typed symbol facts present. | Done |
| Findings are records, not graph nodes | `findings` are stored separately in `graph.sqlite`; `Finding` is not a node kind in `types.ts` or schema. | Done |
| Agent annotations are notes/overlays, not graph facts | `AgentAnnotation` remains an internal legacy type name, but annotations are stored as overlay/notes records and not graph nodes; `notes` is the product surface. | Done |
| Normalized provenance | `graph-contract:*` checks `manifest-default-provenance` and precise confidence vocabulary; SQLite includes `provenance_classes` plus evidence join tables. | Done |
| File membership and monorepo surface records | SQLite includes `file_membership`; monorepo-scale fixture verifies package membership, generated surface, bounded package brief, and membership in brief records. | Done |
| Incremental index reuse | Command tests verify unchanged repo reuse through the SQLite file-hash cache; direct SQLite audit found `index_cache` populated for 133 files. | Done |
| Local workspace package imports | Builder test now imports `@fixture/shared` from `apps/web/src/index.ts` and verifies it links to `package:packages/shared`, not `external:@fixture/shared`. | Done |
| Output path noise control | `brief.ts` and `context.ts` filter directory/unreadable paths; Axia package brief evidence records no full graph payload and controlled read-first output. | Done |
| Security/privacy | Graph contract checks raw env secret values are absent; removal fixture includes CI secret-name detection without secret values; safe validation filters exclude destructive commands. | Done |
| ARK read-only target | Latest smoke/Codex reports include `graph-contract:ark`, `ark-preflight`, and `cli-output-brakes:ark`; artifacts are written under `/tmp`, not ARK. | Done |
| Axia-style monorepo target | `docs/evals/cartographer-code-graph-eval-suites.md` records a 2026-05-12 read-only Axia run with index, verify, and package brief evidence under `/tmp`. | Done |

## Eval Checklist

| PRD eval suite | Evidence | Status |
| --- | --- | --- |
| Graph Store Contract | Latest smoke and Codex reports include `graph-contract:self` and `graph-contract:ark`, each with 10 passing checks: schema, unique IDs, edge endpoints, typed symbols, provenance vocabulary, manifest default provenance, SQLite artifacts, ignored paths, and env secret values. | Done |
| Token Efficiency | `cli-output-brakes:ark` passes under the current ARK target: impact 4,107 estimated tokens, context 3,897 estimated tokens, and depth cap fails closed. | Done |
| Brief Context Precision | `brief-context-precision:fixture` passes: top-10 and top-20 recall 1.0, 6 emitted paths, 1,513 estimated tokens, no hallucinated paths, validation command recall present. | Done |
| Removal Audit Fixture | `removal-audit:fixture` passes with 1.0 recall across 21 Supabase-style classes and fail-on-leftovers blockers for every active class. | Done |
| Agent Baseline Comparison | `codex-trace-adoption` and `codex-trace-outcomes` pass with `baseline-direct`, `cartographer-brief`, and `cartographer-brief-plus-audit` conditions. | Done |
| Drift And Staleness | `notes-lifecycle:fixture` passes candidate ingest, grounded accept, and stale-after-drift checks; `verify --fresh` direct CLI check passes. | Done |
| Security And Privacy | Graph contracts check no env secret values; removal fixture covers CI secret names; validation safety filters exclude deploy/apply/reset/seed/start/dev/preview/postinstall by default. | Done |
| Monorepo Scale | `monorepo-scale:fixture` passes package membership, generated surface, bounded package brief, and membership fields. Axia read-only stress evidence is documented. | Done |

## Phase Checklist

| PRD phase | Evidence | Status |
| --- | --- | --- |
| Phase 0: product surface reset | README, skill docs, help text, and master PRD describe `index`, `brief`, `audit`, `notes`, `export`; legacy surfaces are demoted. | Done |
| Phase 1: output brakes and `brief` | `brief.ts`, `commands.ts`, direct brief output, tests, and `cli-output-brakes:ark` cover modes, budgets, caps, omissions, freshness, JSON/prompt output, and debug escape hatches. | Done |
| Phase 2: schema diet | Symbol nodes and `DEFINES` edges are removed from normal graph facts; findings and annotations are records; ownership is derived through package/file membership. CI workflow facts are also stored in typed `ci_facts`; legacy CI graph nodes remain only as deterministic compatibility/debug records, not as a core agent prompt surface. | Done |
| Phase 3: normalize provenance | Manifest default provenance, provenance classes, evidence tables, and confidence vocabulary are implemented and covered by graph-contract evals. | Done |
| Phase 4: SQLite durable store | `graph.sqlite`, `manifest.json`, SQLite read path, verification, view, brief, and explicit export are implemented and verified. | Done |
| Phase 5: removal audit plus ledger | Removal ledger schema, evidence classes, replacement requirements, validation receipts, live verification, fail-on-leftovers, and reports are implemented and evaluated. | Done |
| Phase 6: notes | Ingest, audit, accept, retire, evidence hashes, stale detection, and brief injection are implemented and tested. | Done |
| Phase 7: incremental indexing and monorepo scale | File-hash cache, extractor-version invalidation, file membership, surface classification, generated/vendor controls, and monorepo evals are implemented. | Done |
| Phase 8: agent harness and outcome evals | Recorded Codex-style adoption and outcome suites pass; live Codex remains explicitly opt-in by design. | Done |

## Reviewed Non-Blockers

- `annotate` and `annotations` still exist as legacy compatibility shims. This is allowed by the PRD's advanced/legacy command section, and daily docs point users to `notes`.
- `AgentAnnotation` remains an internal type name for legacy overlay records. It is not a graph node and is surfaced through `notes`.
- CI workflow/job/run-step facts still have deterministic compatibility graph records in debug/slice surfaces, while SQLite also stores them in `ci_facts`. This preserves existing selectors without making CI a normal agent prompt dump.
- `SERVICE_QUERIES_TABLE` and `SERVICE_CALLS_RPC` remain because they are parser-backed explicit data-access evidence with provenance, not claimed deep call graph precision.
- `CODEBASE_MAP.md` is still generated by default. The PRD leaves this as an open product question and states the human map is optional; it is not the durable or agent-facing graph artifact.
- Validation receipts are ledger records, not a task runner. Existing receipt status is preserved during verification through ledger merge behavior.

## Missing Or Unverified Items

No required PRD launch item remains missing after the current audit.

Future work that is explicitly outside the v2 launch scope:

- compiler/LSP/SCIP-backed deep call graph precision
- cloud/runtime drift checks
- vector memory
- autonomous Cartographer agent orchestration
- LLM annotation as a normal workflow
- live Codex distribution claims beyond the explicit opt-in live profile

## Completion Verdict

Complete.

The standalone Cartographer v2 implementation now satisfies the master PRD launch criteria: deterministic SQLite index, bounded briefs, removal audit ledgers, notes lifecycle, explicit debug exports, monorepo controls, ARK/Axia read-only evidence, and passing smoke/Codex eval reports.
