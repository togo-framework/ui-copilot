'use client'

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useT as _useT } from '@togo-framework/ui-core'
import { fallbackT } from './copilotStrings'

// Safely read the shared LanguageProvider context without throwing when outside it
function useSafeT(): ReturnType<typeof _useT> | null {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return _useT()
  } catch {
    return null
  }
}

import {
  Send, Sparkles, User, Loader2, X, ChevronUp,
  Clock, Plus, Maximize2, Users, AlertTriangle,
  ExternalLink, MoreVertical, Brain, Zap, Lightbulb,
  PanelLeft, PanelRight, PanelBottom, Check, Copy, Share2,
  Wrench, ChevronDown, AtSign, Terminal, Trash2,
  Move, GripVertical, Minimize2,
} from 'lucide-react'
import { Button } from '@togo-framework/ui-core'
import { Textarea } from '@togo-framework/ui-core'
import { ScrollArea } from '@togo-framework/ui-core'
import { Avatar, AvatarImage, AvatarFallback } from '@togo-framework/ui-core'
import { Popover, PopoverContent, PopoverTrigger } from '@togo-framework/ui-core'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@togo-framework/ui-core'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@togo-framework/ui-core'
import {
  Collapsible, CollapsibleTrigger, CollapsibleContent,
} from '@togo-framework/ui-core'
import {
  Command, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem,
} from '@togo-framework/ui-core'
import AgentSteps from './AgentSteps'
import StreamErrorBanner from './StreamErrorBanner'
import ChatToolbar from '../chat/ChatToolbar'
import CompareFactorsCard from '../chat/CompareFactorsCard'
import ChatStructuredData, { extractStructuredBlocks } from '../chat/ChatStructuredData'
import MarkdownContent from '../chat/MarkdownContent'
import { ArtifactRenderer } from './artifacts/ArtifactRenderer'
import type { A2UIActionItem, ArtifactInteraction } from './artifacts/types'
import type {
  CopilotChatState,
  CopilotDockContext,
  ChatAttachment,
  ForcedTools,
  CompareFactorsData,
  ComparisonFactor,
  SendOptions,
  DockPosition,
  ChatPersona,
  CopilotQuickAction,
} from './types'
import type { SlugChecker } from '../chat/ChatStructuredData'

// Operator (2026-06-16): the in-dock "Tools & Skills" panel is removed; tools
// and skills stay reachable via the inline "/" command menu. Typed as boolean
// (not literal false) so TS keeps normal narrowing inside the gated block.
const SHOW_TOOLS_PANEL: boolean = false

// ── Persona picker (inline, avoids another sub-component file) ────────────────

const PERSONAS: Array<{ id: ChatPersona; label: string; labelAr: string; icon: string }> = [
  { id: 'analyst',    label: 'Analyst',    labelAr: 'محلل',     icon: '🔬' },
  { id: 'strategist', label: 'Strategist', labelAr: 'استراتيجي', icon: '♟️' },
  { id: 'advisor',    label: 'Advisor',    labelAr: 'مستشار',   icon: '💼' },
]

