export async function writeOut(value: string): Promise<void> {
	await Bun.write(Bun.stdout, value);
}

export async function writeErr(value: string): Promise<void> {
	await Bun.write(Bun.stderr, value);
}
