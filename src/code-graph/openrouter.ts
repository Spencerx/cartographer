import { HarnessError } from "../shared/errors.ts";
import type { AgentAnnotation, CodeGraphEvidence, GraphSlice } from "./types.ts";

export const DEFAULT_OPENROUTER_MODEL = "openai/gpt-5.5";

type OpenRouterFetch = (
	url: Parameters<typeof fetch>[0],
	init?: Parameters<typeof fetch>[1],
) => ReturnType<typeof fetch>;

export interface OpenRouterAnnotateOptions {
	readonly apiKey: string;
	readonly model?: string;
	readonly slice: GraphSlice;
	readonly now?: Date;
	readonly fetchImpl?: OpenRouterFetch;
}

interface OpenRouterToolCall {
	readonly id: string;
	readonly type: "function";
	readonly function: {
		readonly name: string;
		readonly arguments: string;
	};
}

interface OpenRouterResponse {
	readonly choices?: Array<{
		readonly message?: {
			readonly content?: string | null;
			readonly tool_calls?: OpenRouterToolCall[];
		};
	}>;
	readonly error?: {
		readonly message?: string;
	};
}

interface AnnotationPayload {
	readonly annotations?: unknown;
}

export async function annotateSliceWithOpenRouter(
	options: OpenRouterAnnotateOptions,
): Promise<readonly AgentAnnotation[]> {
	const response = await (options.fetchImpl ?? fetch)(OPENROUTER_CHAT_COMPLETIONS_URL, {
		method: "POST",
		headers: openRouterHeaders(options.apiKey),
		body: JSON.stringify(openRouterRequestBody(options)),
	});
	const body = (await response.json()) as OpenRouterResponse;
	assertOpenRouterOk(response, body);
	const toolCall = recordAnnotationsCall(body);
	if (toolCall === undefined) return [];
	const parsed = parseToolArguments(toolCall.function.arguments);
	return normalizeAnnotations(parsed.annotations, options.slice, options.now ?? new Date());
}

const OPENROUTER_CHAT_COMPLETIONS_URL = "https://openrouter.ai/api/v1/chat/completions";

function openRouterHeaders(apiKey: string): Record<string, string> {
	return {
		Authorization: `Bearer ${apiKey}`,
		"Content-Type": "application/json",
		"HTTP-Referer": "https://github.com/kingbootoshi/cartographer",
		"X-OpenRouter-Title": "Cartographer",
	};
}

function openRouterRequestBody(options: OpenRouterAnnotateOptions): Record<string, unknown> {
	return {
		model: options.model ?? DEFAULT_OPENROUTER_MODEL,
		messages: [
			{
				role: "system",
				content:
					"You annotate code graph slices for coding agents. Return only grounded candidate notes through the record_annotations tool. Do not invent files, owners, tests, or resources. Every note must cite at least one evidence path for its target node.",
			},
			{ role: "user", content: slicePrompt(options.slice) },
		],
		tools: [recordAnnotationsTool()],
		tool_choice: { type: "function", function: { name: "record_annotations" } },
		parallel_tool_calls: false,
	};
}

function assertOpenRouterOk(response: Response, body: OpenRouterResponse): void {
	if (response.ok) return;
	throw new HarnessError("TOOL_EXECUTION_FAILED", body.error?.message ?? "OpenRouter annotation request failed", {
		context: { failureClass: "provider" },
	});
}

function recordAnnotationsCall(body: OpenRouterResponse): OpenRouterToolCall | undefined {
	return body.choices?.[0]?.message?.tool_calls?.find((call) => call.function.name === "record_annotations");
}

function recordAnnotationsTool(): Record<string, unknown> {
	return {
		type: "function",
		function: {
			name: "record_annotations",
			description:
				"Record grounded semantic overlay notes for a code graph slice. Use this only for claims supported by the provided paths and graph facts.",
			parameters: {
				type: "object",
				properties: {
					annotations: {
						type: "array",
						items: {
							type: "object",
							properties: {
								targetNodeId: { type: "string" },
								kind: {
									type: "string",
									enum: [
										"purpose",
										"invariant",
										"edit-warning",
										"workflow",
										"test-guidance",
										"generated-ownership",
										"iac-link",
										"risk",
									],
								},
								summary: { type: "string" },
								evidencePaths: { type: "array", items: { type: "string" } },
							},
							required: ["targetNodeId", "kind", "summary", "evidencePaths"],
							additionalProperties: false,
						},
					},
				},
				required: ["annotations"],
				additionalProperties: false,
			},
		},
	};
}

