export function truncateChars(value: string, maxChars: number): string {
	if (maxChars <= 0 || value.length <= maxChars) return value;
	const marker = "\n...[truncated]...";
	return `${value.slice(0, Math.max(0, maxChars - marker.length))}${marker}`;
}
