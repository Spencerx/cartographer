# Cartographer v2 Master PRD

Status: master PRD
Owner: Cartographer
Date: 2026-05-12
Supersedes: `docs/prds/cartographer-v2-code-graph.md` as the product source of truth

## Summary

Cartographer v2 is a deterministic repo evidence compiler for highly capable coding agents.

It is not an agent manager, planner, PRD writer, semantic memory brain, or grep replacement. The orchestrator agent remains the intelligence layer. Cartographer gives that orchestrator and its subagents bounded structural context, evidence-backed ledgers, graph freshness, drift checks, and completion audits that make large codebase work cleaner and easier to verify.

The v2 product spine is:

```bash
cartographer index
cartographer brief
cartographer audit
cartographer notes
```

Everything else is internal, advanced, debug, legacy, or future integration.

## Problem

Modern coding agents are strong at grep, source reads, tool chaining, and local reasoning. They can often navigate well without a graph. The remaining failure mode is not "agents cannot search." The failure mode is that large monorepo work requires many evidence classes to be checked, remembered, and rechecked across code, packages, tests, docs, migrations, IaC, env vars, generated artifacts, and deployment config.

Examples:

- A Supabase removal is not complete just because `rg supabase` has fewer hits.
- A risky auth change is not scoped just because the first relevant file was found.
- A stale module note is dangerous if its source evidence changed.
- A subagent prompt is weaker when it lacks package ownership, tests, validation commands, and known omissions.
- A principal engineer cannot safely call a migration clean without a ledger of checked surfaces and retained exceptions.

Cartographer v2 solves the evidence organization problem around intelligent agents. It helps the orchestrator know what to inspect, what was checked, what remains unknown, and what must be verified before declaring work complete.

## Product Boundary

### Cartographer Should Do

- Build and refresh deterministic repo graph artifacts.
- Produce bounded briefs around paths, packages, symbols, env vars, DB resources, IaC resources, audits, or changed files.
- Rank likely relevant files, packages, tests, validation commands, and impact paths.
- Track graph freshness, git commit, dirty state, evidence hashes, and omitted context.
- Create and verify task-specific audit ledgers, starting with service/dependency removals.
- Store evidence-backed notes from humans or agents as reviewable claims, not canonical facts.
- Detect stale notes when cited evidence changes.
- Emit prompt-sized context packets for orchestrator and subagent use.
- Provide machine-readable JSON and human-readable Markdown.
- Work without any model call.

### Cartographer Should Not Do

- Manage subagents.
- Decide task plans.
- Write PRDs.
- Own approvals.
- Replace grep or source reads.
- Become a generic vector memory system.
- Treat agent observations as truth without evidence.
- Use cloud credentials or runtime provider APIs by default.
- Claim deep call/reference precision unless backed by a real provider.
- Hide uncertainty, omissions, stale state, or low-confidence extraction.

## Users

### Principal Engineer Orchestrator

The orchestrator is the main intelligent layer. It discusses with Saint, researches first, writes PRDs, decides implementation strategy, prompts subagents, reviews findings, and owns judgment.

Cartographer helps the orchestrator by providing:

- repo atlas context
- focused briefs
- evidence classes to check
- risk and blast-radius surfaces
- validation command candidates
- subagent prompt context
- completion ledgers
- stale note warnings

### Subagents

Subagents are capable workers or scouts. They grep, inspect source, implement, and verify scoped work.

Cartographer helps subagents by providing:

- bounded context for their area
- likely files to open first
- tests and validation commands
- known warnings and stale notes
- structured evidence report expectations

### Humans

Humans use Cartographer output to inspect codebase shape, approve PRDs, review cleanup completeness, and audit retained references.

## Operating Model

Cartographer v2 assumes the intelligence layer is outside the tool.

The normal workflow is:

