#!/usr/bin/env bun

import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
	buildCodeGraph,
	codeGraphSnapshotSchema,
	runCartographerPreflight,
	writeCodeGraphArtifacts,
	type CodeGraphSnapshot,
} from "../src/index.ts";

type EvalStatus = "passed" | "failed" | "skipped" | "informational";

interface EvalCheck {
	readonly id: string;
	readonly status: EvalStatus;
	readonly summary: string;
	readonly metrics?: Record<string, unknown> | undefined;
	readonly evidence?: Record<string, unknown> | undefined;
}

interface EvalSuite {
	readonly id: string;
	readonly title: string;
	readonly status: EvalStatus;
	readonly startedAt: string;
	readonly finishedAt: string;
	readonly durationMs: number;
	readonly checks: readonly EvalCheck[];
	readonly metrics?: Record<string, unknown> | undefined;
	readonly notes?: readonly string[] | undefined;
}

interface EvalReport {
	readonly runId: string;
	readonly profile: string;
	readonly status: EvalStatus;
	readonly startedAt: string;
	readonly finishedAt: string;
	readonly durationMs: number;
	readonly options: EvalOptions;
	readonly environment: Record<string, unknown>;
	readonly researchGrounding: readonly string[];
	readonly suites: readonly EvalSuite[];
	readonly failures: readonly string[];
}

interface EvalOptions {
	readonly profile: string;
	readonly targetRoot: string;
	readonly reportDir: string;
	readonly outBase: string;
	readonly maxFileBytes: number;
}

interface TimedResult<T> {
	readonly value: T;
	readonly durationMs: number;
}

const STATUS_ORDER: Record<EvalStatus, number> = {
	failed: 3,
	skipped: 2,
	informational: 1,
	passed: 0,
};

async function main(): Promise<void> {
	const options = evalOptions(Bun.argv.slice(2));
	const startedAtMs = Date.now();
	const startedAt = new Date(startedAtMs).toISOString();
	const runId = `cartographer-code-graph-${options.profile}-${timestampForRunId(startedAt)}`;
	const runOutDir = join(options.outBase, runId);
	const suites: EvalSuite[] = [];

	await mkdir(runOutDir, { recursive: true });
	await mkdir(options.reportDir, { recursive: true });

	suites.push(await graphContractSuite("self", process.cwd(), join(runOutDir, "self"), options.maxFileBytes));
	suites.push(await graphContractSuite("ark", options.targetRoot, join(runOutDir, "ark"), options.maxFileBytes));
	suites.push(await arkPreflightSuite(options, join(runOutDir, "ark")));

	const finishedAtMs = Date.now();
	const report: EvalReport = {
		runId,
		profile: options.profile,
		status: aggregateStatus(suites.map((suite) => suite.status)),
		startedAt,
		finishedAt: new Date(finishedAtMs).toISOString(),
		durationMs: finishedAtMs - startedAtMs,
		options,
		environment: await environment(),
		researchGrounding: [
			"docs/evals/cartographer-code-graph-eval-suites.md",
			"docs/evals/cartographer-code-graph-completion-audit.md",
			"docs/evals/cartographer-code-graph-plan-integrity-audit.md",
			".evals/research/cartographer-code-graph-trace-survey.md",
			".evals/research/cartographer-axia-stress-run.md",
		],
		suites,
		failures: suites.flatMap((suite) =>
			suite.checks
				.filter((check) => check.status === "failed")
				.map((check) => `${suite.id}/${check.id}: ${check.summary}`),
		),
	};

	const reportPath = join(options.reportDir, `${runId}.json`);
	await Bun.write(reportPath, `${JSON.stringify(report, null, 2)}\n`);
	console.log(`${report.status}: wrote ${reportPath}`);
	if (report.status === "failed") process.exitCode = 1;
}

async function graphContractSuite(
	id: string,
	root: string,
	outDir: string,
	maxFileBytes: number,
): Promise<EvalSuite> {
	return timedSuite(`graph-contract:${id}`, `${id} graph contract`, async () => {
		const timedGraph = await timed(() => buildCodeGraph({ root, maxFileBytes }));
		await writeCodeGraphArtifacts(timedGraph.value, { outDir });
		return [
			check("schema-valid", () => {
				codeGraphSnapshotSchema.parse(timedGraph.value);
				return passed("graph snapshot validates", graphMetrics(timedGraph.value, timedGraph.durationMs));
			}),
			check("unique-node-ids", () => duplicateIdCheck("node", timedGraph.value.nodes.map((node) => node.id))),
			check("unique-edge-ids", () => duplicateIdCheck("edge", timedGraph.value.edges.map((edge) => edge.id))),
			check("edge-endpoints-exist", () => edgeEndpointCheck(timedGraph.value)),
			check("no-default-ignored-paths", () => ignoredPathCheck(timedGraph.value)),
			check("no-env-secret-values", () => envSecretValueCheck(timedGraph.value)),
		];
	});
}

