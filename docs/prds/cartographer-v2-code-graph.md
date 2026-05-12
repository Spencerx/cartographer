# Cartographer v2: Graph CLI And Agent Overlay

Status: superseded by `docs/prds/cartographer-v2-master-prd.md`
Owner: Cartographer
Date: 2026-05-11

This document is retained as historical context for the original graph CLI and agent overlay direction. The current product source of truth is `docs/prds/cartographer-v2-master-prd.md`, which narrows v2 around `index`, `brief`, `audit`, and `notes`.

## Goal

Build Cartographer v2 as a standalone graph-first codebase navigation tool for agents and humans.

The product is a CLI and library that indexes a repository into durable graph artifacts, exposes compact task slices for coding agents, and supports reviewable agent annotations for the knowledge that static parsers cannot safely infer.

ARK and Axia OS are test repositories only. Cartographer v2 must live in this repository and run against external repos by path.

## Problem

Cartographer v1 creates a useful human map, but large monorepos need a queryable system of record. A one-time markdown summary becomes too large, stale, and hard for agents to use before editing.

Static parsers can find files, imports, exports, symbols, package manifests, tests, IaC files, and simple dependency edges. They cannot reliably infer module intent, generated-file ownership, runtime coupling, operational risk, or the practical edit recipe for a feature area.

Cartographer v2 solves this by separating deterministic graph facts from semantic annotations.

## Product Shape

Cartographer v2 ships as:

- `cartographer index` - build graph artifacts for a repo.
- `cartographer update` - rebuild existing artifacts.
- `cartographer view` - summarize graph health and contents.
- `cartographer slice` - return a bounded graph slice for a selector.
- `cartographer impact` - show downstream impact for a path or node.
- `cartographer context` - combine slice and impact for agent planning.
- `cartographer preflight` - emit compact JSON and prompt context before agent edits.
- `cartographer annotate` - generate candidate semantic overlay notes.
- `cartographer annotations` - audit, accept, retire, or reject overlay notes.
- `cartographer adoption` - score whether an agent used graph context before source spelunking.

The CLI is the first-class interface. Future integrations can wrap it with MCP, Codex tool adapters, Claude skills, or CI jobs without moving core graph logic into those runtimes.

## Architecture

Cartographer v2 has two layers.

### Deterministic Graph

The deterministic graph contains facts extracted from repo evidence:

- File inventory, git state, ignored output, dirty artifacts.
- Package/workspace manifests and local package dependencies.
- Scripts, validation commands, and runnable task hints.
- Syntax facts: definitions, exports, imports, env vars, tests.
- Data and IaC facts: SQL tables/functions/policies, Terraform resources/modules, YAML workflows where supported.
- Docs and generated artifacts, with freshness and ownership signals.

Every deterministic fact must carry provenance that points back to source evidence. If Cartographer cannot prove a relationship, it should omit the edge or mark it as lower-confidence metadata rather than inventing a fact.

### Agent Semantic Overlay

The overlay contains grounded guidance produced by agents or humans:

- What a module is for.
- Which files are false friends.
- Which generated files should not be edited directly.
- Which migrations, policies, queues, buckets, resources, tests, and docs move together.
- Which commands validate a task slice.
- Which risks a future agent should check before editing.

Overlay notes are not canonical graph facts. They start as candidates and become useful only when they cite evidence and pass review. Accepted notes can appear in preflight context; stale, retired, and candidate notes should be handled explicitly.

## Graph Artifacts

Default output directory: `docs/codegraph`.

Required artifacts:

- `schema.json` - JSON schema for graph snapshots.
- `manifest.json` - root, git state, generation time, scanner version, file counts.
- `graph.json` - full graph snapshot.
- `CODEBASE_MAP.md` - human-readable map generated from graph facts and accepted notes.

Future artifacts:

- `overlays/*.json` - semantic annotations.
- `reports/*.json` - eval and adoption reports.
- `snapshots/*.json` - graph diffs over time.

## Node And Edge Scope

Initial node kinds:

- `RepoSnapshot`
- `Directory`
- `File`
- `Doc`
- `GeneratedArtifact`
- `Package`
- `PackageScript`
- `ExternalDependency`
- `Symbol`
- `EnvVar`
- `DbTable`
- `DbFunction`
- `DbPolicy`
- `IaCResource`
- `IaCModule`
- `DirtyArtifact`

Initial edge kinds:

- `CONTAINS`
- `DEFINES`
- `EXPORTS`
- `IMPORTS`
- `TYPE_IMPORTS`
- `TESTS`
- `DEPENDS_ON`
- `USES_ENV`
- `RESOURCE_DEPENDS_ON`
- `AFFECTS`

The graph should stay useful even when precision providers are unavailable. Tree-sitter, TypeScript compiler APIs, SCIP, LSP, Terraform plan/state, and cloud drift checks are optional quality upgrades, not requirements for v0.

## Agent Workflow

The intended agent flow is:

1. Run `cartographer preflight --root <repo> --path <target>`.
2. Read the compact graph context first.
3. Use direct source reads to verify the graph before editing.
4. Make the change.
5. Run validation commands suggested by the graph when relevant.
6. Emit enough trace evidence for `cartographer adoption` to verify graph-first behavior.

Cartographer must help agents start in the right place, not replace source inspection.

## Monorepo Requirements

