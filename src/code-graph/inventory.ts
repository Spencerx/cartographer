import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { DEFAULT_MAX_FILE_BYTES } from "./defaults.ts";
import { classifyFile, isDefaultIgnored, isTextLike, normalizePath, relativePath, resolveRoot } from "./path-utils.ts";

export interface InventoryFile {
	readonly path: string;
	readonly absolutePath: string;
	readonly sizeBytes: number;
	readonly hash: string;
	readonly lineCount: number;
	readonly kind: "source" | "asset" | "generated" | "unknown";
	readonly readableText: boolean;
	readonly gitStatus: "tracked" | "untracked" | "modified" | "deleted" | "unknown";
}

export interface GitInventory {
	readonly commit?: string | undefined;
	readonly dirty: boolean;
	readonly trackedFiles: number;
	readonly untrackedFiles: number;
	readonly modifiedFiles: number;
	readonly deletedFiles: number;
	readonly statuses: ReadonlyMap<string, InventoryFile["gitStatus"]>;
}

export interface RepoInventory {
	readonly root: string;
	readonly files: readonly InventoryFile[];
	readonly git: GitInventory;
}

export async function createRepoInventory(
	rootInput: string,
	maxFileBytes = DEFAULT_MAX_FILE_BYTES,
): Promise<RepoInventory> {
	const root = resolveRoot(rootInput);
	const git = readGitInventory(root);
	const paths =
		git.statuses.size > 0
			? [...git.statuses.keys()].filter((path) => git.statuses.get(path) !== "deleted")
			: await walk(root);
	const files = await Promise.all(
		paths.filter((path) => !isDefaultIgnored(path)).map((path) => readInventoryFile(root, path, git, maxFileBytes)),
	);
	const presentFiles = files.filter((file): file is InventoryFile => file !== undefined);
	return { root, files: presentFiles.sort((left, right) => left.path.localeCompare(right.path)), git };
}

function readGitInventory(root: string): GitInventory {
	const commit = currentCommit(root);
	const statuses = readGitStatuses(root);
	const counts = countGitStatuses(statuses);

	return {
		...(commit !== undefined ? { commit } : {}),
		dirty: isDirty(counts),
		...counts,
		statuses,
	};
}

function currentCommit(root: string): string | undefined {
	const commit = runGit(root, ["rev-parse", "HEAD"]).trim();
	return commit.length > 0 ? commit : undefined;
}

function readGitStatuses(root: string): Map<string, InventoryFile["gitStatus"]> {
	const statuses = new Map<string, InventoryFile["gitStatus"]>();
	addGitStatusEntries(statuses, runGit(root, ["ls-files", "-z"]), "tracked");
	addGitStatusEntries(statuses, runGit(root, ["ls-files", "-o", "--exclude-standard", "-z"]), "untracked");
	applyPorcelainStatus(statuses, runGit(root, ["status", "--porcelain=v1", "-z"]));
	return statuses;
}

function addGitStatusEntries(
	statuses: Map<string, InventoryFile["gitStatus"]>,
	output: string,
	status: InventoryFile["gitStatus"],
): void {
	for (const path of splitNul(output)) statuses.set(normalizePath(path), status);
}

function applyPorcelainStatus(statuses: Map<string, InventoryFile["gitStatus"]>, output: string): void {
	for (const entry of parsePorcelainStatus(output)) {
		const previous = statuses.get(entry.path);
		statuses.set(entry.path, previous === "untracked" ? "untracked" : entry.status);
	}
}

function countGitStatuses(statuses: ReadonlyMap<string, InventoryFile["gitStatus"]>) {
	const values = [...statuses.values()];
	return {
		trackedFiles: values.filter((value) => value === "tracked" || value === "modified").length,
		untrackedFiles: values.filter((value) => value === "untracked").length,
		modifiedFiles: values.filter((value) => value === "modified").length,
		deletedFiles: values.filter((value) => value === "deleted").length,
	};
}

