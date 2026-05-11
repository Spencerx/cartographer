# Cartographer Axia OS Stress Run

Date: 2026-05-11
Repo: `/Users/saint/dev/axia-os`
Output: `/tmp/ark-axia-codegraph`
Mode: read-only stress run against a dirty monorepo/IaC-style repo. No Axia repo files were written.

## Why This Repo

Axia OS is the monorepo pattern example for Cartographer v2:

- Bun workspace root with `apps/api`, `apps/web`, and `apps/workbench`.
- Supabase config, seed data, migrations, generated DB types, and reset/type-generation scripts.
- Playwright e2e tests.
- Formal specs under `specs/`.
- Existing `docs/CODEBASE_MAP.md`.
- Dirty state with modified, deleted, and untracked files.
- Large local footprint: `31G` including ignored local outputs and dependencies.

## Index Command

```bash
/usr/bin/time -l bun run cartographer:index -- --root /Users/saint/dev/axia-os --out /tmp/ark-axia-codegraph
```

Observed result:

- Wall time: 0.50s
- Max resident set size: 310,444,032 bytes
- Git state: dirty at `4a6ccfa48862`
- Graph: 1,106 files, 5,093 nodes, 12,261 edges, 0 findings

Current refresh against the same Axia checkout and current ARK Cartographer code:

```bash
/usr/bin/time -l bun run cartographer:index -- --root /Users/saint/dev/axia-os --out /tmp/ark-axia-codegraph-current
```

Observed result:

- Wall time: 0.60s
- Max resident set size: 315,621,376 bytes
- Git state: dirty at `4a6ccfa48862`
- Graph: 1,106 files, 5,093 nodes, 12,261 edges, 0 findings
- Ignored-path contamination: 0
- Edge baselines remained stable: 400 `TESTS`, 1 `GENERATED_BY`, 228 `SERVICE_QUERIES_TABLE`, 9 `SERVICE_CALLS_RPC`, 88 `TABLE_REFERENCES_TABLE`

Current compact context probes:

- `dbtable:public.agent_runs`, depth 1: 48 slice nodes, 111 slice edges, 38 impact nodes, 60 impact edges, 21 primary paths, 15 impact paths; affected packages are `package:apps/api` rank 1 and `package:.` rank 2; validation commands include API build/lint/typecheck/test scripts plus root `db:types` and `db:status`.
- `path:apps/web/src/features/chat/components/ChatMessage.tsx`, depth 1: 62 slice nodes, 123 slice edges, 17 impact nodes, 16 impact edges, 22 primary paths, 4 impact paths; affected packages are `package:apps/web` rank 1 and `package:.` rank 2; validation commands include web build/lint/typecheck plus root build/lint/typecheck scripts.

Interpretation:

- Current Cartographer code preserves the prior Axia scale and edge baselines.
- The DB table context remains bounded enough for agent preflight.
- The chat component context is intentionally broader and remains a precision target for the future navigation-slice eval.

Node kinds:

- 4 `Package`
- 53 `PackageScript`
- 66 `DbTable`
- 33 `DbFunction`
- 112 `DbPolicy`
- 98 `DbTrigger`
- 33 `EnvVar`
- 39 `DirtyArtifact`
- 7 `GeneratedArtifact`

Edge kinds:

- 3,472 `IMPORTS`
- 867 `TYPE_IMPORTS`
- 314 `MIGRATION_CREATES`
- 90 `MIGRATION_ALTERS`
- 5 `MIGRATION_DROPS`
- 1 `GENERATED_BY`
- 228 `SERVICE_QUERIES_TABLE`
- 9 `SERVICE_CALLS_RPC`
- 88 `TABLE_REFERENCES_TABLE`
- 400 `TESTS`
- 77 `USES_ENV`
- 39 `AFFECTS`

Ignored-path contamination check:

```bash
jq -r '[.nodes[] | select(.path|type=="string") | .path] | map(select(startswith("node_modules/") or contains("/node_modules/") or startswith("dist/") or contains("/dist/") or startswith("specs/states/") or contains("/states/"))) | length' /tmp/ark-axia-codegraph/graph.json
```

Observed result: `0`

## Package And Script Coverage

Package nodes found:

- `package:.` -> `axia`
- `package:apps/api` -> `@axia/api`
- `package:apps/web` -> `@axia/web`
- `package:apps/workbench` -> `@axia/workbench`

Important package scripts found:

- root `typecheck`, `lint`, `test`, `test:e2e`, `db:reset`, `db:types`
- API `test`, `test:unit`, `test:integration`, `test:fuzz`
- web `build`, `lint`, `typecheck`
- workbench `build`, `check`, `extract-tokens`, `typecheck`

## Monorepo Cross-App Edges

The graph found cross-app imports, including:

