export type RuntimeEventType = "tool_use" | "tool_result" | "assistant" | "result" | "error" | (string & {});

export interface RuntimeEvent {
	readonly type: RuntimeEventType;
	readonly turnId: string;
	readonly timestamp: string;
	readonly data: unknown;
}
