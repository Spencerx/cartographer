import { countBy } from "./collections.ts";
import type { AgentAnnotation, CodeGraphEdge, CodeGraphFinding, CodeGraphNode, CodeGraphSnapshot } from "./types.ts";

export interface CodeGraphDiffEntry {
	readonly id: string;
	readonly kind?: string | undefined;
	readonly path?: string | undefined;
	readonly label?: string | undefined;
}

export interface CodeGraphChangedEntry extends CodeGraphDiffEntry {
	readonly before: CodeGraphDiffEntry;
	readonly after: CodeGraphDiffEntry;
}

export interface CodeGraphDiffSection {
	readonly added: readonly CodeGraphDiffEntry[];
	readonly removed: readonly CodeGraphDiffEntry[];
	readonly changed: readonly CodeGraphChangedEntry[];
}

export interface CodeGraphDiffSummary {
	readonly added: number;
	readonly removed: number;
	readonly changed: number;
}

export interface CodeGraphDiff {
	readonly base: CodeGraphDiffGraphRef;
	readonly head: CodeGraphDiffGraphRef;
	readonly summary: {
		readonly nodes: CodeGraphDiffSummary;
		readonly edges: CodeGraphDiffSummary;
		readonly findings: CodeGraphDiffSummary;
		readonly annotations: CodeGraphDiffSummary;
	};
	readonly nodes: CodeGraphDiffSection;
	readonly edges: CodeGraphDiffSection;
	readonly findings: CodeGraphDiffSection;
	readonly annotations: CodeGraphDiffSection;
}

export interface CodeGraphDiffGraphRef {
	readonly root: string;
	readonly generatedAt: string;
	readonly commit?: string | undefined;
	readonly dirty: boolean;
	readonly totals: {
		readonly files: number;
		readonly nodes: number;
		readonly edges: number;
		readonly findings: number;
	};
}

export function diffCodeGraphs(base: CodeGraphSnapshot, head: CodeGraphSnapshot): CodeGraphDiff {
	const nodes = diffRecords(base.nodes, head.nodes, nodeEntry);
	const edges = diffRecords(base.edges, head.edges, edgeEntry);
	const findings = diffRecords(base.findings, head.findings, findingEntry);
	const annotations = diffRecords(base.annotations, head.annotations, annotationEntry);
	return {
		base: graphRef(base),
		head: graphRef(head),
		summary: {
			nodes: summarizeDiffSection(nodes),
			edges: summarizeDiffSection(edges),
			findings: summarizeDiffSection(findings),
			annotations: summarizeDiffSection(annotations),
		},
		nodes,
		edges,
		findings,
		annotations,
	};
}

export function renderCodeGraphDiff(diff: CodeGraphDiff): string {
	return [
		"# Code Graph Diff",
		"",
		`Base: ${graphRefSummary(diff.base)}`,
		`Head: ${graphRefSummary(diff.head)}`,
		"",
		"## Summary",
		...renderSummaryTable(diff),
		"",
		"## Nodes",
		...renderSection(diff.nodes),
		"",
		"## Edges",
		...renderSection(diff.edges),
		"",
		"## Findings",
		...renderSection(diff.findings),
		"",
		"## Annotations",
		...renderSection(diff.annotations),
		"",
	].join("\n");
}

function diffRecords<T>(
	baseRecords: readonly T[],
	headRecords: readonly T[],
	entryFor: (record: T) => CodeGraphDiffEntry,
): CodeGraphDiffSection {
	const base = new Map(baseRecords.map((record) => [entryFor(record).id, record]));
	const head = new Map(headRecords.map((record) => [entryFor(record).id, record]));
	const added: CodeGraphDiffEntry[] = [];
	const removed: CodeGraphDiffEntry[] = [];
	const changed: CodeGraphChangedEntry[] = [];

	for (const [id, headRecord] of head) {
		const baseRecord = base.get(id);
		if (baseRecord === undefined) {
			added.push(entryFor(headRecord));
			continue;
		}
		if (stableJson(baseRecord) !== stableJson(headRecord)) {
			const before = entryFor(baseRecord);
			const after = entryFor(headRecord);
			changed.push({ ...after, id, before, after });
		}
	}
	for (const [id, baseRecord] of base) {
		if (!head.has(id)) removed.push(entryFor(baseRecord));
	}

	return {
		added: sortEntries(added),
		removed: sortEntries(removed),
		changed: sortEntries(changed),
	};
}