Cartographer v2 must handle large monorepos by design:

- Detect workspace packages and package ownership.
- Keep package selectors bounded so sibling packages do not bleed into each other.
- Surface local package dependency edges.
- Rank affected packages in context output.
- Suggest root-level and package-level validation commands.
- Ignore large generated output by default.
- Preserve dirty generated artifacts as graph facts when they may affect work.

## IaC And Runtime Requirements

IaC support should start deterministic and file-based:

- Parse Terraform resources/modules and dependency references.
- Parse SQL migrations, tables, functions, policies, and generated type files when present.
- Parse CI workflow files enough to link validation and deployment tasks.
- Treat observed runtime state, drift, and cloud credentials as optional non-default inputs.

Desired config, generated types, migration history, and observed runtime state are separate evidence classes. Cartographer must not collapse them into one fact.

## CLI Quality Bar

The CLI is done for v0 when:

- It installs in this repo with Bun.
- `bun run cartographer -- --help` works.
- `cartographer index --root <repo>` writes graph artifacts without mutating the target repo except the chosen output directory.
- `view`, `slice`, `impact`, `context`, and `preflight` work from persisted artifacts.
- `adoption` scores runtime traces deterministically.
- `annotations` audits overlay candidates and blocks stale or unsupported evidence.
- Typecheck and graph tests pass.

## Eval Targets

Cartographer v2 evals must measure three tiers.

### Tier 1: Deterministic Graph Correctness

Targets:

- Schema validation pass rate: 100%.
- Indexer crash rate on target repos: 0%.
- Package ownership recall on fixture monorepos: at least 95%.
- Local package dependency precision on fixtures: at least 95%.
- Test-path suggestion precision on fixtures: at least 90%.
- IaC dependency extraction precision on Terraform fixtures: at least 90%.
- No default indexing of `node_modules`, `dist`, build outputs, or generated report folders.

### Tier 2: Agent Adoption And Navigation

Targets:

- Graph-first trace pass rate: at least 80% in prompted agent runs.
- Source reads before graph context: below 20% of graph-mandated traces.
- Expected file/path mention rate in final response: at least 90% for gold tasks.
- Expected validation command execution rate: at least 70% for tasks with clear commands.
- Context payload p95 size: under the configured prompt budget.
- Preflight p95 runtime: fast enough to run before normal coding turns on large repos.

### Tier 3: Task Outcome Improvement

Targets:

- Better or equal patch correctness versus baseline direct source exploration.
- Lower irrelevant file reads on gold tasks.
- Higher hidden dependency recall on cross-package and IaC tasks.
- Lower missed validation-command rate.
- No increase in unsupported claims in final responses.

Gold suites should include:

- Small fixture repo for exact expected graph facts.
- Standalone Cartographer repo self-index.
- Large monorepo stress target, for example Axia OS.
- External reference repo, for example ARK, used only as a read-only target when explicitly selected.
- IaC fixture with Terraform and SQL relationships.
- Dirty worktree fixture with generated artifacts and stale overlays.

## Research Grounding

The design follows current code graph and repository-navigation patterns:

- Tree-sitter is a strong syntax substrate, but not a complete product graph.
- SCIP, LSP, and TypeScript compiler APIs can add precision when repo configuration supports them.
- Nx and Turborepo separate project graphs from task graphs; Cartographer should do the same.
- Terraform and IaC tooling separate desired config, dependency edges, policy, state, and drift.
- Agent graph tooling should be evaluated on adoption and task outcomes, not only graph accuracy.

The research notes live under `.evals/research/` and should be treated as supporting material, not product source of truth.

## Roadmap

### Phase 0: Standalone Extraction

- Keep all Cartographer graph code in this repository.
- Provide Bun package metadata, CLI entrypoint, typecheck, and tests.
- Port the existing graph prototype into standalone modules.
- Rebrand user-facing output away from any starter repo.

### Phase 1: Stable Graph Contract

- Freeze v0 schema.
- Add fixture coverage for every node and edge kind.
- Add graph diff output.
- Add artifact compatibility checks.

### Phase 2: Monorepo And IaC Depth

- Improve workspace ownership and affected-package ranking.
- Expand Terraform, SQL, CI, generated type, and docs extractors.
- Add optional precision providers behind capability checks.

### Phase 3: Agent Overlay

- Harden annotation generation and review workflows.
- Track stale notes by source hash.
- Add accepted-note injection to preflight.
- Add reportable overlay precision and usefulness checks.

### Phase 4: Integrations

- Add MCP server wrapper.
- Add Codex/Claude preflight adapters.
- Add CI report mode.
- Add scheduled graph freshness checks.

## Non-Goals

- Do not move Cartographer core logic into ARK or any other runtime.
- Do not make agent annotations canonical graph facts.
- Do not require cloud credentials or runtime drift data for default indexing.
- Do not mutate target repositories except for explicitly requested output artifacts.
- Do not use vector search as the primary graph source of truth.
- Do not claim precision-provider quality when only syntax extraction ran.

## Open Questions

- Which precision provider should ship first: TypeScript compiler API, SCIP, or LSP?
- Should `docs/codegraph` be committed by default or treated as local cache?
- What is the right default p95 preflight budget for very large monorepos?
- Which overlay notes are valuable enough to show agents by default?
- Should MCP be a thin wrapper over CLI artifacts or a long-lived graph server?
