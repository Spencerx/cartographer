import type { RuntimeEvent } from "../core/types.ts";

export interface GraphCommandAdoptionSummary {
	readonly adopted: boolean;
	readonly eventCount: number;
	readonly traceDurationMs?: number | undefined;
	readonly firstGraphCommandIndex?: number | undefined;
	readonly firstGraphCommand?: string | undefined;
	readonly firstGraphCommandOffsetMs?: number | undefined;
	readonly graphPreflightResultCount: number;
	readonly graphPreflightDurationsMs: readonly number[];
	readonly firstGraphPreflightResultIndex?: number | undefined;
	readonly firstGraphPreflightResultCommand?: string | undefined;
	readonly firstGraphPreflightResultOffsetMs?: number | undefined;
	readonly firstGraphPreflightDurationMs?: number | undefined;
	readonly firstGraphPreflightTimings?: GraphPreflightTimingSummary | undefined;
	readonly graphPreflightFailureCount: number;
	readonly graphPreflightFailureCommands: readonly string[];
	readonly firstGraphPreflightFailureIndex?: number | undefined;
	readonly firstGraphPreflightFailureCommand?: string | undefined;
	readonly firstGraphPreflightFailureOffsetMs?: number | undefined;
	readonly toolCommandCount: number;
	readonly sourceReadBeforeGraphCount: number;
	readonly sourceReadCommandsBeforeGraph: readonly string[];
	readonly firstSourceReadBeforeGraphIndex?: number | undefined;
	readonly firstSourceReadBeforeGraph?: string | undefined;
	readonly firstSourceReadBeforeGraphOffsetMs?: number | undefined;
}

export interface GraphPreflightTimingSummary {
	readonly loadGraphMs?: number | undefined;
	readonly buildContextMs?: number | undefined;
	readonly renderPromptMs?: number | undefined;
}

export interface GraphFirstAdoptionCheck {
	readonly passed: boolean;
	readonly failures: readonly string[];
}

export interface TraceExpectationInput {
	readonly text?: TraceExpectedValue | undefined;
	readonly path?: TraceExpectedValue | undefined;
	readonly command?: TraceExpectedValue | undefined;
	readonly executedCommand?: TraceExpectedValue | undefined;
}

export type TraceExpectedValue = string | readonly string[];

export interface TraceExpectationCheck {
	readonly passed: boolean;
	readonly failures: readonly string[];
	readonly finalTextLength: number;
	readonly metrics: TraceExpectationMetrics;
	readonly expectedText?: TraceExpectedValue | undefined;
	readonly expectedPath?: TraceExpectedValue | undefined;
	readonly expectedCommand?: TraceExpectedValue | undefined;
	readonly expectedExecutedCommand?: TraceExpectedValue | undefined;
	readonly pathEvidence?: readonly TraceExpectedPathEvidence[] | undefined;
	readonly commandEvidence?: readonly TraceExpectedCommandEvidence[] | undefined;
	readonly executedCommandEvidence?: readonly TraceExpectedCommandEvidence[] | undefined;
}

export interface TraceExpectationMetrics {
	readonly expectedTextCount: number;
	readonly expectedPathCount: number;
	readonly expectedCommandCount: number;
	readonly expectedExecutedCommandCount: number;
	readonly finalTextHitCount: number;
	readonly finalPathHitCount: number;
	readonly toolPathHitCount: number;
	readonly sourceReadPathHitCount: number;
	readonly finalCommandHitCount: number;
	readonly toolCommandHitCount: number;
	readonly executedCommandHitCount: number;
}

export interface TraceExpectedPathEvidence {
	readonly path: string;
	readonly observedInFinalResponse: boolean;
	readonly observedInToolCommand: boolean;
	readonly observedInSourceReadCommand: boolean;
	readonly firstToolCommandIndex?: number | undefined;
	readonly firstToolCommand?: string | undefined;
	readonly firstToolCommandOffsetMs?: number | undefined;
	readonly firstSourceReadCommandIndex?: number | undefined;
	readonly firstSourceReadCommand?: string | undefined;
	readonly firstSourceReadCommandOffsetMs?: number | undefined;
}