function isDirty(counts: ReturnType<typeof countGitStatuses>): boolean {
	return counts.modifiedFiles + counts.deletedFiles + counts.untrackedFiles > 0;
}

function runGit(root: string, args: readonly string[]): string {
	const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
	return result.status === 0 ? result.stdout : "";
}

function splitNul(value: string): string[] {
	return value.split("\0").filter((entry) => entry.length > 0);
}

function parsePorcelainStatus(
	value: string,
): Array<{ readonly path: string; readonly status: "modified" | "deleted" }> {
	return splitNul(value).flatMap(porcelainEntry);
}

function porcelainEntry(entry: string): Array<{ readonly path: string; readonly status: "modified" | "deleted" }> {
	const status = entry.length < 4 ? undefined : porcelainStatus(entry.slice(0, 2));
	return status === undefined ? [] : [{ path: normalizePath(entry.slice(3)), status }];
}

function porcelainStatus(code: string): "modified" | "deleted" | undefined {
	if (code.includes("D")) return "deleted";
	return code.trim().length > 0 ? "modified" : undefined;
}

async function walk(root: string, base = "."): Promise<string[]> {
	const absolute = base === "." ? root : join(root, base);
	const entries = await readdir(absolute, { withFileTypes: true });
	const paths = await Promise.all(entries.map((entry) => walkEntry(root, base, entry)));
	return paths.flat();
}

async function walkEntry(
	root: string,
	base: string,
	entry: { name: string; isDirectory(): boolean; isFile(): boolean },
) {
	const path = normalizePath(base === "." ? entry.name : `${base}/${entry.name}`);
	if (isDefaultIgnored(path)) return [];
	return walkEntryHandler(entry)(root, path);
}

function walkEntryHandler(entry: { isDirectory(): boolean; isFile(): boolean }) {
	if (entry.isDirectory()) return walk;
	if (entry.isFile()) return singlePath;
	return emptyPath;
}

async function singlePath(_root: string, path: string): Promise<string[]> {
	return [path];
}

async function emptyPath(): Promise<string[]> {
	return [];
}

async function readInventoryFile(
	root: string,
	path: string,
	git: GitInventory,
	maxFileBytes: number,
): Promise<InventoryFile | undefined> {
	const absolutePath = join(root, path);
	const info = await fileStat(absolutePath);
	if (info === undefined) return undefined;
	const kind = classifyFile(path);
	const readableText = canReadText(path, info.size, maxFileBytes);
	const hash = await hashFile(absolutePath);
	const text = await readableFileText(absolutePath, readableText);
	return {
		path: relativePath(root, absolutePath),
		absolutePath,
		sizeBytes: info.size,
		hash,
		lineCount: lineCount(text),
		kind,
		readableText,
		gitStatus: gitStatusFor(git, path),
	};
}

async function fileStat(path: string): Promise<{ readonly size: number } | undefined> {
	const info = await stat(path).catch(() => undefined);
	return info?.isFile() === true ? info : undefined;
}

function canReadText(path: string, sizeBytes: number, maxFileBytes: number): boolean {
	return isTextLike(path) && sizeBytes <= maxFileBytes;
}

async function readableFileText(path: string, readableText: boolean): Promise<string> {
	return readableText ? Bun.file(path).text() : "";
}

function lineCount(text: string): number {
	return text.length > 0 ? text.split(/\r?\n/).length : 0;
}

function gitStatusFor(git: GitInventory, path: string): InventoryFile["gitStatus"] {
	return git.statuses.get(path) ?? "unknown";
}

async function hashFile(path: string): Promise<string> {
	const hash = createHash("sha256");
	await new Promise<void>((resolve, reject) => {
		const stream = createReadStream(path);
		stream.on("data", (chunk) => hash.update(chunk));
		stream.on("error", reject);
		stream.on("end", resolve);
	});
	return hash.digest("hex");
}
