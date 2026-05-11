import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export async function writeAnnotationOverlay(
	outDir: string,
	records: readonly Record<string, unknown>[],
): Promise<void> {
	const overlayDir = join(outDir, "overlays");
	await mkdir(overlayDir, { recursive: true });
	await writeFile(
		join(overlayDir, "agent-notes.jsonl"),
		`${records.map((record) => JSON.stringify(record)).join("\n")}\n`,
	);
}
