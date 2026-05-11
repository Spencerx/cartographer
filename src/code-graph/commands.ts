import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { HarnessError } from "../shared/errors.ts";
import { err, ok, type Result } from "../shared/result.ts";
import type { ParsedArgs } from "../cli/args.ts";
import { flagString, hasFlag } from "../cli/args.ts";
import { writeOut } from "../cli/io.ts";
import type { RuntimeEvent } from "../core/types.ts";
import {
	analyzeGraphCommandAdoption,
	checkGraphFirstAdoption,
	checkTraceExpectations,
	type GraphCommandAdoptionSummary,
	type GraphFirstAdoptionCheck,
	type TraceExpectedValue,
	type TraceExpectationCheck,
	type TraceExpectationInput,
} from "./adoption.ts";
import { writeCodeGraphArtifacts, readCodeGraph } from "./artifacts.ts";
import { buildCodeGraph } from "./builder.ts";
import {
	buildGraphContext,
	compactGraphContext,
	contextSelectorFor,
	renderGraphContextList,
	renderGraphContextSummary,
} from "./context.ts";
import { annotateSliceWithOpenRouter, DEFAULT_OPENROUTER_MODEL } from "./openrouter.ts";
import {
	auditAnnotationOverlay,
	graphWithAnnotationOverlay,
	readAnnotationOverlay,
	renderAnnotationOverlayAudit,
	type AnnotationOverlayAudit,
	type AnnotationOverlayLoadResult,
} from "./overlays.ts";
import { impactGraph, renderSlice, sliceGraph, summarizeGraph } from "./query.ts";
import { runCartographerPreflight, type CartographerPreflightResult } from "./preflight.ts";
import type { AgentAnnotation, GraphContext, GraphContextCompact } from "./types.ts";

type CartographerHandler = (args: ParsedArgs) => Promise<Result<void, HarnessError>>;

interface AdoptionTraceAnalysis {
	readonly events: readonly RuntimeEvent[];
	readonly summary: GraphCommandAdoptionSummary;
}

const cartographerHandlers: Record<string, CartographerHandler> = {
	help: runHelp,
	index: runIndex,
	update: runIndex,
	view: runView,
	slice: runSlice,
	impact: runImpact,
	context: runContext,
	preflight: runPreflight,
	adoption: runAdoption,
	annotate: runAnnotate,
	annotations: runAnnotations,
};

export async function runCartographer(args: ParsedArgs): Promise<Result<void, HarnessError>> {
	const subcommand = args.positionals[0] ?? "help";
	const handler = cartographerHandlers[subcommand];
	return handler === undefined
		? err(new HarnessError("VALIDATION_FAILED", `unknown cartographer subcommand: ${subcommand}`))
		: handler(args);
}

async function runHelp(): Promise<Result<void, HarnessError>> {
	await writeOut(cartographerHelp());
	return ok(undefined);
}

async function runIndex(args: ParsedArgs): Promise<Result<void, HarnessError>> {
	try {
		const root = flagString(args, "root", ".");
		const outDir = flagString(args, "out", "docs/codegraph");
		const maxFileBytes = numberFlag(args, "max-file-bytes", 750_000);
		const graph = await buildCodeGraph({ root, maxFileBytes });
		await writeCodeGraphArtifacts(graph, { outDir, mapPath: mapPath(args, outDir) });
		await writeOut(`${summarizeGraph(graph)}Artifacts: ${outDir}\n`);
		return ok(undefined);
	} catch (cause) {
		return err(HarnessError.from("INTERNAL", cause));
	}
}

async function runView(args: ParsedArgs): Promise<Result<void, HarnessError>> {
	try {
		const graph = await loadGraph(args);
		if (hasFlag(args, "json")) {
			await writeOut(`${JSON.stringify(graph.manifest, null, 2)}\n`);
			return ok(undefined);
		}
		await writeOut(summarizeGraph(graph));
		return ok(undefined);
	} catch (cause) {
		return err(HarnessError.from("INTERNAL", cause));
	}
}

