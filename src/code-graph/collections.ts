export function countBy<T>(items: readonly T[], keyFn: (item: T) => string): Record<string, number> {
	const counts = new Map<string, number>();
	for (const item of items) {
		const key = keyFn(item);
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	return Object.fromEntries([...counts.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

export function uniqueBy<T>(items: readonly T[], keyFn: (item: T) => string): readonly T[] {
	return [...new Map(items.map((item) => [keyFn(item), item])).values()];
}