async function arkPreflightSuite(options: EvalOptions, outDir: string): Promise<EvalSuite> {
	return timedSuite("ark-preflight", "ARK read-only preflight navigation", async () => {
		const targetPath = "src/code-graph/commands.ts";
		const result = await runCartographerPreflight({
			root: options.targetRoot,
			outDir,
			path: targetPath,
			live: true,
			maxFileBytes: options.maxFileBytes,
		});
		if (!result.ok) {
			return [failed("preflight-runs", result.error.message, { code: result.error.code })];
		}
		const context = result.data.context;
		const validationCommands = context.summary.validationCommands.map((command) => command.runCommand ?? command.command);
		return [
			check("target-path-present", () =>
				expectIncludes(context.summary.primaryPaths, targetPath, "target path appears in primary paths"),
			),
			check("focused-tests-present", () =>
				expectAllIncluded(
					context.summary.testPaths,
					["src/code-graph/__tests__/builder.test.ts", "src/code-graph/__tests__/commands.test.ts"],
					"focused test paths are present",
				),
			),
			check("focused-commands-first", () =>
				expectAllIncluded(
					validationCommands.slice(0, 3).filter((item): item is string => item !== undefined),
					[
						"bun test ./src/code-graph/__tests__/builder.test.ts",
						"bun test ./src/code-graph/__tests__/commands.test.ts",
						"bun test ./src/code-graph",
					],
					"focused validation commands lead compact context",
				),
			),
			check("compact-command-limit-recorded", () =>
				context.limits.validationCommands > 0
					? passed("compact validation command limit is recorded", {
							limit: context.limits.validationCommands,
							omitted: context.omissions.validationCommands,
							emitted: context.summary.validationCommands.length,
						})
					: failed("compact-command-limit-recorded", "compact validation command limit was not positive"),
			),
			check("preflight-timings-recorded", () =>
				passed("preflight timing phases recorded", {
					durationMs: result.data.durationMs,
					...result.data.timings,
				}),
			),
		];
	});
}

async function timedSuite(
	id: string,
	title: string,
	buildChecks: () => Promise<readonly EvalCheck[]>,
): Promise<EvalSuite> {
	const startedAtMs = Date.now();
	const startedAt = new Date(startedAtMs).toISOString();
	const checks = await buildChecks();
	const finishedAtMs = Date.now();
	return {
		id,
		title,
		status: aggregateStatus(checks.map((check) => check.status)),
		startedAt,
		finishedAt: new Date(finishedAtMs).toISOString(),
		durationMs: finishedAtMs - startedAtMs,
		checks,
	};
}

async function timed<T>(fn: () => Promise<T>): Promise<TimedResult<T>> {
	const startedAt = Date.now();
	const value = await fn();
	return { value, durationMs: Date.now() - startedAt };
}

function check(id: string, fn: () => EvalCheck): EvalCheck {
	try {
		return { ...fn(), id };
	} catch (cause) {
		return failed(id, cause instanceof Error ? cause.message : String(cause));
	}
}

function passed(summary: string, metrics?: Record<string, unknown>): EvalCheck {
	return { id: "", status: "passed", summary, ...(metrics === undefined ? {} : { metrics }) };
}

function failed(id: string, summary: string, evidence?: Record<string, unknown>): EvalCheck {
	return { id, status: "failed", summary, ...(evidence === undefined ? {} : { evidence }) };
}

function duplicateIdCheck(kind: string, ids: readonly string[]): EvalCheck {
	const seen = new Set<string>();
	const duplicates = new Set<string>();
	for (const id of ids) {
		if (seen.has(id)) duplicates.add(id);
		seen.add(id);
	}
	return duplicates.size === 0
		? passed(`no duplicate ${kind} ids`, { count: ids.length })
		: failed(`unique-${kind}-ids`, `duplicate ${kind} ids found`, { duplicates: [...duplicates] });
}

function edgeEndpointCheck(graph: CodeGraphSnapshot): EvalCheck {
	const nodeIds = new Set(graph.nodes.map((node) => node.id));
	const dangling = graph.edges.filter((edge) => !nodeIds.has(edge.from) || !nodeIds.has(edge.to));
	return dangling.length === 0
		? passed("all edge endpoints exist", { edgeCount: graph.edges.length })
		: failed("edge-endpoints-exist", "dangling edges found", { dangling: dangling.slice(0, 20) });
}

