# Cartographer Gold Task Candidates

Date: 2026-05-11
Status: research candidate list, not runnable fixture data

This document turns the ARK and Axia graph traces into candidate gold navigation tasks. It is intentionally not a scaffolded eval runner, fixture snapshot, or judge prompt. It exists so the approved implementation can start from observed tasks instead of inventing hypothetical ones.

## Candidate Task Format

Each approved task should eventually become a structured record with:

- `id`
- `repoProfile`
- `prompt`
- `startSelector`
- `goldFiles`
- `goldNodes`
- `expectedValidationCommands`
- `mustMentionRisks`
- `forbiddenClaims`
- `currentGraphEvidence`
- `knownCurrentFailure`

## Smoke Candidates

### CG-SMOKE-001: ARK Code Graph Type Change Impact

Prompt:

> Identify what must be reviewed before changing `CodeGraphNodeKind` or `CodeGraphEdgeKind`.

Start selector:

```text
path:src/code-graph/types.ts
```

Gold files:

- `src/code-graph/types.ts`
- `src/code-graph/schema.ts`
- `src/code-graph/builder.ts`
- `src/code-graph/graph-store.ts`
- `src/code-graph/query.ts`
- `src/code-graph/artifacts.ts`
- `src/code-graph/commands.ts`
- `src/code-graph/openrouter.ts`
- `src/code-graph/__tests__/schema.test.ts`
- `src/code-graph/__tests__/builder.test.ts`
- `src/code-graph/__tests__/commands.test.ts`
- `src/code-graph/__tests__/openrouter.test.ts`

Expected validation commands:

```bash
bun test ./src/code-graph
bun run typecheck
```

Current graph evidence:

```bash
bun run cartographer:preflight -- --root . --live --path src/code-graph/types.ts
bun run cartographer:context -- --root . --live --path src/code-graph/types.ts --depth 1 --json
```

Observed compact context: 56 slice nodes, 130 slice edges, 32 impact nodes, 78 impact edges, 16 primary paths, and 19 impact paths. It correctly surfaces all current gold files, direct focused tests including `src/code-graph/__tests__/builder.test.ts` and `src/code-graph/__tests__/commands.test.ts`, the module-level `runCommand` value `bun test ./src/code-graph`, and the root package `runCommand` value `bun run typecheck`. Full context JSON is the scoring input when the runner needs nested slice/impact details.

Known current gap:

- The impact view does not rank files. The eval should check top-k ordering once ranking exists.

### CG-SMOKE-002: ARK Builder Flow Readiness

Prompt:

> Explain the code graph builder flow and list the files an agent should read before editing extraction behavior.

Start selector:

```text
path:src/code-graph/builder.ts
```

Gold files:

- `src/code-graph/builder.ts`
- `src/code-graph/inventory.ts`
- `src/code-graph/extractors.ts`
- `src/code-graph/package-facts.ts`
- `src/code-graph/graph-store.ts`
- `src/code-graph/graph-paths.ts`
- `src/code-graph/path-utils.ts`
- `src/code-graph/types.ts`
- `src/code-graph/__tests__/builder.test.ts`

Expected validation commands:

```bash
bun test ./src/code-graph/__tests__/builder.test.ts
bun test ./src/code-graph
```

Current graph evidence:

```bash
bun run cartographer:preflight -- --root . --live --path src/code-graph/builder.ts
bun run cartographer:context -- --root . --live --path src/code-graph/builder.ts --depth 1 --json
```

Observed compact context: 90 slice nodes, 137 slice edges, 20 impact nodes, 28 impact edges, 14 primary paths, and 7 impact paths. It surfaces the focused builder test command first, followed by other impacted-dependent tests and the module-level command `bun test ./src/code-graph`. Current eval runner should use compact context for agent preflight and full context JSON for scoring.

Known current gap:

- Cold repos need an index first unless the caller uses `--live`.

### CG-SMOKE-003: Axia Env Var Usage

Prompt:

> Find where `DATABASE_URL` is consumed and what validation should run before changing DB connection handling.

Start selector:

```text
env:DATABASE_URL
```

Gold files:

- `apps/api/src/__tests__/helpers/cleanupTestOrg.ts`
- `apps/api/src/__tests__/integration/privileges.integration.test.ts`
- `apps/api/src/__tests__/integration/rls.integration.test.ts`
- `apps/api/src/__tests__/integration/sqlTestHelpers.ts`
- `.env.example`
- `.env.test`
- `supabase/config.toml`

Expected validation commands:

```bash
cd apps/api && bun run test:integration
bun run db:status
```

Current graph evidence:

```bash
bun run cartographer:preflight -- --out /tmp/ark-axia-codegraph --path env:DATABASE_URL
bun run cartographer:context -- --out /tmp/ark-axia-codegraph --path env:DATABASE_URL --depth 1 --json
```

Observed compact context: 22 slice nodes, 19 slice edges, 22 impact nodes, 19 impact edges, 4 primary paths, and `package:apps/api` plus root package context. It finds test consumers through `USES_ENV`; the `preflight` command is now the preferred agent entry point because it also carries package and validation-command summary.

