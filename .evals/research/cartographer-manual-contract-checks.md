# Cartographer Manual Contract Checks

Date: 2026-05-11
Status: manual verification evidence, not a runnable eval suite

This records one-off graph contract checks against fresh ARK and Axia graph snapshots. These commands do not replace the future approved `scripts/cartographer-code-graph-evals.ts` runner.

## Snapshot Builds

ARK:

```bash
/usr/bin/time -l bun run cartographer:index -- --root . --out /tmp/ark-cartographer-contract-check
```

Observed:

- Wall time: 0.41s
- Max resident set size: 232,701,952 bytes
- Git state: dirty at `3261f703312d`
- Graph: 564 files, 3,619 nodes, 8,498 edges, 0 findings
- Edge checks: 585 `TESTS`, 0 `GENERATED_BY`, 0 `SERVICE_QUERIES_TABLE`, 0 `SERVICE_CALLS_RPC`, 37 `TABLE_REFERENCES_TABLE`

Axia:

```bash
/usr/bin/time -l bun run cartographer:index -- --root /Users/saint/dev/axia-os --out /tmp/ark-axia-codegraph-contract-check
```

Observed:

- Wall time: 0.56s
- Max resident set size: 312,606,720 bytes
- Git state: dirty at `4a6ccfa48862`
- Graph: 1,106 files, 5,093 nodes, 12,261 edges, 0 findings
- Edge checks: 400 `TESTS`, 1 `GENERATED_BY`, 228 `SERVICE_QUERIES_TABLE`, 9 `SERVICE_CALLS_RPC`, 88 `TABLE_REFERENCES_TABLE`

Current refresh:

```bash
/usr/bin/time -l bun run cartographer:index -- --root . --out /tmp/ark-cartographer-contract-check-current
# Then run the contract checker below against:
# /tmp/ark-cartographer-contract-check-current/graph.json
# /tmp/ark-axia-codegraph-current/graph.json
```

Observed ARK result:

- Wall time: 0.38s
- Max resident set size: 242,434,048 bytes
- Git state: clean at `ddab7dd4260a`
- Graph: 612 files, 4,046 nodes, 9,408 edges, 0 findings
- Edge checks: 629 `TESTS`, 0 `GENERATED_BY`, 0 `SERVICE_QUERIES_TABLE`, 0 `SERVICE_CALLS_RPC`, 37 `TABLE_REFERENCES_TABLE`

Observed current contract output:

ARK:

```json
{
  "schemaValid": true,
  "files": 612,
  "nodes": 4046,
  "edges": 9408,
  "serviceQueriesTable": 0,
  "serviceCallsRpc": 0,
  "tableReferencesTable": 37,
  "testEdges": 629,
  "generatedByEdges": 0,
  "duplicateNodeIds": 0,
  "duplicateEdgeIds": 0,
  "danglingEdgeCount": 0,
  "ignoredPathCount": 0,
  "envVarsWithMetadata": 0,
  "nodesMissingEvidence": 0,
  "findings": 0
}
```

Axia:

```json
{
  "schemaValid": true,
  "files": 1106,
  "nodes": 5093,
  "edges": 12261,
  "serviceQueriesTable": 228,
  "serviceCallsRpc": 9,
  "tableReferencesTable": 88,
  "testEdges": 400,
  "generatedByEdges": 1,
  "duplicateNodeIds": 0,
  "duplicateEdgeIds": 0,
  "danglingEdgeCount": 0,
  "ignoredPathCount": 0,
  "envVarsWithMetadata": 0,
  "nodesMissingEvidence": 0,
  "findings": 0
}
```

## Historical Contract Check Command

This original command/result pair is retained as first-run historical evidence. The current refresh above reused the same checks against `/tmp/ark-cartographer-contract-check-current/graph.json` and `/tmp/ark-axia-codegraph-current/graph.json`.

