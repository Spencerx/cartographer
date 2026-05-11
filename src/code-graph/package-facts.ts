import { basename, dirname } from "node:path";
import type { InventoryFile } from "./inventory.ts";
import { addEdge, addNode, addProvenanceEdge, provenance, type MutableGraph } from "./graph-store.ts";

export async function addPackageFacts(graph: MutableGraph, files: readonly InventoryFile[]): Promise<void> {
	const packageFiles = files.filter((file) => file.path.endsWith("package.json"));
	const packages: PackageRecord[] = [];
	for (const file of packageFiles) {
		const packageJson = await safeJson(file);
		const packageInfo = packageInfoFor(file, packageJson);
		packages.push({ file, packageInfo, packageJson });
		addPackageNode(graph, file, packageInfo, packageJson);
		addPackageScripts(graph, file, packageInfo, packageJson);
	}
	addWorkspaceDependencyEdges(graph, packages);
}

interface PackageInfo {
	readonly dir: string;
	readonly id: string;
	readonly name: string;
}

interface PackageRecord {
	readonly file: InventoryFile;
	readonly packageInfo: PackageInfo;
	readonly packageJson: Record<string, unknown>;
}

function packageInfoFor(file: InventoryFile, packageJson: Record<string, unknown>): PackageInfo {
	const dir = dirname(file.path) === "." ? "." : dirname(file.path);
	const name = stringField(packageJson, "name") ?? fallbackPackageName(dir);
	return { dir, id: `package:${dir}`, name };
}

function fallbackPackageName(dir: string): string {
	return dir === "." ? "root" : basename(dir);
}

function addPackageNode(
	graph: MutableGraph,
	file: InventoryFile,
	packageInfo: PackageInfo,
	packageJson: Record<string, unknown>,
): void {
	addNode(graph, {
		id: packageInfo.id,
		kind: "Package",
		label: packageInfo.name,
		path: file.path,
		metadata: {
			version: stringField(packageJson, "version"),
			private: booleanField(packageJson, "private"),
			workspaces: packageJson["workspaces"],
		},
		provenance: provenance("package-manager", [{ path: file.path, hash: file.hash }]),
	});
	addEdge(graph, "CONTAINS", packageParentNodeId(packageInfo.dir), packageInfo.id, "package");
}

function addPackageScripts(
	graph: MutableGraph,
	file: InventoryFile,
	packageInfo: PackageInfo,
	packageJson: Record<string, unknown>,
): void {
	for (const [scriptName, scriptCommand] of scripts(packageJson)) {
		const scriptId = `script:${packageInfo.dir}:${scriptName}`;
		addNode(graph, {
			id: scriptId,
			kind: "PackageScript",
			label: scriptName,
			path: file.path,
			metadata: { command: scriptCommand },
			provenance: provenance("package-manager", [{ path: file.path, hash: file.hash }]),
		});
		addEdge(graph, "DEFINES", packageInfo.id, scriptId, "script");
	}
}

function addWorkspaceDependencyEdges(graph: MutableGraph, packages: readonly PackageRecord[]): void {
	const packagesByName = new Map(packages.map((entry) => [entry.packageInfo.name, entry]));
	for (const entry of packages) {
		for (const dependency of packageDependencies(entry.packageJson)) {
			const target = packagesByName.get(dependency.name);
			if (target === undefined || target.packageInfo.id === entry.packageInfo.id) continue;
			addProvenanceEdge(
				graph,
				"DEPENDS_ON",
				entry.packageInfo.id,
				target.packageInfo.id,
				`${dependency.field}:${dependency.name}`,
				provenance("package-manager", [{ path: entry.file.path, hash: entry.file.hash }]),
			);
		}
	}
}

interface PackageDependency {
	readonly field: string;
	readonly name: string;
}

function packageDependencies(packageJson: Record<string, unknown>): readonly PackageDependency[] {
	return dependencyFields.flatMap((field) => dependencyNames(packageJson[field]).map((name) => ({ field, name })));
}

function dependencyNames(value: unknown): string[] {
	if (!isRecord(value)) return [];
	return Object.entries(value).flatMap(([name, spec]) => (typeof spec === "string" ? [name] : []));
}

function packageParentNodeId(dir: string): string {
	return dir === "." ? "repo:root" : `dir:${dir}`;
}

async function safeJson(file: InventoryFile): Promise<Record<string, unknown>> {
	const text = await Bun.file(file.absolutePath).text();
	try {
		const parsed: unknown = JSON.parse(text);
		return isRecord(parsed) ? parsed : {};
	} catch {
		return {};
	}
}

function stringField(value: Record<string, unknown>, key: string): string | undefined {
	const field = value[key];
	return typeof field === "string" ? field : undefined;
}

function booleanField(value: Record<string, unknown>, key: string): boolean | undefined {
	const field = value[key];
	return typeof field === "boolean" ? field : undefined;
}

function scripts(value: Record<string, unknown>): Array<[string, string]> {
	const raw = value["scripts"];
	if (!isRecord(raw)) return [];
	return Object.entries(raw).flatMap(([key, command]) => (typeof command === "string" ? [[key, command]] : []));
}

const dependencyFields = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
