import { z } from "zod";
import { CODE_GRAPH_SCHEMA_VERSION, type CodeGraphSnapshot } from "./types.ts";

const nodeKindSchema = z.enum([
	"RepoSnapshot",
	"Workspace",
	"Package",
	"PackageScript",
	"File",
	"Directory",
	"Symbol",
	"Entrypoint",
	"Route",
	"Test",
	"Doc",
	"GeneratedArtifact",
	"Config",
	"EnvVar",
	"BoundaryPolicy",
	"Finding",
	"AgentAnnotation",
	"ExternalDependency",
	"Migration",
	"DbTable",
	"DbFunction",
	"DbPolicy",
	"DbTrigger",
	"IaCModule",
	"IaCResource",
	"DirtyArtifact",
]);

const edgeKindSchema = z.enum([
	"CONTAINS",
	"DEFINES",
	"IMPORTS",
	"TYPE_IMPORTS",
	"EXPORTS",
	"REFERENCES",
	"CALLS",
	"ROUTES_TO",
	"TESTS",
	"DOCUMENTS",
	"GENERATED_BY",
	"USES_ENV",
	"CONFIGURES",
	"SERVICE_QUERIES_TABLE",
	"SERVICE_CALLS_RPC",
	"TABLE_REFERENCES_TABLE",
	"DEPENDS_ON",
	"TASK_DEPENDS_ON",
	"AFFECTS",
	"OWNED_BY",
	"GUARDED_BY",
	"STALE_BECAUSE",
	"ANNOTATES",
	"MIGRATION_CREATES",
	"MIGRATION_ALTERS",
	"MIGRATION_DROPS",
	"MIGRATION_SUPERSEDES",
	"RESOURCE_DEPENDS_ON",
]);

export const codeGraphEvidenceSchema = z.object({
	path: z.string(),
	startLine: z.number().int().positive().optional(),
	endLine: z.number().int().positive().optional(),
	hash: z.string().optional(),
});

const provenanceSchema = z.object({
	source: z.enum([
		"filesystem",
		"git",
		"package-manager",
		"syntax",
		"typescript",
		"fallow",
		"iac-parser",
		"sql-parser",
		"ci-parser",
		"doc-parser",
		"agent-annotation",
		"human-review",
	]),
	evidence: z.array(codeGraphEvidenceSchema),
	confidence: z.enum(["deterministic", "compiler-backed", "agent-inferred", "human-reviewed"]),
	freshness: z.enum(["fresh", "dirty", "stale", "unknown"]),
	snapshotCommit: z.string().optional(),
	scannerVersion: z.string().optional(),
});

export const agentAnnotationSchema = z.object({
	id: z.string(),
	targetNodeId: z.string(),
	kind: z.enum([
		"purpose",
		"invariant",
		"edit-warning",
		"workflow",
		"test-guidance",
		"generated-ownership",
		"iac-link",
		"risk",
	]),
	summary: z.string(),
	evidence: z.array(codeGraphEvidenceSchema),
	author: z.object({
		type: z.enum(["agent", "human"]),
		name: z.string().optional(),
		runId: z.string().optional(),
	}),
	confidence: z.enum(["agent-inferred", "human-reviewed"]),
	status: z.enum(["candidate", "accepted", "stale", "retired"]),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export const codeGraphSnapshotSchema = z.object({
	schemaVersion: z.literal(CODE_GRAPH_SCHEMA_VERSION),
	manifest: z.object({
		schemaVersion: z.literal(CODE_GRAPH_SCHEMA_VERSION),
		root: z.string(),
		generatedAt: z.string(),
		scanner: z.object({
			name: z.literal("cartographer"),
			version: z.string(),
		}),
		git: z.object({
			commit: z.string().optional(),
			dirty: z.boolean(),
			trackedFiles: z.number().int().nonnegative(),
			untrackedFiles: z.number().int().nonnegative(),
			modifiedFiles: z.number().int().nonnegative(),
			deletedFiles: z.number().int().nonnegative(),
		}),
		totals: z.object({
			files: z.number().int().nonnegative(),
			packages: z.number().int().nonnegative(),
			nodes: z.number().int().nonnegative(),
			edges: z.number().int().nonnegative(),
			findings: z.number().int().nonnegative(),
		}),
		ignorePatterns: z.array(z.string()),
	}),
	nodes: z.array(
		z.object({
			id: z.string(),
			kind: nodeKindSchema,
			label: z.string(),
			path: z.string().optional(),
			metadata: z.record(z.string(), z.unknown()),
			provenance: provenanceSchema,
		}),
	),
	edges: z.array(
		z.object({
			id: z.string(),
			kind: edgeKindSchema,
			from: z.string(),
			to: z.string(),
			label: z.string().optional(),
			metadata: z.record(z.string(), z.unknown()),
			provenance: provenanceSchema,
		}),
	),
	findings: z.array(
		z.object({
			id: z.string(),
			severity: z.enum(["info", "warn", "error"]),
			message: z.string(),
			nodeId: z.string().optional(),
			evidence: z.array(codeGraphEvidenceSchema),
		}),
	),
	annotations: z.array(agentAnnotationSchema),
}) satisfies z.ZodType<CodeGraphSnapshot>;

export function codeGraphJsonSchema(): Record<string, unknown> {
	return {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		title: "Cartographer Code Graph Snapshot",
		type: "object",
		required: ["schemaVersion", "manifest", "nodes", "edges", "findings", "annotations"],
		properties: {
			schemaVersion: { const: CODE_GRAPH_SCHEMA_VERSION },
			manifest: { type: "object" },
			nodes: { type: "array" },
			edges: { type: "array" },
			findings: { type: "array" },
			annotations: { type: "array" },
		},
		additionalProperties: false,
	};
}