async function runSlice(args: ParsedArgs): Promise<Result<void, HarnessError>> {
	try {
		const selector = requiredFlag(
			args,
			"selector",
			"usage: cartographer slice --selector path:src/index.ts",
		);
		const graph = await loadGraph(args);
		await writeSlice(args, sliceGraph(graph, selector));
		return ok(undefined);
	} catch (cause) {
		if (cause instanceof HarnessError) return err(cause);
		return err(HarnessError.from("INTERNAL", cause));
	}
}

async function runImpact(args: ParsedArgs): Promise<Result<void, HarnessError>> {
	try {
		const path = requiredFlag(args, "path", "usage: cartographer impact --path src/index.ts");
		const graph = await loadGraph(args);
		await writeSlice(args, impactGraph(graph, path, { maxDepth: optionalNumberFlag(args, "depth") }));
		return ok(undefined);
	} catch (cause) {
		if (cause instanceof HarnessError) return err(cause);
		return err(HarnessError.from("INTERNAL", cause));
	}
}

async function runContext(args: ParsedArgs): Promise<Result<void, HarnessError>> {
	try {
		const path = requiredFlag(args, "path", "usage: cartographer context --path src/index.ts");
		const graph = await loadGraph(args);
		const depth = optionalNumberFlag(args, "depth");
		const selector = flagString(args, "selector", contextSelectorFor(path));
		await writeContext(args, buildGraphContext(graph, { path, selector, depth }));
		return ok(undefined);
	} catch (cause) {
		if (cause instanceof HarnessError) return err(cause);
		return err(HarnessError.from("INTERNAL", cause));
	}
}

async function runPreflight(args: ParsedArgs): Promise<Result<void, HarnessError>> {
	try {
		const path = requiredFlag(args, "path", "usage: cartographer preflight --path src/index.ts");
		const result = await runCartographerPreflight({
			root: flagString(args, "root", "."),
			outDir: flagString(args, "out", "docs/codegraph"),
			live: hasFlag(args, "live"),
			path,
			depth: optionalNumberFlag(args, "depth") ?? 1,
			maxFileBytes: numberFlag(args, "max-file-bytes", 750_000),
		});
		if (!result.ok) return err(result.error);
		await writeOut(`${JSON.stringify(preflightJson(result.data), null, 2)}\n`);
		return ok(undefined);
	} catch (cause) {
		if (cause instanceof HarnessError) return err(cause);
		return err(HarnessError.from("INTERNAL", cause));
	}
}

async function runAdoption(args: ParsedArgs): Promise<Result<void, HarnessError>> {
	try {
		const analysis = await adoptionTraceAnalysisFromArgs(args);
		const expectationCheck = traceExpectationCheck(args, analysis.events);
		const graphFirstCheck = graphFirstAdoptionCheck(args, analysis.summary);
		await writeAdoptionSummary(args, analysis.summary, expectationCheck, graphFirstCheck);
		const graphFirst = enforceGraphFirstAdoption(args, analysis.summary, graphFirstCheck);
		if (!graphFirst.ok) return graphFirst;
		return enforceTraceExpectations(expectationCheck);
	} catch (cause) {
		if (cause instanceof HarnessError) return err(cause);
		return err(HarnessError.from("INTERNAL", cause));
	}
}

async function adoptionTraceAnalysisFromArgs(args: ParsedArgs): Promise<AdoptionTraceAnalysis> {
	const tracePath = requiredFlag(args, "trace", "usage: cartographer adoption --trace trace.json");
	const events = await readRuntimeEvents(tracePath);
	return { events, summary: analyzeGraphCommandAdoption(events) };
}

async function writeAdoptionSummary(
	args: ParsedArgs,
	summary: GraphCommandAdoptionSummary,
	expectationCheck: TraceExpectationCheck | undefined,
	graphFirstCheck: GraphFirstAdoptionCheck | undefined,
): Promise<void> {
	await writeOut(
		hasFlag(args, "json")
			? `${JSON.stringify(adoptionJson(summary, expectationCheck, graphFirstCheck), null, 2)}\n`
			: renderAdoptionSummary(summary, expectationCheck, graphFirstCheck),
	);
}

function adoptionJson(
	summary: GraphCommandAdoptionSummary,
	expectationCheck: TraceExpectationCheck | undefined,
	graphFirstCheck: GraphFirstAdoptionCheck | undefined,
): Record<string, unknown> {
	return {
		...summary,
		...(graphFirstCheck === undefined ? {} : { graphFirstAdoption: graphFirstCheck }),
		...(expectationCheck === undefined ? {} : { finalResponseExpectation: expectationCheck }),
	};
}