function slicePrompt(slice: GraphSlice): string {
	const nodes = slice.nodes.slice(0, 160).map((node) => ({
		id: node.id,
		kind: node.kind,
		label: node.label,
		path: node.path,
		metadata: node.metadata,
	}));
	const edges = slice.edges.slice(0, 220).map((edge) => ({
		kind: edge.kind,
		from: edge.from,
		to: edge.to,
		label: edge.label,
	}));
	const findings = slice.findings.slice(0, 80).map((finding) => ({
		severity: finding.severity,
		message: finding.message,
		nodeId: finding.nodeId,
		evidence: finding.evidence,
	}));
	return JSON.stringify(
		{
			selector: slice.selector,
			title: slice.title,
			instructions: [
				"Create concise semantic notes useful to coding agents.",
				"Prefer edit warnings, generated ownership, workflow, test guidance, and IaC links when supported.",
				"Every annotation must cite evidencePaths that exist in the provided nodes or findings.",
				"At least one evidencePath must belong to the target node path or target node provenance.",
				"If there is not enough evidence, return an empty annotations array.",
			],
			nodes,
			edges,
			findings,
		},
		null,
		2,
	);
}

function parseToolArguments(raw: string): AnnotationPayload {
	try {
		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed === "object" && parsed !== null) return parsed as AnnotationPayload;
		return {};
	} catch {
		return {};
	}
}

function normalizeAnnotations(raw: unknown, slice: GraphSlice, now: Date): readonly AgentAnnotation[] {
	if (!Array.isArray(raw)) return [];
	const context = annotationContext(slice, now);
	return raw.flatMap((item, index) => normalizeAnnotationItem(item, index, context));
}

interface AnnotationContext {
	readonly nodeIds: ReadonlySet<string>;
	readonly evidenceByPath: ReadonlyMap<string, CodeGraphEvidence>;
	readonly targetEvidencePathsByNodeId: ReadonlyMap<string, ReadonlySet<string>>;
	readonly timestamp: string;
}

function annotationContext(slice: GraphSlice, now: Date): AnnotationContext {
	const evidenceByPath = new Map<string, CodeGraphEvidence>();
	const targetEvidencePathsByNodeId = new Map<string, Set<string>>();
	for (const node of slice.nodes) {
		targetEvidencePathsByNodeId.set(node.id, recordNodeEvidence(node, evidenceByPath));
	}
	for (const edge of slice.edges) {
		for (const evidence of edge.provenance.evidence) recordEvidence(evidence, evidenceByPath);
	}
	for (const finding of slice.findings) {
		for (const evidence of finding.evidence) recordEvidence(evidence, evidenceByPath);
	}
	for (const annotation of slice.annotations) {
		for (const evidence of annotation.evidence) recordEvidence(evidence, evidenceByPath);
	}
	return {
		nodeIds: new Set(slice.nodes.map((node) => node.id)),
		evidenceByPath,
		targetEvidencePathsByNodeId,
		timestamp: now.toISOString(),
	};
}

function recordNodeEvidence(
	node: GraphSlice["nodes"][number],
	evidenceByPath: Map<string, CodeGraphEvidence>,
): Set<string> {
	const targetEvidencePaths = new Set<string>();
	if (node.path !== undefined) {
		recordEvidence({ path: node.path }, evidenceByPath);
		targetEvidencePaths.add(node.path);
	}
	for (const evidence of node.provenance.evidence) {
		recordEvidence(evidence, evidenceByPath);
		targetEvidencePaths.add(evidence.path);
	}
	return targetEvidencePaths;
}