function ignoredPathCheck(graph: CodeGraphSnapshot): EvalCheck {
	const contaminated = graph.nodes
		.map((node) => node.path)
		.filter((path): path is string => path !== undefined)
		.filter((path) => ignoredPath(path));
	return contaminated.length === 0
		? passed("ignored output paths are excluded")
		: failed("no-default-ignored-paths", "ignored paths entered graph", { paths: contaminated.slice(0, 20) });
}

function envSecretValueCheck(graph: CodeGraphSnapshot): EvalCheck {
	const offenders = graph.nodes
		.filter((node) => node.kind === "EnvVar")
		.filter((node) =>
			Object.entries(node.metadata).some(([key, value]) => key.toLowerCase().includes("value") && value !== undefined),
		)
		.map((node) => node.id);
	return offenders.length === 0
		? passed("env var nodes do not expose raw values")
		: failed("no-env-secret-values", "env var metadata contains value-like fields", { offenders });
}

function expectIncludes(items: readonly string[], expected: string, summary: string): EvalCheck {
	return items.includes(expected) ? passed(summary) : failed(summaryId(summary), `${summary}: missing ${expected}`, { items });
}

function expectAllIncluded(items: readonly string[], expected: readonly string[], summary: string): EvalCheck {
	const missing = expected.filter((item) => !items.includes(item));
	return missing.length === 0 ? passed(summary) : failed(summaryId(summary), `${summary}: missing expected items`, { missing, items });
}

function graphMetrics(graph: CodeGraphSnapshot, durationMs: number): Record<string, unknown> {
	return {
		durationMs,
		files: graph.manifest.totals.files,
		nodes: graph.nodes.length,
		edges: graph.edges.length,
		findings: graph.findings.length,
		gitDirty: graph.manifest.git.dirty,
	};
}

function ignoredPath(path: string): boolean {
	return (
		path === "node_modules" ||
		path.startsWith("node_modules/") ||
		path.includes("/node_modules/") ||
		path === "dist" ||
		path.startsWith("dist/") ||
		path.includes("/dist/") ||
		path === ".git" ||
		path.startsWith(".git/") ||
		path.includes("/.git/") ||
		path === "docs/codegraph" ||
		path.startsWith("docs/codegraph/")
	);
}

function aggregateStatus(statuses: readonly EvalStatus[]): EvalStatus {
	if (statuses.length === 0) return "skipped";
	return statuses.toSorted((left, right) => STATUS_ORDER[right] - STATUS_ORDER[left])[0] ?? "skipped";
}

async function environment(): Promise<Record<string, unknown>> {
	return {
		cwd: process.cwd(),
		platform: process.platform,
		arch: process.arch,
		bunVersion: Bun.version,
		git: {
			commit: await commandText(["git", "rev-parse", "HEAD"]),
			dirty: (await commandText(["git", "status", "--short"])).length > 0,
		},
	};
}

async function commandText(command: readonly string[]): Promise<string> {
	const proc = Bun.spawn(command, { stdout: "pipe", stderr: "pipe" });
	const output = await new Response(proc.stdout).text();
	await proc.exited;
	return output.trim();
}

function evalOptions(argv: readonly string[]): EvalOptions {
	const flags = flagsFor(argv);
	return {
		profile: flags.get("profile") ?? "smoke",
		targetRoot: resolve(flags.get("target-root") ?? "/Users/saint/dev/agent-runtime-kernel"),
		reportDir: resolve(flags.get("report-dir") ?? "docs/reports"),
		outBase: resolve(flags.get("out-base") ?? "/tmp/cartographer-code-graph-evals"),
		maxFileBytes: Number.parseInt(flags.get("max-file-bytes") ?? "500000", 10),
	};
}

function flagsFor(argv: readonly string[]): ReadonlyMap<string, string> {
	const flags = new Map<string, string>();
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (!arg?.startsWith("--")) continue;
		const name = arg.slice(2);
		const next = argv[index + 1];
		if (next !== undefined && !next.startsWith("--")) {
			flags.set(name, next);
			index += 1;
		} else {
			flags.set(name, "true");
		}
	}
	return flags;
}

function timestampForRunId(iso: string): string {
	return iso.replaceAll(":", "-").replaceAll(".", "-");
}

function summaryId(summary: string): string {
	return summary.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

await main();