function preflightJson(result: CartographerPreflightResult): Record<string, unknown> {
	return {
		...result.context,
		preflight: {
			command: result.command,
			root: result.root,
			targetPath: result.targetPath,
			live: result.live,
			startedAt: result.startedAt,
			finishedAt: result.finishedAt,
			durationMs: result.durationMs,
			timings: result.timings,
		},
	};
}

function traceExpectationCheck(args: ParsedArgs, events: readonly RuntimeEvent[]): TraceExpectationCheck | undefined {
	const expectations = traceExpectationInput(args);
	return expectations === undefined ? undefined : checkTraceExpectations(events, expectations);
}

function traceExpectationInput(args: ParsedArgs): TraceExpectationInput | undefined {
	const expectations = {
		...optionalStringFlag(args, "expect-text", "text"),
		...optionalStringFlag(args, "expect-path", "path"),
		...optionalStringFlag(args, "expect-command", "command"),
		...optionalStringFlag(args, "expect-executed-command", "executedCommand"),
	};
	return Object.keys(expectations).length === 0 ? undefined : expectations;
}

function optionalStringFlag(
	args: ParsedArgs,
	flag: string,
	key: keyof TraceExpectationInput,
): Partial<TraceExpectationInput> {
	const value = args.flags[flag];
	if (typeof value === "string" && value.length > 0) {
		return { [key]: value };
	}
	const values = Array.isArray(value) ? value.filter((entry) => entry.length > 0) : [];
	return values.length > 0 ? { [key]: values } : {};
}

function graphFirstAdoptionCheck(
	args: ParsedArgs,
	summary: GraphCommandAdoptionSummary,
): GraphFirstAdoptionCheck | undefined {
	return hasFlag(args, "require-graph-first") ? checkGraphFirstAdoption(summary) : undefined;
}

function enforceGraphFirstAdoption(
	args: ParsedArgs,
	summary: GraphCommandAdoptionSummary,
	graphFirst: GraphFirstAdoptionCheck | undefined,
): Result<void, HarnessError> {
	if (!hasFlag(args, "require-graph-first") || graphFirst === undefined) return ok(undefined);
	if (graphFirst.passed) return ok(undefined);
	return err(
		new HarnessError("VALIDATION_FAILED", `graph-first adoption failed: ${graphFirst.failures.join("; ")}`, {
			context: {
				adopted: summary.adopted,
				graphPreflightFailureCount: summary.graphPreflightFailureCount,
				sourceReadBeforeGraphCount: summary.sourceReadBeforeGraphCount,
				failures: [...graphFirst.failures],
			},
		}),
	);
}

function enforceTraceExpectations(expectationCheck: TraceExpectationCheck | undefined): Result<void, HarnessError> {
	if (expectationCheck === undefined || expectationCheck.passed) return ok(undefined);
	return err(
		new HarnessError("VALIDATION_FAILED", `trace expectation failed: ${expectationCheck.failures.join("; ")}`, {
			context: {
				finalTextLength: expectationCheck.finalTextLength,
				failures: [...expectationCheck.failures],
				expectedText: expectationCheck.expectedText,
				expectedPath: expectationCheck.expectedPath,
				expectedCommand: expectationCheck.expectedCommand,
				expectedExecutedCommand: expectationCheck.expectedExecutedCommand,
			},
		}),
	);
}

async function writeSlice(args: ParsedArgs, slice: ReturnType<typeof sliceGraph>): Promise<void> {
	if (hasFlag(args, "json")) {
		await writeOut(`${JSON.stringify(slice, null, 2)}\n`);
		return;
	}
	await writeOut(renderSlice(slice));
}

async function writeContext(args: ParsedArgs, context: GraphContext): Promise<void> {
	if (hasFlag(args, "compact")) {
		const compact = compactGraphContext(context);
		await writeOut(hasFlag(args, "json") ? `${JSON.stringify(compact, null, 2)}\n` : renderCompactContext(compact));
		return;
	}
	if (hasFlag(args, "json")) {
		await writeOut(`${JSON.stringify(context, null, 2)}\n`);
		return;
	}
	await writeOut(renderContext(context));
}

