import { describe, expect, test } from "bun:test";
import type { RuntimeEvent } from "../../core/types.ts";
import {
	analyzeGraphCommandAdoption,
	checkGraphFirstAdoption,
	checkTraceExpectations,
	finalResponseText,
	isCartographerPreflightCommand,
	isSourceReadCommand,
} from "../adoption.ts";

describe("graph command adoption", () => {
	test("accepts the short preflight command as graph adoption", () => {
		const summary = analyzeGraphCommandAdoption([
			toolUse(["bun", "run", "cartographer:preflight", "--", "--path", "src/index.ts"]),
			toolUse(["sed", "-n", "1,80p", "src/index.ts"]),
		]);

		expect(summary.adopted).toBe(true);
		expect(summary.firstGraphCommandIndex).toBe(0);
		expect(summary.graphPreflightFailureCount).toBe(0);
		expect(summary.graphPreflightFailureCommands).toEqual([]);
		expect(summary.sourceReadBeforeGraphCount).toBe(0);
		expect(summary.toolCommandCount).toBe(2);
	});

	test("records source reads before graph use", () => {
		const summary = analyzeGraphCommandAdoption([
			toolUse(["rg", "CodeGraphNodeKind", "src"], "2026-05-11T00:00:00.000Z"),
			toolUse(
				["bun", "run", "src/cli/index.ts", "cartographer", "preflight", "--path", "src/code-graph/types.ts"],
				"2026-05-11T00:00:02.500Z",
			),
		]);

		expect(summary.adopted).toBe(true);
		expect(summary.eventCount).toBe(2);
		expect(summary.traceDurationMs).toBe(2500);
		expect(summary.firstGraphCommandIndex).toBe(1);
		expect(summary.firstGraphCommandOffsetMs).toBe(2500);
		expect(summary.sourceReadBeforeGraphCount).toBe(1);
		expect(summary.sourceReadCommandsBeforeGraph).toEqual(["rg CodeGraphNodeKind src"]);
		expect(summary.firstSourceReadBeforeGraphIndex).toBe(0);
		expect(summary.firstSourceReadBeforeGraph).toBe("rg CodeGraphNodeKind src");
		expect(summary.firstSourceReadBeforeGraphOffsetMs).toBe(0);
	});

	test("records graph preflight result duration and phase timings", () => {
		const summary = analyzeGraphCommandAdoption([
			toolUse(["bun", "run", "cartographer:preflight", "--", "--path", "src/index.ts"], "2026-05-11T00:00:00.000Z"),
			toolResult(
				{
					name: "cartographer.preflight",
					command: "bun run cartographer:preflight -- --path src/index.ts",
					durationMs: 120,
					timings: { loadGraphMs: 90, buildContextMs: 20, renderPromptMs: 10 },
				},
				"2026-05-11T00:00:00.120Z",
			),
		]);

		expect(summary.adopted).toBe(true);
		expect(summary.graphPreflightResultCount).toBe(1);
		expect(summary.graphPreflightDurationsMs).toEqual([120]);
		expect(summary.firstGraphPreflightResultIndex).toBe(1);
		expect(summary.firstGraphPreflightResultCommand).toBe("bun run cartographer:preflight -- --path src/index.ts");
		expect(summary.firstGraphPreflightResultOffsetMs).toBe(120);
		expect(summary.firstGraphPreflightDurationMs).toBe(120);
		expect(summary.firstGraphPreflightTimings).toEqual({
			loadGraphMs: 90,
			buildContextMs: 20,
			renderPromptMs: 10,
		});
	});

	test("records graph preflight failures without treating them as adoption", () => {
		const summary = analyzeGraphCommandAdoption([
			toolUse(["git", "status", "--short"], "2026-05-11T00:00:00.000Z"),
			errorEvent(
				{
					code: "INTERNAL",
					message: "Cartographer preflight failed",
					graphPreflight: {
						command: "cartographer preflight --path src/index.ts --out docs/codegraph",
						root: "/repo",
						path: "src/index.ts",
						live: false,
						depth: 1,
						outDir: "docs/codegraph",
					},
				},
				"2026-05-11T00:00:01.250Z",
			),
		]);

		expect(summary.adopted).toBe(false);
		expect(summary.graphPreflightFailureCount).toBe(1);
		expect(summary.graphPreflightFailureCommands).toEqual([
			"cartographer preflight --path src/index.ts --out docs/codegraph",
		]);
		expect(summary.firstGraphPreflightFailureIndex).toBe(1);
		expect(summary.firstGraphPreflightFailureCommand).toBe(
			"cartographer preflight --path src/index.ts --out docs/codegraph",
		);
		expect(summary.firstGraphPreflightFailureOffsetMs).toBe(1250);
		expect(summary.sourceReadBeforeGraphCount).toBe(0);
		expect(summary.firstGraphCommand).toBeUndefined();
	});

	test("accepts context commands as graph adoption", () => {
		expect(
			isCartographerPreflightCommand("bun run cartographer:context -- --path src/index.ts --depth 1 --compact --json"),
		).toBe(true);
		expect(isCartographerPreflightCommand("bun run cartographer:context -- --path src/index.ts --json")).toBe(true);
		expect(
			isCartographerPreflightCommand("cartographer context --root /repo --live --path src/index.ts --depth 0 --json"),
		).toBe(true);
		expect(isCartographerPreflightCommand("bun run cartographer:context -- --path src/index.ts")).toBe(false);
		const summary = analyzeGraphCommandAdoption([
			toolUse(["cartographer", "context", "--root", "/repo", "--live", "--path", "src/index.ts", "--json"]),
			toolUse(["sed", "-n", "1,40p", "src/index.ts"]),
		]);
		expect(summary.adopted).toBe(true);
		expect(summary.sourceReadBeforeGraphCount).toBe(0);
	});

	test("extracts command execution items from Codex raw event payloads", () => {
		const summary = analyzeGraphCommandAdoption([
			codexCommandEvent("cat src/index.ts"),
			codexCommandEvent(["bun", "run", "cartographer:preflight", "--", "--path", "src/index.ts"]),
		]);

		expect(summary.adopted).toBe(true);
		expect(summary.sourceReadBeforeGraphCount).toBe(1);
	});

	test("does not count graph commands as source reads", () => {
		expect(isSourceReadCommand("bun run cartographer:preflight -- --path src/index.ts")).toBe(false);
		expect(isSourceReadCommand("git status --short")).toBe(false);
		expect(isSourceReadCommand("git diff -- src/index.ts")).toBe(true);
	});

	test("detects shell-wrapped source reads while ignoring skill instruction reads", () => {
		expect(isSourceReadCommand("/bin/zsh -lc \"nl -ba src/code-graph/commands.ts | sed -n '1,90p'\"")).toBe(true);
		expect(
			isSourceReadCommand("/bin/zsh -lc \"sed -n '1,220p' /Users/saint/.codex/skills/cartographer/SKILL.md\""),
		).toBe(false);
	});

	test("counts shell-wrapped repo source reads before graph use", () => {
		const summary = analyzeGraphCommandAdoption([
			codexCommandEvent("/bin/zsh -lc \"sed -n '1,80p' /Users/saint/.codex/skills/cartographer/SKILL.md\""),
			codexCommandEvent("/bin/zsh -lc \"nl -ba src/code-graph/commands.ts | sed -n '1,90p'\""),
			codexCommandEvent(["bun", "run", "cartographer:preflight", "--", "--path", "src/index.ts"]),
		]);

		expect(summary.adopted).toBe(true);
		expect(summary.sourceReadBeforeGraphCount).toBe(1);
		expect(summary.sourceReadCommandsBeforeGraph).toEqual([
			"/bin/zsh -lc \"nl -ba src/code-graph/commands.ts | sed -n '1,90p'\"",
		]);
	});

	test("checks graph-first adoption failures deterministically", () => {
		expect(
			checkGraphFirstAdoption({
				adopted: true,
				eventCount: 2,
				graphPreflightResultCount: 0,
				graphPreflightDurationsMs: [],
				graphPreflightFailureCount: 0,
				graphPreflightFailureCommands: [],
				toolCommandCount: 1,
				sourceReadBeforeGraphCount: 0,
				sourceReadCommandsBeforeGraph: [],
			}),
		).toEqual({ passed: true, failures: [] });
		expect(
			checkGraphFirstAdoption({
				adopted: false,
				eventCount: 2,
				graphPreflightResultCount: 0,
				graphPreflightDurationsMs: [],
				graphPreflightFailureCount: 1,
				graphPreflightFailureCommands: ["cartographer preflight --path src/index.ts"],
				toolCommandCount: 1,
				sourceReadBeforeGraphCount: 2,
				sourceReadCommandsBeforeGraph: ["cat src/index.ts", "rg target src"],
			}),
		).toEqual({
			passed: false,
			failures: ["1 graph preflight failure(s)", "no graph command was used", "2 source read(s) before graph context"],
		});
	});

	test("checks final response expectations from result text", () => {
		const answer =
			'{"marker":"CODEX_UNDERSTANDING_OK","file":"src/code-graph/adoption.ts","validationCommand":"bun test"}';
		const events = [assistantEvent("thinking aloud"), resultEvent({ text: answer })];

		expect(finalResponseText(events)).toContain("src/code-graph/adoption.ts");
		expect(
			checkTraceExpectations(events, {
				text: "CODEX_UNDERSTANDING_OK",
				path: "src/code-graph/adoption.ts",
				command: "bun test",
			}),
		).toEqual({
			passed: true,
			failures: [],
			finalTextLength: answer.length,
			metrics: {
				expectedTextCount: 1,
				expectedPathCount: 1,
				expectedCommandCount: 1,
				expectedExecutedCommandCount: 0,
				finalTextHitCount: 1,
				finalPathHitCount: 1,
				toolPathHitCount: 0,
				sourceReadPathHitCount: 0,
				finalCommandHitCount: 1,
				toolCommandHitCount: 0,
				executedCommandHitCount: 0,
			},
			expectedText: "CODEX_UNDERSTANDING_OK",
			expectedPath: "src/code-graph/adoption.ts",
			expectedCommand: "bun test",
			pathEvidence: [
				{
					path: "src/code-graph/adoption.ts",
					observedInFinalResponse: true,
					observedInToolCommand: false,
					observedInSourceReadCommand: false,
				},
			],
			commandEvidence: [
				{
					command: "bun test",
					observedInFinalResponse: true,
					observedInToolCommand: false,
				},
			],
		});
		expect(checkTraceExpectations(events, { path: "src/code-graph/commands.ts" })).toEqual({
			passed: false,
			failures: ["final response did not include expected path: src/code-graph/commands.ts"],
			finalTextLength: answer.length,
			metrics: {
				expectedTextCount: 0,
				expectedPathCount: 1,
				expectedCommandCount: 0,
				expectedExecutedCommandCount: 0,
				finalTextHitCount: 0,
				finalPathHitCount: 0,
				toolPathHitCount: 0,
				sourceReadPathHitCount: 0,
				finalCommandHitCount: 0,
				toolCommandHitCount: 0,
				executedCommandHitCount: 0,
			},
			expectedPath: "src/code-graph/commands.ts",
			pathEvidence: [
				{
					path: "src/code-graph/commands.ts",
					observedInFinalResponse: false,
					observedInToolCommand: false,
					observedInSourceReadCommand: false,
				},
			],
		});
	});

	test("checks repeated final response expectations", () => {
		const answer = [
			"CODEX_UNDERSTANDING_OK",
			"src/code-graph/adoption.ts",
			"src/code-graph/commands.ts",
			"bun test src/code-graph",
		].join("\n");
		const events = [resultEvent({ text: answer })];

		expect(
			checkTraceExpectations(events, {
				text: "CODEX_UNDERSTANDING_OK",
				path: ["src/code-graph/adoption.ts", "src/code-graph/commands.ts"],
				command: ["bun test src/code-graph", "bun run typecheck"],
			}),
		).toEqual({
			passed: false,
			failures: ["final response did not include expected command: bun run typecheck"],
			finalTextLength: answer.length,
			metrics: {
				expectedTextCount: 1,
				expectedPathCount: 2,
				expectedCommandCount: 2,
				expectedExecutedCommandCount: 0,
				finalTextHitCount: 1,
				finalPathHitCount: 2,
				toolPathHitCount: 0,
				sourceReadPathHitCount: 0,
				finalCommandHitCount: 1,
				toolCommandHitCount: 0,
				executedCommandHitCount: 0,
			},
			expectedText: "CODEX_UNDERSTANDING_OK",
			expectedPath: ["src/code-graph/adoption.ts", "src/code-graph/commands.ts"],
			expectedCommand: ["bun test src/code-graph", "bun run typecheck"],
			pathEvidence: [
				{
					path: "src/code-graph/adoption.ts",
					observedInFinalResponse: true,
					observedInToolCommand: false,
					observedInSourceReadCommand: false,
				},
				{
					path: "src/code-graph/commands.ts",
					observedInFinalResponse: true,
					observedInToolCommand: false,
					observedInSourceReadCommand: false,
				},
			],
			commandEvidence: [
				{
					command: "bun test src/code-graph",
					observedInFinalResponse: true,
					observedInToolCommand: false,
				},
				{
					command: "bun run typecheck",
					observedInFinalResponse: false,
					observedInToolCommand: false,
				},
			],
		});
	});

	test("records expected path evidence across final text, tool commands, and source reads", () => {
		const events = [
			toolUse(["bun", "run", "cartographer:preflight", "--", "--path", "src/code-graph/adoption.ts"]),
			toolUse(["sed", "-n", "1,80p", "src/code-graph/commands.ts"]),
			resultEvent({
				text: "CODEX_UNDERSTANDING_OK\nsrc/code-graph/adoption.ts\nsrc/code-graph/commands.ts",
			}),
		];

		expect(
			checkTraceExpectations(events, {
				path: ["src/code-graph/adoption.ts", "src/code-graph/commands.ts"],
			}).pathEvidence,
		).toEqual([
			{
				path: "src/code-graph/adoption.ts",
				observedInFinalResponse: true,
				observedInToolCommand: true,
				observedInSourceReadCommand: false,
				firstToolCommandIndex: 0,
				firstToolCommand: "bun run cartographer:preflight -- --path src/code-graph/adoption.ts",
				firstToolCommandOffsetMs: 0,
			},
			{
				path: "src/code-graph/commands.ts",
				observedInFinalResponse: true,
				observedInToolCommand: true,
				observedInSourceReadCommand: true,
				firstToolCommandIndex: 1,
				firstToolCommand: "sed -n 1,80p src/code-graph/commands.ts",
				firstToolCommandOffsetMs: 0,
				firstSourceReadCommandIndex: 1,
				firstSourceReadCommand: "sed -n 1,80p src/code-graph/commands.ts",
				firstSourceReadCommandOffsetMs: 0,
			},
		]);
	});

	test("records expected command evidence across final text and tool commands", () => {
		const events = [
			toolUse(["bun", "test", "src/code-graph"]),
			resultEvent({ text: "Validation: bun test src/code-graph and bun run typecheck" }),
		];

		expect(
			checkTraceExpectations(events, {
				command: ["bun test src/code-graph", "bun run typecheck"],
			}).commandEvidence,
		).toEqual([
			{
				command: "bun test src/code-graph",
				observedInFinalResponse: true,
				observedInToolCommand: true,
				firstToolCommandIndex: 0,
				firstToolCommand: "bun test src/code-graph",
				firstToolCommandOffsetMs: 0,
			},
			{
				command: "bun run typecheck",
				observedInFinalResponse: true,
				observedInToolCommand: false,
			},
		]);
	});

	test("passes executed command expectations only when a tool command ran", () => {
		const events = [toolUse(["bun", "test", "src/code-graph"]), resultEvent({ text: "Validation completed." })];
		const check = checkTraceExpectations(events, { executedCommand: "bun test src/code-graph" });

		expect(check.passed).toBe(true);
		expect(check.failures).toEqual([]);
		expect(check.expectedExecutedCommand).toBe("bun test src/code-graph");
		expect(check.metrics.expectedExecutedCommandCount).toBe(1);
		expect(check.metrics.executedCommandHitCount).toBe(1);
		expect(check.executedCommandEvidence).toEqual([
			{
				command: "bun test src/code-graph",
				observedInFinalResponse: false,
				observedInToolCommand: true,
				firstToolCommandIndex: 0,
				firstToolCommand: "bun test src/code-graph",
				firstToolCommandOffsetMs: 0,
			},
		]);
	});

	test("fails executed command expectations when the final answer only recommends the command", () => {
		const events = [resultEvent({ text: "Run bun test src/code-graph before merging." })];
		const check = checkTraceExpectations(events, { executedCommand: "bun test src/code-graph" });

		expect(check.passed).toBe(false);
		expect(check.failures).toEqual(["trace did not execute expected command: bun test src/code-graph"]);
		expect(check.metrics.executedCommandHitCount).toBe(0);
		expect(check.executedCommandEvidence).toEqual([
			{
				command: "bun test src/code-graph",
				observedInFinalResponse: true,
				observedInToolCommand: false,
			},
		]);
	});

	test("falls back to assistant deltas when no result text exists", () => {
		const events = [assistantEvent("src/code-graph/"), assistantEvent("adoption.ts")];

		expect(finalResponseText(events)).toBe("src/code-graph/adoption.ts");
		expect(checkTraceExpectations(events, { path: "src/code-graph/adoption.ts" }).passed).toBe(true);
	});
});