export interface TraceExpectedCommandEvidence {
	readonly command: string;
	readonly observedInFinalResponse: boolean;
	readonly observedInToolCommand: boolean;
	readonly firstToolCommandIndex?: number | undefined;
	readonly firstToolCommand?: string | undefined;
	readonly firstToolCommandOffsetMs?: number | undefined;
}

interface ObservedToolCommand {
	readonly index: number;
	readonly command: string;
	readonly offsetMs?: number | undefined;
}

interface ObservedGraphPreflightFailure {
	readonly index: number;
	readonly command?: string | undefined;
	readonly offsetMs?: number | undefined;
}

interface ObservedGraphPreflightResult {
	readonly index: number;
	readonly command?: string | undefined;
	readonly offsetMs?: number | undefined;
	readonly durationMs?: number | undefined;
	readonly timings?: GraphPreflightTimingSummary | undefined;
}

type FirstGraphCommandFields = Pick<
	GraphCommandAdoptionSummary,
	"firstGraphCommandIndex" | "firstGraphCommand" | "firstGraphCommandOffsetMs"
>;
type FirstGraphPreflightResultFields = Pick<
	GraphCommandAdoptionSummary,
	| "firstGraphPreflightResultIndex"
	| "firstGraphPreflightResultCommand"
	| "firstGraphPreflightResultOffsetMs"
	| "firstGraphPreflightDurationMs"
	| "firstGraphPreflightTimings"
>;
type FirstGraphPreflightFailureFields = Pick<
	GraphCommandAdoptionSummary,
	"firstGraphPreflightFailureIndex" | "firstGraphPreflightFailureCommand" | "firstGraphPreflightFailureOffsetMs"
>;
type FirstSourceReadBeforeGraphFields = Pick<
	GraphCommandAdoptionSummary,
	"firstSourceReadBeforeGraphIndex" | "firstSourceReadBeforeGraph" | "firstSourceReadBeforeGraphOffsetMs"
>;

export function analyzeGraphCommandAdoption(events: readonly RuntimeEvent[]): GraphCommandAdoptionSummary {
	const commands = observedToolCommands(events);
	const graphPreflightResults = observedGraphPreflightResults(events);
	const graphPreflightFailures = observedGraphPreflightFailures(events);
	const firstGraphCommand = commands.find((item) => isCartographerPreflightCommand(item.command));
	const firstGraphPreflightResult = graphPreflightResults[0];
	const firstGraphPreflightFailure = graphPreflightFailures[0];
	const commandsBeforeGraph =
		firstGraphCommand === undefined ? commands : commands.filter((item) => item.index < firstGraphCommand.index);
	const sourceReadsBeforeGraph = commandsBeforeGraph.filter((item) => isSourceReadCommand(item.command));
	const firstSourceReadBeforeGraph = sourceReadsBeforeGraph[0];

	return {
		adopted: firstGraphCommand !== undefined,
		eventCount: events.length,
		...optionalNumber("traceDurationMs", traceDurationMs(events)),
		...firstGraphCommandFields(firstGraphCommand),
		graphPreflightResultCount: graphPreflightResults.length,
		graphPreflightDurationsMs: graphPreflightResults.flatMap((item) =>
			item.durationMs === undefined ? [] : [item.durationMs],
		),
		...firstGraphPreflightResultFields(firstGraphPreflightResult),
		graphPreflightFailureCount: graphPreflightFailures.length,
		graphPreflightFailureCommands: graphPreflightFailures.flatMap((item) =>
			item.command === undefined ? [] : [item.command],
		),
		...firstGraphPreflightFailureFields(firstGraphPreflightFailure),
		toolCommandCount: commands.length,
		sourceReadBeforeGraphCount: sourceReadsBeforeGraph.length,
		sourceReadCommandsBeforeGraph: sourceReadsBeforeGraph.map((item) => item.command),
		...firstSourceReadBeforeGraphFields(firstSourceReadBeforeGraph),
	};
}

