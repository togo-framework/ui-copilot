'use client'

/**
 * CopilotProvider — @prism/ui F3
 *
 * Context provider that wires UnifiedCopilotDock to the cortex-sdk
 * CortexClient.copilotDispatch() SSE stream. Apps mount this once at their
 * root (or inside LanguageProvider) and call useCopilot() anywhere to
 * open/close the dock.
 *
 * Wave B additions (2026-06-06):
 *   B1 — Fetches /v1/copilot/config on mount; exposes allowedAgents as dynamic
 *        personas list and allowedTools/allowedSkills for the dock panels.
 *        Falls back to empty/undefined when Cortex is unreachable (nil-safe).
 *   B2 — allowedTools + allowedSkills passed to dock via new prop.
 *   B3 — AR suggestions already fixed (bilingual pair shape). Provider default
 *        suggestions are now bilingual.
 *   B4 — pageContext prop forwarded into CopilotRequest.intelligenceContext.data_summary.
 *
 * Architecture:
 *   - Provider manages CopilotChatState (messages, streaming, error).
 *   - onSend → CortexClient.copilotDispatch() → async generator → state updates.
 *   - Language comes from the shared LanguageProvider context so the copilot
 *     always answers in the active locale (EN/AR).
 *   - cortex-sdk is a pure fetch/SSE SDK — no React dependency. Safe in any
 *     runtime (browser, Node 18+, edge).
 *
 * Error handling (Rule 14 spirit):
 *   - Network / Cortex unreachable → streamError shown in dock; no crash.
 *   - Each SSE turn is wrapped in try/catch/finally so state always resolves.
 *
 * Rules: Rule 7 (displayName), Rule 8 (bilingual), Rule 16 (Sentra style),
 *        Rule 25 (product-agnostic — no product DB/context reads).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
// Decoupled from @sentra/cortex-sdk — the host injects a CopilotClient (same shape).
import type { CopilotClient, CopilotRequest, CopilotEvent, StepEvent as CortexStepEvent } from './client'
import type {
  CopilotChatState,
  CopilotDockContext,
  CopilotMessage,
  AgentStep,
  SendOptions,
  A2UIArtifact,
  CopilotQuickAction,
} from './types'
import UnifiedCopilotDock from './UnifiedCopilotDock'
import type { A2UIActionItem, ArtifactInteraction } from './artifacts/types'
import { useT as _useT } from '@togo-framework/ui-core'

// Safely read language context — won't throw if LanguageProvider is absent.
function useSafeLanguage(): { language: 'en' | 'ar'; isRTL: boolean } {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const ctx = _useT()
    return { language: ctx.language as 'en' | 'ar', isRTL: ctx.isRTL }
  } catch {
    return { language: 'en', isRTL: false }
  }
}

// ── ID generator ──────────────────────────────────────────────────────────────

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// stripA2UI removes ```a2ui … ``` artifact blocks from assistant text so the
// raw JSON is never shown to the user — the structured widget is rendered
// separately from message.a2uiArtifacts. During streaming the closing fence may
// not have arrived yet, so we also hide any in-progress (unclosed) block from
// the first ```a2ui marker onward.
function stripA2UI(text: string): string {
  let out = text.replace(/```a2ui[\s\S]*?```/g, '')
  const open = out.indexOf('```a2ui')
  if (open !== -1) out = out.slice(0, open)
  return out.trim()
}

// genUUID returns an RFC-4122 v4 UUID. The Cortex session backend requires a
// real UUID (non-UUID ids are skipped) — crypto.randomUUID is available in all
// browsers we target; the Math.random fallback keeps SSR/old-runtime safe.
function genUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// ── Agent Arabic name fallback map ────────────────────────────────────────────
// The Cortex /v1/copilot/config endpoint (config_handler.go) currently returns
// only `name` (EN). The DB has name_ar populated for all agent-persona rows.
// Until the Go handler is updated to emit name_ar, we map by slug here.
// Source: cortex DB plugins table, plugin_type='adk_artifact', adk_kind='agent'
// Query: SELECT slug, name_ar FROM plugins WHERE slug LIKE 'agent-persona-%';
const AGENT_AR_NAMES: Record<string, string> = {
  'agent-persona-analyst':   'محلل الاستخبارات',
  'agent-persona-media':     'محلل الإعلام',
  'agent-persona-diplomat':  'الدبلوماسي',
  'agent-persona-osint':     'باحث OSINT',
}

// ── Config types (mirrors config_handler.go response shape) ──────────────────

export interface CopilotConfigTool {
  slug: string
  name: string
  name_ar?: string
  function_name?: string
}

export interface CopilotConfigSkill {
  slug: string
  name: string
  name_ar?: string
}

export interface CopilotConfigAgent {
  slug: string
  name: string
  /** Arabic name. The Go config handler currently returns only `name` (EN).
   *  When the server starts emitting this field it will be picked up automatically.
   *  Until then, CopilotProvider falls back to the AGENT_AR_NAMES map below.
   */
  name_ar?: string
}

