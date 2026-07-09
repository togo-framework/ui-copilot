// CopilotClient — the host-injected seam that replaces @sentra/cortex-sdk.
// The kit ships the copilot UI (dock, chat thread, streaming, artifacts) and the
// app provides a client that streams events (e.g. over SSE) from its own backend.

export interface CopilotRequest {
  [key: string]: any;
  attachments?: unknown[];
  intelligenceContext?: { data_summary?: string; [key: string]: unknown };
}

export interface CopilotEvent {
  type?: string;
  [key: string]: any;
}

export interface StepEvent {
  [key: string]: any;
}

/** The streaming client the host injects into CopilotProvider. */
export interface CopilotClient {
  copilotDispatch(
    req: CopilotRequest,
    opts?: { signal?: AbortSignal },
  ): AsyncIterable<CopilotEvent>;
}