function firstGraphPreflightResultFields(
	result: ObservedGraphPreflightResult | undefined,
): Partial<FirstGraphPreflightResultFields> {
	if (result === undefined) return {};
	return {
		firstGraphPreflightResultIndex: result.index,
		...(result.command !== undefined ? { firstGraphPreflightResultCommand: result.command } : {}),
		...optionalNumber("firstGraphPreflightResultOffsetMs", result.offsetMs),
		...optionalNumber("firstGraphPreflightDurationMs", result.durationMs),
		...(result.timings !== undefined ? { firstGraphPreflightTimings: result.timings } : {}),
	};
}

function firstGraphCommandFields(command: ObservedToolCommand | undefined): Partial<FirstGraphCommandFields> {
	if (command === undefined) return {};
	return {
		firstGraphCommandIndex: command.index,
		firstGraphCommand: command.command,
		...optionalNumber("firstGraphCommandOffsetMs", command.offsetMs),
	};
}

function firstGraphPreflightFailureFields(
	failure: ObservedGraphPreflightFailure | undefined,
): Partial<FirstGraphPreflightFailureFields> {
	if (failure === undefined) return {};
	return {
		firstGraphPreflightFailureIndex: failure.index,
		...(failure.command !== undefined ? { firstGraphPreflightFailureCommand: failure.command } : {}),
		...optionalNumber("firstGraphPreflightFailureOffsetMs", failure.offsetMs),
	};
}

function firstSourceReadBeforeGraphFields(
	read: ObservedToolCommand | undefined,
): Partial<FirstSourceReadBeforeGraphFields> {
	if (read === undefined) return {};
	return {
		firstSourceReadBeforeGraphIndex: read.index,
		firstSourceReadBeforeGraph: read.command,
		...optionalNumber("firstSourceReadBeforeGraphOffsetMs", read.offsetMs),
	};
}

export function checkGraphFirstAdoption(summary: GraphCommandAdoptionSummary): GraphFirstAdoptionCheck {
	const failures = [
		...(summary.graphPreflightFailureCount > 0
			? [`${summary.graphPreflightFailureCount} graph preflight failure(s)`]
			: []),
		...(!summary.adopted ? ["no graph command was used"] : []),
		...(summary.sourceReadBeforeGraphCount > 0
			? [`${summary.sourceReadBeforeGraphCount} source read(s) before graph context`]
			: []),
	];
	return { passed: failures.length === 0, failures };
}

export function finalResponseText(events: readonly RuntimeEvent[]): string {
	const resultText = events
		.filter((event) => event.type === "result")
		.map((event) => textFromValue(event.data))
		.filter((text) => text !== undefined && text.length > 0)
		.at(-1);
	if (resultText !== undefined) return resultText;
	return events
		.filter((event) => event.type === "assistant")
		.map((event) => textFromValue(event.data) ?? "")
		.join("");
}

export function checkTraceExpectations(
	events: readonly RuntimeEvent[],
	expectations: TraceExpectationInput,
): TraceExpectationCheck {
	const finalText = finalResponseText(events);
	const expectedText = expectedValues(expectations.text);
	const pathEvidence = tracePathEvidence(events, finalText, expectations.path);
	const commandEvidence = traceCommandEvidence(events, finalText, expectations.command);
	const executedCommandEvidence = traceCommandEvidence(events, finalText, expectations.executedCommand);
	const failures = [
		...missingExpectedValue(finalText, expectations.text, "text"),
		...missingExpectedValue(finalText, expectations.path, "path"),
		...missingExpectedValue(finalText, expectations.command, "command"),
		...missingExecutedCommand(executedCommandEvidence),
	];
	return {
		passed: failures.length === 0,
		failures,
		finalTextLength: finalText.length,
		metrics: traceExpectationMetrics(finalText, expectedText, pathEvidence, commandEvidence, executedCommandEvidence),
		...expectedTraceFields(expectations),
		...pathEvidenceField(pathEvidence),
		...commandEvidenceField(commandEvidence),
		...executedCommandEvidenceField(executedCommandEvidence),
	};
}

