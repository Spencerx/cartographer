import { dirname, extname, join, normalize } from "node:path";
import { uniqueBy } from "./collections.ts";
import type { InventoryFile } from "./inventory.ts";
import { normalizePath } from "./path-utils.ts";

export interface ImportFact {
	readonly specifier: string;
	readonly targetPath?: string | undefined;
	readonly externalPackage?: string | undefined;
	readonly typeOnly: boolean;
}

export interface SymbolFact {
	readonly name: string;
	readonly kind: "function" | "class" | "interface" | "type" | "const";
	readonly line: number;
	readonly exported: boolean;
}

export interface EnvVarFact {
	readonly name: string;
	readonly line: number;
}

export interface SqlFact {
	readonly kind: "table" | "function" | "policy" | "trigger";
	readonly action: "creates" | "alters" | "drops";
	readonly name: string;
	readonly line: number;
}

export interface SqlReferenceFact {
	readonly fromTable: string;
	readonly toTable: string;
	readonly line: number;
}

export interface IacFact {
	readonly kind: "resource" | "module";
	readonly type: string;
	readonly name: string;
	readonly line: number;
}

export interface IacDependencyFact {
	readonly from: IacDependencyEndpoint;
	readonly to: IacDependencyEndpoint;
	readonly line: number;
}

export interface IacDependencyEndpoint {
	readonly kind: "resource" | "module";
	readonly type: string;
	readonly name: string;
}

export interface DataAccessFact {
	readonly kind: "table" | "rpc";
	readonly name: string;
	readonly line: number;
}

