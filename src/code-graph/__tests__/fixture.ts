import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export async function createCartographerFixture(prefix: string): Promise<string> {
	const tempDir = await mkdtemp(join(tmpdir(), prefix));
	await mkdir(join(tempDir, "repo/src"), { recursive: true });
	await writeFile(
		join(tempDir, "repo/package.json"),
		JSON.stringify({ name: "fixture", scripts: { test: "bun test" } }),
	);
	await writeFile(join(tempDir, "repo/src/index.ts"), "export const value = 1;\n");
	await writeFile(
		join(tempDir, "repo/src/index.test.ts"),
		"import { value } from './index';\ntest('value', () => value);\n",
	);
	return tempDir;
}

export async function removeCartographerFixture(tempDir: string): Promise<void> {
	await rm(tempDir, { recursive: true, force: true });
}