1. A principal-engineer orchestrator discusses the problem with Saint.
2. The orchestrator uses Cartographer during research to understand repo structure, evidence classes, impact surfaces, stale notes, and validation paths.
3. The orchestrator decides whether to keep researching, write a PRD, split work across subagents, or implement directly.
4. Subagents receive bounded Cartographer briefs as extra context alongside normal grep, source reads, docs, tests, and direct reasoning.
5. Subagents return evidence-backed reports.
6. Cartographer records or verifies those reports only as notes, ledgers, and receipts.
7. The orchestrator remains responsible for judgment, review, plan changes, and final claims.

Cartographer should not require a natural-language task to be useful. The orchestrator may ask for a brief around a path, package, env var, DB object, audit ledger, changed files, or repo area before it has decided on a plan. That makes Cartographer useful during research and discussion, not only after a task is already scoped.

### Initialization And Refresh

Cartographer has two setup modes:

- Initial repo setup: build the deterministic graph, produce a first repo overview, identify major packages and evidence classes, and optionally ingest reviewed notes from human or agent research.
- Refresh after changes: rebuild graph artifacts, diff against the prior graph, mark stale notes, verify affected ledgers, and expose drift before new work begins.

Initialization may be helped by a separate skill or external agent workflow, but that workflow sits above Cartographer. The v2 CLI remains deterministic and does not manage subagents itself.

### Prompting Subagents

When the orchestrator delegates work, Cartographer should help compile compact, evidence-backed context packets.

A good subagent packet contains:

- the relevant anchor and graph freshness
- primary files to inspect
- related packages and dependencies
- likely tests and validation commands
- audit classes in scope
- known omissions and stale notes
- explicit reporting expectations

The packet should never tell the subagent that source inspection is optional. It should orient the subagent before grep and file reads.

## Core Concepts

### Deterministic Graph Facts

Facts extracted from source evidence:

- repo snapshot
- directories, files, docs, generated artifacts, dirty artifacts
- workspaces and packages
- package scripts
- external dependencies
- imports, type imports, exports, symbols
- tests and conservative test-target edges
- env var names, never values
- SQL migrations, tables, functions, policies, triggers
- IaC modules and resources
- CI/deploy references where deterministic

Every fact must carry provenance: source path, optional line range, extractor, confidence, freshness, and graph snapshot.

### Brief

A brief is the primary agent-facing context compiler.

It answers:

- What should the agent read first?
- What package or subsystem owns this anchor?
- What depends on or is affected by this anchor?
- What tests and validation commands are likely relevant?
- What notes are accepted or stale?
- What findings or omissions should the agent know?
- How fresh is this graph?

Briefs are not plans. The orchestrator decides the plan.

### Audit Ledger

An audit ledger is a task-specific completeness record. The first major ledger type is `removal`.

It tracks:

- target
- evidence classes
- findings
- statuses
- retained exceptions
- validation receipts
- graph snapshot
- live verification results

This is the main feature that clearly beats grep.

### Notes

Notes are evidence-backed semantic claims written by humans or agents.

Notes may explain:

- module purpose
- false friends
- generated-file ownership
- runtime coupling
- migration gotchas
- validation advice
- edit warnings

Notes are never deterministic graph facts. They must be anchored to evidence and may be `candidate`, `accepted`, `stale`, or `retired`.

## Command Surface

### `cartographer index`

Build or refresh deterministic graph artifacts.

Example:

```bash
cartographer index --root . --out .cartographer
```

Requirements:

- Must not mutate the target repo except the chosen output directory.
- Must record root, git commit, dirty state, generated time, scanner version, file count, node count, edge count, and findings.
- Must ignore default generated/vendor paths.
- Must store env var names only.
- Must be safe to run repeatedly after branch changes.

Alias:

```bash
cartographer update
```

`update` is only an alias for `index`; it is not a separate product concept.

### `cartographer brief`

Compile bounded context around an anchor.

Examples:

