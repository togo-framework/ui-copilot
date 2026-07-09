'use client'

/**
 * CopilotSelectionTrigger — smart "Ask Copilot" on text selection.
 *
 * Mount this once inside a CopilotProvider. When the user selects text anywhere
 * on the page (or within an optional `boundarySelector` subtree), a small
 * floating "Ask Copilot" button appears near the end of the selection. Clicking
 * it opens the copilot dock pre-filled with the selected text (optionally
 * auto-sent).
 *
 * Opt-in: it renders nothing until there's a qualifying selection.
 * Accessible: Escape dismisses; the button is a real <button> with an aria-label.
 * RTL-aware: the bubble offsets toward the selection's leading edge.
 *
 *   <CopilotProvider client={client}>
 *     …app…
 *     <CopilotSelectionTrigger />
 *   </CopilotProvider>
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useCopilot } from './CopilotProvider'
import { useT as _useT } from '@togo-framework/ui-core'
import { fallbackT } from './copilotStrings'

function useSafeT(): ReturnType<typeof _useT> | null {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return _useT()
  } catch {
    return null
  }
}

export interface CopilotSelectionTriggerProps {
  /** Minimum selected character count before the trigger appears. Default 8. */
  minChars?: number
  /** Maximum characters forwarded as the prompt (selection is trimmed). Default 2000. */
  maxChars?: number
  /** Auto-send the prompt on click instead of pre-filling the input. Default false. */
  autoSend?: boolean
  /** Override the button label. Defaults to the i18n "copilot:askCopilot". */
  label?: string
  /**
   * Limit the trigger to selections inside this element subtree. Pass a CSS
   * selector (e.g. "[data-copilot-selectable]") or an element ref. When omitted,
   * the whole document is selectable.
   */
  boundarySelector?: string
  /**
   * Build the prompt from the selected text. Defaults to a short "Explain:"
   * framing in the active language. Return the raw selection to send it as-is.
   */
  getPrompt?: (selectedText: string, language: 'en' | 'ar') => string
}

interface Anchor { x: number; y: number; text: string }

const CopilotSelectionTrigger = ({
  minChars = 8,
  maxChars = 2000,
  autoSend = false,
  label,
  boundarySelector,
  getPrompt,
}: CopilotSelectionTriggerProps) => {
  const { open } = useCopilot()
  const ctx = useSafeT()
  const language: 'en' | 'ar' = ctx?.language ?? 'en'
  const t = ctx?.t ?? fallbackT
  const isRTL = language === 'ar'

  const [anchor, setAnchor] = useState<Anchor | null>(null)
  // Skip the selectionchange that our own button-click clears.
  const dismissedRef = useRef(false)

  const withinBoundary = useCallback(
    (node: Node | null): boolean => {
      if (!boundarySelector) return true
      let el: HTMLElement | null =
        node && node.nodeType === Node.ELEMENT_NODE
          ? (node as HTMLElement)
          : node?.parentElement ?? null
      return !!el?.closest(boundarySelector)
    },
    [boundarySelector],
  )

  const evaluateSelection = useCallback(() => {
    if (dismissedRef.current) { dismissedRef.current = false; return }
    const sel = typeof window !== 'undefined' ? window.getSelection() : null
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) { setAnchor(null); return }
    const raw = sel.toString().trim()
    if (raw.length < minChars) { setAnchor(null); return }
    const range = sel.getRangeAt(0)
    if (!withinBoundary(range.commonAncestorContainer)) { setAnchor(null); return }
    const rects = range.getClientRects()
    const rect = rects.length ? rects[rects.length - 1] : range.getBoundingClientRect()
    if (!rect || (rect.width === 0 && rect.height === 0)) { setAnchor(null); return }
    // Anchor at the selection's trailing-edge end (RTL → leading/left side).
    const x = isRTL ? rect.left : rect.right
    const y = rect.bottom
    setAnchor({ x, y, text: raw.slice(0, maxChars) })
  }, [minChars, maxChars, withinBoundary, isRTL])

  // selectionchange fires continuously while dragging — settle on pointer/key up.
  // setTimeout (not rAF) so it still fires in a hidden/throttled tab, and so the
  // selection has committed before we measure it.
  useEffect(() => {
    const settle = () => window.setTimeout(evaluateSelection, 0)
    const onUp = () => settle()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setAnchor(null); return }
      // Shift+Arrow keyboard selection
      if (e.shiftKey || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        settle()
      }
    }
    const onScroll = () => setAnchor(null)
    document.addEventListener('mouseup', onUp)
    document.addEventListener('keyup', onKey)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mouseup', onUp)
      document.removeEventListener('keyup', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [evaluateSelection])

  if (!anchor) return null

  const resolvedLabel = label ?? t('copilot:askCopilot')
  const handleAsk = () => {
    const message = getPrompt
      ? getPrompt(anchor.text, language)
      : isRTL
        ? `اشرح ما يلي:\n\n"${anchor.text}"`
        : `Explain the following:\n\n"${anchor.text}"`
    dismissedRef.current = true
    setAnchor(null)
    try { window.getSelection()?.removeAllRanges() } catch { /* ignore */ }
    open({ message, autoSend })
  }

  // Position the bubble just below the selection. In RTL the button's right
  // edge anchors at the selection's left edge (translateX(-100%)).
  const vw = typeof window !== 'undefined' ? window.innerWidth : 9999
  const vh = typeof window !== 'undefined' ? window.innerHeight : 9999
  const style: React.CSSProperties = {
    position: 'fixed',
    top: Math.min(anchor.y + 6, vh - 44),
    left: Math.max(8, Math.min(anchor.x, vw - 8)),
    transform: isRTL ? 'translateX(-100%)' : undefined,
    zIndex: 60,
  }

  return (
    <div style={style} dir={isRTL ? 'rtl' : 'ltr'} data-testid="copilot-selection-trigger">
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault() /* keep the selection alive until click */}
        onClick={handleAsk}
        aria-label={resolvedLabel}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-lg border border-primary/30 hover:bg-primary/90 transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 animate-in fade-in zoom-in-95"
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        {resolvedLabel}
      </button>
    </div>
  )
}

CopilotSelectionTrigger.displayName = 'CopilotSelectionTrigger'

export { CopilotSelectionTrigger }
export default CopilotSelectionTrigger