/**
 * Token-scoped branding the dashboard/SDK applies to the copilot dock.
 * Forwarded verbatim from cortex_api_keys.capabilities.branding (config_handler.go).
 * All fields optional — an empty object means "use the dock defaults".
 */
export interface CopilotBranding {
  /** Dock header title (EN). Overrides the default "Copilot". */
  title?: string
  /** Dock header title (AR). */
  titleAr?: string
  /** Accent colour (CSS colour string) applied to the dock's primary surfaces. */
  primaryColor?: string
  /** Input placeholder (EN). */
  placeholder?: string
  /** Input placeholder (AR). */
  placeholderAr?: string
}

/**
 * Token-scoped UI toggles. Forwarded from capabilities.ui. Each defaults to
 * "shown" when undefined so an unconfigured token keeps the full surface.
 */
export interface CopilotUIConfig {
  /** Show the in-dock Tools panel + / command tools group. Default true. */
  showTools?: boolean
  /** Show the in-dock Skills panel + / command skills group. Default true. */
  showSkills?: boolean
  /** Show the @ agent/persona menu + picker. Default true. */
  showAgents?: boolean
}

export interface CopilotConfig {
  allowed_tools: CopilotConfigTool[]
  allowed_skills: CopilotConfigSkill[]
  allowed_agents: CopilotConfigAgent[]
  allowed_mcp: unknown[]
  branding: CopilotBranding
  ui: CopilotUIConfig
  limits: {
    rate_per_min: number | null
    monthly_budget: string | null
    hard_cap: string | null
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

/**
 * Options accepted by `useCopilot().open()`.
 *
 * Backwards-compatible: bare `open()` (no args) still works unchanged.
 */
export interface OpenCopilotOptions {
  /**
   * Pre-fill the dock input with this message text.
   * When autoSend is false (default), the text is placed in the input field
   * and focus is moved to it so the user can review before sending.
   */
  message?: string
  /**
   * When true, the message is sent automatically as soon as the dock opens,
   * without user confirmation. Use for smart-action "اسأل" flows where the
   * intent is clear from the card context.
   */
  autoSend?: boolean
}

export interface CopilotContextValue {
  /**
   * Open the copilot dock.
   *
   * @example bare open (no pre-load)
   * ```tsx
   * const { open } = useCopilot()
   * <button onClick={() => open()}>Copilot</button>
   * ```
   *
   * @example pre-fill input
   * ```tsx
   * open({ message: `اشرح هذا الخبر: ${card.title_ar}` })
   * ```
   *
   * @example auto-send
   * ```tsx
   * open({ message: `اشرح هذا الخبر: ${card.title_ar}`, autoSend: true })
   * ```
   */
  open: (opts?: OpenCopilotOptions) => void
  /** Close the copilot dock */
  close: () => void
  /** Whether the dock is currently open/expanded */
  isOpen: boolean
  /** Token-scoped config (null while loading or when Cortex is unreachable) */
  config: CopilotConfig | null
}

const CopilotContext = createContext<CopilotContextValue | null>(null)

// ── Provider props ────────────────────────────────────────────────────────────

export interface CopilotProviderProps {
  children: ReactNode

  /**
   * Cortex base URL. Defaults to '/api/v1'.
   * Apps that proxy Cortex through Next.js rewrites pass the rewrite path here
   * (e.g. '/api/cortex'). Apps with a separate Cortex service pass the full
   * service URL (e.g. 'http://cortex:8210').
   */
  baseUrl?: string

  /**
   * Optional Cortex API token (Bearer). When apps proxy Cortex via cookie-auth
   * (Next.js middleware attaches the token server-side) the token can be omitted.
   * When a raw token is available client-side, pass it here.
   */
  token?: string
  /** Streaming client (replaces the cortex-sdk). Without it the dock renders but cannot dispatch. */
  client?: CopilotClient

  /**
   * Page-level context fed to the copilot dock (type, title, suggestions, etc.).
   * Defaults to a generic "global" context. Apps update this by re-rendering
   * the provider with different context (or by wrapping per-page sub-sections).
   */
  context?: CopilotDockContext

  /**
   * Start the dock in an open/expanded state. Defaults to false.
   */
  defaultOpen?: boolean

  /**
   * B4: Optional markdown description of the current page. When set, the copilot
   * receives it as intelligenceContext.data_summary in every dispatch so it
   * "understands the current page" without the user having to explain.
   *
   * Apps update this prop on navigation to keep the context current.
   *
   * Example: "User is on the Plugins page. 13 plugins are loaded. Active types:
   * tool, skill, agent. The user can enable/disable plugins here."
   */
  pageContext?: string

  /**
   * Quick-action chips shown in the dock's empty/intro state. Each chip sends
   * its `prompt` when clicked. Falls back to `context.suggestions` when omitted.
   */
  quickActions?: CopilotQuickAction[]
}

// ── Default context ───────────────────────────────────────────────────────────

const DEFAULT_CONTEXT: CopilotDockContext = {
  type: 'global',
  contextRef: '',
  title: 'Copilot',
  mode: 'global',
  suggestions: [
    { en: 'Summarise recent alerts', ar: 'لخّص التنبيهات الأخيرة' },
    { en: 'What are the key narratives this week?', ar: 'ما أبرز السرديات هذا الأسبوع؟' },
    { en: 'Show top entities by coverage', ar: 'اعرض أبرز الكيانات حسب التغطية' },
  ],
}

// ── Provider ──────────────────────────────────────────────────────────────────

const CopilotProvider = ({
  children,
  baseUrl = '/api/v1',
  token,
  context = DEFAULT_CONTEXT,
  defaultOpen = false,
  pageContext,
  quickActions,
  client: injectedClient,
}: CopilotProviderProps) => {
  const { language } = useSafeLanguage()

  // ── Dock open/close state ───────────────────────────────────────────────────
  const [isOpen, setIsOpen] = useState(defaultOpen)

  // ── Pending message state (from open({ message, autoSend })) ───────────────
  // Passed as pendingMessage/pendingAutoSend props to UnifiedCopilotDock, which
  // consumes them in its own effect and calls onPendingMessageConsumed to clear.
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
  const [pendingAutoSend, setPendingAutoSend] = useState(false)

  // ── B1: Token-scoped config ─────────────────────────────────────────────────
  const [config, setConfig] = useState<CopilotConfig | null>(null)

  // ── Chat state ──────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<CopilotMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isReceiving, setIsReceiving] = useState(false)
  // True after [DONE] while the committed assistant message paints (markdown,
  // tables, charts, artifacts). Cleared on a post-commit double-rAF so the dock
  // keeps its thinking indicator until the rendered content is on screen.
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([])
  const [streamError, setStreamError] = useState<string | null>(null)

  // ── Wave D: session management ──────────────────────────────────────────────
  // The current Cortex chat-session id. When set, dispatch persists both turns
  // to it; the backend auto-titles a fresh session from the first message. null
  // = a new untracked conversation (a session is created server-side on first send).
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionTitle, setSessionTitle] = useState<string | undefined>(undefined)

  // Keep last sent payload for retry
  const lastPayloadRef = useRef<{ text: string; opts?: SendOptions } | null>(null)
  // AbortController for the current stream
  const abortRef = useRef<AbortController | null>(null)

  // ── CortexClient — memoised per baseUrl/token change ───────────────────────
  // Build a new client ref only when baseUrl/token actually changes.
  const clientRef = useRef<CopilotClient | null>(injectedClient ?? null)
  clientRef.current = injectedClient ?? null

  // ── B1: Fetch /v1/copilot/config on mount (and when client changes) ─────────
  // Nil-safe: if the fetch fails for any reason (Cortex unreachable, 401, etc.),
  // config stays null and the dock falls back to hardcoded PERSONAS.
  useEffect(() => {
    let cancelled = false
    const fetchConfig = async () => {
      try {
        // Use raw fetch to the config path rather than the client.request() helper
        // so we don't throw on 401 when no token is yet available.
        const configUrl = baseUrl.endsWith('/') ? `${baseUrl}copilot/config` : `${baseUrl}/copilot/config`
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (token) headers['Authorization'] = `Bearer ${token}`
        const res = await fetch(configUrl, {
          method: 'GET',
          headers,
          credentials: 'include',
        })
        if (!res.ok || cancelled) return
        const data = (await res.json()) as CopilotConfig
        if (!cancelled) setConfig(data)
      } catch {
        // Cortex unreachable or no token yet — silently ignore, dock degrades gracefully.
      }
    }
    void fetchConfig()
    return () => { cancelled = true }
  }, [baseUrl, token])

  // ── Map cortex StepEvent → AgentStep ─────────────────────────────────────
  const mapStep = (s: CortexStepEvent): AgentStep => ({
    step: s.step,
    message: s.message,
    done: s.done,
    count: s.count,
    duration_ms: s.duration_ms,
    sources: s.sources,
    domains: s.domains,
    handles: s.handles,
    query: s.query,
  })

  // ── Send ───────────────────────────────────────────────────────────────────

  const handleSend = useCallback(
    async (text: string, opts?: SendOptions) => {
      if (!text.trim()) return

      // Abort any in-flight stream
      abortRef.current?.abort()
      const abort = new AbortController()
      abortRef.current = abort

      lastPayloadRef.current = { text, opts }

      // Wave D: ensure a session id so dispatch persists this conversation.
      // Lazily mint one for a fresh conversation; the backend upserts + auto-titles it.
      let activeSession = sessionId
      if (!activeSession) {
        activeSession = genUUID()
        setSessionId(activeSession)
      }

      // Add user message
      const userMsg: CopilotMessage = {
        id: genId(),
        role: 'user',
        content: text,
        hidden: opts?.hideUserMessage,
      }

      setMessages(prev => [...prev, userMsg])
      setInputValue('')
      setStreamError(null)
      setIsLoading(true)
      setIsStreaming(false)
      setIsReceiving(false)
      setIsFinalizing(false)
      setAgentSteps([])
      setStreamingText('')

      // Build the assistant message shell — will be updated with streaming content
      const assistantId = `streaming-${genId()}`
      let accumulated = ''
      let finalSteps: AgentStep[] = []
      // A2UI: collect artifacts emitted before [DONE] into the finalised message.
      let finalArtifacts: A2UIArtifact[] = []

      try {
        const client = clientRef.current
        if (!client) { throw new Error('No CopilotClient provided') }

        // B4: Build intelligenceContext — inject pageContext as data_summary when available.
        const intelligenceCtx = pageContext
          ? { data_summary: pageContext }
          : undefined

        const req: CopilotRequest = {
          messages: [
            // Pass the full history so the model has conversation context
            ...(messages.map(m => ({
              role: m.role,
              content: m.content,
            }))),
            { role: 'user', content: text },
          ],
          language,
          mode: context.mode,
          thinking_mode: opts?.thinkingMode,
          forced_tools: opts?.forcedTools
            ? {
                deep_research: opts.forcedTools.deep_research ?? false,
                search_sources: opts.forcedTools.search_sources ?? [],
              }
            : undefined,
          attachments: opts?.attachments as CopilotRequest['attachments'],
          intelligenceContext: intelligenceCtx,
          // Wave D: persist this turn to the active session (backend upserts + auto-titles).
          session_id: activeSession,
          // Phase-3: structured interaction post-back from an interactive artifact.
          // Forwarded when handleArtifactInteract is the caller; absent for normal sends.
          interaction: opts?.interaction,
        }

        // Optimistically title a brand-new conversation from its first message
        // so the header reflects it immediately (backend auto-titles to match).
        if (!sessionTitle && messages.length === 0) {
          const t = text.length > 50 ? `${text.slice(0, 50)}…` : text
          setSessionTitle(t)
        }

        for await (const event of client.copilotDispatch(req, { signal: abort.signal })) {
          if (abort.signal.aborted) break

          switch (event.type) {
            case 'delta': {
              accumulated += event.text
              setIsStreaming(true)
              setIsReceiving(true)
              // Hide any ```a2ui block from the live text — the widget renders separately.
              setStreamingText(stripA2UI(accumulated))
              break
            }
            case 'step': {
              const step = mapStep(event.step)
              finalSteps = [...finalSteps, step]
              setAgentSteps([...finalSteps])
              setIsStreaming(true)
              break
            }
            case 'citations': {
              // Citations are attached to the finalised assistant message below.
              break
            }
            case 'artifact': {
              // A2UI: accumulate artifacts — they are attached to the finalised message.
              finalArtifacts = [...finalArtifacts, event.artifact as A2UIArtifact]
              break
            }
            case 'done': {
              // Stream finished cleanly — break out of the generator
              break
            }
            default:
              break
          }
        }

        // Finalise: commit the assistant message with stripped text + steps + artifacts.
        // The ```a2ui block is removed from content (rendered as a widget instead);
        // commit when there is prose OR at least one artifact.
        const cleanContent = stripA2UI(accumulated)
        const committed = !abort.signal.aborted && (cleanContent || finalArtifacts.length > 0)
        if (committed) {
          // Enter the finalizing phase BEFORE committing so the dock's busy
          // indicator survives the streaming→done transition. Cleared after the
          // message has had two animation frames to mount + paint its markdown,
          // tables, charts and artifacts.
          setIsFinalizing(true)
          const assistantMsg: CopilotMessage = {
            id: assistantId,
            role: 'assistant',
            content: cleanContent,
            steps: finalSteps.length > 0 ? finalSteps : undefined,
            a2uiArtifacts: finalArtifacts.length > 0 ? finalArtifacts : undefined,
          }
          setMessages(prev => [...prev, assistantMsg])
          if (typeof requestAnimationFrame !== 'undefined') {
            requestAnimationFrame(() =>
              requestAnimationFrame(() => setIsFinalizing(false)),
            )
          } else {
            setIsFinalizing(false)
          }
        }
      } catch (err) {
        if (abort.signal.aborted) {
          // User aborted — not an error
          return
        }
        console.error('[CopilotProvider]', 'Stream error', err)
        const msg =
          err instanceof Error ? err.message : 'Cortex is unreachable. Please try again.'
        setStreamError(msg)
      } finally {
        setIsLoading(false)
        setIsStreaming(false)
        setIsReceiving(false)
        setStreamingText('')
        setAgentSteps([])
      }
    },
    // messages is included so each turn picks up the current history correctly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messages, language, context.mode, baseUrl, token, pageContext, sessionId, sessionTitle],
  )

  const handleRetry = useCallback(() => {
    if (!lastPayloadRef.current) return
    const { text, opts } = lastPayloadRef.current
    // Remove the last assistant message (if any) so retry re-runs cleanly
    setMessages(prev =>
      prev.filter(m => m.role !== 'assistant' || prev.indexOf(m) < prev.length - 1),
    )
    setStreamError(null)
    void handleSend(text, opts)
  }, [handleSend])

  const handleNewConversation = useCallback(() => {
    abortRef.current?.abort()
    setMessages([])
    setInputValue('')
    setStreamError(null)
    setIsLoading(false)
    setIsStreaming(false)
    setIsReceiving(false)
    setIsFinalizing(false)
    setStreamingText('')
    setAgentSteps([])
    lastPayloadRef.current = null
    // Wave D: drop the active session so the next send mints a fresh one.
    setSessionId(null)
    setSessionTitle(undefined)
  }, [])

  // ── Wave D: history (list) + load a past session ────────────────────────────

  // Fetch the token's chat sessions, mapped to the dock's history shape.
  const handleFetchHistory = useCallback(async (): Promise<
    Array<{ id: string; title: string; updated_at: string; context_label?: string }>
  > => {
    try {
      const url = baseUrl.endsWith('/')
        ? `${baseUrl}copilot/sessions`
        : `${baseUrl}/copilot/sessions`
      const res = await fetch(url, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (!res.ok) return []
      const data = (await res.json()) as {
        sessions?: Array<{ id: string; title: string; last_message_at?: number; created_at?: number }>
      }
      return (data.sessions ?? []).map(s => ({
        id: s.id,
        title: s.title || 'New chat',
        // dock expects an ISO/string updated_at; convert epoch-ms when present.
        updated_at: s.last_message_at
          ? new Date(s.last_message_at).toISOString()
          : s.created_at
            ? new Date(s.created_at).toISOString()
            : '',
      }))
    } catch {
      return []
    }
  }, [baseUrl, token])

  // Delete a past session (and its memory) on the server.
  const handleDeleteConversation = useCallback(
    async (id: string): Promise<void> => {
      const url = baseUrl.endsWith('/')
        ? `${baseUrl}copilot/sessions/${id}`
        : `${baseUrl}/copilot/sessions/${id}`
      const res = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      // 204 No Content on success; 404 (already gone) is also acceptable.
      if (!res.ok && res.status !== 404) {
        throw new Error(`delete session failed: ${res.status}`)
      }
    },
    [baseUrl, token],
  )

  // Load a past session's messages and make it the active conversation.
  const handleLoadConversation = useCallback(
    async (id: string) => {
      abortRef.current?.abort()
      try {
        const url = baseUrl.endsWith('/')
          ? `${baseUrl}copilot/sessions/${id}/messages`
          : `${baseUrl}/copilot/sessions/${id}/messages`
        const res = await fetch(url, {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
        if (!res.ok) return
        const data = (await res.json()) as {
          title?: string
          messages?: Array<{ role: string; content: string }>
        }
        const loaded: CopilotMessage[] = (data.messages ?? [])
          .filter(m => m.role === 'user' || m.role === 'assistant')
          .map(m => ({
            id: genId(),
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }))
        setMessages(loaded)
        setSessionId(id)
        setSessionTitle(data.title)
        setStreamError(null)
        setStreamingText('')
        setAgentSteps([])
        setInputValue('')
      } catch {
        // Silent — the dock shows the prior conversation unchanged on failure.
      }
    },
    [baseUrl, token],
  )

  const handleStop = useCallback(() => {
    abortRef.current?.abort()
    setIsLoading(false)
    setIsStreaming(false)
    setIsReceiving(false)
    setIsFinalizing(false)
  }, [])

  // ── CopilotChatState object ────────────────────────────────────────────────

  const chatState: CopilotChatState = {
    messages,
    streamingText,
    isReceiving,
    isLoading,
    isStreaming,
    isFinalizing,
    agentSteps,
    streamError,
    inputValue,
    onInputChange: setInputValue,
    onSend: (text, opts) => { void handleSend(text, opts) },
    onStop: handleStop,
    onRetry: handleRetry,
    onNewConversation: handleNewConversation,
    // Wave D: session management — activates the dock's history popover.
    conversationId: sessionId ?? undefined,
    conversationTitle: sessionTitle,
    onFetchHistory: handleFetchHistory,
    onLoadConversation: handleLoadConversation,
    onDeleteConversation: handleDeleteConversation,
  }

  // ── B1: Build dynamic personas list from config.allowed_agents ────────────
  // Strip the "agent-persona-" prefix if present, so dispatch receives the
  // short slug (e.g. "analyst") the copilot backend recognises as a persona.
  // Falls back to undefined → UnifiedCopilotDock uses its hardcoded PERSONAS.
  const dynamicPersonas = config && config.allowed_agents.length > 0
    ? config.allowed_agents.map(a => ({
        id: a.slug.replace(/^agent-persona-/, ''),
        label: a.name,
        // Prefer name_ar from the server payload (when the Go handler emits it),
        // then fall back to AGENT_AR_NAMES keyed by the full slug, then the EN name.
        labelAr: a.name_ar || AGENT_AR_NAMES[a.slug] || a.name,
        icon: undefined,
      }))
    : undefined

  // ── Context value ──────────────────────────────────────────────────────────

  // ── A2UI: artifact action handler ─────────────────────────────────────────
  // When an ArtifactActions chip is clicked, send the item.prompt as a new
  // user message via the existing handleSend path (expands the dock if collapsed).
  const handleArtifactAction = useCallback(
    (item: A2UIActionItem) => {
      if (!item.prompt) return
      setIsOpen(true)
      void handleSend(item.prompt)
    },
    [handleSend],
  )

  // ── Phase-3: structured artifact interaction handler ──────────────────────
  // When an interactive Phase-3 artifact (client_candidates, client_field_picker,
  // client_diff_confirm, persona_starters) posts a structured interaction:
  //   1. Open the dock so the response is visible.
  //   2. Synthesise a minimal text tag — never shown to the user (hideUserMessage).
  //   3. Attach the interaction to the CopilotRequest so the backend dispatches
  //      on structured data rather than the synthesised text.
  const handleArtifactInteract = useCallback(
    (interaction: ArtifactInteraction) => {
      setIsOpen(true)
      const text = `[interaction:${interaction.kind}]`
      void handleSend(text, {
        hideUserMessage: true,
        interaction,
      })
    },
    [handleSend],
  )

  const handleOpen = useCallback((opts?: OpenCopilotOptions) => {
    setIsOpen(true)
    if (opts?.message) {
      setPendingMessage(opts.message)
      setPendingAutoSend(opts.autoSend ?? false)
    }
  }, [])

  const handleClose = useCallback(() => setIsOpen(false), [])

  const handlePendingMessageConsumed = useCallback(() => {
    setPendingMessage(null)
    setPendingAutoSend(false)
  }, [])

  const contextValue: CopilotContextValue = {
    open: handleOpen,
    close: handleClose,
    isOpen,
    config,
  }

  return (
    <CopilotContext.Provider value={contextValue}>
      {children}

      {/* Mount the dock — always in the DOM so state persists across navigation */}
      <UnifiedCopilotDock
        chatState={chatState}
        context={context}
        language={language}
        defaultExpanded={isOpen}
        // Intro quick-action chips (empty state). Falls back to suggestions.
        quickActions={quickActions}
        onClose={handleClose}
        // B1: dynamic personas from config (undefined = use hardcoded fallback)
        personas={dynamicPersonas}
        // B2: tools + skills from config for the in-dock panel
        allowedTools={config?.allowed_tools}
        allowedSkills={config?.allowed_skills}
        // B4: page-context already forwarded via chatState.onSend intelligenceContext
        // E: token-scoped branding + ui toggles from config
        branding={config?.branding}
        uiConfig={config?.ui}
        // A2UI: artifact action chip → send prompt as new user message
        onArtifactAction={handleArtifactAction}
        // Phase-3: structured interaction → dispatch with interaction payload
        onArtifactInteract={handleArtifactInteract}
        // Task 3: pre-loaded message from open({ message, autoSend })
        pendingMessage={pendingMessage}
        pendingAutoSend={pendingAutoSend}
        onPendingMessageConsumed={handlePendingMessageConsumed}
      />
    </CopilotContext.Provider>
  )
}

CopilotProvider.displayName = 'CopilotProvider'

// ── useCopilot ────────────────────────────────────────────────────────────────

/**
 * useCopilot — consume the copilot context.
 *
 * Returns `{ open, close, isOpen, config }`.
 * Must be used inside a <CopilotProvider>.
 *
 * @example
 * ```tsx
 * const { open } = useCopilot()
 * <button onClick={open}>Ask AI</button>
 * ```
 */
export const useCopilot = (): CopilotContextValue => {
  const ctx = useContext(CopilotContext)
  if (!ctx) {
    throw new Error('[useCopilot] Must be used inside <CopilotProvider> from @prism/ui')
  }
  return ctx
}

export { CopilotProvider }
export default CopilotProvider