function renderContext(context: GraphContext): string {
	return [
		`# Context for ${context.path}`,
		"",
		`Graph: \`${context.manifest.root}\``,
		`Generated: ${context.manifest.generatedAt}`,
		`Git: ${context.manifest.git.dirty ? "dirty" : "clean"}${context.manifest.git.commit ? ` @ ${context.manifest.git.commit.slice(0, 12)}` : ""}`,
		`Selector: \`${context.selector}\``,
		`Impact depth: ${context.depth ?? "unbounded"}`,
		"",
		...renderGraphContextSummary(context.summary),
		"## Selected Slice",
		renderSlice(context.slice).trim(),
		"",
		"## Impact",
		renderSlice(context.impact).trim(),
		"",
	].join("\n");
}

function renderCompactContext(context: GraphContextCompact): string {
	return [
		`# Context for ${context.path}`,
		"",
		`Graph: \`${context.manifest.root}\``,
		`Generated: ${context.manifest.generatedAt}`,
		`Git: ${context.manifest.git.dirty ? "dirty" : "clean"}${context.manifest.git.commit ? ` @ ${context.manifest.git.commit.slice(0, 12)}` : ""}`,
		`Selector: \`${context.selector}\``,
		`Impact depth: ${context.depth ?? "unbounded"}`,
		`Slice totals: ${context.totals.slice.nodes} nodes, ${context.totals.slice.edges} edges, ${context.totals.slice.findings} findings`,
		`Impact totals: ${context.totals.impact.nodes} nodes, ${context.totals.impact.edges} edges, ${context.totals.impact.findings} findings`,
		"",
		...renderGraphContextSummary(context.summary),
	].join("\n");
}

function renderAdoptionSummary(
	summary: GraphCommandAdoptionSummary,
	expectationCheck: TraceExpectationCheck | undefined,
	graphFirstCheck: GraphFirstAdoptionCheck | undefined,
): string {
	return [
		"# Graph Command Adoption",
		"",
		`Adopted: ${yesNo(summary.adopted)}`,
		`Trace events: ${summary.eventCount}`,
		`Trace duration: ${msOrUnknown(summary.traceDurationMs)}`,
		`Tool commands: ${summary.toolCommandCount}`,
		`Graph preflight results: ${summary.graphPreflightResultCount}`,
		`First graph preflight duration: ${msOrUnknown(summary.firstGraphPreflightDurationMs)}`,
		`Graph preflight failures: ${summary.graphPreflightFailureCount}`,
		`Source reads before graph: ${summary.sourceReadBeforeGraphCount}`,
		`First graph command: ${textOrNone(summary.firstGraphCommand)}`,
		`First graph command offset: ${msOrUnknown(summary.firstGraphCommandOffsetMs)}`,
		`First graph preflight failure: ${textOrNone(summary.firstGraphPreflightFailureCommand)}`,
		`First graph preflight failure offset: ${msOrUnknown(summary.firstGraphPreflightFailureOffsetMs)}`,
		`First source read before graph: ${textOrNone(summary.firstSourceReadBeforeGraph)}`,
		`First source read before graph offset: ${msOrUnknown(summary.firstSourceReadBeforeGraphOffsetMs)}`,
		"",
		"Graph preflight failure commands:",
		...renderGraphContextList(summary.graphPreflightFailureCommands),
		"",
		"Source reads before graph:",
		...renderGraphContextList(summary.sourceReadCommandsBeforeGraph),
		"",
		...renderGraphFirstAdoptionSummary(graphFirstCheck),
		"",
		...renderTraceExpectationSummary(expectationCheck),
		"",
	].join("\n");
}

function renderGraphFirstAdoptionSummary(graphFirstCheck: GraphFirstAdoptionCheck | undefined): readonly string[] {
	if (graphFirstCheck === undefined) return [];
	return [
		"Graph-first gate:",
		`Passed: ${yesNo(graphFirstCheck.passed)}`,
		"Gate failures:",
		...renderGraphContextList(graphFirstCheck.failures),
	];
}