```bash
cartographer brief --path src/auth/client.ts --format prompt --budget 12000
cartographer brief --package apps/web --format json
cartographer brief --env SUPABASE_URL --mode planning
cartographer brief --audit supabase-removal --mode prd
cartographer brief --changed --mode review
```

Supported anchors for v2:

- `--path <path>`
- `--package <package-id>`
- `--symbol <symbol-id>`
- `--env <ENV_NAME>`
- `--db <db-node-id>`
- `--iac <iac-node-id>`
- `--audit <ledger-id-or-path>`
- `--changed`

Supported modes:

- `planning`
- `implementation`
- `review`
- `prd`

Modes are render profiles over the same underlying context object. They must not become separate commands like `dossier`, `scout-kit`, `prompt-pack`, or `prd-context`.

Brief output must include:

- graph snapshot and freshness
- selected anchor
- primary paths
- impact paths
- test paths
- affected packages
- validation commands
- accepted notes
- stale notes
- findings
- omitted context counts
- confidence and provenance metadata

### `cartographer audit removal`

Create a removal/completeness ledger for a dependency, service, platform, env prefix, package, DB resource, or provider.

Example:

```bash
cartographer audit removal --target supabase \
  --write .cartographer/audits/supabase-removal.json \
  --format markdown
```

The command should produce:

- direct references
- dependency and package references
- lockfile references
- generated artifact references
- env var references
- SQL, migration, function, policy, trigger, and storage references
- edge function references
- CI, deploy, and secret-name references
- docs, tests, mocks, and fixtures
- unknown or unclassified hits
- intentional-retention placeholders
- suggested validation commands
- explicit omissions and confidence notes

### `cartographer audit verify`

Re-run checks against a ledger after implementation.

Example:

```bash
cartographer audit verify \
  --ledger .cartographer/audits/supabase-removal.json \
  --live \
  --fail-on-leftovers
```

Requirements:

- Must default to live graph/search checks for final verification.
- Must fail when active leftovers exist and `--fail-on-leftovers` is set.
- Must distinguish removed, replaced, retained, unknown, and needs-review states.
- Must never claim completion without listing evidence classes checked.
- Must record validation receipts when supplied.

### `cartographer notes ingest`

Ingest structured evidence-backed notes from agents or humans.

Example:

```bash
cartographer notes ingest subagent-report.json
```

Ingested notes default to `candidate`.

Required note shape:

```json
{
  "target": "supabase-removal",
  "claims": [
    {
      "kind": "removed-reference",
      "summary": "Removed Supabase client wrapper from web auth.",
      "evidence": [
        { "path": "apps/web/package.json" },
        { "path": "apps/web/src/auth/client.ts" }
      ]
    }
  ]
}
```

### `cartographer notes audit`

Check notes for evidence quality and staleness.

Example:

```bash
cartographer notes audit
```

Checks:

- valid JSON
- stable IDs
- duplicate IDs
- known target nodes or ledger IDs
- evidence paths exist
- evidence hashes still match
- accepted notes still grounded
- candidate notes are review-ready or blocked

### `cartographer notes accept`

Promote an audit-clean candidate note.

Example:

```bash
cartographer notes accept <note-id> --reviewer saint
```

### `cartographer notes retire`

Retire a stale, unsafe, obsolete, or unhelpful note.

Example:

```bash
cartographer notes retire <note-id> --reviewer saint
```

## Advanced And Legacy Commands

These may remain available for debugging, evals, or compatibility, but they are not the main v2 product story:

- `slice`
- `impact`
- `context`
- `preflight`
- `adoption`
- `annotate`
- `annotations`

Recommended mapping:

| Existing command | v2 treatment |
| --- | --- |
| `slice` | advanced/debug graph primitive |
| `impact` | advanced/debug graph primitive |
| `context` | implementation behind `brief` |
| `preflight` | alias or machine-mode variant of `brief` |
| `adoption` | eval/harness tool, not daily user command |
| `annotate` | experimental only |
| `annotations` | migrate to `notes` |