function recordEvidence(evidence: CodeGraphEvidence, evidenceByPath: Map<string, CodeGraphEvidence>): void {
	const current = evidenceByPath.get(evidence.path);
	if (current === undefined || (current.hash === undefined && evidence.hash !== undefined)) {
		evidenceByPath.set(evidence.path, evidence);
	}
}

function normalizeAnnotationItem(item: unknown, index: number, context: AnnotationContext): readonly AgentAnnotation[] {
	if (!isRecord(item)) return [];
	const annotation = normalizedAnnotationFromRecord(item, index, context);
	return annotation === undefined ? [] : [annotation];
}

function normalizedAnnotationFromRecord(
	item: Record<string, unknown>,
	index: number,
	context: AnnotationContext,
): AgentAnnotation | undefined {
	const fields = annotationFields(item, context.nodeIds);
	if (fields === undefined) return undefined;
	const evidence = validEvidencePaths(item["evidencePaths"], context.evidenceByPath);
	if (evidence.length === 0) return undefined;
	if (!evidenceAnchorsTarget(fields.targetNodeId, evidence, context.targetEvidencePathsByNodeId)) return undefined;
	return {
		id: `annotation:${fields.targetNodeId}:${fields.kind}:${index}`,
		targetNodeId: fields.targetNodeId,
		kind: fields.kind,
		summary: fields.summary,
		evidence,
		author: { type: "agent", name: "openrouter" },
		confidence: "agent-inferred",
		status: "candidate",
		createdAt: context.timestamp,
		updatedAt: context.timestamp,
	};
}

function evidenceAnchorsTarget(
	targetNodeId: string,
	evidence: readonly CodeGraphEvidence[],
	targetEvidencePathsByNodeId: ReadonlyMap<string, ReadonlySet<string>>,
): boolean {
	const targetEvidencePaths = targetEvidencePathsByNodeId.get(targetNodeId);
	if (targetEvidencePaths === undefined || targetEvidencePaths.size === 0) return true;
	return evidence.some((item) => targetEvidencePaths.has(item.path));
}

interface AnnotationFields {
	readonly targetNodeId: string;
	readonly kind: AgentAnnotation["kind"];
	readonly summary: string;
}

function annotationFields(item: Record<string, unknown>, nodeIds: ReadonlySet<string>): AnnotationFields | undefined {
	const fields = rawAnnotationFields(item);
	return fields !== undefined && nodeIds.has(fields.targetNodeId) ? fields : undefined;
}

function rawAnnotationFields(item: Record<string, unknown>): AnnotationFields | undefined {
	const targetNodeId = stringValue(item["targetNodeId"]);
	const kind = annotationKind(item["kind"]);
	const summary = stringValue(item["summary"]);
	if (targetNodeId === undefined) return undefined;
	if (kind === undefined) return undefined;
	if (summary === undefined) return undefined;
	return { targetNodeId, kind, summary };
}

function annotationKind(value: unknown): AgentAnnotation["kind"] | undefined {
	const kind = stringValue(value);
	return kind !== undefined && isAnnotationKind(kind) ? kind : undefined;
}

function validEvidencePaths(
	raw: unknown,
	evidenceByPath: ReadonlyMap<string, CodeGraphEvidence>,
): readonly CodeGraphEvidence[] {
	return [...new Set(arrayOfStrings(raw))].flatMap((path) => {
		const evidence = evidenceByPath.get(path);
		return evidence === undefined ? [] : [evidence];
	});
}

function arrayOfStrings(raw: unknown): readonly string[] {
	return Array.isArray(raw) ? raw.flatMap((value) => (typeof value === "string" ? [value] : [])) : [];
}

function isAnnotationKind(value: string): value is AgentAnnotation["kind"] {
	return annotationKinds.has(value as AgentAnnotation["kind"]);
}

const annotationKinds = new Set<AgentAnnotation["kind"]>([
	"purpose",
	"invariant",
	"edit-warning",
	"workflow",
	"test-guidance",
	"generated-ownership",
	"iac-link",
	"risk",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
	return typeof value === "string" && value.length > 0 ? value : undefined;
}