function renderTraceExpectationSummary(expectationCheck: TraceExpectationCheck | undefined): readonly string[] {
	if (expectationCheck === undefined) return [];
	return [
		"Final response expectation:",
		`Passed: ${yesNo(expectationCheck.passed)}`,
		`Final text length: ${expectationCheck.finalTextLength}`,
		`Expected text: ${expectedValueOrNone(expectationCheck.expectedText)}`,
		`Expected path: ${expectedValueOrNone(expectationCheck.expectedPath)}`,
		`Expected command: ${expectedValueOrNone(expectationCheck.expectedCommand)}`,
		`Expected executed command: ${expectedValueOrNone(expectationCheck.expectedExecutedCommand)}`,
		"Expectation metrics:",
		...renderTraceExpectationMetrics(expectationCheck.metrics),
		"Path evidence:",
		...renderPathEvidence(expectationCheck.pathEvidence),
		"Command evidence:",
		...renderCommandEvidence(expectationCheck.commandEvidence),
		"Executed command evidence:",
		...renderCommandEvidence(expectationCheck.executedCommandEvidence),
		"Expectation failures:",
		...renderGraphContextList(expectationCheck.failures),
	];
}

function renderTraceExpectationMetrics(metrics: TraceExpectationCheck["metrics"]): readonly string[] {
	return [
		`- Text final hits: ${metrics.finalTextHitCount}/${metrics.expectedTextCount}`,
		`- Path final/tool/source-read hits: ${metrics.finalPathHitCount}/${metrics.toolPathHitCount}/${metrics.sourceReadPathHitCount} of ${metrics.expectedPathCount}`,
		`- Command final/tool hits: ${metrics.finalCommandHitCount}/${metrics.toolCommandHitCount} of ${metrics.expectedCommandCount}`,
		`- Executed command hits: ${metrics.executedCommandHitCount}/${metrics.expectedExecutedCommandCount}`,
	];
}

function renderPathEvidence(pathEvidence: TraceExpectationCheck["pathEvidence"]): readonly string[] {
	if (pathEvidence === undefined || pathEvidence.length === 0) return ["- None"];
	return pathEvidence.map((item) =>
		[
			`- ${item.path}: final=${yesNo(item.observedInFinalResponse)}`,
			`tool=${yesNo(item.observedInToolCommand)}`,
			`source-read=${yesNo(item.observedInSourceReadCommand)}`,
			`first-tool=${textOrNone(item.firstToolCommand)}`,
			`first-source-read=${textOrNone(item.firstSourceReadCommand)}`,
		].join("; "),
	);
}

function renderCommandEvidence(commandEvidence: TraceExpectationCheck["commandEvidence"]): readonly string[] {
	if (commandEvidence === undefined || commandEvidence.length === 0) return ["- None"];
	return commandEvidence.map((item) =>
		[
			`- ${item.command}: final=${yesNo(item.observedInFinalResponse)}`,
			`tool=${yesNo(item.observedInToolCommand)}`,
			`first-tool=${textOrNone(item.firstToolCommand)}`,
		].join("; "),
	);
}

function yesNo(value: boolean): string {
	return value ? "yes" : "no";
}

function textOrNone(value: string | undefined): string {
	return value ?? "None";
}

function expectedValueOrNone(value: TraceExpectedValue | undefined): string {
	if (value === undefined) return "None";
	return typeof value === "string" ? value : value.join(", ");
}

function msOrUnknown(value: number | undefined): string {
	return `${value ?? "unknown"} ms`;
}

async function readRuntimeEvents(path: string): Promise<readonly RuntimeEvent[]> {
	const text = await readFile(path, "utf8");
	return runtimeEventsFromJson(parseTraceJson(text)).map(runtimeEventAtIndex);
}

function parseTraceJson(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch (cause) {
		throw new HarnessError(
			"VALIDATION_FAILED",
			`trace is not valid JSON: ${cause instanceof Error ? cause.message : String(cause)}`,
		);
	}
}

function runtimeEventsFromJson(value: unknown): readonly unknown[] {
	if (Array.isArray(value)) return value;
	if (!isRecord(value)) throw invalidTraceShapeError();
	return runtimeEventArrayFromRecord(value) ?? raiseTraceShapeError();
}