function graphRef(graph: CodeGraphSnapshot): CodeGraphDiffGraphRef {
	return {
		root: graph.manifest.root,
		generatedAt: graph.manifest.generatedAt,
		commit: graph.manifest.git.commit,
		dirty: graph.manifest.git.dirty,
		totals: {
			files: graph.manifest.totals.files,
			nodes: graph.nodes.length,
			edges: graph.edges.length,
			findings: graph.findings.length,
		},
	};
}

function nodeEntry(node: CodeGraphNode): CodeGraphDiffEntry {
	return { id: node.id, kind: node.kind, path: node.path, label: node.label };
}

function edgeEntry(edge: CodeGraphEdge): CodeGraphDiffEntry {
	return { id: edge.id, kind: edge.kind, label: `${edge.from} -> ${edge.to}` };
}

function findingEntry(finding: CodeGraphFinding): CodeGraphDiffEntry {
	return { id: finding.id, kind: finding.severity, label: finding.message };
}

function annotationEntry(annotation: AgentAnnotation): CodeGraphDiffEntry {
	return { id: annotation.id, kind: annotation.kind, label: annotation.summary };
}

function summarizeDiffSection(section: CodeGraphDiffSection): CodeGraphDiffSummary {
	return {
		added: section.added.length,
		removed: section.removed.length,
		changed: section.changed.length,
	};
}

function renderSummaryTable(diff: CodeGraphDiff): readonly string[] {
	return [
		"| Section | Added | Removed | Changed |",
		"| --- | ---: | ---: | ---: |",
		...Object.entries(diff.summary).map(
			([section, summary]) => `| ${section} | ${summary.added} | ${summary.removed} | ${summary.changed} |`,
		),
	];
}

function renderSection(section: CodeGraphDiffSection): readonly string[] {
	return [
		...renderEntryGroup("Added", section.added),
		"",
		...renderEntryGroup("Removed", section.removed),
		"",
		...renderEntryGroup("Changed", section.changed),
	];
}

function renderEntryGroup(title: string, entries: readonly CodeGraphDiffEntry[]): readonly string[] {
	if (entries.length === 0) return [`### ${title}`, "", "- None"];
	const byKind = countBy(entries, (entry) => entry.kind ?? "unknown");
	return [
		`### ${title}`,
		"",
		...Object.entries(byKind).map(([kind, count]) => `- ${kind}: ${count}`),
		"",
		...entries.slice(0, MAX_RENDERED_ENTRIES).map(renderEntry),
		...(entries.length > MAX_RENDERED_ENTRIES ? [`- ... ${entries.length - MAX_RENDERED_ENTRIES} more`] : []),
	];
}

function renderEntry(entry: CodeGraphDiffEntry): string {
	const parts = [`- \`${entry.id}\``];
	if (entry.kind !== undefined) parts.push(`(${entry.kind})`);
	if (entry.path !== undefined) parts.push(`path: \`${entry.path}\``);
	if (entry.label !== undefined) parts.push(`- ${entry.label}`);
	return parts.join(" ");
}

function graphRefSummary(ref: CodeGraphDiffGraphRef): string {
	return [
		`\`${ref.root}\``,
		ref.commit === undefined ? "no commit" : `@ ${ref.commit.slice(0, 12)}`,
		ref.dirty ? "dirty" : "clean",
		`${ref.totals.files} files`,
		`${ref.totals.nodes} nodes`,
		`${ref.totals.edges} edges`,
	].join(", ");
}

function sortEntries<T extends CodeGraphDiffEntry>(entries: readonly T[]): readonly T[] {
	return [...entries].toSorted((left, right) => left.id.localeCompare(right.id));
}

function stableJson(value: unknown): string {
	return JSON.stringify(sortJsonValue(value));
}

function sortJsonValue(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(sortJsonValue);
	if (!isRecord(value)) return value;
	return Object.fromEntries(
		Object.entries(value)
			.toSorted(([left], [right]) => left.localeCompare(right))
			.map(([key, entry]) => [key, sortJsonValue(entry)]),
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

const MAX_RENDERED_ENTRIES = 40;
