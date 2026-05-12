import { describe, expect, test } from "bun:test";
import { annotateSliceWithOpenRouter } from "../openrouter.ts";
import type { GraphSlice } from "../types.ts";

describe("annotateSliceWithOpenRouter", () => {
	test("uses OpenRouter tool calling and normalizes grounded annotations", async () => {
		const calls: unknown[] = [];
		const fetchImpl = (async (_url: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
			calls.push(JSON.parse(String(init?.body)));
			return new Response(
				JSON.stringify({
					choices: [
						{
							message: {
								tool_calls: [
									{
										id: "call_1",
										type: "function",
										function: {
											name: "record_annotations",
											arguments: JSON.stringify({
												annotations: [
													{
														targetNodeId: "file:src/index.ts",
														kind: "purpose",
														summary: "Entrypoint for the fixture.",
														evidencePaths: ["src/index.ts"],
													},
													{
														targetNodeId: "file:src/index.ts",
														kind: "workflow",
														summary: "This cites a real slice file, but not the target node.",
														evidencePaths: ["src/other.ts"],
													},
													{
														targetNodeId: "missing",
														kind: "purpose",
														summary: "This should be dropped.",
														evidencePaths: ["src/index.ts"],
													},
												],
											}),
										},
									},
								],
							},
						},
					],
				}),
				{ status: 200 },
			);
		}) as typeof fetch;

		const annotations = await annotateSliceWithOpenRouter({
			apiKey: "test-key",
			model: "openai/gpt-5.5",
			fetchImpl,
			now: new Date("2026-05-11T00:00:00.000Z"),
			slice: fixtureSlice(),
		});

		expect(annotations).toHaveLength(1);
		expect(annotations[0]?.targetNodeId).toBe("file:src/index.ts");
		expect(annotations[0]?.confidence).toBe("agent-inferred");
		expect(annotations[0]?.evidence).toEqual([{ path: "src/index.ts", hash: "fixture-hash" }]);
		expect(calls).toHaveLength(1);
		const request = calls[0] as Record<string, unknown>;
		expect(request["model"]).toBe("openai/gpt-5.5");
		expect(request["tools"]).toBeArray();
		expect(request["tool_choice"]).toEqual({ type: "function", function: { name: "record_annotations" } });
	});
});

function fixtureSlice(): GraphSlice {
	return {
		selector: "path:src/index.ts",
		title: "Slice for path:src/index.ts",
		nodes: [
			{
				id: "file:src/index.ts",
				kind: "File",
				label: "index.ts",
				path: "src/index.ts",
				metadata: {},
				provenance: {
					source: "filesystem",
					evidence: [{ path: "src/index.ts", hash: "fixture-hash" }],
					confidence: "exact",
					freshness: "fresh",
				},
			},
			{
				id: "file:src/other.ts",
				kind: "File",
				label: "other.ts",
				path: "src/other.ts",
				metadata: {},
				provenance: {
					source: "filesystem",
					evidence: [{ path: "src/other.ts", hash: "other-hash" }],
					confidence: "exact",
					freshness: "fresh",
				},
			},
		],
		edges: [],
		findings: [],
		annotations: [],
	};
}