- `apps/web/src/types.ts` -> `apps/api/src/trpc/router.ts`
- `apps/web/src/features/email/components/StatusBadge.tsx` -> `apps/api/src/services/email/email.types.ts`

This validates the PRD requirement that Cartographer v2 must model package/app boundaries instead of only file trees.

## Chat Slice Probe

Command:

```bash
bun run cartographer:slice -- --out /tmp/ark-axia-codegraph --selector path:apps/web/src/features/chat/components/ChatMessage.tsx
```

Observed result:

- 50 nodes
- 113 edges
- includes `DirtyArtifact` for modified `ChatMessage.tsx`
- includes local imports, sibling chat components, hooks, utils, tests, and related new untracked chat components

Impact command:

```bash
bun run cartographer:impact -- --out /tmp/ark-axia-codegraph --path apps/web/src/features/chat/components/ChatMessage.tsx
```

Observed result:

- 11 nodes
- 12 edges
- includes route chain from `apps/web/src/main.tsx` through app/router/page to `ChatContainer`, `VirtualizedMessageList`, and `ChatMessage.test.tsx`

## Data Impact Probe

Command:

```bash
bun run cartographer:impact -- --out /tmp/ark-axia-codegraph --path dbtable:public.agent_runs --depth 1
```

Observed result:

- 38 nodes
- 60 edges
- includes direct service/test files that query `agent_runs`
- includes directly referencing tables such as `live_run_snapshots`, `chat_messages`, and `chat_summaries`
- includes owner/ancestor validation scripts such as `build`, `lint`, `typecheck`, and `test:*`
- includes safe DB schema/type/status scripts such as `db:types` and `db:status`, while excluding runtime-only or destructive scripts such as `dev`, `preview`, `start`, `postinstall`, `db:reset`, and `db:seed`
- JSON output exposes the same package/task context under `summary.affectedPackages` and `summary.validationCommands` for harness scoring: the top packages are `package:apps/api` at rank 1 and `package:.` at rank 2, with app-level API validation commands plus root `db:types` and `db:status`

Expansion comparison:

- `--depth 2`: 100 nodes, 225 edges
- unbounded: 431 nodes, 1,310 edges

This gives agents a bounded first pass for table blast-radius work instead of forcing a full transitive dump.

The combined agent preflight command also works against the same graph:

```bash
bun run src/cli/index.ts cartographer context --out /tmp/ark-axia-codegraph --path dbtable:public.agent_runs --depth 1 --json
bun run src/cli/index.ts cartographer context --out /tmp/ark-axia-codegraph --path dbtable:public.agent_runs --depth 1 --compact --json
```

Observed result:

- selector: `dbtable:public.agent_runs`
- slice: 48 nodes, 111 edges
- impact: 38 nodes, 60 edges
- compact timing: 0.11s wall time, 157 MB max RSS; omits nested slice/impact payloads while preserving summary and totals
- affected packages: `package:apps/api` rank 1, `package:.` rank 2
- validation commands include app-level API `build`, `lint`, `typecheck`, `test:*` scripts and root validation/DB-safe scripts

## Current Gaps And Resolved Baselines

These observations are useful eval targets:

- `GENERATED_BY` edges: 1. `apps/api/src/types/database.types.ts` now links to the root `db:types` package script. Remaining generated-ownership evals should check recall/precision across fixtures and make sure slices distinguish generated output from schema authority.
- `TESTS` edges: 400. Test-for-source relationships now exist through local test imports. Navigation evals still need recall and precision gates so broad sibling context does not pass by accident.
- App-to-data edges: 228 `SERVICE_QUERIES_TABLE` and 9 `SERVICE_CALLS_RPC`.
- Table-to-table edges: 88 `TABLE_REFERENCES_TABLE`.
- Remaining data-graph evals should measure whether table/RPC impact slices return the right service files without flooding agents with broad transitive context.
- IaC resource nodes: 0 in this repo. Axia currently exercises Supabase SQL/data graph more than Terraform/Kubernetes graph support.
- Slice noise: `path:ChatMessage.tsx` includes useful context, but also many sibling files. Gold navigation evals need precision gates so broad directory neighborhoods cannot pass by dumping context.
- Symbol heuristic: one extracted symbol appears as `so` in `ChatMessage.tsx`, likely from syntax/pattern extraction rather than a meaningful semantic symbol. This supports the PRD requirement to separate parser-derived facts from compiler-backed facts.

## Evaluation Implication

Axia should become the first live stress case, not the first frozen fixture:

- Use it to catch scale, dirty-state, generated-artifact, and monorepo/IaC blind spots.
- Do not write graph artifacts into Axia by default.
- Freeze smaller fixture repos for deterministic pass/fail evals.
- Add a dedicated Axia live profile after the deterministic eval runner is approved.