Do not ship these as separate core concepts:

- `dossier`
- `scout-kit`
- `prompt-pack`
- `prd-context`

Those are `brief --mode ...` renderings.

## Supabase Removal Anchor Workflow

The Supabase removal use case is the primary v2 wedge because it requires completeness across many surfaces.

### Step 1: Index

```bash
cartographer index --root . --out .cartographer
```

### Step 2: Create Removal Ledger

```bash
cartographer audit removal --target supabase \
  --write .cartographer/audits/supabase-removal.json \
  --format markdown
```

### Step 3: PRD Context

```bash
cartographer brief --audit .cartographer/audits/supabase-removal.json --mode prd
```

The orchestrator writes the PRD. Cartographer only supplies evidence.

### Step 4: Scoped Subagent Context

```bash
cartographer brief --package apps/web --audit supabase-removal --mode implementation
cartographer brief --env SUPABASE_URL --audit supabase-removal --mode implementation
cartographer brief --db public.users --audit supabase-removal --mode implementation
```

### Step 5: Ingest Findings

```bash
cartographer notes ingest subagent-report.json
cartographer notes audit
```

### Step 6: Verify Completion

```bash
cartographer audit verify \
  --ledger .cartographer/audits/supabase-removal.json \
  --live \
  --fail-on-leftovers
```

### Supabase Evidence Classes

The removal ledger must track:

| Evidence class | Completion standard |
| --- | --- |
| Package dependencies | No active `@supabase/*`, `supabase`, or Supabase CLI packages in manifests or lockfiles unless retained with reason. |
| Imports and SDK clients | No active imports, client factories, wrappers, mocks, or generated client helpers. |
| Env vars | No active `SUPABASE_*` runtime env names in app, CI, deploy config, or active docs unless retained with reason. |
| SQL migrations | Supabase-specific migrations, functions, triggers, grants, and policies reviewed and migrated or retained. |
| RLS policies | RLS policy objects accounted for; no orphaned Supabase auth assumptions. |
| Edge functions | Function directories, deploy config, callers, tests, and docs removed or retained with reason. |
| Storage buckets | Bucket policy, upload, signed URL, mocks, and docs accounted for. |
| Generated DB types | Supabase-generated types removed or replaced with local Postgres generation. |
| Auth/user model | Replacement auth and user model surfaces connected and tested. |
| CI/deploy secrets | Secret names checked; no raw secret values stored. |
| Tests/mocks/fixtures | Supabase-specific tests and mocks removed or rewritten. |
| Docs | Active docs updated; historical retained references explicitly listed. |
| Validation | Typecheck, tests, migration checks, generated-type checks, and relevant integration checks recorded. |

### Ledger Statuses

Supported statuses:

- `not-found`
- `found`
- `removed`
- `replaced`
- `intentional-retention`
- `needs-human-review`
- `unknown`
- `passed`
- `failed`

Avoid binary pass/fail until final verification.

### Clean Removal Definition

A clean Supabase removal means:

- No active Supabase dependency edges.
- No active Supabase imports, SDK client factories, or wrappers.
- No active Supabase env vars or CI/deploy secret names.
- No unaccounted Supabase migrations, policies, functions, triggers, storage buckets, or edge functions.
- No active generated Supabase types.
- No active docs, tests, mocks, or fixtures that assume Supabase.
- Replacement DB/auth surfaces are validated.
- Intentional retained references are documented with evidence and reason.
- Verification commands are recorded.

## Data Model

### Core Node Kinds

- `RepoSnapshot`
- `Directory`
- `File`
- `Doc`
- `GeneratedArtifact`
- `DirtyArtifact`
- `Workspace`
- `Package`
- `PackageScript`
- `ExternalDependency`
- `Symbol`
- `EnvVar`
- `Migration`
- `DbTable`
- `DbFunction`
- `DbPolicy`
- `DbTrigger`
- `IaCModule`
- `IaCResource`