Known current gap:

- It does not include `.env.example`, `.env.test`, or Supabase config as env declaration/config evidence.

### CG-SMOKE-004: Workspace Package Dependency Impact

Prompt:

> A shared workspace package changed. Identify dependent app packages and the validation command that should run for each dependent package.

Fixture shape:

- Root `package.json` with workspaces such as `packages/*` and `apps/*`.
- `packages/shared/package.json` named `@fixture/shared`.
- `apps/web/package.json` named `@fixture/web` with `dependencies: { "@fixture/shared": "workspace:*" }` and an external dependency such as `react`.
- `apps/web` has a `typecheck` or `test` script.

Start selector:

```text
package:packages/shared
```

Gold nodes:

- `package:packages/shared`
- `package:apps/web`
- `script:apps/web:typecheck` or the fixture's app validation script

Expected validation commands:

```bash
cd apps/web && bun run typecheck
```

Current graph evidence:

```bash
bun test ./src/code-graph/__tests__/builder.test.ts --timeout 120000
```

Observed on 2026-05-11:

- `79af608` adds local package-to-package `DEPENDS_ON` edges when a dependency name matches another package in the same repo.
- The focused builder test verifies the edge from `package:apps/web` to `package:packages/shared`, verifies that external `react` is not emitted as a package dependency edge, and verifies that impact from the shared package surfaces the dependent app package plus its validation script.

Known current gap:

- This is covered as a unit fixture, not yet as a runnable eval fixture or report. Approval is still required before converting it into `scripts/cartographer-code-graph-evals.ts` fixture data.

## Baseline Candidates

### CG-BASE-001: Axia Generated DB Type Ownership

Prompt:

> Explain what owns `apps/api/src/types/database.types.ts` and what should be regenerated or validated if migrations change.

Start selector:

```text
path:apps/api/src/types/database.types.ts
```

Gold files and nodes:

- `apps/api/src/types/database.types.ts`
- root `package.json` script `db:types`
- root `package.json` scripts `db:reset:types`, `db:reset:seed:types`
- `supabase/migrations/**`
- `supabase/config.toml`
- representative importing services under `apps/api/src/services/**`
- representative integration tests under `apps/api/src/__tests__/integration/**`

Expected validation commands:

```bash
bun run db:types
bun run typecheck:api
cd apps/api && bun run test:integration
```

Current graph evidence:

```bash
bun run cartographer:preflight -- --out /tmp/ark-axia-codegraph --path apps/api/src/types/database.types.ts
bun run cartographer:context -- --out /tmp/ark-axia-codegraph --path apps/api/src/types/database.types.ts --depth 1 --json
```

Observed compact context: 103 slice nodes, 418 slice edges, 101 impact nodes, 414 impact edges, 84 primary paths, and `db:types` in validation guidance. It finds the generated artifact, the `db:types` owner, and many import consumers. Full context JSON should be used when scoring whether generated ownership and schema-authority wording are separated correctly.

Known current failures:

- `GENERATED_BY` now links `apps/api/src/types/database.types.ts` to `db:types`; keep this task to verify generated-ownership recall and schema-authority wording.
- The slice is broad because the DB type file is imported by many services.
- The graph does not yet distinguish generated type ownership from schema authority.

### CG-BASE-002: Axia Chat Message Tool Work Change

Prompt:

> Find the files, tests, and design-workbench fixtures relevant to changing chat message tool-work rendering.

Start selector:

```text
path:apps/web/src/features/chat/components/ChatMessage.tsx
```

Gold files:

- `apps/web/src/features/chat/components/ChatMessage.tsx`
- `apps/web/src/features/chat/components/ReportCard.tsx`
- `apps/web/src/features/chat/components/TaskBriefingCard.tsx`
- `apps/web/src/features/chat/components/ToolWorkPill.tsx`
- `apps/web/src/features/chat/utils/toolWorkPill.ts`
- `apps/web/src/features/chat/utils/toolWorkPill.test.ts`
- `apps/web/src/features/chat/utils/toolGroupCollapse.ts`
- `apps/web/src/features/chat/utils/toolParts.ts`
- `apps/web/src/features/chat/styles/messages.css`
- `apps/web/src/features/chat/styles/tool-timeline.css`
- `apps/workbench/src/fixtures/chat.fixture.ts`
- `apps/workbench/src/variants/chat/**`
- `apps/web/src/features/chat/components/ChatMessage.test.tsx`

Expected validation commands:

```bash
cd apps/web && bun run typecheck
cd apps/web && bun run lint
cd apps/workbench && bun run typecheck
bun test apps/web/src/features/chat/components/ChatMessage.test.tsx apps/web/src/features/chat/utils/toolWorkPill.test.ts
```

Current graph evidence:

```bash
bun run cartographer:preflight -- --out /tmp/ark-axia-codegraph --path apps/web/src/features/chat/components/ChatMessage.tsx
bun run cartographer:context -- --out /tmp/ark-axia-codegraph --path apps/web/src/features/chat/components/ChatMessage.tsx --depth 1 --json
```