function expectedTraceFields(expectations: TraceExpectationInput): Partial<TraceExpectationCheck> {
	return {
		...(expectations.text !== undefined ? { expectedText: expectations.text } : {}),
		...(expectations.path !== undefined ? { expectedPath: expectations.path } : {}),
		...(expectations.command !== undefined ? { expectedCommand: expectations.command } : {}),
		...(expectations.executedCommand !== undefined ? { expectedExecutedCommand: expectations.executedCommand } : {}),
	};
}

function pathEvidenceField(pathEvidence: readonly TraceExpectedPathEvidence[]): Partial<TraceExpectationCheck> {
	return pathEvidence.length > 0 ? { pathEvidence } : {};
}

function commandEvidenceField(
	commandEvidence: readonly TraceExpectedCommandEvidence[],
): Partial<TraceExpectationCheck> {
	return commandEvidence.length > 0 ? { commandEvidence } : {};
}

function executedCommandEvidenceField(
	executedCommandEvidence: readonly TraceExpectedCommandEvidence[],
): Partial<TraceExpectationCheck> {
	return executedCommandEvidence.length > 0 ? { executedCommandEvidence } : {};
}

function traceExpectationMetrics(
	finalText: string,
	expectedText: readonly string[],
	pathEvidence: readonly TraceExpectedPathEvidence[],
	commandEvidence: readonly TraceExpectedCommandEvidence[],
	executedCommandEvidence: readonly TraceExpectedCommandEvidence[],
): TraceExpectationMetrics {
	return {
		expectedTextCount: expectedText.length,
		expectedPathCount: pathEvidence.length,
		expectedCommandCount: commandEvidence.length,
		expectedExecutedCommandCount: executedCommandEvidence.length,
		finalTextHitCount: expectedText.filter((text) => finalText.includes(text)).length,
		finalPathHitCount: pathEvidence.filter((item) => item.observedInFinalResponse).length,
		toolPathHitCount: pathEvidence.filter((item) => item.observedInToolCommand).length,
		sourceReadPathHitCount: pathEvidence.filter((item) => item.observedInSourceReadCommand).length,
		finalCommandHitCount: commandEvidence.filter((item) => item.observedInFinalResponse).length,
		toolCommandHitCount: commandEvidence.filter((item) => item.observedInToolCommand).length,
		executedCommandHitCount: executedCommandEvidence.filter((item) => item.observedInToolCommand).length,
	};
}

function tracePathEvidence(
	events: readonly RuntimeEvent[],
	finalText: string,
	expectedPath: TraceExpectedValue | undefined,
): readonly TraceExpectedPathEvidence[] {
	const commands = observedToolCommands(events);
	const sourceReadCommands = commands.filter((command) => isSourceReadCommand(command.command));
	return expectedValues(expectedPath).map((path) => {
		const firstToolCommand = commands.find((command) => command.command.includes(path));
		const firstSourceReadCommand = sourceReadCommands.find((command) => command.command.includes(path));
		return {
			path,
			observedInFinalResponse: finalText.includes(path),
			observedInToolCommand: firstToolCommand !== undefined,
			observedInSourceReadCommand: firstSourceReadCommand !== undefined,
			...firstToolCommandEvidence(firstToolCommand),
			...firstSourceReadCommandEvidence(firstSourceReadCommand),
		};
	});
}