function toolUse(command: readonly string[], timestamp?: string): RuntimeEvent {
	return event({ name: "shell", input: { command } }, timestamp);
}

function codexCommandEvent(command: string | readonly string[]): RuntimeEvent {
	return event({ status: "started", item: { type: "commandExecution", command } });
}

function event(data: unknown, timestamp = "2026-05-11T00:00:00.000Z"): RuntimeEvent {
	return {
		type: "tool_use",
		turnId: "turn-test",
		timestamp,
		data,
	};
}

function toolResult(data: unknown, timestamp = "2026-05-11T00:00:00.000Z"): RuntimeEvent {
	return {
		type: "tool_result",
		turnId: "turn-test",
		timestamp,
		data,
	};
}

function errorEvent(data: unknown, timestamp = "2026-05-11T00:00:00.000Z"): RuntimeEvent {
	return {
		type: "error",
		turnId: "turn-test",
		timestamp,
		data,
	};
}

function assistantEvent(text: string): RuntimeEvent {
	return {
		type: "assistant",
		turnId: "turn-test",
		timestamp: "2026-05-11T00:00:00.000Z",
		data: { text },
	};
}

function resultEvent(data: unknown): RuntimeEvent {
	return {
		type: "result",
		turnId: "turn-test",
		timestamp: "2026-05-11T00:00:00.000Z",
		data,
	};
}
