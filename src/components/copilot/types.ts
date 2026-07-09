// ── Copilot shared types ──────────────────────────────────────────────────────
// Extracted from sentra-next so these components have no app dependency.

export type CopilotLanguage = 'en' | 'ar'
// 'float' = an undocked, free-floating, draggable + resizable window. The other
// three pin the dock to a screen edge.
export type DockPosition = 'bottom' | 'left' | 'right' | 'float'
export type ChatPersona = 'analyst' | 'strategist' | 'advisor' | string

// ── CopilotQuickAction — intro quick-action chip ─────────────────────────────
// Rendered in the dock's empty/intro state. Clicking a chip sends `prompt`.
// Bilingual labels so the chip follows the active language.
export interface CopilotQuickAction {
  label_en: string
  label_ar: string
  prompt: string
  /** Optional lucide-style icon name hint (rendered by the dock when known). */
  icon?: string
}

// ── AgentStep — mirrors app/src/lib/types.ts#AgentStep ──────────────────────
export interface AgentStep {
  step: string
  message: string
  query?: string
  subQuery?: string
  count?: number
  highQuality?: number
  citations?: string[]
  sources?: string[]
  domains?: string[]
  handles?: string[]
  duration_ms?: number
  done?: boolean
}

// ── ArtifactPayload (legacy controller-slug shape) ───────────────────────────
export interface ArtifactPayload {
  controller_slug: string
  title?: string
  title_ar?: string
  data: unknown
}

// ── A2UIArtifact (Cortex SSE stream shape — version 1) ────────────────────────
// Mirrors cortex/internal/copilot/sse.go A2UIArtifact.
// Import the full typed version from './artifacts/types' when narrowing kind.
export interface A2UIArtifact {
  version: number
  kind: string
  title_en?: string
  title_ar?: string
  data: unknown
}

// ── CopilotMessage — core message shape ──────────────────────────────────────
export interface CopilotMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  content_ar?: string
  /** Whether the user message should be hidden (insight-trigger bubbles) */
  hidden?: boolean
  steps?: AgentStep[]
  citations?: Array<{ number: number; title: string; slug: string; type: string; description?: string }>
  briefing?: Record<string, unknown>
  /** Legacy controller-slug artifacts (ArtifactViewer). */
  artifacts?: ArtifactPayload[]
  /**
   * A2UI structured artifacts from the Cortex SSE stream (phase 4).
   * A single message may carry multiple artifacts (emitted before [DONE]).
   * Rendered by ArtifactRenderer below the message text in the dock.
   */
  a2uiArtifacts?: A2UIArtifact[]
}

// ── ComparisonFactor ──────────────────────────────────────────────────────────
export interface ComparisonFactor {
  id: string
  label: string
  description: string
  weight: 'high' | 'medium' | 'low'
  enabled: boolean
}

export interface CompareFactorsData {
  factors: ComparisonFactor[]
  subjectA: { title: string; slug: string }
  subjectB: { title: string; slug: string }
  type: string
}

// ── ChatAttachment ─────────────────────────────────────────────────────────────
export interface ChatAttachment {
  /** Storage proxy URL (legacy path) */
  url?: string
  /** Base64 data URI from FileReader.readAsDataURL (inline path) */
  data?: string
  name: string
  type: string
  size?: number
}

// ── ForcedTools ───────────────────────────────────────────────────────────────
export interface ForcedTools {
  search?: boolean
  search_sources?: string[]
  deep_research?: boolean
}

// ── SendOptions — options forwarded alongside the message ─────────────────────
export interface SendOptions {
  thinkingMode?: boolean
  insight?: boolean
  hideUserMessage?: boolean
  forcedTools?: ForcedTools
  attachments?: Array<{ url?: string; data?: string; name: string; type: string }>
  /**
   * Structured interaction post-back from an interactive artifact renderer.
   * When set, CopilotProvider attaches it to the CopilotRequest.interaction
   * field so the backend can dispatch on the structured payload rather than
   * the synthesised text message. The user bubble is suppressed via hideUserMessage.
   */
  interaction?: { kind: string; payload: Record<string, unknown> }
}