### Postpone Or Move Out Of Core

| Kind | Treatment |
| --- | --- |
| `AgentAnnotation` | overlay record, not graph node |
| `Finding` | finding record, not graph node |
| `BoundaryPolicy` | postpone until deterministic extractor exists |
| `Route` | postpone unless extractor is reliable |
| `Entrypoint` | metadata until stronger extraction exists |
| `Config` | only if deterministic and well-scoped |

### Core Edge Kinds

Keep edge kinds conservative:

- `CONTAINS`
- `DEFINES`
- `EXPORTS`
- `IMPORTS`
- `TYPE_IMPORTS`
- `TESTS`
- `DEPENDS_ON`
- `USES_ENV`
- `MIGRATION_CREATES`
- `MIGRATION_ALTERS`
- `MIGRATION_DROPS`
- `TABLE_REFERENCES_TABLE`
- `RESOURCE_DEPENDS_ON`
- `AFFECTS`

Avoid edge kinds like `CALLS`, `REFERENCES`, `GUARDED_BY`, `OWNED_BY`, and `TASK_DEPENDS_ON` unless backed by a precise provider or explicit evidence.

### Ledger Record

```json
{
  "id": "supabase-removal",
  "kind": "removal",
  "target": "supabase",
  "createdAt": "2026-05-12T00:00:00.000Z",
  "updatedAt": "2026-05-12T00:00:00.000Z",
  "graphSnapshot": {
    "root": ".",
    "commit": "abc123",
    "dirty": true,
    "hash": "..."
  },
  "classes": [
    {
      "class": "package-dependency",
      "status": "found",
      "evidence": [],
      "exceptions": []
    }
  ],
  "validation": []
}
```

### Note Record

```json
{
  "id": "note_...",
  "target": "path:src/auth/client.ts",
  "kind": "edit-warning",
  "summary": "This client wrapper is generated from provider config.",
  "status": "candidate",
  "evidence": [
    {
      "path": "src/auth/client.ts",
      "lineStart": 1,
      "lineEnd": 40,
      "hash": "..."
    }
  ],
  "author": "codex-agent",
  "createdAt": "2026-05-12T00:00:00.000Z"
}
```

## Artifacts

Default output directory:

```text
.cartographer
```

Required artifacts:

```text
.cartographer/manifest.json
.cartographer/graph.json
.cartographer/schema.json
.cartographer/briefs/
.cartographer/audits/
.cartographer/notes.jsonl
.cartographer/reports/
```

Optional human map:

```text
docs/codegraph/CODEBASE_MAP.md
```

The committed human map is optional. The deterministic graph and ledgers are the core product.

## Requirements

### Functional Requirements

- `index` builds a valid graph for this repo and selected external repos by path.
- `brief` can compile context around path, package, env var, DB node, IaC node, audit, and changed-file anchors.
- `brief` respects a prompt budget and records omissions.
- `audit removal` creates a ledger with evidence classes and findings.
- `audit verify` rechecks a ledger in live mode and can fail closed.
- `notes ingest` accepts structured reports and stores candidate notes only.
- `notes audit` reports stale, unsupported, duplicate, and invalid notes.
- Accepted notes appear in briefs only when still grounded.
- Stale notes appear as warnings, not trusted context.
- JSON output is stable enough for eval runners.
- Markdown output is readable enough for humans and orchestrators.

### Non-Functional Requirements

- The graph must work with zero LLM calls.
- The CLI must be fast enough to run before normal coding turns.
- The CLI must be safe on dirty worktrees.
- The tool must not leak secret values.
- Graph extraction must prefer omission or low confidence over false precision.
- Large generated/vendor output must be ignored by default.
- Every user-facing completion claim must show evidence classes checked.

## Evals

### Suite 1: Graph Contract

Purpose: prove graph artifacts are structurally safe.

Targets:

