'use client'

import { WifiOff, RefreshCw } from 'lucide-react'
import { Button } from '@togo-framework/ui-core'

// ── Types ──────────────────────────────────────────────────────────────────────

interface StreamErrorBannerProps {
  /** Called when the user clicks "Retry" — should re-send the last message. */
  onRetry: () => void
  /** Whether a retry is currently in flight. */
  isRetrying?: boolean
  /** UI language. Defaults to 'en'. */
  language?: 'en' | 'ar'
  /** Text direction. Inferred from language when not provided. */
  dir?: 'ltr' | 'rtl'
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * StreamErrorBanner
 *
 * Rendered inside the chat thread when an SSE stream is interrupted mid-flight
 * (e.g. the user loses network connectivity). Shows a localised error message
 * and a retry button that re-sends the last user message WITHOUT navigating
 * away from the page.
 *
 * Bilingual (EN/AR). RTL-aware via logical margin/padding classes.
 * All app deps removed — language/dir are plain props.
 */
const StreamErrorBanner = ({ onRetry, isRetrying = false, language = 'en', dir }: StreamErrorBannerProps) => {
  const isAR = language === 'ar'
  const resolvedDir = dir ?? (isAR ? 'rtl' : 'ltr')

  const handleRetry = () => {
    if (!isRetrying) onRetry()
  }

  return (
    <div
      className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-sm"
      dir={resolvedDir}
      role="alert"
      aria-live="polite"
    >
      <WifiOff className="w-4 h-4 text-destructive shrink-0 mt-0.5" aria-hidden="true" />

      <div className="flex-1 min-w-0 space-y-2">
        <p className="text-destructive font-medium text-xs leading-snug">
          {isAR
            ? 'انقطع الاتصال أثناء استجابة المساعد'
            : 'Connection interrupted during response'}
        </p>
        <p className="text-muted-foreground text-[11px] leading-snug">
          {isAR
            ? 'انقطعت البث بسبب مشكلة في الشبكة. يمكنك إعادة المحاولة لاستئناف المحادثة.'
            : 'The stream was interrupted due to a network issue. Retry to continue the conversation.'}
        </p>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleRetry}
          disabled={isRetrying}
        >
          {isRetrying ? (
            <>
              <RefreshCw className="w-3 h-3 animate-spin me-1.5" aria-hidden="true" />
              {isAR ? 'جارٍ المحاولة...' : 'Retrying...'}
            </>
          ) : (
            <>
              <RefreshCw className="w-3 h-3 me-1.5" aria-hidden="true" />
              {isAR ? 'إعادة المحاولة' : 'Retry'}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

StreamErrorBanner.displayName = 'StreamErrorBanner'

export default StreamErrorBanner