function traceCommandEvidence(
	events: readonly RuntimeEvent[],
	finalText: string,
	expectedCommand: TraceExpectedValue | undefined,
): readonly TraceExpectedCommandEvidence[] {
	const commands = observedToolCommands(events);
	return expectedValues(expectedCommand).map((command) => {
		const firstToolCommand = commands.find((item) => item.command.includes(command));
		return {
			command,
			observedInFinalResponse: finalText.includes(command),
			observedInToolCommand: firstToolCommand !== undefined,
			...expectedCommandToolEvidence(firstToolCommand),
		};
	});
}

function firstToolCommandEvidence(command: ObservedToolCommand | undefined): Partial<TraceExpectedPathEvidence> {
	if (command === undefined) return {};
	return {
		firstToolCommandIndex: command.index,
		firstToolCommand: command.command,
		...optionalNumber("firstToolCommandOffsetMs", command.offsetMs),
	};
}

function firstSourceReadCommandEvidence(command: ObservedToolCommand | undefined): Partial<TraceExpectedPathEvidence> {
	if (command === undefined) return {};
	return {
		firstSourceReadCommandIndex: command.index,
		firstSourceReadCommand: command.command,
		...optionalNumber("firstSourceReadCommandOffsetMs", command.offsetMs),
	};
}

function expectedCommandToolEvidence(command: ObservedToolCommand | undefined): Partial<TraceExpectedCommandEvidence> {
	if (command === undefined) return {};
	return {
		firstToolCommandIndex: command.index,
		firstToolCommand: command.command,
		...optionalNumber("firstToolCommandOffsetMs", command.offsetMs),
	};
}

export function isCartographerPreflightCommand(command: string): boolean {
	const normalized = normalizeCommand(command);
	return isPreflightAlias(normalized) || isContextGraphCommand(normalized);
}

export function isSourceReadCommand(command: string): boolean {
	const normalized = normalizeCommand(command);
	if (isCartographerPreflightCommand(normalized)) return false;
	return sourceReadCommandCandidates(normalized).some(isSourceReadCandidate);
}

function observedToolCommands(events: readonly RuntimeEvent[]): readonly ObservedToolCommand[] {
	const startedAtMs = firstTimestampMs(events);
	return events.flatMap((event, index) => {
		if (event.type !== "tool_use") return [];
		const command = commandTextFromValue(event.data);
		if (command === undefined) return [];
		return [{ index, command, ...optionalNumber("offsetMs", offsetMs(startedAtMs, timestampMs(event.timestamp))) }];
	});
}

function observedGraphPreflightResults(events: readonly RuntimeEvent[]): readonly ObservedGraphPreflightResult[] {
	const startedAtMs = firstTimestampMs(events);
	return events.flatMap((event, index) => {
		if (event.type !== "tool_result") return [];
		const preflight = graphPreflightResultFromValue(event.data);
		if (preflight === undefined) return [];
		return [
			{
				index,
				...preflight,
				...optionalNumber("offsetMs", offsetMs(startedAtMs, timestampMs(event.timestamp))),
			},
		];
	});
}

function observedGraphPreflightFailures(events: readonly RuntimeEvent[]): readonly ObservedGraphPreflightFailure[] {
	const startedAtMs = firstTimestampMs(events);
	return events.flatMap((event, index) => {
		if (event.type !== "error") return [];
		const preflight = graphPreflightErrorFromValue(event.data);
		if (preflight === undefined) return [];
		return [
			{
				index,
				...preflight,
				...optionalNumber("offsetMs", offsetMs(startedAtMs, timestampMs(event.timestamp))),
			},
		];
	});
}

function traceDurationMs(events: readonly RuntimeEvent[]): number | undefined {
	const timestamps = events.map((event) => timestampMs(event.timestamp)).filter((value) => value !== undefined);
	const first = timestamps[0];
	const last = timestamps.at(-1);
	return first !== undefined && last !== undefined && last >= first ? last - first : undefined;
}

function firstTimestampMs(events: readonly RuntimeEvent[]): number | undefined {
	for (const event of events) {
		const parsed = timestampMs(event.timestamp);
		if (parsed !== undefined) return parsed;
	}
	return undefined;
}