const PersonaPicker = ({
  value,
  onChange,
  disabled,
  language = 'en',
  personas: personasProp,
}: {
  value: ChatPersona
  onChange: (p: ChatPersona) => void
  disabled?: boolean
  language?: 'en' | 'ar'
  /** B1: dynamic persona list from config; falls back to PERSONAS constant */
  personas?: Array<{ id: string; label: string; labelAr: string; icon?: string }>
}) => {
  const list = personasProp && personasProp.length > 0 ? personasProp : PERSONAS
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {list.map(p => (
        <button
          key={p.id}
          onClick={() => !disabled && onChange(p.id)}
          disabled={disabled}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all duration-fast ease-standard border ${
            value === p.id
              ? 'bg-primary/15 text-primary border-primary/30'
              : 'bg-transparent text-muted-foreground border-border hover:bg-muted hover:text-foreground'
          }`}
        >
          {p.icon && <span>{p.icon}</span>}
          {language === 'ar' ? p.labelAr : p.label}
        </button>
      ))}
    </div>
  )
}
PersonaPicker.displayName = 'PersonaPicker'

// ── Context badge map ─────────────────────────────────────────────────────────

const CONTEXT_BADGES: Record<string, { label: string; labelAr: string; color: string }> = {
  dashboard:     { label: 'Dashboard',     labelAr: 'لوحة التحكم',  color: 'bg-blue-500/20 text-blue-400' },
  narrative:     { label: 'Narrative',     labelAr: 'سردية',        color: 'bg-amber-500/20 text-amber-400' },
  entity:        { label: 'Entity',        labelAr: 'جهة',          color: 'bg-emerald-500/20 text-emerald-400' },
  alert:         { label: 'Alert',         labelAr: 'إشارة',        color: 'bg-red-500/20 text-red-400' },
  task:          { label: 'Task',          labelAr: 'مهمة',         color: 'bg-purple-500/20 text-purple-400' },
  task_detail:   { label: 'Task',          labelAr: 'مهمة',         color: 'bg-purple-500/20 text-purple-400' },
  tasks:         { label: 'Tasks',         labelAr: 'المهام',       color: 'bg-purple-500/20 text-purple-400' },
  digital_twin:  { label: 'Digital Twin',  labelAr: 'توأم رقمي',    color: 'bg-violet-500/20 text-violet-400' },
  breaking_news: { label: 'Breaking News', labelAr: 'خبر عاجل',    color: 'bg-orange-500/20 text-orange-400' },
}

// ── sanitizeAgentEmptyState ───────────────────────────────────────────────────

function sanitizeAgentEmptyState(content: string, emptyMessage: string): string {
  if (!content) return content
  let stripped = content.replace(/```json[\s\S]*?```/g, '').trim()
  const reduced = stripped
    .replace(/NO_DATA_AVAILABLE/gi, '')
    .replace(/\[\s*\]/g, '')
    .replace(/[\s.,;:!?-]+/g, ' ')
    .trim()
  if (reduced.length === 0) return emptyMessage
  return content
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface UnifiedCopilotDockProps {
  /**
   * The chat state seam. The product creates this from its useCopilotChat hook
   * (Sentra) or its own streaming hook (Cortex, Scout). This is the ONLY API
   * surface that touches actual streaming/network logic.
   */
  chatState: CopilotChatState

  /** Page-level context (type, title, suggestions) */
  context: CopilotDockContext

  /**
   * UI language — 'en' or 'ar'. The product reads this from its LanguageContext
   * and passes it here. No context import needed in this component.
   */
  language?: 'en' | 'ar'

  /**
   * Navigation callback. Called with an absolute path when the user clicks
   * an internal link (context badge, citation, entity chip, etc.).
   * The product wires this to router.push (Next.js) or window.location.href.
   */
  onNavigate?: (path: string) => void

  /**
   * Optional: batch slug-check for ChatStructuredData.
   * When omitted, all slugs are assumed valid.
   */
  onCheckSlugs?: SlugChecker

  /**
   * Optional: navigate to the full-page chat view.
   * Called when the user clicks the Maximize button.
   */
  onExpandToFullPage?: () => void

  /** Pre-fill the input with this text */
  pendingMessage?: string | null
  /** If true, auto-send pendingMessage instead of just filling the input */
  pendingAutoSend?: boolean
  /** Called once the pending message has been consumed */
  onPendingMessageConsumed?: () => void

  /** Quick-action chips shown after the first insight response */
  followUpChips?: string[]

  /**
   * Quick-action chips shown in the empty/intro state (before any messages).
   * Each chip sends its `prompt` when clicked. When omitted, the dock falls
   * back to rendering `context.suggestions` as chips (back-compat).
   */
  quickActions?: CopilotQuickAction[]

  /** Start the dock in expanded state */
  defaultExpanded?: boolean

  /** Assistant greeting shown above suggestion chips when chat is empty */
  seedGreeting?: string

  /** Called when user closes/collapses the dock */
  onClose?: () => void

  /**
   * Optional: persona list override.
   * Defaults to analyst/strategist/advisor. Pass empty array to hide the picker.
   */
  personas?: Array<{ id: string; label: string; labelAr: string; icon?: string }>

  /**
   * Token-scoped allowed tools (from /v1/copilot/config). Drives the Tools panel
   * + the `/` command menu. Undefined = no token restriction (panel hidden or
   * uses defaults). Each item: { slug, name, function_name? }.
   */
  allowedTools?: Array<{ slug: string; name: string; function_name?: string }>

  /**
   * Token-scoped allowed skills (from /v1/copilot/config). Drives the Skills
   * panel + the `/` command menu's activate-skill entries. Undefined = none.
   */
  allowedSkills?: Array<{ slug: string; name: string }>

  /**
   * B4: Optional markdown description of the current page. The dock stores
   * this and CopilotProvider injects it as intelligenceContext.data_summary.
   * For direct-mount consumers using their own chatState, wire page context
   * through their own send path. This prop is accepted but not auto-forwarded
   * from the dock itself (provider handles it).
   */
  pageContext?: string

  /**
   * E: token-scoped branding (from /v1/copilot/config.branding). Optional —
   * an omitted/empty object keeps the dock defaults. Backwards-compatible.
   */
  branding?: {
    title?: string
    titleAr?: string
    primaryColor?: string
    placeholder?: string
    placeholderAr?: string
  }

  /**
   * E: token-scoped UI toggles (from /v1/copilot/config.ui). Each defaults to
   * shown when undefined, so an unconfigured token keeps the full surface.
   */
  uiConfig?: {
    showTools?: boolean
    showSkills?: boolean
    showAgents?: boolean
  }

  /**
   * A2UI: callback fired when the user clicks an action chip in an ArtifactActions
   * artifact. The item.prompt (when set) should be sent as a new user message.
   * CopilotProvider wires this automatically — direct mount consumers may pass
   * their own handler here.
   *
   * When omitted the dock provides a default that calls chatState.onSend(item.prompt).
   */
  onArtifactAction?: (item: A2UIActionItem) => void

  /**
   * Phase-3 structured interaction channel. Fired when the user interacts with
   * a client_candidates, client_field_picker, client_diff_confirm, or
   * persona_starters artifact. The interaction carries a kind discriminator and
   * a structured payload — no free-text echo.
   *
   * CopilotProvider wires this to handleArtifactInteract (attaches the
   * interaction to the dispatch request, suppresses the user bubble).
   * Direct mount consumers may provide their own handler.
   *
   * When omitted the dock falls back to sending a synthesised hidden message
   * via chatState.onSend with { hideUserMessage: true, interaction }.
   */
  onArtifactInteract?: (interaction: ArtifactInteraction) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * UnifiedCopilotDock
 *
 * Floating AI copilot dock (collapsed bar / expanded panel). Supports three
 * dock positions (bottom, left, right), streaming agent steps, structured data
 * blocks, compare-factors cards, attachment uploads, thinking-mode toggle, and
 * conversation history.
 *
 * ALL app-specific dependencies removed:
 *  - useCopilotChat  → chatState prop (CopilotChatState seam)
 *  - useAuth         → removed (no user avatar needed in shared lib)
 *  - useLanguage     → language prop
 *  - useRouter       → onNavigate / onExpandToFullPage props
 *  - bridge          → onCheckSlugs prop (ChatStructuredData seam)
 *  - Mode type       → plain string in CopilotDockContext
 *  - AuthImage       → plain <img> or omitted
 */
const UnifiedCopilotDock = ({
  chatState,
  context,
  language: languageProp = 'en',
  onNavigate,
  onCheckSlugs,
  onExpandToFullPage,
  pendingMessage,
  pendingAutoSend,
  onPendingMessageConsumed,
  followUpChips,
  quickActions,
  defaultExpanded,
  seedGreeting,
  onClose,
  personas,
  allowedTools,
  allowedSkills,
  branding,
  uiConfig,
  pageContext: _pageContext,
  onArtifactAction,
  onArtifactInteract,
}: UnifiedCopilotDockProps) => {
  // Context wins over prop — ensures AR/EN follows the shared LanguageProvider
  const langCtx = useSafeT()
  const language: 'en' | 'ar' = langCtx ? langCtx.language : languageProp
  // Without a LanguageProvider, fall back to the bundled English copilot
  // dictionary (copilotStrings) instead of echoing raw "copilot:*" keys.
  const t = langCtx ? langCtx.t : fallbackT
  const isRTL = language === 'ar'

  // ── A2UI: default artifact action handler ─────────────────────────────────
  // When onArtifactAction is not provided, action-chip clicks send the item's
  // prompt as a new user message via the standard send path.
  const handleArtifactAction = useCallback(
    (item: A2UIActionItem) => {
      if (onArtifactAction) {
        onArtifactAction(item)
        return
      }
      if (item.prompt) {
        chatState.onSend(item.prompt)
      }
    },
    [onArtifactAction, chatState],
  )

  // ── Phase-3: default structured interaction handler ────────────────────────
  // When onArtifactInteract is not provided (direct-mount consumers without
  // CopilotProvider), fall back to sending a synthesised hidden message that
  // carries the interaction in SendOptions so the bridge can route it.
  const handleArtifactInteract = useCallback(
    (interaction: ArtifactInteraction) => {
      if (onArtifactInteract) {
        onArtifactInteract(interaction)
        return
      }
      // Synthesise a minimal text so the turn is not empty.
      // hideUserMessage suppresses the bubble; interaction is forwarded in opts.
      const text = `[interaction:${interaction.kind}]`
      chatState.onSend(text, { hideUserMessage: true, interaction })
    },
    [onArtifactInteract, chatState],
  )
  const [isExpanded, setIsExpanded] = useState(defaultExpanded ?? false)
  const [forcedTools, setForcedTools] = useState<ForcedTools>({})
  const [attachments, setAttachments] = useState<ChatAttachment[]>([])
  const [thinkingMode, setThinkingMode] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [persona, setPersona] = useState<ChatPersona>('analyst')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyItems, setHistoryItems] = useState<Array<{ id: string; title: string; updated_at: string; context_label?: string }>>([])
  const [insightTriggered, setInsightTriggered] = useState(false)
  const [snapshottedChips, setSnapshottedChips] = useState<string[] | undefined>()

  // ── C3/C2b: slash + at-mention menu state ────────────────────────────────
  const [slashMenuOpen, setSlashMenuOpen] = useState(false)
  const [atMenuOpen, setAtMenuOpen] = useState(false)
  const [slashQuery, setSlashQuery] = useState('')
  const [atQuery, setAtQuery] = useState('')
  // Wrapper refs so textarea Arrow/Enter keys can be forwarded into the open
  // cmdk menu (the textarea keeps focus, so cmdk's own nav never fires otherwise).
  const slashMenuRef = useRef<HTMLDivElement>(null)
  const atMenuRef = useRef<HTMLDivElement>(null)

  // ── C2: Tools & Skills panel collapsed state ──────────────────────────────
  const [toolsPanelOpen, setToolsPanelOpen] = useState(false)

  // ── C4: post-streaming refocus ────────────────────────────────────────────
  const prevIsStreamingRef = useRef(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const pendingAutoSendRef = useRef<string | null>(null)
  const dragCounterRef = useRef(0)
  const toolbarUploadRef = useRef<((files: File[]) => Promise<void>) | null>(null)

  // Dock position
  const getInitialDockPosition = (): DockPosition => {
    try {
      const saved = localStorage.getItem('sentra-copilot-dock-position')
      if (saved === 'left' || saved === 'right' || saved === 'bottom' || saved === 'float') return saved
    } catch { /* ignore */ }
    return 'bottom'
  }
  const [dockPosition, setDockPosition] = useState<DockPosition>(getInitialDockPosition)

  const handleDockPositionChange = (pos: DockPosition) => {
    setDockPosition(pos)
    try { localStorage.setItem('sentra-copilot-dock-position', pos) } catch { /* ignore */ }
  }

  // ── Float mode: free-floating, draggable + resizable window ────────────────
  // Persisted geometry (top-left x/y + width/height in CSS px). Clamped to the
  // viewport on read so a saved rect from a larger screen still lands on-screen.
  const FLOAT_MIN_W = 320
  const FLOAT_MIN_H = 360
  type FloatRect = { x: number; y: number; w: number; h: number }
  const defaultFloatRect = useCallback((): FloatRect => {
    const w = 420
    const h = 560
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800
    // RTL → open near the left edge; LTR → near the right edge.
    const x = isRTL ? 24 : Math.max(24, vw - w - 24)
    const y = Math.max(24, vh - h - 24)
    return { x, y, w, h }
  }, [isRTL])
  const clampFloatRect = useCallback((r: FloatRect): FloatRect => {
    if (typeof window === 'undefined') return r
    const vw = window.innerWidth
    const vh = window.innerHeight
    const w = Math.min(Math.max(r.w, FLOAT_MIN_W), vw - 16)
    const h = Math.min(Math.max(r.h, FLOAT_MIN_H), vh - 16)
    const x = Math.min(Math.max(r.x, 8), Math.max(8, vw - w - 8))
    const y = Math.min(Math.max(r.y, 8), Math.max(8, vh - h - 8))
    return { x, y, w, h }
  }, [])
  const [floatRect, setFloatRect] = useState<FloatRect>(() => {
    try {
      const saved = localStorage.getItem('sentra-copilot-float-rect')
      if (saved) return clampFloatRect(JSON.parse(saved) as FloatRect)
    } catch { /* ignore */ }
    return defaultFloatRect()
  })
  const persistFloatRect = useCallback((r: FloatRect) => {
    try { localStorage.setItem('sentra-copilot-float-rect', JSON.stringify(r)) } catch { /* ignore */ }
  }, [])
  // Live pointer-drag/resize gesture state (refs avoid re-render per move).
  const floatGestureRef = useRef<
    | null
    | { mode: 'move' | 'resize'; startX: number; startY: number; orig: FloatRect }
  >(null)

  const effectiveDockPosition = useMemo<DockPosition>(() => {
    // On phones a free-floating window is unusable → force bottom sheet.
    if (typeof window !== 'undefined' && window.innerWidth < 640) return 'bottom'
    return dockPosition
  }, [dockPosition])

  const isFloat = effectiveDockPosition === 'float'

  // Pointer-based move (drag by header) + resize (corner handle). Works with
  // mouse + touch + pen via Pointer Events; RTL flips the resize handle side.
  const onFloatPointerMove = useCallback((e: PointerEvent) => {
    const g = floatGestureRef.current
    if (!g) return
    const dx = e.clientX - g.startX
    const dy = e.clientY - g.startY
    if (g.mode === 'move') {
      setFloatRect(clampFloatRect({ ...g.orig, x: g.orig.x + dx, y: g.orig.y + dy }))
    } else {
      // Resize from the inner-bottom corner. In RTL the handle sits bottom-left,
      // so width grows as the pointer moves left (negative dx).
      const w = g.orig.w + (isRTL ? -dx : dx)
      const x = isRTL ? g.orig.x + dx : g.orig.x
      setFloatRect(clampFloatRect({ x, y: g.orig.y, w, h: g.orig.h + dy }))
    }
  }, [clampFloatRect, isRTL])

  const endFloatGesture = useCallback(() => {
    if (!floatGestureRef.current) return
    floatGestureRef.current = null
    window.removeEventListener('pointermove', onFloatPointerMove)
    window.removeEventListener('pointerup', endFloatGesture)
    setFloatRect(r => { persistFloatRect(r); return r })
  }, [onFloatPointerMove, persistFloatRect])

  const startFloatGesture = useCallback(
    (mode: 'move' | 'resize') => (e: React.PointerEvent) => {
      if (!isFloat) return
      e.preventDefault()
      floatGestureRef.current = { mode, startX: e.clientX, startY: e.clientY, orig: floatRect }
      window.addEventListener('pointermove', onFloatPointerMove)
      window.addEventListener('pointerup', endFloatGesture)
    },
    [isFloat, floatRect, onFloatPointerMove, endFloatGesture],
  )

  // Cleanup any in-flight gesture on unmount.
  useEffect(() => () => {
    window.removeEventListener('pointermove', onFloatPointerMove)
    window.removeEventListener('pointerup', endFloatGesture)
  }, [onFloatPointerMove, endFloatGesture])

  // Re-clamp the float rect when the viewport shrinks so it never drifts off-screen.
  useEffect(() => {
    if (!isFloat) return
    const onResize = () => setFloatRect(r => clampFloatRect(r))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [isFloat, clampFloatRect])

  const dockClasses = useMemo(() => {
    if (!isExpanded) return 'fixed bottom-0 left-0 right-0 z-50 h-14 transition-all duration-300'
    switch (effectiveDockPosition) {
      case 'float':
        // Geometry comes from inline style (floatStyle); no transition so drag
        // tracks the pointer 1:1.
        return 'fixed z-50'
      case 'left':
        return 'fixed top-[3.5rem] left-0 bottom-0 w-full sm:w-[420px] z-50 transition-all duration-300'
      case 'right':
        return 'fixed top-[3.5rem] right-0 bottom-0 w-full sm:w-[420px] z-50 transition-all duration-300'
      case 'bottom':
      default:
        return 'fixed bottom-0 left-0 right-0 z-50 h-[calc(100vh-3.5rem)] sm:h-[60vh] transition-all duration-300'
    }
  }, [isExpanded, effectiveDockPosition])

  const floatStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (!isFloat || !isExpanded) return undefined
    return { left: floatRect.x, top: floatRect.y, width: floatRect.w, height: floatRect.h }
  }, [isFloat, isExpanded, floatRect])

  const expandedBorderClass = useMemo(() => {
    switch (effectiveDockPosition) {
      case 'left':  return 'border-e'
      case 'right': return 'border-s'
      case 'float': return 'border rounded-2xl overflow-hidden'
      default:      return 'border-t'
    }
  }, [effectiveDockPosition])

  const expandedShadowClass = useMemo(() => {
    switch (effectiveDockPosition) {
      case 'left':  return 'shadow-[4px_0_15px_rgba(0,0,0,0.12)]'
      case 'right': return 'shadow-[-4px_0_15px_rgba(0,0,0,0.12)]'
      case 'float': return 'shadow-2xl'
      default:      return 'shadow-2xl'
    }
  }, [effectiveDockPosition])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatState.messages, chatState.agentSteps])

  // Pending message handling
  useEffect(() => {
    if (pendingMessage) {
      if (pendingAutoSend) {
        pendingAutoSendRef.current = pendingMessage
        setInsightTriggered(true)
        setSnapshottedChips(followUpChips)
        chatState.onNewConversation()
        setIsExpanded(true)
        onPendingMessageConsumed?.()
      } else {
        chatState.onInputChange(pendingMessage)
        setIsExpanded(true)
        onPendingMessageConsumed?.()
        setTimeout(() => inputRef.current?.focus(), 300)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingMessage, onPendingMessageConsumed])

  // Fire queued auto-send after conversation reset
  useEffect(() => {
    if (chatState.messages.length === 0) {
      if (pendingAutoSendRef.current && !chatState.isLoading) {
        const msg = pendingAutoSendRef.current
        pendingAutoSendRef.current = null
        chatState.onSend(msg, { thinkingMode, insight: true, hideUserMessage: true })
      } else if (!pendingAutoSendRef.current) {
        setInsightTriggered(false)
        setSnapshottedChips(undefined)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatState.messages, chatState.isLoading])

  // History
  useEffect(() => {
    if (historyOpen && chatState.onFetchHistory) {
      chatState.onFetchHistory().then(setHistoryItems)
    } else if (historyOpen && chatState.conversationHistory) {
      setHistoryItems(chatState.conversationHistory)
    }
  }, [historyOpen, chatState])

  // Sync controlled open: the provider flips defaultExpanded (from isOpen) when
  // the launcher / a smart-action calls open(). Expand the dock to match so a
  // bare open() (no pending message) reliably opens the panel.
  useEffect(() => {
    if (defaultExpanded) setIsExpanded(true)
  }, [defaultExpanded])

  // Escape to collapse
  useEffect(() => {
    if (!isExpanded) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsExpanded(false); onClose?.() }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isExpanded, onClose])

  // C4: refocus input after SSE stream ends (isStreaming true → false)
  // Don't steal focus if a command/mention menu is currently open.
  useEffect(() => {
    const wasStreaming = prevIsStreamingRef.current
    prevIsStreamingRef.current = chatState.isStreaming
    if (wasStreaming && !chatState.isStreaming && isExpanded && !slashMenuOpen && !atMenuOpen) {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [chatState.isStreaming, isExpanded, slashMenuOpen, atMenuOpen])

  // Derived context / mode
  const isTwin = chatState.effectiveMode === 'digital_twin'
  const twinImg = context.entityImageUrl
  const twinInitials = (context.title || '??').slice(0, 2).toUpperCase()

  // E: token-scoped branding + ui toggles. Each toggle defaults to shown.
  const brandPlaceholder = isRTL ? branding?.placeholderAr : branding?.placeholder
  const brandTitle = isRTL ? (branding?.titleAr || branding?.title) : branding?.title
  const showTools = uiConfig?.showTools !== false
  const showSkills = uiConfig?.showSkills !== false
  const showAgents = uiConfig?.showAgents !== false
  // Effective allow-lists honour the ui toggles (hide a surface even if the
  // token is allowed the underlying capabilities).
  const effAllowedTools = showTools ? allowedTools : undefined
  const effAllowedSkills = showSkills ? allowedSkills : undefined

  const placeholder = brandPlaceholder
    ? brandPlaceholder
    : isTwin
      ? t('copilot:placeholderAsk').replace('{{name}}', context.title)
      : t('copilot:placeholder')

  const aiName = isTwin
    ? context.title
    : (brandTitle || t('copilot:aiName'))

  const twinBadge = isTwin ? t('copilot:digitalTwin') : null

  const dockContextType  = chatState.loadedContextType  || context.type
  const dockContextLabel = chatState.loadedContextLabel || context.title
  const dockContextBadge = isTwin
    ? CONTEXT_BADGES['digital_twin']
    : CONTEXT_BADGES[dockContextType] || null

  // ── Helpers ────────────────────────────────────────────────────────────────

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  const handleExpand = () => {
    setIsExpanded(true)
    setTimeout(() => inputRef.current?.focus(), 300)
  }

  const handleSend = useCallback(() => {
    if (!chatState.inputValue.trim()) return
    const hasTools = Object.values(forcedTools).some(Boolean)
    const atts = attachments.length > 0
      ? attachments.map(a => ({ url: a.url, data: a.data, name: a.name, type: a.type }))
      : undefined

    const opts: SendOptions = {
      thinkingMode,
      forcedTools: hasTools ? forcedTools : undefined,
      attachments: atts,
    }
    // Close any open menus before sending
    setSlashMenuOpen(false)
    setAtMenuOpen(false)
    chatState.onSend(chatState.inputValue, opts)
    setAttachments([])
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [chatState, forcedTools, attachments, thinkingMode])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // When a command menu is open, Escape closes it without collapsing the dock.
    if (e.key === 'Escape' && (slashMenuOpen || atMenuOpen)) {
      e.stopPropagation()
      setSlashMenuOpen(false)
      setAtMenuOpen(false)
      return
    }
    // When a command menu is open, forward navigation keys (Up/Down/Enter) into
    // the cmdk list so the user can move between items with the keyboard. The
    // textarea keeps focus, so we re-dispatch the keydown onto the cmdk input,
    // which bubbles to the cmdk root and drives selection/highlight.
    if ((slashMenuOpen || atMenuOpen) &&
        (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === 'Home' || e.key === 'End')) {
      if (e.key === 'Enter' && e.shiftKey) {
        // Shift+Enter is a newline — let it pass through to the textarea.
      } else {
        const wrap = (slashMenuOpen ? slashMenuRef.current : atMenuRef.current)
        const target = (wrap?.querySelector('[cmdk-input]') ?? wrap?.querySelector('[cmdk-root]')) as HTMLElement | null
        if (target) {
          e.preventDefault()
          e.stopPropagation()
          target.dispatchEvent(new KeyboardEvent('keydown', { key: e.key, bubbles: true, cancelable: true }))
          return
        }
      }
    }
    // Fallback: when a menu is open, Enter is handled by the cmdk list — don't send.
    if (e.key === 'Enter' && !e.shiftKey && (slashMenuOpen || atMenuOpen)) {
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (chatState.inputValue.trim()) handleSend()
    }
  }

  // C3/C2b: handle input value changes and open/close menus on / and @
  const handleInputChange = useCallback((value: string) => {
    chatState.onInputChange(value)

    // Slash menu only opens when there are tools or skills to show (degrade gracefully).
    // Honours the ui.showTools/showSkills toggles via eff* lists.
    const hasSlashItems = (effAllowedTools && effAllowedTools.length > 0) || (effAllowedSkills && effAllowedSkills.length > 0)
    if (hasSlashItems) {
      const slashMatch = value.match(/(?:^|\s)\/([^\s]*)$/)
      if (slashMatch) {
        setSlashQuery(slashMatch[1] ?? '')
        setSlashMenuOpen(true)
        setAtMenuOpen(false)
        return
      }
    }

    // At-mention menu only opens when agents are shown AND there are personas
    // (undefined personas = use hardcoded fallback, still shown).
    const hasAtItems = showAgents && ((personas !== undefined && personas.length > 0) || personas === undefined)
    if (hasAtItems) {
      const atMatch = value.match(/(?:^|\s)@([^\s]*)$/)
      if (atMatch) {
        setAtQuery(atMatch[1] ?? '')
        setAtMenuOpen(true)
        setSlashMenuOpen(false)
        return
      }
    }

    // No active trigger — close menus
    if (slashMenuOpen) setSlashMenuOpen(false)
    if (atMenuOpen) setAtMenuOpen(false)
  }, [chatState, effAllowedTools, effAllowedSkills, personas, showAgents, slashMenuOpen, atMenuOpen])

  // C3: insert a slash-command into the input (replaces the trailing /... token)
  const handleSlashSelect = useCallback((command: string) => {
    const value = chatState.inputValue
    // Replace the trailing slash-token with the selected command
    const updated = value.replace(/(?:^|\s)\/[^\s]*$/, (match) => {
      const prefix = match.startsWith(' ') ? ' ' : ''
      return `${prefix}/${command} `
    })
    chatState.onInputChange(updated)
    setSlashMenuOpen(false)
    setSlashQuery('')
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [chatState])

  // C2b: insert an @mention into the input (replaces the trailing @... token)
  const handleAtSelect = useCallback((name: string) => {
    const value = chatState.inputValue
    const updated = value.replace(/(?:^|\s)@[^\s]*$/, (match) => {
      const prefix = match.startsWith(' ') ? ' ' : ''
      return `${prefix}@${name} `
    })
    chatState.onInputChange(updated)
    setAtMenuOpen(false)
    setAtQuery('')
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [chatState])

  // C1: Read dropped files into base64 data URI attachments for the chat send path
  const handleDroppedFiles = useCallback(async (files: File[]) => {
    const newAttachments: ChatAttachment[] = await Promise.all(
      files.map(
        file =>
          new Promise<ChatAttachment>((resolve) => {
            const reader = new FileReader()
            reader.onload = (ev) => {
              resolve({ data: ev.target?.result as string, name: file.name, type: file.type, size: file.size })
            }
            reader.onerror = () => {
              resolve({ name: file.name, type: file.type, size: file.size })
            }
            reader.readAsDataURL(file)
          }),
      ),
    )
    setAttachments(prev => [...prev, ...newAttachments])
  }, [])

  const handleLoadConversation = (id: string) => {
    chatState.onLoadConversation?.(id)
    setHistoryOpen(false)
    setInsightTriggered(false)
    setSnapshottedChips(undefined)
  }

  // Delete a past conversation (session + memory). Optimistically drops it from
  // the list, then awaits the server; on the active conversation, also resets to
  // a fresh chat so the dock doesn't keep showing deleted context.
  const handleDeleteConversation = async (id: string) => {
    if (!chatState.onDeleteConversation) return
    setHistoryItems(prev => prev.filter(c => c.id !== id))
    if (id === chatState.conversationId) {
      chatState.onNewConversation()
    }
    try {
      await chatState.onDeleteConversation(id)
    } catch {
      // On failure, re-fetch so the list reflects server truth.
      if (chatState.onFetchHistory) chatState.onFetchHistory().then(setHistoryItems)
    }
  }

  // ── TwinAvatar sub-component ───────────────────────────────────────────────

  const TwinAvatar = ({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) => {
    const sizeClasses = size === 'lg' ? 'w-12 h-12' : size === 'md' ? 'w-8 h-8' : 'w-6 h-6'
    const textSize = size === 'lg' ? 'text-sm' : size === 'md' ? 'text-[10px]' : 'text-[8px]'
    const iconSize = size === 'lg' ? 'w-6 h-6' : size === 'md' ? 'w-4 h-4' : 'w-3 h-3'
    const borderRadius = size === 'lg' ? 'rounded-xl' : size === 'md' ? 'rounded-lg' : 'rounded-md'

    if (isTwin && twinImg) {
      return (
        <Avatar className={`${sizeClasses} shrink-0`}>
          <AvatarImage src={twinImg} alt={context.title} />
          <AvatarFallback className={`bg-gradient-to-br from-violet-500 to-indigo-600 text-white ${textSize} font-bold`}>{twinInitials}</AvatarFallback>
        </Avatar>
      )
    }
    if (isTwin) {
      return (
        <div className={`${sizeClasses} ${borderRadius} flex items-center justify-center shrink-0 bg-gradient-to-br from-violet-500 to-indigo-600`}>
          <Users className={`${iconSize} text-white`} />
        </div>
      )
    }
    return (
      <div className={`${sizeClasses} ${borderRadius} flex items-center justify-center shrink-0 bg-gradient-to-br from-primary to-primary/70`}>
        <Sparkles className={`${iconSize} text-primary-foreground`} />
      </div>
    )
  }

  // ── Empty state message ────────────────────────────────────────────────────

  const emptyMessage = t('copilot:noDataAvailable')

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="h-16 w-full shrink-0" aria-hidden="true" />
      <div
        className={dockClasses}
        dir={isRTL ? 'rtl' : 'ltr'}
        // E: token-scoped accent — override the --primary CSS var so bg-primary/
        // text-primary children pick it up. No-op when branding.primaryColor unset.
        // In float mode, floatStyle supplies the free-floating geometry.
        style={{
          ...(branding?.primaryColor ? ({ ['--primary']: branding.primaryColor } as React.CSSProperties) : {}),
          ...(floatStyle ?? {}),
        }}
      >

        {/* ── Collapsed bar ──────────────────────────────────────────────── */}
        {!isExpanded && (
          <div
            className="h-full bg-card/95 backdrop-blur-lg border-t border-border shadow-lg flex items-center gap-3 px-4 cursor-pointer hover:bg-accent/30 transition-colors duration-fast ease-standard"
            onClick={handleExpand}
          >
            <TwinAvatar size="md" />
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={chatState.inputValue}
                onChange={(e) => { e.stopPropagation(); chatState.onInputChange(e.target.value) }}
                onClick={(e) => { e.stopPropagation(); handleExpand() }}
                onKeyDown={(e) => {
                  // Enter from the collapsed bar EXPANDS the dock AND SENDS the
                  // typed message — previously it only expanded, so a question
                  // typed here vanished and the copilot appeared to "do nothing".
                  if (e.key === 'Enter' && chatState.inputValue.trim()) {
                    e.preventDefault()
                    e.stopPropagation()
                    handleExpand()
                    handleSend()
                  }
                }}
                placeholder={placeholder}
                className="w-full bg-transparent text-base md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
            <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>
        )}

        {/* ── Expanded panel ─────────────────────────────────────────────── */}
        {isExpanded && (
          <div className={`relative h-full bg-card/95 backdrop-blur-lg ${expandedBorderClass} border-border ${expandedShadowClass} flex flex-col`}>

            {/* Float-mode resize handle (inner-bottom corner; RTL → bottom-left) */}
            {isFloat && (
              <div
                role="separator"
                aria-label={t('copilot:resize')}
                onPointerDown={startFloatGesture('resize')}
                className={`absolute bottom-0 ${isRTL ? 'left-0' : 'right-0'} z-10 h-5 w-5 ${isRTL ? 'cursor-sw-resize' : 'cursor-se-resize'} touch-none flex items-end justify-end p-0.5 text-muted-foreground/50 hover:text-muted-foreground`}
                style={isRTL ? { transform: 'scaleX(-1)' } : undefined}
              >
                <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" fill="currentColor" aria-hidden="true">
                  <path d="M9 1 1 9M9 5 5 9M9 9 9 9" stroke="currentColor" strokeWidth="1.2" fill="none" />
                </svg>
              </div>
            )}

            {/* Header — doubles as the float-mode drag handle */}
            <div
              className={`px-4 py-2.5 border-b border-border flex items-center justify-between shrink-0 bg-background/50 ${isFloat ? 'cursor-move select-none' : ''}`}
              onPointerDown={isFloat ? startFloatGesture('move') : undefined}
            >
              <div className="flex items-center gap-2.5">
                {isFloat && (
                  <GripVertical className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" aria-hidden="true" />
                )}
                <TwinAvatar size="md" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      {chatState.conversationTitle || aiName}
                    </h3>
                    {twinBadge && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400 font-medium">
                        {twinBadge}
                      </span>
                    )}
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0 inline-flex items-center gap-0.5 ${thinkingMode ? 'bg-amber-500/20 text-amber-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                      {thinkingMode ? <Brain className="w-2.5 h-2.5" /> : <Zap className="w-2.5 h-2.5" />}
                      {thinkingMode ? t('copilot:thinking') : t('copilot:fast')}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">
                    {isTwin
                      ? t('copilot:aiPersonaSimulation')
                      : (dockContextLabel || context.title)}
                  </p>
                  {dockContextBadge && (
                    <button
                      onClick={dockContextBadge && onNavigate ? () => {
                        const ref = chatState.loadedContextRef || context.contextRef
                        const type = chatState.loadedContextType || context.type
                        onNavigate?.(`/${type}/${ref}`)
                      } : undefined}
                      className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full mt-0.5 transition-all duration-fast ease-standard border ${dockContextBadge.color} ${onNavigate ? 'hover:brightness-125 cursor-pointer border-current/20' : 'opacity-60 cursor-default border-transparent'}`}
                    >
                      {onNavigate && <ExternalLink className="w-2.5 h-2.5 shrink-0" />}
                      <span className="truncate max-w-[150px] font-medium">
                        {language === 'ar' ? dockContextBadge.labelAr : dockContextBadge.label}
                        {dockContextLabel ? ` · ${dockContextLabel}` : ''}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Header actions — never start a float drag from a control. */}
              <div className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
                <DropdownMenu dir={isRTL ? 'rtl' : 'ltr'}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={language === 'ar' ? 'موضع النافذة' : 'Dock position'}
                    >
                      <MoreVertical className="w-3.5 h-3.5" aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel className="text-[10px] text-muted-foreground font-normal" dir={isRTL ? 'rtl' : 'ltr'}>
                      {t('copilot:dockPosition')}
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => handleDockPositionChange('left')}
                      dir={isRTL ? 'rtl' : 'ltr'}
                      className={dockPosition === 'left' ? 'text-primary' : ''}
                    >
                      <PanelLeft className={`w-3.5 h-3.5 me-2`} />
                      {t('copilot:dockLeft')}
                      {dockPosition === 'left' && <Check className={`w-3 h-3 ms-auto text-primary`} />}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDockPositionChange('right')}
                      dir={isRTL ? 'rtl' : 'ltr'}
                      className={dockPosition === 'right' ? 'text-primary' : ''}
                    >
                      <PanelRight className={`w-3.5 h-3.5 me-2`} />
                      {t('copilot:dockRight')}
                      {dockPosition === 'right' && <Check className={`w-3 h-3 ms-auto text-primary`} />}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDockPositionChange('bottom')}
                      dir={isRTL ? 'rtl' : 'ltr'}
                      className={dockPosition === 'bottom' ? 'text-primary' : ''}
                    >
                      <PanelBottom className={`w-3.5 h-3.5 me-2`} />
                      {t('copilot:dockBottom')}
                      {dockPosition === 'bottom' && <Check className={`w-3 h-3 ms-auto text-primary`} />}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDockPositionChange('float')}
                      dir={isRTL ? 'rtl' : 'ltr'}
                      className={dockPosition === 'float' ? 'text-primary' : ''}
                    >
                      <Move className={`w-3.5 h-3.5 me-2`} />
                      {t('copilot:dockFloat')}
                      {dockPosition === 'float' && <Check className={`w-3 h-3 ms-auto text-primary`} />}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Quick undock / re-dock toggle (float ⇄ bottom) */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleDockPositionChange(isFloat ? 'bottom' : 'float')}
                  title={isFloat ? t('copilot:redock') : t('copilot:undock')}
                  aria-label={isFloat ? t('copilot:redock') : t('copilot:undock')}
                >
                  {isFloat ? <Minimize2 className="w-3.5 h-3.5" /> : <Move className="w-3.5 h-3.5" />}
                </Button>

                {(chatState.onFetchHistory || chatState.conversationHistory) && (
                  <Popover open={historyOpen} onOpenChange={setHistoryOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title={t('copilot:history')}>
                        <Clock className="w-3.5 h-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-72 p-0" dir={isRTL ? 'rtl' : 'ltr'}>
                      <div className="p-3 border-b border-border">
                        <p className="text-xs font-medium text-foreground">
                          {t('copilot:conversationHistory')}
                        </p>
                      </div>
                      <ScrollArea className="max-h-64">
                        <div className="p-2 space-y-0.5">
                          {historyItems.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-4">
                              {t('copilot:noPreviousConversations')}
                            </p>
                          ) : historyItems.map(conv => (
                            <div
                              key={conv.id}
                              className={`group flex items-center gap-1 rounded-lg transition-colors duration-fast ease-standard hover:bg-muted ${conv.id === chatState.conversationId ? 'bg-primary/10' : ''}`}
                            >
                              <button
                                onClick={() => handleLoadConversation(conv.id)}
                                className={`flex-1 min-w-0 text-start px-2.5 py-2 text-xs`}
                              >
                                <p className="font-medium text-foreground line-clamp-1">
                                  {conv.title || conv.context_label || 'Untitled'}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {new Date(conv.updated_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                                </p>
                              </button>
                              {chatState.onDeleteConversation && (
                                <button
                                  onClick={() => handleDeleteConversation(conv.id)}
                                  className="shrink-0 me-1.5 p-1 rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all duration-fast ease-standard"
                                  title={t('copilot:deleteConversation')}
                                  aria-label={t('copilot:deleteConversation')}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => { chatState.onNewConversation(); setThinkingMode(false) }}
                  title={t('copilot:newChat')}
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>

                {onExpandToFullPage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={onExpandToFullPage}
                    title={t('copilot:fullView')}
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label={t('common:close')}
                  onClick={() => { setIsExpanded(false); onClose?.() }}
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </Button>
              </div>
            </div>

            {/* Message area */}
            <ScrollArea className="flex-1 px-4 py-3" dir={isRTL ? 'rtl' : 'ltr'}>
              <div className="space-y-3">
                {/* Digital twin disclaimer */}
                {isTwin && chatState.messages.length === 0 && (
                  <div className="mx-auto max-w-md mb-3 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-500/90">
                      {t('copilot:twinDisclaimer')}
                    </p>
                  </div>
                )}

                {/* Empty state */}
                {chatState.messages.length === 0 && !chatState.isLoading && (
                  <div className="text-center py-6">
                    <div className="mx-auto mb-3 flex justify-center"><TwinAvatar size="lg" /></div>
                    {seedGreeting ? (
                      <div className="max-w-md mx-auto mb-4 p-3 bg-muted rounded-xl border border-border text-start">
                        <p className="text-sm text-foreground" dir="auto">{seedGreeting}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mb-4">{placeholder}</p>
                    )}
                    {/* Quick actions (preferred) — explicit intro prompts.
                        Falls back to context.suggestions when none provided. */}
                    {quickActions && quickActions.length > 0 ? (
                      <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
                        {quickActions.map((qa, i) => (
                          <button
                            key={i}
                            onClick={() => chatState.onSend(qa.prompt, { thinkingMode })}
                            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary/10 hover:bg-primary/15 text-foreground rounded-full transition-colors duration-fast ease-standard border border-primary/20 hover:border-primary/40"
                          >
                            <Sparkles className="w-3 h-3 text-primary shrink-0" aria-hidden="true" />
                            {language === 'ar' ? qa.label_ar : qa.label_en}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
                        {context.suggestions.map((suggestion, i) => {
                          // Suggestions may be a plain string (back-compat) or a
                          // {en,ar} pair — render the active language.
                          const text =
                            typeof suggestion === 'string'
                              ? suggestion
                              : language === 'ar'
                                ? suggestion.ar
                                : suggestion.en
                          return (
                            <button
                              key={i}
                              onClick={() => chatState.onSend(text, { thinkingMode })}
                              className="text-xs px-3 py-1.5 bg-muted hover:bg-accent text-muted-foreground hover:text-foreground rounded-full transition-colors duration-fast ease-standard border border-border hover:border-primary/30"
                            >
                              {text}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Message list */}
                {chatState.messages.map((message, msgIdx) => {
                  const isLastAssistant = message.role === 'assistant' && msgIdx === chatState.messages.length - 1

                  const compareFactorsStep = message.steps?.find(
                    (s) => s.step === 'compare_factors' && (s as unknown as Record<string, unknown>)['factors'],
                  )
                  const compareFactorsData = compareFactorsStep ? {
                    factors: (compareFactorsStep as unknown as Record<string, unknown>)['factors'],
                    subjectA: (compareFactorsStep as unknown as Record<string, unknown>)['subjectA'],
                    subjectB: (compareFactorsStep as unknown as Record<string, unknown>)['subjectB'],
                    type: (compareFactorsStep as unknown as Record<string, unknown>)['type'],
                  } as CompareFactorsData : null

                  const handleAcceptFactors = (factors: ComparisonFactor[]) => {
                    if (!compareFactorsData) return
                    const payload = JSON.stringify({
                      factors,
                      type: compareFactorsData.type,
                      slugA: compareFactorsData.subjectA.slug,
                      slugB: compareFactorsData.subjectB.slug,
                    })
                    chatState.onSend(`[COMPARE_ACCEPT]${payload}`, { thinkingMode })
                  }

                  const strippedContent = message.role === 'assistant'
                    ? message.content.replace(/\[COMPARE_FACTORS_STATE\][\s\S]*?\[\/COMPARE_FACTORS_STATE\]/g, '').trim()
                    : message.content
                  const { markdown: cleanMarkdown, structured: structuredData } = message.role === 'assistant'
                    ? extractStructuredBlocks(strippedContent)
                    : { markdown: strippedContent, structured: null }

                  const renderedMarkdown = message.role === 'assistant'
                    ? sanitizeAgentEmptyState(cleanMarkdown, emptyMessage)
                    : cleanMarkdown

                  const displayContent = message.role === 'user' && message.content.startsWith('[COMPARE_ACCEPT]')
                    ? t('copilot:comparisonFactorsAccepted')
                    : renderedMarkdown

                  // Hidden insight-trigger bubbles
                  if (message.hidden && message.role === 'user') {
                    const insightText = message.content.match(/"([^"]+)"/)?.[1]
                      || t('copilot:insightFromDashboard')
                    return (
                      <div key={message.id} className="flex justify-center py-1">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 border border-primary/20 rounded-full text-[11px] text-primary/70 max-w-[90%]">
                          <Lightbulb className="w-3 h-3 shrink-0" />
                          <span className="truncate" dir="auto">{insightText}</span>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div key={message.id}>
                      {/* Agent steps for this message */}
                      {message.role === 'assistant' && message.steps && message.steps.length > 0 && (
                        <div className="flex gap-2 mb-1 justify-start">
                          <div className="mt-1 shrink-0"><TwinAvatar size="sm" /></div>
                          <div className="min-w-0 flex-1 max-w-[calc(85%-2rem)]">
                            <AgentSteps
                              steps={message.steps}
                              isStreaming={chatState.isStreaming && msgIdx === chatState.messages.length - 1}
                              language={language}
                              dir={isRTL ? 'rtl' : 'ltr'}
                            />
                          </div>
                        </div>
                      )}

                      {/* Message bubble
                          Alignment convention (correct for any direction):
                          - user    → justify-end  (logical trailing edge: right in LTR, left in RTL)
                          - assistant → justify-start (logical leading edge: left in LTR, right in RTL)
                          No flex-row-reverse — the container's dir attribute handles visual flip.

                          role × dir → visual position
                          ────────────────────────────
                          user    × LTR → RIGHT   (trailing)
                          user    × RTL → LEFT    (trailing)
                          assistant × LTR → LEFT  (leading)
                          assistant × RTL → RIGHT (leading)
                      */}
                      <div className={`flex gap-2 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}>
                        {/* Assistant avatar: leading side — first in DOM so it appears at
                            the leading edge (left in LTR, right in RTL) */}
                        {message.role === 'assistant' && <div className="mt-1 shrink-0"><TwinAvatar size="sm" /></div>}

                        <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground border border-border'
                        }`}>
                          {message.role === 'assistant' ? (
                            <div className="max-w-none break-words" dir={isRTL ? 'rtl' : 'ltr'}>
                              {/* Assistant output is markdown — render it (GFM, skipHtml,
                                  links in new tab). User messages stay plain text below. */}
                              <MarkdownContent content={displayContent} dir={isRTL ? 'rtl' : 'ltr'} />
                              {structuredData && (
                                <ChatStructuredData
                                  data={structuredData}
                                  language={language}
                                  dir={isRTL ? 'rtl' : 'ltr'}
                                  onNavigate={onNavigate}
                                  onCheckSlugs={onCheckSlugs}
                                />
                              )}
                              {message.briefing && (
                                <ChatStructuredData
                                  data={message.briefing as Parameters<typeof ChatStructuredData>[0]['data']}
                                  language={language}
                                  dir={isRTL ? 'rtl' : 'ltr'}
                                  onNavigate={onNavigate}
                                  onCheckSlugs={onCheckSlugs}
                                />
                              )}
                              {compareFactorsData && (
                                <CompareFactorsCard
                                  data={compareFactorsData}
                                  onAccept={handleAcceptFactors}
                                  disabled={!isLastAssistant || chatState.isLoading}
                                  language={language}
                                />
                              )}
                              {message.citations && message.citations.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-border/50 flex flex-wrap gap-1" dir={isRTL ? 'rtl' : 'ltr'}>
                                  {message.citations.map(c => (
                                    <button
                                      key={c.number}
                                      type="button"
                                      onClick={() => onNavigate?.(`/${c.type}/${c.slug}`)}
                                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-medium transition-colors duration-fast ease-standard border border-primary/20"
                                      title={c.description || c.title}
                                    >
                                      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-primary/20 text-primary text-[8px] font-bold">{c.number}</span>
                                      <span className="truncate max-w-[120px]">{c.title}</span>
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* A2UI: render structured artifacts below the text */}
                              {message.a2uiArtifacts && message.a2uiArtifacts.length > 0 && (
                                <div className="mt-2 space-y-2" dir={isRTL ? 'rtl' : 'ltr'}>
                                  {message.a2uiArtifacts.map((artifact, artIdx) => (
                                    <ArtifactRenderer
                                      key={artIdx}
                                      artifact={artifact}
                                      onAction={handleArtifactAction}
                                      onInteract={handleArtifactInteract}
                                      language={language}
                                      dir={isRTL ? 'rtl' : 'ltr'}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : displayContent}
                        </div>

                        {/* User avatar: trailing side — last in DOM so it appears at
                            the trailing edge (right in LTR, left in RTL) */}
                        {message.role === 'user' && (
                          <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center shrink-0 mt-1">
                            <User className="w-3 h-3 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Copy / Share actions — always offset from the leading edge
                          (start side of the message block) to stay under the assistant bubble */}
                      {message.role === 'assistant' && !message.id.startsWith('streaming-') && renderedMarkdown && (
                        <div className="flex items-center gap-1 mt-1 justify-start ps-8">
                          <button
                            type="button"
                            title={t('copilot:copyResponse')}
                            onClick={() => navigator.clipboard.writeText(renderedMarkdown).catch(() => {})}
                            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors duration-fast ease-standard"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{t('copilot:copyResponse')}</span>
                          </button>
                          {typeof navigator !== 'undefined' && 'share' in navigator && (
                            <button
                              type="button"
                              title={t('copilot:shareResponse')}
                              onClick={() => navigator.share({ title: 'Copilot Response', text: renderedMarkdown }).catch(() => {})}
                              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors duration-fast ease-standard"
                            >
                              <Share2 className="w-3 h-3" />
                              <span>{t('copilot:shareResponse')}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Stream error banner — always at leading edge (assistant side) */}
                {chatState.streamError && (
                  <div className="flex gap-2 justify-start">
                    <div className="mt-1 shrink-0"><TwinAvatar size="sm" /></div>
                    <div className="min-w-0 flex-1 max-w-[calc(85%-2rem)]">
                      <StreamErrorBanner
                        onRetry={chatState.onRetry}
                        isRetrying={chatState.isLoading}
                        language={language}
                      />
                    </div>
                  </div>
                )}

                {/* Follow-up chips after insight */}
                {snapshottedChips && snapshottedChips.length > 0 && insightTriggered && chatState.messages.length === 2 && !chatState.isLoading && chatState.messages[1]?.role === 'assistant' && (
                  <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto py-2">
                    {snapshottedChips.map((chip, i) => (
                      <button
                        key={i}
                        onClick={() => { chatState.onSend(chip, { thinkingMode }); setSnapshottedChips(undefined); setInsightTriggered(false) }}
                        className="text-xs px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-full transition-colors duration-fast ease-standard border border-primary/20"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}

                {/* Live agent steps (pre-response) — always at leading edge */}
                {(chatState.isLoading || chatState.isStreaming) && !chatState.isReceiving && chatState.agentSteps.length > 0 && (
                  <div className="flex gap-2 justify-start">
                    <div className="mt-1 shrink-0"><TwinAvatar size="sm" /></div>
                    <div className="min-w-0 flex-1 max-w-[calc(85%-2rem)]">
                      <AgentSteps steps={chatState.agentSteps} isStreaming={true} language={language} dir={isRTL ? 'rtl' : 'ltr'} />
                    </div>
                  </div>
                )}

                {/* Thinking indicator (no steps yet) — always at leading edge.
                    Stays visible through isFinalizing so the spinner doesn't
                    clear a frame before the committed response paints. */}
                {(chatState.isLoading || chatState.isStreaming || chatState.isFinalizing) && !chatState.isReceiving && chatState.agentSteps.length === 0 && (
                  <div className="flex gap-2 justify-start">
                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0">
                      <Loader2 className="w-3 h-3 text-primary-foreground animate-spin" />
                    </div>
                    <div className="bg-muted rounded-xl px-3 py-2 border border-border">
                      <span className="text-xs text-muted-foreground animate-pulse">
                        {t('copilot:thinkingIndicator')}
                      </span>
                    </div>
                  </div>
                )}

                <div dir={isRTL ? 'rtl' : 'ltr'} ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input area */}
            <div
              className="px-4 py-2.5 border-t border-border bg-background/50 shrink-0 space-y-2 relative"
              dir={isRTL ? 'rtl' : 'ltr'}
              onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); dragCounterRef.current++; setIsDragging(true) }}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
              onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); dragCounterRef.current--; if (dragCounterRef.current <= 0) { setIsDragging(false); dragCounterRef.current = 0 } }}
              onDrop={(e) => {
                e.preventDefault(); e.stopPropagation(); setIsDragging(false); dragCounterRef.current = 0
                const files = Array.from(e.dataTransfer.files)
                if (files.length > 0) {
                  // C1: Add to attachment chips (sent with next handleSend via attachments path)
                  void handleDroppedFiles(files)
                  // Also forward to the toolbar's remote-upload path when available
                  if (toolbarUploadRef.current) toolbarUploadRef.current(files)
                }
              }}
            >
              {isDragging && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-primary/5 border-2 border-dashed border-primary/40 rounded-lg backdrop-blur-sm">
                  <p className="text-xs font-medium text-primary">
                    {t('copilot:dropFiles')}
                  </p>
                </div>
              )}

              <ChatToolbar
                forcedTools={forcedTools}
                onForcedToolsChange={setForcedTools}
                attachments={attachments}
                onAttachmentsChange={setAttachments}
                thinkingMode={thinkingMode}
                onThinkingModeChange={(enabled) => {
                  setThinkingMode(enabled)
                  try { localStorage.setItem('sentra-thinking-mode', String(enabled)) } catch { /* ignore */ }
                }}
                disabled={chatState.isLoading}
                language={language}
                onUploadReady={(fn) => { toolbarUploadRef.current = fn }}
              />

              {!isTwin && (personas === undefined || (personas ?? PERSONAS).length > 0) && (
                <PersonaPicker
                  value={persona}
                  onChange={setPersona}
                  disabled={chatState.isLoading}
                  language={language}
                  personas={personas}
                />
              )}

              {/* Tools & Skills collapsible panel — REMOVED per operator (2026-06-16):
                  the "الأدوات والمهارات" panel is hidden; tools/skills remain
                  reachable via the inline "/" command menu in the input.
                  SHOW_TOOLS_PANEL is a const false so the block never renders. */}
              {SHOW_TOOLS_PANEL && (
                <Collapsible open={toolsPanelOpen} onOpenChange={setToolsPanelOpen}>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors duration-fast ease-standard"
                      aria-expanded={toolsPanelOpen}
                    >
                      <Wrench className="w-3 h-3 shrink-0" />
                      <span>{language === 'ar' ? 'الأدوات والمهارات' : 'Tools & Skills'}</span>
                      <ChevronDown className={`w-3 h-3 transition-transform duration-fast ease-standard ${toolsPanelOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-1.5 rounded-lg border border-border bg-muted/40 p-2 space-y-1">
                      {effAllowedTools && effAllowedTools.map(tool => (
                        <div
                          key={tool.slug}
                          className="flex items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-muted transition-colors duration-fast ease-standard"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Terminal className="w-3 h-3 shrink-0 text-blue-400" />
                            <span className="text-xs text-foreground truncate">{tool.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const cmd = `/${tool.function_name ?? tool.slug} `
                              chatState.onInputChange(chatState.inputValue + cmd)
                              setToolsPanelOpen(false)
                              requestAnimationFrame(() => inputRef.current?.focus())
                            }}
                            className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors duration-fast ease-standard"
                            title={language === 'ar' ? 'أدرج' : 'Insert'}
                          >
                            {language === 'ar' ? 'أدرج' : 'Insert'}
                          </button>
                        </div>
                      ))}
                      {effAllowedSkills && effAllowedSkills.map(skill => (
                        <div
                          key={skill.slug}
                          className="flex items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-muted transition-colors duration-fast ease-standard"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Zap className="w-3 h-3 shrink-0 text-amber-400" />
                            <span className="text-xs text-foreground truncate">{skill.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const cmd = `/skill ${skill.slug} `
                              chatState.onInputChange(chatState.inputValue + cmd)
                              setToolsPanelOpen(false)
                              requestAnimationFrame(() => inputRef.current?.focus())
                            }}
                            className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors duration-fast ease-standard"
                            title={language === 'ar' ? 'أدرج' : 'Insert'}
                          >
                            {language === 'ar' ? 'أدرج' : 'Insert'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* C1: Attachment chips — queued files shown before the textarea */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {attachments.map((att, i) => (
                    <div
                      key={`${att.name}-${i}`}
                      className="inline-flex items-center gap-1.5 px-2 py-1 bg-muted border border-border rounded-md text-[11px] text-foreground max-w-[160px]"
                    >
                      <span className="truncate font-medium">{att.name}</span>
                      <button
                        type="button"
                        onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors duration-fast ease-standard"
                        aria-label={language === 'ar' ? `إزالة ${att.name}` : `Remove ${att.name}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* C3 + C2b: slash command and @mention popovers anchored above the textarea */}
              <div className="relative">
                {/* C3: Slash command menu */}
                {slashMenuOpen && (
                  <div
                    ref={slashMenuRef}
                    className="absolute bottom-full mb-1 start-0 w-72 z-50 rounded-lg border border-border bg-popover shadow-md overflow-hidden"
                    dir={isRTL ? 'rtl' : 'ltr'}
                  >
                    <Command shouldFilter={false}>
                      <CommandInput
                        value={slashQuery}
                        onValueChange={setSlashQuery}
                        placeholder={language === 'ar' ? 'ابحث في الأوامر…' : 'Search commands…'}
                        className="h-8 text-xs"
                        autoFocus={false}
                      />
                      <CommandList className="max-h-52">
                        <CommandEmpty className="text-xs py-3">
                          {language === 'ar' ? 'لا توجد أوامر' : 'No commands found'}
                        </CommandEmpty>
                        {effAllowedTools && effAllowedTools.length > 0 && (
                          <CommandGroup heading={language === 'ar' ? 'أدوات' : 'Tools'}>
                            {effAllowedTools
                              .filter(t =>
                                !slashQuery ||
                                (t.function_name ?? t.slug).toLowerCase().includes(slashQuery.toLowerCase()) ||
                                t.name.toLowerCase().includes(slashQuery.toLowerCase())
                              )
                              .map(tool => (
                                <CommandItem
                                  key={tool.slug}
                                  value={tool.function_name ?? tool.slug}
                                  onSelect={() => handleSlashSelect(tool.function_name ?? tool.slug)}
                                  className="text-xs cursor-pointer"
                                >
                                  <Terminal className="w-3 h-3 me-2 shrink-0 text-blue-400" />
                                  <span className="font-mono text-primary me-1.5">/{tool.function_name ?? tool.slug}</span>
                                  <span className="text-muted-foreground truncate">{tool.name}</span>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        )}
                        {effAllowedSkills && effAllowedSkills.length > 0 && (
                          <CommandGroup heading={language === 'ar' ? 'مهارات' : 'Skills'}>
                            {effAllowedSkills
                              .filter(s =>
                                !slashQuery ||
                                s.slug.toLowerCase().includes(slashQuery.toLowerCase()) ||
                                s.name.toLowerCase().includes(slashQuery.toLowerCase())
                              )
                              .map(skill => (
                                <CommandItem
                                  key={skill.slug}
                                  value={`skill-${skill.slug}`}
                                  onSelect={() => handleSlashSelect(`skill ${skill.slug}`)}
                                  className="text-xs cursor-pointer"
                                >
                                  <Zap className="w-3 h-3 me-2 shrink-0 text-amber-400" />
                                  <span className="font-mono text-primary me-1.5">/skill {skill.slug}</span>
                                  <span className="text-muted-foreground truncate">{skill.name}</span>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </div>
                )}

                {/* C2b: @mention menu (gated by ui.showAgents) */}
                {atMenuOpen && showAgents && (
                  <div
                    ref={atMenuRef}
                    className="absolute bottom-full mb-1 start-0 w-64 z-50 rounded-lg border border-border bg-popover shadow-md overflow-hidden"
                    dir={isRTL ? 'rtl' : 'ltr'}
                  >
                    <Command shouldFilter={false}>
                      <CommandInput
                        value={atQuery}
                        onValueChange={setAtQuery}
                        placeholder={language === 'ar' ? 'ابحث في الوكلاء…' : 'Search agents…'}
                        className="h-8 text-xs"
                        autoFocus={false}
                      />
                      <CommandList className="max-h-48">
                        <CommandEmpty className="text-xs py-3">
                          {language === 'ar' ? 'لا يوجد وكلاء' : 'No agents found'}
                        </CommandEmpty>
                        <CommandGroup heading={language === 'ar' ? 'الوكلاء' : 'Agents'}>
                          {(personas ?? PERSONAS as Array<{ id: string; label: string; labelAr: string; icon?: string }>)
                            .filter(p =>
                              !atQuery ||
                              p.label.toLowerCase().includes(atQuery.toLowerCase()) ||
                              p.id.toLowerCase().includes(atQuery.toLowerCase())
                            )
                            .map(p => (
                              <CommandItem
                                key={p.id}
                                value={p.id}
                                onSelect={() => handleAtSelect(p.label)}
                                className="text-xs cursor-pointer"
                              >
                                {p.icon
                                  ? <span className="me-2 text-sm">{p.icon}</span>
                                  : <AtSign className="w-3 h-3 me-2 shrink-0 text-emerald-400" />
                                }
                                <span className="text-foreground">{p.label}</span>
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </div>
                )}

                <form
                  onSubmit={(e) => { e.preventDefault(); handleSend() }}
                  className="flex items-end gap-2"
                >
                  <Textarea
                    ref={inputRef}
                    value={chatState.inputValue}
                    onChange={(e) => { handleInputChange(e.target.value); autoResize(e.target) }}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={chatState.isLoading}
                    rows={1}
                    className="flex-1 min-h-[36px] max-h-[120px] resize-none text-sm py-2"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={chatState.isLoading || !chatState.inputValue.trim()}
                    className="h-9 w-9 shrink-0"
                    aria-label={language === 'ar' ? 'إرسال' : 'Send'}
                  >
                    <Send className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

UnifiedCopilotDock.displayName = 'UnifiedCopilotDock'

export default UnifiedCopilotDock