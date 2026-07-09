'use client'

import { Loader2, Sparkles } from 'lucide-react'
import MarkdownContent from '../chat/MarkdownContent'

// ── Types ──────────────────────────────────────────────────────────────────────

interface StreamingMessageProps {
  text: string
  isStreaming: boolean
  /** UI language. Defaults to 'en'. */
  language?: 'en' | 'ar'
  /** Text direction. Inferred from language when not provided. */
  dir?: 'ltr' | 'rtl'
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * StreamingMessage
 *
 * Renders an assistant message that may still be receiving SSE token deltas.
 * While streaming, shows a pulsing cursor at the end.
 * Content renders as markdown via the shared MarkdownContent primitive
 * (GFM, skipHtml, links in new tab, RTL-safe logical padding).
 *
 * All app deps removed — language/dir are plain props.
 */
const StreamingMessage = ({ text, isStreaming, language = 'en', dir }: StreamingMessageProps) => {
  const isAR = language === 'ar'
  const resolvedDir = dir ?? (isAR ? 'rtl' : 'ltr')

  if (!text && isStreaming) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-xl border border-border">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground animate-pulse">
          {isAR ? 'جارٍ التفكير...' : 'Thinking...'}
        </span>
      </div>
    )
  }

  return (
    <div
      className="bg-muted rounded-xl px-3 py-2 border border-border text-sm text-foreground"
      dir={resolvedDir}
    >
      <MarkdownContent content={text} dir={resolvedDir} className="max-w-none" />
      {isStreaming && (
        <span className="inline-block w-1.5 h-3.5 bg-primary animate-pulse rounded-sm ms-0.5 align-middle" />
      )}
    </div>
  )
}

StreamingMessage.displayName = 'StreamingMessage'

export default StreamingMessage

// ── Spinner shown while the bridge sends the first byte ──────────────────────

interface StreamingSpinnerProps {
  language?: 'en' | 'ar'
}

export const StreamingSpinner = ({ language = 'en' }: StreamingSpinnerProps) => {
  return (
    <div className="flex gap-2 items-start">
      <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
      </div>
      <div className="bg-muted rounded-xl px-3 py-2 border border-border">
        <span className="text-xs text-muted-foreground animate-pulse">
          {language === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}
        </span>
      </div>
    </div>
  )
}

StreamingSpinner.displayName = 'StreamingSpinner'
