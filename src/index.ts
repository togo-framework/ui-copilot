// @togo-framework/ui-copilot — public API.
// Copilot chat dock + streaming (host injects a CopilotClient), the chat
// message/artifact renderers, and the intel severity chip. Merged into one
// package because chat/ and copilot/ have a circular dependency on each
// other. Depends on @togo-framework/ui-core and @togo-framework/ui-markdown.

// ── copilot artifacts (presentational renderers) ──
export * from "./components/copilot/artifacts";
export { SeverityChip } from "./components/intel/SeverityChip";
export type { IntelSeverity } from "./components/intel/types";
export { default as MarkdownContent } from "./components/chat/MarkdownContent";

// ── copilot (chat dock + streaming; host injects a CopilotClient) ──
export { CopilotProvider, useCopilot } from "./components/copilot/CopilotProvider";
export { default as UnifiedCopilotDock } from "./components/copilot/UnifiedCopilotDock";
export { CopilotLauncher } from "./components/copilot/CopilotLauncher";
export { CopilotSelectionTrigger } from "./components/copilot/CopilotSelectionTrigger";
export type { CopilotSelectionTriggerProps } from "./components/copilot/CopilotSelectionTrigger";
export type { DockPosition, CopilotQuickAction } from "./components/copilot/types";
export { default as ChatThread } from "./components/copilot/ChatThread";
export { default as StreamingMessage } from "./components/copilot/StreamingMessage";
export { default as ArtifactViewer } from "./components/copilot/ArtifactViewer";
export { default as AgentSteps } from "./components/copilot/AgentSteps";
export type { CopilotClient, CopilotRequest, CopilotEvent } from "./components/copilot/client";