const symbolPatterns: Array<{ readonly kind: SymbolFact["kind"]; readonly regex: RegExp }> = [
	{ kind: "function", regex: /\b(export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g },
	{ kind: "class", regex: /\b(export\s+)?class\s+([A-Za-z_$][\w$]*)/g },
	{ kind: "interface", regex: /\bexport\s+interface\s+([A-Za-z_$][\w$]*)/g },
	{ kind: "type", regex: /\bexport\s+type\s+([A-Za-z_$][\w$]*)/g },
	{ kind: "const", regex: /\bexport\s+const\s+([A-Za-z_$][\w$]*)/g },
];

const envPatterns = [
	/\b(?:process|Bun)\.env\.([A-Z][A-Z0-9_]*)/g,
	/\b(?:process|Bun)\.env\[['"]([A-Z][A-Z0-9_]*)['"]\]/g,
	/\bDeno\.env\.get\(['"]([A-Z][A-Z0-9_]*)['"]\)/g,
	/\$\{\{\s*(?:secrets|vars)\.([A-Z][A-Z0-9_]*)\s*\}\}/g,
];

export async function readText(file: InventoryFile): Promise<string | undefined> {
	if (!file.readableText) return undefined;
	return Bun.file(file.absolutePath).text();
}

export function extractImports(
	file: InventoryFile,
	text: string,
	allPaths: ReadonlySet<string>,
): readonly ImportFact[] {
	const ext = extname(file.path).toLowerCase();
	if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"].includes(ext)) {
		return extractEcmaImports(file.path, text, allPaths);
	}
	if (ext === ".py") return extractPythonImports(text);
	return [];
}

export function extractSymbols(file: InventoryFile, text: string): readonly SymbolFact[] {
	const ext = extname(file.path).toLowerCase();
	if (![".ts", ".tsx", ".js", ".jsx", ".mts", ".cts"].includes(ext)) return [];
	return symbolPatterns.flatMap((pattern) =>
		[...text.matchAll(pattern.regex)].flatMap((match) => symbolFact(text, pattern, match)),
	);
}

export function extractEnvVars(text: string): readonly EnvVarFact[] {
	const facts = envPatterns.flatMap((pattern) => [...text.matchAll(pattern)].flatMap((match) => envFact(text, match)));
	return uniqueBy(facts, (fact) => fact.name);
}

export function extractSqlFacts(file: InventoryFile, text: string): readonly SqlFact[] {
	if (!file.path.endsWith(".sql")) return [];
	const patterns: Array<{
		readonly kind: SqlFact["kind"];
		readonly action: SqlFact["action"];
		readonly regex: RegExp;
	}> = [
		{ kind: "table", action: "creates", regex: /\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?"?([\w.]+)"?/gi },
		{ kind: "table", action: "alters", regex: /\balter\s+table\s+"?([\w.]+)"?/gi },
		{ kind: "table", action: "drops", regex: /\bdrop\s+table\s+(?:if\s+exists\s+)?"?([\w.]+)"?/gi },
		{ kind: "function", action: "creates", regex: /\bcreate\s+(?:or\s+replace\s+)?function\s+"?([\w.]+)"?/gi },
		{ kind: "policy", action: "creates", regex: /\bcreate\s+policy\s+"?([\w.]+)"?/gi },
		{ kind: "trigger", action: "creates", regex: /\bcreate\s+trigger\s+"?([\w.]+)"?/gi },
	];
	return patterns.flatMap((pattern) =>
		[...text.matchAll(pattern.regex)].flatMap((match) => {
			const name = match[1];
			if (name === undefined) return [];
			return [{ kind: pattern.kind, action: pattern.action, name, line: lineForIndex(text, match.index ?? 0) }];
		}),
	);
}

export function extractSqlReferenceFacts(file: InventoryFile, text: string): readonly SqlReferenceFact[] {
	if (!file.path.endsWith(".sql")) return [];
	return uniqueBy([...extractCreateTableReferences(text), ...extractAlterTableReferences(text)], sqlReferenceKey);
}

export function extractIacFacts(file: InventoryFile, text: string): readonly IacFact[] {
	if (!file.path.endsWith(".tf")) return [];
	return [...extractTerraformResources(text), ...extractTerraformModules(text)];
}

export function extractIacDependencyFacts(file: InventoryFile, text: string): readonly IacDependencyFact[] {
	if (!file.path.endsWith(".tf")) return [];
	return uniqueBy(
		terraformBlocks(text).flatMap((block) => terraformDependencyFactsForBlock(text, block)),
		iacDependencyKey,
	);
}

export function extractDataAccessFacts(file: InventoryFile, text: string): readonly DataAccessFact[] {
	const ext = extname(file.path).toLowerCase();
	if (![".ts", ".tsx", ".js", ".jsx", ".mts", ".cts"].includes(ext)) return [];
	const patterns: Array<{ readonly kind: DataAccessFact["kind"]; readonly regex: RegExp }> = [
		{ kind: "table", regex: /\.\s*from\s*(?:<[^>]+>)?\s*\(\s*['"]([^'"]+)['"]/g },
		{ kind: "rpc", regex: /\.\s*rpc\s*(?:<[^>]+>)?\s*\(\s*['"]([^'"]+)['"]/g },
	];
	const facts = patterns.flatMap((pattern) =>
		[...text.matchAll(pattern.regex)].flatMap((match) => dataAccessFact(text, pattern.kind, match)),
	);
	return uniqueBy(facts, (fact) => `${fact.kind}:${fact.name}:${fact.line}`);
}

function extractEcmaImports(path: string, text: string, allPaths: ReadonlySet<string>): readonly ImportFact[] {
	const facts: ImportFact[] = [];
	const patterns: Array<{ readonly regex: RegExp; readonly typeOnly: boolean }> = [
		{ regex: /\bimport\s+type\s+[^'"]*from\s+['"]([^'"]+)['"]/g, typeOnly: true },
		{ regex: /\bimport\s+(?!type\b)[^'"]*from\s+['"]([^'"]+)['"]/g, typeOnly: false },
		{ regex: /\bexport\s+type\s+[^'"]*from\s+['"]([^'"]+)['"]/g, typeOnly: true },
		{ regex: /\bexport\s+(?!type\b)[^'"]*from\s+['"]([^'"]+)['"]/g, typeOnly: false },
		{ regex: /\brequire\(['"]([^'"]+)['"]\)/g, typeOnly: false },
		{ regex: /\bimport\(['"]([^'"]+)['"]\)/g, typeOnly: false },
	];
	for (const pattern of patterns) {
		for (const match of text.matchAll(pattern.regex)) {
			const specifier = match[1];
			if (specifier === undefined) continue;
			facts.push(importFact(path, specifier, pattern.typeOnly, allPaths));
		}
	}
	return dedupeImports(facts);
}

function extractPythonImports(text: string): readonly ImportFact[] {
	const facts: ImportFact[] = [];
	for (const match of text.matchAll(/^\s*(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))/gm)) {
		const specifier = match[1] ?? match[2];
		if (specifier !== undefined) {
			facts.push({ specifier, externalPackage: specifier.split(".")[0], typeOnly: false });
		}
	}
	return dedupeImports(facts);
}

function importFact(path: string, specifier: string, typeOnly: boolean, allPaths: ReadonlySet<string>): ImportFact {
	if (specifier.startsWith(".")) {
		const targetPath = resolveRelativeImport(path, specifier, allPaths);
		return { specifier, ...(targetPath !== undefined ? { targetPath } : {}), typeOnly };
	}
	return { specifier, externalPackage: packageName(specifier), typeOnly };
}

function resolveRelativeImport(path: string, specifier: string, allPaths: ReadonlySet<string>): string | undefined {
	const base = normalizePath(normalize(join(dirname(path), specifier)));
	const candidates = [
		base,
		`${base}.ts`,
		`${base}.tsx`,
		`${base}.js`,
		`${base}.jsx`,
		`${base}.json`,
		`${base}.sql`,
		`${base}/index.ts`,
		`${base}/index.tsx`,
		`${base}/index.js`,
		`${base}/index.jsx`,
	];
	return candidates.find((candidate) => allPaths.has(candidate));
}

function packageName(specifier: string): string {
	if (specifier.startsWith("@")) {
		const [scope, name] = specifier.split("/");
		return name === undefined ? specifier : `${scope}/${name}`;
	}
	return specifier.split("/")[0] ?? specifier;
}

function dedupeImports(facts: readonly ImportFact[]): readonly ImportFact[] {
	return uniqueBy(facts, importKey);
}

function lineForIndex(text: string, index: number): number {
	return text.slice(0, index).split(/\r?\n/).length;
}

function symbolFact(
	text: string,
	pattern: { readonly kind: SymbolFact["kind"] },
	match: RegExpMatchArray,
): readonly SymbolFact[] {
	const name = match[2] ?? match[1];
	if (name === undefined) return [];
	return [
		{ name, kind: pattern.kind, line: lineForIndex(text, match.index ?? 0), exported: match[0].includes("export") },
	];
}

function envFact(text: string, match: RegExpMatchArray): readonly EnvVarFact[] {
	const name = match[1];
	return name === undefined ? [] : [{ name, line: lineForIndex(text, match.index ?? 0) }];
}

function extractCreateTableReferences(text: string): readonly SqlReferenceFact[] {
	const createTablePattern = /\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?"?([\w.]+)"?\s*\(([\s\S]*?)\);/gi;
	return extractTableReferenceMatches(text, createTablePattern);
}

function extractAlterTableReferences(text: string): readonly SqlReferenceFact[] {
	const alterTablePattern = /\balter\s+table\s+"?([\w.]+)"?([\s\S]*?);/gi;
	return extractTableReferenceMatches(text, alterTablePattern);
}

function extractTableReferenceMatches(text: string, pattern: RegExp): readonly SqlReferenceFact[] {
	return [...text.matchAll(pattern)].flatMap((match) => sqlReferencesForTableMatch(text, match));
}

function sqlReferencesForTableMatch(text: string, match: RegExpMatchArray): readonly SqlReferenceFact[] {
	const fromTable = match[1];
	const body = match[2];
	if (fromTable === undefined) return [];
	if (body === undefined) return [];
	return sqlReferencesInStatement(text, match.index ?? 0, body, fromTable);
}

function sqlReferencesInStatement(
	text: string,
	statementIndex: number,
	statement: string,
	fromTable: string,
): readonly SqlReferenceFact[] {
	return [...statement.matchAll(/\breferences\s+"?([\w.]+)"?/gi)].flatMap((match) => {
		const toTable = match[1];
		if (toTable === undefined || toTable === fromTable) return [];
		return [{ fromTable, toTable, line: lineForIndex(text, statementIndex + (match.index ?? 0)) }];
	});
}

function dataAccessFact(
	text: string,
	kind: DataAccessFact["kind"],
	match: RegExpMatchArray,
): readonly DataAccessFact[] {
	const name = usableDataAccessName(text, kind, match);
	if (name === undefined) return [];
	return [{ kind, name, line: lineForIndex(text, match.index ?? 0) }];
}

function usableDataAccessName(text: string, kind: DataAccessFact["kind"], match: RegExpMatchArray): string | undefined {
	const name = match[1];
	if (name === undefined) return undefined;
	if (shouldSkipDataAccessCall(text, kind, match.index ?? 0)) return undefined;
	return name;
}

function shouldSkipDataAccessCall(text: string, kind: DataAccessFact["kind"], dotIndex: number): boolean {
	if (kind !== "table") return false;
	return isBuiltInFromCall(text, dotIndex);
}

function isBuiltInFromCall(text: string, dotIndex: number): boolean {
	const receiver = receiverBeforeDot(text, dotIndex);
	return builtInFromReceivers.has(receiver);
}

function receiverBeforeDot(text: string, dotIndex: number): string {
	const beforeDot = text.slice(0, dotIndex).trimEnd();
	return beforeDot.match(/([A-Za-z_$][\w$]*)$/)?.[1] ?? "";
}

const builtInFromReceivers = new Set([
	"Array",
	"Buffer",
	"Uint8Array",
	"Uint16Array",
	"Uint32Array",
	"Int8Array",
	"Int16Array",
	"Int32Array",
	"Float32Array",
	"Float64Array",
	"BigInt64Array",
	"BigUint64Array",
]);

function extractTerraformResources(text: string): readonly IacFact[] {
	return terraformBlocks(text)
		.filter((block) => block.kind === "resource")
		.map((block) => ({ kind: block.kind, type: block.type, name: block.name, line: block.line }));
}

function extractTerraformModules(text: string): readonly IacFact[] {
	return terraformBlocks(text)
		.filter((block) => block.kind === "module")
		.map((block) => ({ kind: block.kind, type: block.type, name: block.name, line: block.line }));
}

function importKey(fact: ImportFact): string {
	return `${fact.specifier}:${fact.targetPath ?? fact.externalPackage ?? ""}:${fact.typeOnly}`;
}

function sqlReferenceKey(fact: SqlReferenceFact): string {
	return `${fact.fromTable}:${fact.toTable}:${fact.line}`;
}

interface TerraformBlock extends IacDependencyEndpoint {
	readonly line: number;
	readonly body: string;
	readonly bodyStartIndex: number;
}

interface TerraformReference extends IacDependencyEndpoint {
	readonly line: number;
}

function terraformBlocks(text: string): readonly TerraformBlock[] {
	return [...terraformResourceBlocks(text), ...terraformModuleBlocks(text)];
}

function terraformResourceBlocks(text: string): readonly TerraformBlock[] {
	return [...text.matchAll(/\bresource\s+"([^"]+)"\s+"([^"]+)"\s*\{/g)].flatMap((match) => {
		const type = match[1];
		const name = match[2];
		if (type === undefined || name === undefined) return [];
		return terraformBlockForMatch(text, match, { kind: "resource", type, name });
	});
}

function terraformModuleBlocks(text: string): readonly TerraformBlock[] {
	return [...text.matchAll(/\bmodule\s+"([^"]+)"\s*\{/g)].flatMap((match) => {
		const name = match[1];
		if (name === undefined) return [];
		return terraformBlockForMatch(text, match, { kind: "module", type: "module", name });
	});
}

function terraformBlockForMatch(
	text: string,
	match: RegExpMatchArray,
	endpoint: IacDependencyEndpoint,
): readonly TerraformBlock[] {
	const matchIndex = match.index ?? 0;
	const body = terraformBlockBody(text, matchIndex);
	if (body === undefined) return [];
	return [
		{
			...endpoint,
			line: lineForIndex(text, matchIndex),
			body: body.text,
			bodyStartIndex: body.startIndex,
		},
	];
}

function terraformBlockBody(
	text: string,
	searchStartIndex: number,
): { readonly text: string; readonly startIndex: number } | undefined {
	const openBraceIndex = text.indexOf("{", searchStartIndex);
	if (openBraceIndex === -1) return undefined;
	const closeBraceIndex = matchingBraceIndex(text, openBraceIndex);
	if (closeBraceIndex === undefined) return undefined;
	const startIndex = openBraceIndex + 1;
	return { text: text.slice(startIndex, closeBraceIndex), startIndex };
}

function matchingBraceIndex(text: string, openBraceIndex: number): number | undefined {
	let depth = 0;
	for (let index = openBraceIndex; index < text.length; index += 1) {
		const char = text[index];
		depth += terraformBraceDelta(char);
		if (closesTerraformBlock(char, depth)) return index;
	}
	return undefined;
}

function terraformBraceDelta(char: string | undefined): number {
	if (char === "{") return 1;
	if (char === "}") return -1;
	return 0;
}

function closesTerraformBlock(char: string | undefined, depth: number): boolean {
	return char === "}" && depth === 0;
}

function terraformDependencyFactsForBlock(text: string, block: TerraformBlock): readonly IacDependencyFact[] {
	return terraformReferencesInBlock(text, block).flatMap((reference) => {
		if (sameIacEndpoint(block, reference)) return [];
		return [{ from: iacEndpoint(block), to: iacEndpoint(reference), line: reference.line }];
	});
}

function terraformReferencesInBlock(text: string, block: TerraformBlock): readonly TerraformReference[] {
	const references: TerraformReference[] = [];
	let offset = 0;
	for (const line of block.body.split(/\r?\n/)) {
		const lineStartIndex = block.bodyStartIndex + offset;
		references.push(...terraformReferencesInLine(text, line, lineStartIndex));
		offset += line.length + 1;
	}
	return uniqueBy(references, (reference) => `${reference.kind}:${reference.type}:${reference.name}:${reference.line}`);
}

function terraformReferencesInLine(text: string, line: string, lineStartIndex: number): readonly TerraformReference[] {
	return [
		...terraformInterpolationReferences(text, line, lineStartIndex),
		...terraformExpressionReferences(text, line, lineStartIndex),
	];
}

function terraformInterpolationReferences(
	text: string,
	line: string,
	lineStartIndex: number,
): readonly TerraformReference[] {
	return [...line.matchAll(/\$\{([^}]+)\}/g)].flatMap((match) => {
		const expression = match[1];
		if (expression === undefined) return [];
		return terraformReferencesInExpression(text, expression, lineStartIndex + (match.index ?? 0));
	});
}

function terraformExpressionReferences(
	text: string,
	line: string,
	lineStartIndex: number,
): readonly TerraformReference[] {
	const expression = stripTerraformLineComment(stripQuotedStrings(line));
	return terraformReferencesInExpression(text, expression, lineStartIndex);
}

function terraformReferencesInExpression(
	text: string,
	expression: string,
	expressionStartIndex: number,
): readonly TerraformReference[] {
	return [
		...terraformModuleReferences(text, expression, expressionStartIndex),
		...terraformResourceReferences(text, expression, expressionStartIndex),
	];
}

function terraformModuleReferences(
	text: string,
	expression: string,
	expressionStartIndex: number,
): readonly TerraformReference[] {
	return [...expression.matchAll(/\bmodule\.([A-Za-z0-9_-]+)\b/g)].flatMap((match) => {
		const name = match[1];
		if (name === undefined) return [];
		return [
			{
				kind: "module",
				type: "module",
				name,
				line: lineForIndex(text, expressionStartIndex + (match.index ?? 0)),
			},
		];
	});
}

function terraformResourceReferences(
	text: string,
	expression: string,
	expressionStartIndex: number,
): readonly TerraformReference[] {
	return [...expression.matchAll(/\b([A-Za-z][A-Za-z0-9_]*)\.([A-Za-z0-9_-]+)\b/g)].flatMap((match) => {
		return terraformResourceReferenceForMatch(text, match, expressionStartIndex);
	});
}

function terraformResourceReferenceForMatch(
	text: string,
	match: RegExpMatchArray,
	expressionStartIndex: number,
): readonly TerraformReference[] {
	const endpoint = terraformResourceEndpointForMatch(match);
	if (endpoint === undefined) return [];
	return [
		{
			...endpoint,
			line: lineForIndex(text, expressionStartIndex + (match.index ?? 0)),
		},
	];
}

function terraformResourceEndpointForMatch(match: RegExpMatchArray): IacDependencyEndpoint | undefined {
	const type = match[1];
	const name = match[2];
	if (type === undefined || name === undefined) return undefined;
	if (reservedTerraformReferenceRoots.has(type)) return undefined;
	return { kind: "resource", type, name };
}

const reservedTerraformReferenceRoots = new Set([
	"count",
	"data",
	"each",
	"local",
	"module",
	"path",
	"self",
	"terraform",
	"var",
]);

function stripQuotedStrings(line: string): string {
	return line.replace(/"([^"\\]|\\.)*"/g, "").replace(/'([^'\\]|\\.)*'/g, "");
}

function stripTerraformLineComment(line: string): string {
	return line.replace(/\s*(?:#|\/\/).*$/, "");
}

function sameIacEndpoint(left: IacDependencyEndpoint, right: IacDependencyEndpoint): boolean {
	return left.kind === right.kind && left.type === right.type && left.name === right.name;
}

function iacEndpoint(endpoint: IacDependencyEndpoint): IacDependencyEndpoint {
	return { kind: endpoint.kind, type: endpoint.type, name: endpoint.name };
}

function iacDependencyKey(fact: IacDependencyFact): string {
	return `${fact.from.kind}:${fact.from.type}:${fact.from.name}->${fact.to.kind}:${fact.to.type}:${fact.to.name}:${fact.line}`;
}