// ── CopilotChatState — the injected seam the product provides ────────────────
//
// This is the PRIMARY SEAM. Instead of importing useCopilotChat (which talks
// directly to the Sentra bridge/ADK), the consumer passes a CopilotChatState
// object. The Sentra product constructs it from useCopilotChat; Cortex or
// Scout would construct their own equivalent pointing to their own streaming
// endpoint (Cortex /v1/copilot/dispatch).
//
// Usage pattern:
//
//   // In the Sentra product:
//   const chat = useCopilotChat({ ... })  // existing hook
//   <UnifiedCopilotDock chatState={chat} ... />
//
//   // In a standalone consumer (e.g. Storybook):
//   const [messages, setMessages] = useState<CopilotMessage[]>([])
//   const chatState: CopilotChatState = {
//     messages,
//     inputValue: '',
//     onInputChange: () => {},
//     onSend: async (text, opts) => { /* call Cortex /v1/copilot/dispatch */ },
//     isLoading: false,
//     isStreaming: false,
//     isReceiving: false,
//     streamingText: '',
//     agentSteps: [],
//     streamError: null,
//     onRetry: () => {},
//     onNewConversation: () => {},
//   }
//   <UnifiedCopilotDock chatState={chatState} ... />
//
export interface CopilotChatState {
  // Message list (complete turns)
  messages: CopilotMessage[]
  // Current streaming tail (accumulating SSE deltas)
  streamingText: string
  // true once the first SSE byte arrives and until the turn ends
  isReceiving: boolean
  // true from send until the turn fully completes
  isLoading: boolean
  isStreaming: boolean

  // true after the stream's [DONE] while the final assistant message (markdown,
  // tables, charts, artifacts) is committing/painting. The dock keeps the
  // thinking indicator alive until this clears so the spinner doesn't vanish a
  // frame before the rendered content appears. Optional for back-compat.
  isFinalizing?: boolean

  // Live agent step indicators
  agentSteps: AgentStep[]

  // Error from a broken stream (mid-response network failure)
  streamError: string | null

  // Input field value
  inputValue: string
  onInputChange: (value: string) => void

  // Send a message. The product implementation calls its streaming endpoint.
  onSend: (text: string, opts?: SendOptions) => void

  // Abort the current streaming turn
  onStop?: () => void

  // Retry the last message after a streamError
  onRetry: () => void

  // Start a fresh conversation
  onNewConversation: () => void

  // Optional: conversation metadata (for the header)
  conversationTitle?: string
  conversationId?: string

  // Conversation history (for the history popover)
  conversationHistory?: Array<{ id: string; title: string; updated_at: string; context_label?: string }>
  onLoadConversation?: (id: string) => void
  onFetchHistory?: () => Promise<Array<{ id: string; title: string; updated_at: string; context_label?: string }>>
  // Delete a past conversation (session + its memory). When wired, the history
  // popover shows a per-row delete control. Resolves after the server confirms.
  onDeleteConversation?: (id: string) => Promise<void>

  // Optional context metadata for header badges (loaded conversation may override props)
  loadedContextType?: string
  loadedContextRef?: string
  loadedContextLabel?: string
  loadedCreatedAt?: string
  loadedUpdatedAt?: string
  effectiveMode?: string
}

// ── CopilotContext — page-level context the dock receives ─────────────────────
/**
 * A suggestion chip. Either a plain string (back-compat — same text in both
 * languages) or a bilingual pair so the dock can render the right language.
 */
export type CopilotSuggestion = string | { en: string; ar: string }

export interface CopilotDockContext {
  type: string
  contextRef: string
  title: string
  mode: string
  systemContext?: Record<string, unknown>
  suggestions: CopilotSuggestion[]
  entityImageUrl?: string | null
}
