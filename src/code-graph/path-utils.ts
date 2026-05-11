import { extname, relative, resolve, sep } from "node:path";
import { ASSET_EXTENSIONS, DEFAULT_IGNORE_PATTERNS, SOURCE_EXTENSIONS } from "./defaults.ts";

const ignoredParts = new Set(["node_modules", "dist", ".git", ".bun-tmp", ".claude", ".cartographer"]);
const ignoredPrefixes = [
	"docs/codegraph/",
	"supabase/.temp/",
	"supabase/.branches/",
	"e2e/playwright-report/",
	"e2e/test-results/",
	"e2e/reports/",
	"specs/states/",
];
const ignoredInfixes = ["/states/", "_TTrace_"];
const ignoredSuffixes = [".st", ".fp"];
const ignoredExactPaths = new Set(["specs/tla2tools.jar"]);
const generatedInfixes = ["/generated/", "__generated__"];
const generatedSuffixes = [".d.ts", "database.types.ts", ".generated.ts", ".gen.ts"];
const ignoreChecks: ReadonlyArray<(path: string) => boolean> = [
	(path) => path.split("/").some((part) => ignoredParts.has(part)),
	(path) => startsWithAny(path, ignoredPrefixes),
	(path) => includesAny(path, ignoredInfixes),
	(path) => endsWithAny(path, ignoredSuffixes),
	(path) => ignoredExactPaths.has(path),
];

export function normalizePath(path: string): string {
	return path.split(sep).join("/");
}

export function relativePath(root: string, path: string): string {
	const normalized = normalizePath(relative(root, path));
	return normalized === "" ? "." : normalized;
}

export function resolveRoot(root: string): string {
	return resolve(root);
}

export function isDefaultIgnored(path: string): boolean {
	const normalized = normalizePath(path);
	if (normalized === ".") return false;
	return ignoreChecks.some((check) => check(normalized));
}

export function defaultIgnorePatterns(): readonly string[] {
	return DEFAULT_IGNORE_PATTERNS;
}

export function classifyFile(path: string): "source" | "asset" | "generated" | "unknown" {
	const normalized = normalizePath(path);
	const ext = extname(normalized).toLowerCase();
	if (isGeneratedPath(normalized)) return "generated";
	if (SOURCE_EXTENSIONS.has(ext)) return "source";
	if (ASSET_EXTENSIONS.has(ext)) return "asset";
	return "unknown";
}

export function isTextLike(path: string): boolean {
	return classifyFile(path) === "source";
}

function isGeneratedPath(path: string): boolean {
	return includesAny(path, generatedInfixes) || endsWithAny(path, generatedSuffixes);
}

function startsWithAny(value: string, prefixes: readonly string[]): boolean {
	return prefixes.some((prefix) => value.startsWith(prefix));
}

function includesAny(value: string, needles: readonly string[]): boolean {
	return needles.some((needle) => value.includes(needle));
}

function endsWithAny(value: string, suffixes: readonly string[]): boolean {
	return suffixes.some((suffix) => value.endsWith(suffix));
}