```bash
bun --eval '
import { codeGraphSnapshotSchema } from "./src/code-graph/schema.ts";
const paths = ["/tmp/ark-cartographer-contract-check/graph.json", "/tmp/ark-axia-codegraph-contract-check/graph.json"];
for (const path of paths) {
  const graph = codeGraphSnapshotSchema.parse(await Bun.file(path).json());
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const duplicateNodeIds = graph.nodes.length - nodeIds.size;
  const edgeIds = new Set(graph.edges.map((edge) => edge.id));
  const duplicateEdgeIds = graph.edges.length - edgeIds.size;
  const danglingEdges = graph.edges.filter((edge) => !nodeIds.has(edge.from) || !nodeIds.has(edge.to));
  const ignoredPaths = graph.nodes.flatMap((node) => node.path ? [node.path] : []).filter((path) => /(^|\/)(node_modules|dist|\.git)(\/|$)|(^|\/)docs\/codegraph(\/|$)|(^|\/)specs\/states(\/|$)|(^|\/)states(\/|$)/.test(path));
  const envVarsWithMetadata = graph.nodes.filter((node) => node.kind === "EnvVar" && Object.keys(node.metadata).length > 0);
  const missingEvidence = graph.nodes.filter((node) => node.provenance.evidence.length === 0 && node.kind !== "RepoSnapshot");
  console.log(JSON.stringify({ path, schemaValid: true, files: graph.manifest.totals.files, nodes: graph.nodes.length, edges: graph.edges.length, serviceQueriesTable: graph.edges.filter((edge) => edge.kind === "SERVICE_QUERIES_TABLE").length, serviceCallsRpc: graph.edges.filter((edge) => edge.kind === "SERVICE_CALLS_RPC").length, tableReferencesTable: graph.edges.filter((edge) => edge.kind === "TABLE_REFERENCES_TABLE").length, testEdges: graph.edges.filter((edge) => edge.kind === "TESTS").length, generatedByEdges: graph.edges.filter((edge) => edge.kind === "GENERATED_BY").length, duplicateNodeIds, duplicateEdgeIds, danglingEdgeCount: danglingEdges.length, ignoredPathCount: ignoredPaths.length, envVarsWithMetadata: envVarsWithMetadata.length, nodesMissingEvidence: missingEvidence.length, findings: graph.findings.length }, null, 2));
  if (duplicateNodeIds || duplicateEdgeIds || danglingEdges.length || ignoredPaths.length || envVarsWithMetadata.length || missingEvidence.length) process.exitCode = 1;
}
'
```

## Historical Results

ARK:

```json
{
  "schemaValid": true,
  "files": 564,
  "nodes": 3619,
  "edges": 8498,
  "serviceQueriesTable": 0,
  "serviceCallsRpc": 0,
  "tableReferencesTable": 37,
  "testEdges": 585,
  "generatedByEdges": 0,
  "duplicateNodeIds": 0,
  "duplicateEdgeIds": 0,
  "danglingEdgeCount": 0,
  "ignoredPathCount": 0,
  "envVarsWithMetadata": 0,
  "nodesMissingEvidence": 0,
  "findings": 0
}
```

Axia:

```json
{
  "schemaValid": true,
  "files": 1106,
  "nodes": 5093,
  "edges": 12261,
  "serviceQueriesTable": 228,
  "serviceCallsRpc": 9,
  "tableReferencesTable": 88,
  "testEdges": 400,
  "generatedByEdges": 1,
  "duplicateNodeIds": 0,
  "duplicateEdgeIds": 0,
  "danglingEdgeCount": 0,
  "ignoredPathCount": 0,
  "envVarsWithMetadata": 0,
  "nodesMissingEvidence": 0,
  "findings": 0
}
```

## Interpretation

The current refresh strengthens Tier 1 confidence:

- Current graph snapshots parse against `codeGraphSnapshotSchema`.
- Node and edge IDs are unique.
- Edges do not dangle.
- Default ignored paths do not contaminate the snapshots.
- Env var nodes contain names only; no env-var metadata payload is stored.
- All non-root nodes have provenance evidence.

Remaining gap:

- These are manual checks. They must be converted into the `graph-contract` suite after explicit eval runner approval.