- schema validation: 100%
- duplicate node IDs: 0
- duplicate edge IDs: 0
- dangling edges: 0
- ignored-path contamination: 0
- raw secret values: 0
- non-root nodes without evidence: 0

### Suite 2: Brief Context Precision

Purpose: prove `brief` gives compact, useful context.

Metrics:

- top-10 gold-file recall
- top-20 gold-file recall
- slice precision
- omitted relevant files
- irrelevant files included
- prompt size
- hallucinated paths
- validation command recall

Targets:

- hallucinated paths: 0
- top-10 gold-file recall: at least 90%
- top-20 gold-file recall: at least 95%
- context stays under configured budget
- broad repo dumps fail the eval

### Suite 3: Removal Audit Fixture

Purpose: prove Cartographer beats grep for completeness.

Fixture should include Supabase-style references across:

- dependencies
- lockfiles
- imports
- env vars
- SQL migrations
- RLS policies
- functions and triggers
- storage
- edge functions
- generated types
- CI/deploy config
- docs
- tests
- mocks
- intentional retained historical references

Metrics:

- evidence-class recall
- path recall
- false-positive rate
- unknown/unclassified count
- intentional-retention handling
- leftover detection after partial removal
- ledger completeness

Targets:

- evidence-class recall: at least 95%
- seeded leftover detection: 100%
- no raw secrets in reports
- retained references require evidence and reason

### Suite 4: Agent Baseline Comparison

Purpose: prove intelligent agents perform better with Cartographer than grep alone.

Profiles:

- `baseline-direct`: normal agent tools, no Cartographer instruction
- `graph-prompted`: agent is told to run Cartographer
- `graph-mandated`: harness injects or requires brief before source reads

Metrics:

- gold-file recall
- gold evidence-class recall
- first correct file
- irrelevant file reads
- tool-call count
- context size
- missed validation commands
- hallucinated paths
- leftover references after implementation
- final explanation accuracy

Graph adoption is a guardrail, not the final success metric.

### Suite 5: Drift And Staleness

Purpose: prove notes and ledgers do not rot silently.

Checks:

- accepted notes become stale when evidence hashes change
- stale notes appear as warnings in `brief`
- audit verification does not trust stale notes
- ledger verification reports changed evidence
- branch changes force freshness warnings when graph is stale

### Suite 6: Security And Privacy

Purpose: ensure safe indexing and reporting.

Checks:

- env var names allowed
- secret values redacted
- `.env` files handled conservatively
- CI/deploy secret names only
- no credentialed cloud/runtime drift checks by default
- destructive commands excluded from validation suggestions

## Implementation Plan

### Phase 0: Product Surface Reset

- [ ] Mark this PRD as the v2 source of truth.
- [ ] Update feature docs to describe `index`, `brief`, `audit`, and `notes`.
- [ ] Demote `slice`, `impact`, `context`, `preflight`, `adoption`, `annotate`, and `annotations` in docs.
- [ ] Rename overlay language from annotations to notes in product docs.
- [ ] Keep existing commands as compatibility shims while new surface lands.

### Phase 1: Graph Plus Brief MVP

- [ ] Stabilize graph schema around conservative node and edge kinds.
- [ ] Add `brief` command as the primary context compiler.
- [ ] Support anchors for path, package, env var, DB node, IaC node, audit, and changed files.
- [ ] Add `--mode planning|implementation|review|prd`.
- [ ] Add `--budget` and omission metadata.
- [ ] Include graph freshness, git commit, dirty state, and live/persisted mode in every brief.
- [ ] Render compact JSON and prompt Markdown.
- [ ] Preserve `preflight` as an alias or machine-mode rendering of `brief`.

Acceptance criteria:

- `bun run typecheck` passes.
- Existing graph tests pass.
- New brief tests cover every anchor kind supported in Phase 1.
- Brief fixture top-10 gold-file recall is at least 90%.
- Brief output includes zero hallucinated paths.

### Phase 2: Removal Audit Plus Ledger

