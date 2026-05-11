export type ErrorCode = "VALIDATION_FAILED" | "AUTH_FAILED" | "INTERNAL" | (string & {});

export class HarnessError extends Error {
	readonly code: ErrorCode;
	readonly context: Record<string, unknown>;

	constructor(code: ErrorCode, message: string, options: { readonly cause?: unknown; readonly context?: Record<string, unknown> } = {}) {
		super(message, { cause: options.cause });
		this.name = "HarnessError";
		this.code = code;
		this.context = options.context ?? {};
	}

	static from(code: ErrorCode, cause: unknown, context?: Record<string, unknown>): HarnessError {
		if (cause instanceof HarnessError) return cause;
		if (cause instanceof Error) return new HarnessError(code, cause.message, { cause, context });
		return new HarnessError(code, String(cause), { cause, context });
	}
}

export function normalizeError(cause: unknown): HarnessError {
	return HarnessError.from("INTERNAL", cause);
}
