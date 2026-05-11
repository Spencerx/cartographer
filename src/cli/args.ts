import { err, ok, type Result } from "../shared/result.ts";
import { HarnessError } from "../shared/errors.ts";

export interface ParsedArgs {
	readonly command?: string;
	readonly positionals: readonly string[];
	readonly flags: Record<string, string | boolean | readonly string[]>;
}

export function parseArgs(argv: readonly string[]): Result<ParsedArgs, HarnessError> {
	const positionals: string[] = [];
	const flags: Record<string, string | boolean | readonly string[]> = {};
	for (let index = 0; index < argv.length; index += 1) {
		const token = argv[index];
		if (token === "--") {
			positionals.push(...argv.slice(index + 1));
			break;
		}
		if (token.startsWith("--")) {
			const parsed = parseLongFlag(token, argv[index + 1]);
			setFlag(flags, parsed.name, parsed.value);
			if (parsed.consumedNext) index += 1;
			continue;
		}
		if (token.startsWith("-") && token.length > 1) {
			setFlag(flags, token.slice(1), true);
			continue;
		}
		positionals.push(token);
	}
	const [command, ...rest] = positionals;
	return ok({ command, positionals: rest, flags });
}

export function hasFlag(args: ParsedArgs, name: string): boolean {
	return args.flags[name] !== undefined;
}

export function flagString(args: ParsedArgs, name: string, fallback?: string): string {
	const value = args.flags[name];
	if (typeof value === "string") return value;
	if (Array.isArray(value) && typeof value.at(-1) === "string") return value.at(-1) as string;
	if (fallback !== undefined) return fallback;
	throw new HarnessError("VALIDATION_FAILED", `missing --${name}`);
}

function parseLongFlag(token: string, next: string | undefined): { readonly name: string; readonly value: string | boolean; readonly consumedNext: boolean } {
	const body = token.slice(2);
	const equals = body.indexOf("=");
	if (equals >= 0) return { name: body.slice(0, equals), value: body.slice(equals + 1), consumedNext: false };
	if (next !== undefined && !next.startsWith("-")) return { name: body, value: next, consumedNext: true };
	return { name: body, value: true, consumedNext: false };
}

function setFlag(flags: Record<string, string | boolean | readonly string[]>, name: string, value: string | boolean): void {
	const existing = flags[name];
	if (existing === undefined) {
		flags[name] = value;
		return;
	}
	if (Array.isArray(existing)) {
		flags[name] = [...existing, String(value)];
		return;
	}
	flags[name] = [String(existing), String(value)];
}