function runtimeEventArrayFromRecord(value: Record<string, unknown>): readonly unknown[] | undefined {
	const events = value["events"];
	if (Array.isArray(events)) return events;
	const runtimeEvents = value["runtimeEvents"];
	return Array.isArray(runtimeEvents) ? runtimeEvents : undefined;
}

function runtimeEventAtIndex(event: unknown, index: number): RuntimeEvent {
	if (isRuntimeEvent(event)) return event;
	throw new HarnessError("VALIDATION_FAILED", `trace event at index ${index} is not a RuntimeEvent`);
}

function raiseTraceShapeError(): never {
	throw invalidTraceShapeError();
}

function invalidTraceShapeError(): HarnessError {
	return new HarnessError(
		"VALIDATION_FAILED",
		"trace JSON must be a RuntimeEvent[] or an object with events/runtimeEvents",
	);
}

function isRuntimeEvent(value: unknown): value is RuntimeEvent {
	return isRecord(value) && hasRuntimeEventHeader(value) && "data" in value;
}

function hasRuntimeEventHeader(value: Record<string, unknown>): boolean {
	return (
		runtimeEventTypes.has(value["type"]) &&
		typeof value["timestamp"] === "string" &&
		typeof value["turnId"] === "string"
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function runAnnotate(args: ParsedArgs): Promise<Result<void, HarnessError>> {
	try {
		const graph = await loadGraph(args);
		const selector = flagString(args, "selector", "all");
		const slice = sliceGraph(graph, selector);
		if (hasFlag(args, "dry-run")) {
			await writeOut(renderSlice(slice));
			return ok(undefined);
		}
		const apiKey = requireOpenRouterApiKey();
		const annotations = await annotateSliceWithOpenRouter({
			apiKey,
			model: flagString(args, "model", DEFAULT_OPENROUTER_MODEL),
			slice,
		});
		const overlayPath = await writeAnnotationOverlay(args, annotations);
		await writeOut(`Wrote ${annotations.length} candidate annotations to ${overlayPath}\n`);
		return ok(undefined);
	} catch (cause) {
		if (cause instanceof HarnessError) return err(cause);
		return err(HarnessError.from("INTERNAL", cause));
	}
}

async function runAnnotations(args: ParsedArgs): Promise<Result<void, HarnessError>> {
	try {
		const graph = await loadBaseGraph(args);
		const overlay = await loadAnnotationOverlay(args);
		const audit = auditAnnotationOverlay(graph, overlay);
		const review = annotationReviewFromArgs(args);
		if (review !== undefined) {
			const result = applyAnnotationReview(overlay, audit, review);
			await writeAnnotationOverlayRecords(overlay.overlayPath, result.annotations);
			const nextAudit = auditAnnotationOverlay(graph, { ...overlay, annotations: result.annotations, parseIssues: [] });
			await writeAnnotationReviewResult(args, { ...result, audit: nextAudit });
			return ok(undefined);
		}
		await writeOut(hasFlag(args, "json") ? `${JSON.stringify(audit, null, 2)}\n` : renderAnnotationOverlayAudit(audit));
		return ok(undefined);
	} catch (cause) {
		if (cause instanceof HarnessError) return err(cause);
		return err(HarnessError.from("INTERNAL", cause));
	}
}

interface AnnotationReviewInput {
	readonly action: "accept" | "retire";
	readonly annotationId: string;
	readonly reviewer: string;
	readonly now: Date;
}

interface AnnotationReviewResult {
	readonly overlayPath: string;
	readonly action: AnnotationReviewInput["action"];
	readonly annotationId: string;
	readonly reviewer: string;
	readonly annotation: AgentAnnotation;
	readonly annotations: readonly AgentAnnotation[];
}

interface AnnotationReviewOutput extends AnnotationReviewResult {
	readonly audit: AnnotationOverlayAudit;
}

function annotationReviewFromArgs(args: ParsedArgs): AnnotationReviewInput | undefined {
	const accept = optionalFlagString(args, "accept");
	const retire = optionalFlagString(args, "retire");
	if (accept !== undefined && retire !== undefined) {
		throw new HarnessError("VALIDATION_FAILED", "use only one of --accept or --retire");
	}
	const annotationId = accept ?? retire;
	if (annotationId === undefined) return undefined;
	const reviewer = optionalFlagString(args, "reviewer");
	if (reviewer === undefined) {
		throw new HarnessError("VALIDATION_FAILED", "--reviewer is required when reviewing annotations");
	}
	return { action: accept !== undefined ? "accept" : "retire", annotationId, reviewer, now: new Date() };
}

function optionalFlagString(args: ParsedArgs, name: string): string | undefined {
	const value = args.flags[name];
	if (Array.isArray(value)) return value.at(-1);
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

function applyAnnotationReview(
	overlay: AnnotationOverlayLoadResult,
	audit: AnnotationOverlayAudit,
	review: AnnotationReviewInput,
): AnnotationReviewResult {
	if (audit.parseIssues.length > 0) {
		throw new HarnessError("VALIDATION_FAILED", "cannot rewrite annotation overlay while parse issues are present");
	}
	const annotation = overlay.annotations.find((candidate) => candidate.id === review.annotationId);
	if (annotation === undefined) {
		throw new HarnessError("VALIDATION_FAILED", `annotation not found: ${review.annotationId}`);
	}
	const updated = updateReviewedAnnotation(annotation, review, issuesForAnnotation(audit, review.annotationId));
	return {
		overlayPath: overlay.overlayPath,
		action: review.action,
		annotationId: review.annotationId,
		reviewer: review.reviewer,
		annotation: updated,
		annotations: overlay.annotations.map((candidate) => (candidate.id === review.annotationId ? updated : candidate)),
	};
}

function issuesForAnnotation(audit: AnnotationOverlayAudit, annotationId: string) {
	return audit.issues.filter((issue) => issue.annotationId === annotationId);
}

function updateReviewedAnnotation(
	annotation: AgentAnnotation,
	review: AnnotationReviewInput,
	issues: ReturnType<typeof issuesForAnnotation>,
): AgentAnnotation {
	if (review.action === "accept" && issues.length > 0) {
		throw new HarnessError(
			"VALIDATION_FAILED",
			`cannot accept annotation with audit issues: ${issues.map((issue) => issue.code).join(", ")}`,
		);
	}
	return {
		...annotation,
		author: { type: "human", name: review.reviewer },
		confidence: "human-reviewed",
		status: review.action === "accept" ? "accepted" : "retired",
		updatedAt: review.now.toISOString(),
	};
}

async function writeAnnotationReviewResult(args: ParsedArgs, result: AnnotationReviewOutput): Promise<void> {
	if (hasFlag(args, "json")) {
		await writeOut(
			`${JSON.stringify(
				{
					overlayPath: result.overlayPath,
					action: result.action,
					annotationId: result.annotationId,
					reviewer: result.reviewer,
					annotation: result.annotation,
					audit: result.audit,
				},
				null,
				2,
			)}\n`,
		);
		return;
	}
	await writeOut(
		[
			`Reviewed annotation ${result.annotationId}`,
			`Action: ${result.action}`,
			`Reviewer: ${result.reviewer}`,
			`Overlay: ${result.overlayPath}`,
			"",
		].join("\n"),
	);
}

function requireOpenRouterApiKey(): string {
	const apiKey = Bun.env["OPENROUTER_API_KEY"];
	if (apiKey !== undefined && apiKey.length > 0) return apiKey;
	throw new HarnessError("AUTH_FAILED", "OPENROUTER_API_KEY is required for cartographer annotate");
}

async function writeAnnotationOverlay(args: ParsedArgs, annotations: readonly unknown[]): Promise<string> {
	const outDir = flagString(args, "out", "docs/codegraph");
	const overlayDir = join(outDir, "overlays");
	await mkdir(overlayDir, { recursive: true });
	const overlayPath = join(overlayDir, "agent-notes.jsonl");
	if (annotations.length > 0) {
		await appendFile(overlayPath, `${annotations.map((annotation) => JSON.stringify(annotation)).join("\n")}\n`);
	}
	return overlayPath;
}

async function writeAnnotationOverlayRecords(
	overlayPath: string,
	annotations: readonly AgentAnnotation[],
): Promise<void> {
	await mkdir(dirname(overlayPath), { recursive: true });
	await writeFile(
		overlayPath,
		annotations.length === 0 ? "" : `${annotations.map((annotation) => JSON.stringify(annotation)).join("\n")}\n`,
	);
}

async function loadGraph(args: ParsedArgs) {
	return graphWithAnnotationOverlay(await loadBaseGraph(args), await loadAnnotationOverlay(args));
}

async function loadBaseGraph(args: ParsedArgs) {
	const outDir = flagString(args, "out", "docs/codegraph");
	if (hasFlag(args, "live")) {
		return buildCodeGraph({
			root: flagString(args, "root", "."),
			maxFileBytes: numberFlag(args, "max-file-bytes", 750_000),
		});
	}
	return readCodeGraph(outDir);
}

async function loadAnnotationOverlay(args: ParsedArgs) {
	return readAnnotationOverlay(flagString(args, "out", "docs/codegraph"));
}

function mapPath(args: ParsedArgs, outDir: string): string | undefined {
	const value = args.flags["map"];
	if (value === false) return undefined;
	if (typeof value === "string") return value;
	return join(outDir, "CODEBASE_MAP.md");
}

function requiredFlag(args: ParsedArgs, name: string, message: string): string {
	const value = args.flags[name];
	if (typeof value === "string" && value.length > 0) return value;
	throw new HarnessError("VALIDATION_FAILED", message);
}

function numberFlag(args: ParsedArgs, name: string, fallback: number): number {
	const value = args.flags[name];
	if (typeof value !== "string") return fallback;
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function optionalNumberFlag(args: ParsedArgs, name: string): number | undefined {
	const value = args.flags[name];
	if (typeof value !== "string") return undefined;
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function cartographerHelp(): string {
	return [
		"cartographer <subcommand> [options]",
		"",
		"Subcommands:",
		"  index      Build docs/codegraph/{schema,manifest,graph}.json and CODEBASE_MAP.md",
		"  update     Rebuild the graph artifacts in place",
		"  view       Show graph summary from --out",
		"  slice      Show a task slice, e.g. --selector path:src/index.ts",
		"  impact     Show incoming impact for --path src/index.ts",
		"  context    Show slice plus impact context for --path src/index.ts",
		"  preflight  Agent pre-edit context: compact JSON, depth 1 by default",
		"  adoption   Summarize graph-command adoption from a RuntimeEvent trace",
		"  annotate   Use OpenRouter to write candidate overlay notes",
		"  annotations Audit semantic overlay notes against the current graph",
		"",
		"Options:",
		"  --root <path>              Repo root for live/index mode. Default: .",
		"  --out <path>               Graph artifact directory. Default: docs/codegraph",
		"  --map <path>               Map output path. Default: <out>/CODEBASE_MAP.md",
		"  --selector <selector>      all, path:<path>, package:<path-or-name>, kind:<node-kind>, node id, or text",
		"  --path <path>              File path or node id for impact/context",
		"  --trace <path>             RuntimeEvent[] JSON trace for adoption analysis",
		"  --depth <n>                Limit impact traversal depth. Default: unbounded",
		"  --json                     Emit JSON for view, slice, impact, context, adoption, and annotations",
		"  --require-graph-first      For adoption, fail if graph was unused, preflight failed, or repo source was read before graph context",
		"  --expect-text <text>       For adoption, fail if final trace text omits this text. Repeatable",
		"  --expect-path <path>       For adoption, fail if final trace text omits this path. Repeatable",
		"  --expect-command <cmd>     For adoption, fail if final trace text omits this command. Repeatable",
		"  --expect-executed-command <cmd> For adoption, fail if no tool command executes this command. Repeatable",
		"  --accept <annotation-id>  For annotations, accept a review-ready candidate annotation",
		"  --retire <annotation-id>  For annotations, retire an annotation",
		"  --reviewer <name>         Reviewer name required with --accept or --retire",
		"  --compact                  For context, omit nested slice/impact payloads and keep totals only",
		"  --live                     Build in memory instead of reading <out>/graph.json",
		"  --dry-run                  For annotate, render the slice without calling OpenRouter",
		"  --model <model>            OpenRouter model. Default: openai/gpt-5.5",
		"  --max-file-bytes <bytes>   Max text bytes read per file. Default: 750000",
		"",
	].join("\n");
}

const runtimeEventTypes = new Set<unknown>([
	"status",
	"assistant",
	"tool_use",
	"tool_result",
	"result",
	"error",
	"heartbeat",
]);
