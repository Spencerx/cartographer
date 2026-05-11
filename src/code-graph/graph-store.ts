import type {
	CodeGraphEdge,
	CodeGraphEdgeKind,
	CodeGraphEvidence,
	CodeGraphFinding,
	CodeGraphNode,
	CodeGraphProvenance,
} from "./types.ts";

export const SCANNER_VERSION = "0.1.0";

export interface MutableGraph {
	readonly nodes: Map<string, CodeGraphNode>;
	readonly edges: Map<string, CodeGraphEdge>;
	readonly findings: CodeGraphFinding[];
}

export function createMutableGraph(): MutableGraph {
	return { nodes: new Map(), edges: new Map(), findings: [] };
}

export function addNode(graph: MutableGraph, node: CodeGraphNode): CodeGraphNode {
	const existing = graph.nodes.get(node.id);
	if (existing !== undefined) return existing;
	graph.nodes.set(node.id, node);
	return node;
}

export function addEdge(graph: MutableGraph, kind: CodeGraphEdgeKind, from: string, to: string, label?: string): void {
	addProvenanceEdge(graph, kind, from, to, label, provenance("syntax", []));
}

export function addProvenanceEdge(
	graph: MutableGraph,
	kind: CodeGraphEdgeKind,
	from: string,
	to: string,
	label: string | undefined,
	edgeProvenance: CodeGraphProvenance,
): void {
	if (!hasEdgeEndpoints(graph, kind, from, to)) return;
	const id = edgeId(kind, from, to, label);
	if (graph.edges.has(id)) return;
	graph.edges.set(id, {
		id,
		kind,
		from,
		to,
		...(label !== undefined ? { label } : {}),
		metadata: {},
		provenance: edgeProvenance,
	});
}

function hasEdgeEndpoints(graph: MutableGraph, kind: CodeGraphEdgeKind, from: string, to: string): boolean {
	if (graph.nodes.has(from) && graph.nodes.has(to)) return true;
	graph.findings.push({
		id: `finding:dangling:${kind}:${from}:${to}`,
		severity: "warn",
		message: `Skipped dangling ${kind} edge from ${from} to ${to}`,
		evidence: [],
	});
	return false;
}

function edgeId(kind: CodeGraphEdgeKind, from: string, to: string, label?: string): string {
	return `edge:${kind}:${from}:${to}:${label ?? ""}`;
}

export function provenance(
	source: CodeGraphProvenance["source"],
	evidence: readonly CodeGraphEvidence[],
	freshness: CodeGraphProvenance["freshness"] = "fresh",
): CodeGraphProvenance {
	return {
		source,
		evidence,
		confidence: source === "agent-annotation" ? "agent-inferred" : "deterministic",
		freshness,
		scannerVersion: SCANNER_VERSION,
	};
}

export function fileNodeId(path: string): string {
	return `file:${path}`;
}