function timestampMs(value: string): number | undefined {
	const parsed = Date.parse(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}

function offsetMs(startedAtMs: number | undefined, timestamp: number | undefined): number | undefined {
	if (startedAtMs === undefined || timestamp === undefined || timestamp < startedAtMs) return undefined;
	return timestamp - startedAtMs;
}

function optionalNumber<K extends string>(key: K, value: number | undefined): { readonly [P in K]?: number } {
	return value === undefined ? {} : ({ [key]: value } as { readonly [P in K]?: number });
}

function commandTextFromValue(value: unknown, depth = 0): string | undefined {
	if (depth > 5) return undefined;
	const directCommand = directCommandText(value);
	if (directCommand !== undefined) return directCommand;
	if (!isRecord(value)) return undefined;
	return commandTextFromRecord(value, depth);
}

function directCommandText(value: unknown): string | undefined {
	if (typeof value === "string") return nonEmptyString(value);
	if (isStringArray(value)) return value.join(" ");
	return undefined;
}

function commandTextFromRecord(value: Record<string, unknown>, depth: number): string | undefined {
	for (const key of commandKeys) {
		const command = commandTextFromValue(value[key], depth + 1);
		if (command !== undefined) return command;
	}
	return undefined;
}

function textFromValue(value: unknown, depth = 0): string | undefined {
	if (depth > 5) return undefined;
	if (typeof value === "string") return value;
	if (Array.isArray(value)) return textFromArray(value, depth);
	if (!isRecord(value)) return undefined;
	for (const key of textKeys) {
		const text = textFromValue(value[key], depth + 1);
		if (text !== undefined) return text;
	}
	return undefined;
}

function textFromArray(values: readonly unknown[], depth: number): string | undefined {
	const text = values.map((value) => textFromValue(value, depth + 1) ?? "").join("");
	return text.length > 0 ? text : undefined;
}

function graphPreflightResultFromValue(
	value: unknown,
): Pick<ObservedGraphPreflightResult, "command" | "durationMs" | "timings"> | undefined {
	if (!isRecord(value)) return undefined;
	const command = commandTextFromValue(value["command"]) ?? commandTextFromValue(value);
	if (!isGraphPreflightResult(value, command)) return undefined;
	return {
		...(command !== undefined ? { command } : {}),
		...optionalNumber("durationMs", nonnegativeNumber(value["durationMs"])),
		...optionalTimings(value["timings"]),
	};
}

function isGraphPreflightResult(value: Record<string, unknown>, command: string | undefined): boolean {
	return (
		value["name"] === "cartographer.preflight" || (command !== undefined && isCartographerPreflightCommand(command))
	);
}

function graphPreflightErrorFromValue(value: unknown): Pick<ObservedGraphPreflightFailure, "command"> | undefined {
	if (!isRecord(value)) return undefined;
	const graphPreflight = value["graphPreflight"];
	if (!isRecord(graphPreflight)) return undefined;
	const command = commandTextFromValue(graphPreflight["command"]);
	return command === undefined ? {} : { command };
}

function optionalTimings(value: unknown): { readonly timings?: GraphPreflightTimingSummary } {
	if (!isRecord(value)) return {};
	const timings: GraphPreflightTimingSummary = {
		...optionalNumber("loadGraphMs", nonnegativeNumber(value["loadGraphMs"])),
		...optionalNumber("buildContextMs", nonnegativeNumber(value["buildContextMs"])),
		...optionalNumber("renderPromptMs", nonnegativeNumber(value["renderPromptMs"])),
	};
	return Object.keys(timings).length > 0 ? { timings } : {};
}

function nonnegativeNumber(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function nonEmptyString(value: string): string | undefined {
	return value.trim().length > 0 ? value : undefined;
}

function missingExpectedValue(
	text: string,
	expected: TraceExpectedValue | undefined,
	label: string,
): readonly string[] {
	return expectedValues(expected)
		.filter((value) => !text.includes(value))
		.map((value) => `final response did not include expected ${label}: ${value}`);
}

function missingExecutedCommand(commandEvidence: readonly TraceExpectedCommandEvidence[]): readonly string[] {
	return commandEvidence
		.filter((item) => !item.observedInToolCommand)
		.map((item) => `trace did not execute expected command: ${item.command}`);
}

function expectedValues(expected: TraceExpectedValue | undefined): readonly string[] {
	if (expected === undefined) return [];
	return typeof expected === "string" ? [expected] : expected;
}

function normalizeCommand(command: string): string {
	return command.replace(/\s+/g, " ").trim();
}

function sourceReadCommandCandidates(command: string): readonly string[] {
	const unwrapped = unwrapShellCommand(command);
	return unwrapped === undefined ? [command] : [command, unwrapped];
}

function isSourceReadCandidate(command: string): boolean {
	return sourceReadCommandPatterns.some((pattern) => pattern.test(command)) && !isInstructionOnlyRead(command);
}

function unwrapShellCommand(command: string): string | undefined {
	return unwrapShellCommandWithQuote(command, "'") ?? unwrapShellCommandWithQuote(command, '"');
}

function unwrapShellCommandWithQuote(command: string, quote: "'" | '"'): string | undefined {
	const content = shellEvalPattern(quote).exec(command)?.[1];
	return content === undefined ? undefined : normalizeCommand(content);
}

function shellEvalPattern(quote: "'" | '"'): RegExp {
	const escapedQuote = quote === "'" ? "'" : '\\"';
	return new RegExp(
		`(?:^|\\s)(?:[\\w./-]+/)?(?:sh|bash|zsh)\\s+-[\\w-]*c\\s+${escapedQuote}([^${escapedQuote}]*)${escapedQuote}`,
	);
}

function isInstructionOnlyRead(command: string): boolean {
	const paths = pathLikeValues(command);
	return paths.length > 0 && paths.every(isInstructionPath);
}

function pathLikeValues(command: string): readonly string[] {
	return [...command.matchAll(pathLikePattern)].map((match) => match[1]).filter((value) => value !== undefined);
}

function isInstructionPath(value: string): boolean {
	const normalized = value.replace(/^~\//, "/").replace(/\\/g, "/");
	return instructionPathPatterns.some((pattern) => pattern.test(normalized));
}

function hasFlag(command: string, flag: string): boolean {
	return new RegExp(`(?:^|\\s)--${flag}(?:\\s|=|$)`).test(command);
}

function isPreflightAlias(command: string): boolean {
	return preflightAliasPatterns.some((pattern) => pattern.test(command));
}

function isContextGraphCommand(command: string): boolean {
	return cartographerContextPattern.test(command) && hasFlag(command, "json");
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is readonly string[] {
	return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

const commandKeys = ["command", "cmd", "argv", "args", "commandLine", "input", "item"];
const textKeys = ["text", "result", "summary", "content", "message", "delta"];

const sourceReadCommandPatterns = [
	/(?:^|\s)(?:cat|sed|grep|rg|ripgrep|awk|nl|head|tail|less|more|bat|fd|find|tree)(?:\s|$)/,
	/(?:^|\s)git\s+(?:grep|show|diff)(?:\s|$)/,
];

const pathLikePattern = /(?:^|\s)(~?\/[^\s"'|;]+|\.{1,2}\/[^\s"'|;]+|[A-Za-z0-9_.-]+\/[^\s"'|;]+)/g;
const instructionPathPatterns = [/(^|\/)\.codex\/skills\//, /(^|\/)\.agents\/skills\//, /(^|\/)\.claude\/skills\//];
const preflightAliasPatterns = [/\bcartographer:preflight\b/, /\bcartographer\s+preflight\b/];
const cartographerContextPattern = /\bcartographer(?::|\s+)context\b/;
