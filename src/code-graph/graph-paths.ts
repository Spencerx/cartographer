import { dirname } from "node:path";
import type { InventoryFile } from "./inventory.ts";
import type { CodeGraphProvenance } from "./types.ts";

export function parentDirectory(path: string): string {
	const parent = dirname(path);
	return parent === "." ? "." : parent;
}

export function directoryNodeId(directory: string): string {
	return directory === "." ? "dir:." : `dir:${directory}`;
}

export function parentDirectoryNodeId(directory: string): string {
	return directory === "." ? "repo:root" : `dir:${parentDirectory(directory)}`;
}

export function uniqueDirectories(files: readonly InventoryFile[]): readonly string[] {
	const dirs = new Set<string>(["."]);
	for (const file of files) {
		let current = dirname(file.path);
		while (current !== "." && current !== "") {
			dirs.add(current);
			current = dirname(current);
		}
	}
	return [...dirs].sort((left, right) => left.localeCompare(right));
}

export function freshnessFor(file: InventoryFile): CodeGraphProvenance["freshness"] {
	return file.gitStatus === "modified" || file.gitStatus === "untracked" ? "dirty" : "fresh";
}