- [ ] Add `audit removal --target <thing>`.
- [ ] Add removal ledger schema.
- [ ] Add evidence classes for dependencies, imports, env vars, SQL, RLS, functions, triggers, storage, edge functions, generated types, CI/deploy, docs, tests, mocks, and unknown hits.
- [ ] Add intentional-retention records.
- [ ] Add `audit verify --ledger <file> --live`.
- [ ] Add `--fail-on-leftovers`.
- [ ] Add Supabase removal fixture.
- [ ] Add Markdown and JSON reports.

Acceptance criteria:

- Supabase fixture evidence-class recall is at least 95%.
- Seeded leftovers are detected.
- Unknown/unclassified hits are reported.
- Reports contain no secret values.
- Final verification cannot pass with active unaccounted leftovers.

### Phase 3: Notes

- [ ] Add `notes ingest`.
- [ ] Add `notes audit`.
- [ ] Add `notes accept`.
- [ ] Add `notes retire`.
- [ ] Store evidence hashes for note evidence.
- [ ] Mark accepted notes stale when evidence changes.
- [ ] Inject accepted notes into `brief`.
- [ ] Inject stale notes as warnings only.
- [ ] Migrate or alias existing `annotations` behavior to `notes`.

Acceptance criteria:

- Candidate notes with missing evidence are rejected or blocked from acceptance.
- Accepted notes become stale after source evidence changes.
- Stale notes cannot silently appear as trusted facts.
- Notes improve brief usefulness without increasing hallucinated claims in agent trace evals.

### Phase 4: Agent Harness And Outcome Evals

- [ ] Update eval runner around `brief`, `audit removal`, and `notes`.
- [ ] Add baseline-direct, graph-prompted, and graph-mandated profiles.
- [ ] Score outcomes, not just adoption.
- [ ] Track irrelevant reads, gold-file recall, validation command execution, leftover references, and final explanation accuracy.
- [ ] Keep live Codex profiles opt-in.

Acceptance criteria:

- Cartographer-assisted profiles outperform baseline on evidence-class recall.
- Cartographer-assisted profiles do not increase hallucinated paths.
- Cartographer-assisted profiles reduce missed validation commands.
- Reports label all live/non-comparable conditions.

## Open Questions

- Should `.cartographer` be committed, ignored, or project-configurable by default?
- Should `docs/codegraph/CODEBASE_MAP.md` remain generated by default or become opt-in?
- What is the minimum useful SQL/RLS/storage extractor for Supabase-style apps?
- Should `brief --changed` compare against merge base, last graph snapshot, or both?
- How should validation receipts be attached to ledgers without becoming a task runner?
- What is the review policy for accepting notes: human only, orchestrator only, or configurable?

## Non-Goals For v2

- Autonomous Cartographer agent layer.
- Task queues.
- Subagent spawning.
- PRD generation.
- Cloud runtime drift platform.
- Vector memory.
- MCP server as a required runtime.
- LLM-generated annotations as the default workflow.
- Deep call graph precision without compiler/LSP/SCIP provider receipts.

## Launch Criteria

Cartographer v2 is ready for dogfood when:

- `index`, `brief`, `audit removal`, `audit verify`, and `notes audit` work in this repo.
- The same commands run read-only against ARK and Axia-style monorepo targets.
- Supabase removal fixture eval passes.
- Brief context precision eval passes.
- Drift/staleness eval passes.
- Security/privacy eval passes.
- Existing smoke and Codex trace evals still pass or are intentionally migrated.
- Product docs describe the simplified surface without presenting Cartographer as an orchestrator.

## Final Product Statement

Before an agent changes a large repo, Cartographer gives it bounded structural context and the validation surface. For removals and migrations, Cartographer gives the orchestrator a completion ledger so important evidence classes are not missed.

Cartographer is the deterministic map, audit ledger, and evidence compiler. The orchestrator agent is the intelligence layer. Subagents are scouts and workers that consume briefs and return evidence.