Observed:

- Compact context slice totals: 62 nodes, 123 edges.
- Compact context impact totals: 17 nodes, 16 edges.
- Package context: `package:apps/web` and root.
- The slice includes dirty/untracked chat files and key imports.

Known current failures:

- Workbench variant files are not connected to the chat source by deterministic edges.
- CSS files are not connected to TSX files.
- `TESTS` edges now exist; this task should measure whether the slice returns the right tests with acceptable precision, not just import/path proximity.
- Precision is not yet measured; broad sibling inclusion may hide noisy context.

### CG-BASE-003: Axia Web/API Type Boundary

Prompt:

> Find all package boundaries affected by changing the API router output types consumed by the web app.

Start selector:

```text
path:apps/web/src/types.ts
```

Gold files:

- `apps/web/src/types.ts`
- `apps/api/src/trpc/router.ts`
- `apps/web/src/lib/trpcClient.ts`
- route/app files that consume `AppSection`
- representative feature consumers under `apps/web/src/features/**`
- root/package scripts for web and API typecheck

Expected validation commands:

```bash
bun run typecheck:web
bun run typecheck:api
```

Current graph evidence:

```bash
bun run cartographer:preflight -- --out /tmp/ark-axia-codegraph --path apps/web/src/types.ts
bun run cartographer:context -- --out /tmp/ark-axia-codegraph --path apps/web/src/types.ts --depth 1 --json
```

Observed compact context: 76 slice nodes, 180 slice edges, 51 impact nodes, 142 impact edges, and package context for `package:apps/web`, root, and `package:apps/api`.

Known current failures:

- The impact set is very large. `cartographer impact --depth` now supports bounded expansion, and slice/impact JSON includes ranked `summary.affectedPackages`; the future eval runner still needs to score affected-package accuracy against gold tasks.
- Package/task ownership is exposed through `summary.validationCommands`, but evals still need to prove the commands are specific enough for large monorepo changes.

### CG-BASE-004: Axia Supabase RLS/Migration Change

Prompt:

> Identify migration files, generated types, service code, and integration tests relevant to changing Supabase RLS policy behavior.

Start selectors:

```text
kind:DbPolicy
path:supabase/migrations/0003_rls.sql
```

Gold files and nodes:

- `supabase/migrations/0003_rls.sql`
- relevant later migrations that alter policies
- `apps/api/src/types/database.types.ts`
- `apps/api/src/supabase/permissions.ts`
- integration tests under `apps/api/src/__tests__/integration/*rls*`
- root `db:reset`, `db:types`, `test:integration` scripts

Expected validation commands:

```bash
bun run db:reset:types
cd apps/api && bun run test:integration
bun run typecheck:api
```

Known current failures:

- SQL policy nodes exist, but app-to-policy and policy-to-service relationships are not modeled.
- Generated type ownership is linked through `GENERATED_BY`; remaining risk is whether slices distinguish generated output from schema authority and validation commands.
- Runtime observed drift is out of scope for local deterministic smoke.

## Live Agent Harness Candidates

### CG-LIVE-001: Codex Graph-Mandated Builder Explanation

Condition:

- `baseline-direct`: Codex can use normal shell/file tools.
- `graph-prompted`: prompt asks Codex to run `cartographer preflight --path <target>` before source reads.
- `graph-mandated`: harness fails if source reads happen before graph context.

Prompt:

> Explain the code graph builder flow and list files to read before editing extraction behavior.

Expected graph commands:

```bash
bun run cartographer:preflight -- --root . --live --path src/code-graph/builder.ts
```

The runner may call full `context --json` separately for scoring nested slice/impact details, but agent adoption should be measured against compact context use before source reads.

Required trace metrics:

- graph adoption rate
- source reads before graph use
- first correct file
- final context list validity
- redundant reads
- hallucinated path count

### CG-LIVE-002: Codex Axia Chat Slice

Prompt:

> On the Axia repo, find the source, tests, styles, and workbench fixtures for changing chat message tool-work rendering. Do not edit files.

Expected graph commands:

```bash
bun run cartographer:preflight -- --out /tmp/ark-axia-codegraph --path apps/web/src/features/chat/components/ChatMessage.tsx
```

The runner may call full `context --json` separately for scoring nested slice/impact details, but agent adoption should be measured against compact context use before source reads.

Known current failure:

- The current graph does not link styles or workbench variants strongly enough. A good agent may still find them by direct source search after graph orientation. The eval should distinguish graph recall from agent follow-up search recall.

## Goodhart Notes

- Do not pass tasks by returning every file under `apps/web/src/features/chat`.
- Do not count generated DB type consumers as proof of generated ownership.
- Do not count package scripts as affected-task evidence unless linked to the relevant package or generated artifact.
- Do not let live Codex runs silently skip graph commands.
- Do not treat `docs/CODEBASE_MAP.md` as gold truth; it is advisory and may be stale.
