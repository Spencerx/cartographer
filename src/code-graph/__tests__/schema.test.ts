import { describe, expect, test } from "bun:test";
import { ASSET_EXTENSIONS, DEFAULT_IGNORE_PATTERNS, DEFAULT_MAX_FILE_BYTES, SOURCE_EXTENSIONS } from "../defaults.ts";
import {
	classifyFile,
	defaultIgnorePatterns,
	isDefaultIgnored,
	isTextLike,
	normalizePath,
	relativePath,
	resolveRoot,
} from "../path-utils.ts";
import { codeGraphJsonSchema, codeGraphSnapshotSchema } from "../schema.ts";
import { CODE_GRAPH_SCHEMA_VERSION } from "../types.ts";
import type { BuildCodeGraphOptions, CodeGraphSnapshot, GraphSlice, WriteCodeGraphOptions } from "../types.ts";

describe("code graph contract", () => {
	test("validates the snapshot shape used by cartographer", () => {
		const options: BuildCodeGraphOptions = {
			root: ".",
			maxFileBytes: DEFAULT_MAX_FILE_BYTES,
			now: new Date("2026-05-11T00:00:00.000Z"),
		};
		const writeOptions: WriteCodeGraphOptions = { outDir: "docs/codegraph", mapPath: "docs/CODEBASE_MAP.md" };
		const snapshot: CodeGraphSnapshot = {
			schemaVersion: CODE_GRAPH_SCHEMA_VERSION,
			manifest: {
				schemaVersion: CODE_GRAPH_SCHEMA_VERSION,
				root: resolveRoot(options.root),
				generatedAt: options.now?.toISOString() ?? "",
				scanner: { name: "cartographer", version: "0.1.0" },
				git: {
					commit: undefined,
					dirty: true,
					trackedFiles: 1,
					untrackedFiles: 1,
					modifiedFiles: 1,
					deletedFiles: 0,
				},
				totals: { files: 1, packages: 1, nodes: 1, edges: 0, findings: 0 },
				ignorePatterns: [...DEFAULT_IGNORE_PATTERNS],
				defaultProvenance: {
					source: "syntax",
					confidence: "parser-backed",
					freshness: "fresh",
					scannerVersion: "0.1.0",
				},
			},
			nodes: [
				{
					id: "file:src/index.ts",
					kind: "File",
					label: "src/index.ts",
					path: "src/index.ts",
					metadata: {},
					provenance: {
						source: "filesystem",
						evidence: [{ path: "src/index.ts", startLine: 1, endLine: 1, hash: undefined }],
						confidence: "exact",
						freshness: "dirty",
						snapshotCommit: undefined,
						scannerVersion: "0.1.0",
					},
				},
			],
			edges: [],
			findings: [],
			annotations: [],
		};
		const slice: GraphSlice = {
			selector: "path:src/index.ts",
			title: "Index",
			nodes: snapshot.nodes,
			edges: snapshot.edges,
			findings: snapshot.findings,
			annotations: snapshot.annotations,
		};

		const parsed = codeGraphSnapshotSchema.parse(snapshot);
		expect(parsed.schemaVersion).toBe(snapshot.schemaVersion);
		expect(parsed.nodes).toHaveLength(snapshot.nodes.length);
		expect(codeGraphJsonSchema()).toMatchObject({ title: "Cartographer Code Graph Snapshot" });
		expect(writeOptions.outDir).toBe("docs/codegraph");
		expect(slice.nodes).toHaveLength(1);
	});

	test("classifies paths and default ignores without embedding a monolithic condition", () => {
		expect(normalizePath("src/code-graph/schema.ts")).toBe("src/code-graph/schema.ts");
		expect(relativePath(resolveRoot("."), resolveRoot("."))).toBe(".");
		expect(defaultIgnorePatterns()).toBe(DEFAULT_IGNORE_PATTERNS);
		expect(isDefaultIgnored("node_modules/zod/index.d.ts")).toBe(true);
		expect(isDefaultIgnored("docs/codegraph/snapshot.json")).toBe(true);
		expect(isDefaultIgnored("src/code-graph/schema.ts")).toBe(false);
		expect(classifyFile("src/index.ts")).toBe("source");
		expect(classifyFile("src/generated/client.generated.ts")).toBe("generated");
		expect(classifyFile("public/logo.png")).toBe("asset");
		expect(classifyFile("archive.bin")).toBe("unknown");
		expect(isTextLike("src/index.ts")).toBe(true);
		expect(SOURCE_EXTENSIONS.has(".ts")).toBe(true);
		expect(ASSET_EXTENSIONS.has(".png")).toBe(true);
	});
});
