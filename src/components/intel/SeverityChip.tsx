'use client'

/**
 * SeverityChip — severity badge + optional scope tag used in IntelCard.
 *
 * Design:
 *   Severity dot + label badge (left). Scope tag separate chip (right) when
 *   scopeName is provided — keeps both readable and untruncated.
 *
 * Tokens (semantic only — no hex):
 *   critical / high  → destructive family
 *   medium           → alert-amber family
 *   low              → success family
 *   scope tag        → muted/foreground (neutral)
 *
 * RTL: uses logical props (ms-* / me-*). Pure, no side-effects, no context.
 */

import { cn } from '@togo-framework/ui-core'
import type { IntelSeverity } from './types'

const SEVERITY_LABELS: Record<IntelSeverity, { en: string; ar: string }> = {
  critical: { en: 'Critical', ar: 'حرج' },
  high:     { en: 'High',     ar: 'مرتفع' },
  medium:   { en: 'Medium',   ar: 'متوسط' },
  low:      { en: 'Low',      ar: 'منخفض' },
}

/** Dot color — a filled circle indicator inside the badge */
const SEVERITY_DOT: Record<IntelSeverity, string> = {
  critical: 'bg-destructive',
  high:     'bg-destructive/70',
  medium:   'bg-amber-400',
  low:      'bg-green-500',
}

/** Badge background + text + border using only semantic Tailwind tokens */
const SEVERITY_BADGE: Record<IntelSeverity, string> = {
  critical: 'bg-destructive/10 text-destructive border-destructive/25',
  high:     'bg-destructive/8  text-destructive border-destructive/18',
  medium:   'bg-amber-400/10   text-amber-600   border-amber-400/25  dark:text-amber-400',
  low:      'bg-green-500/10   text-green-700   border-green-500/25  dark:text-green-400',
}

/** @deprecated — kept for consumers that read SEVERITY_CLASSES directly */
const SEVERITY_CLASSES = SEVERITY_BADGE

export interface SeverityChipProps {
  severity: IntelSeverity
  /** Scope/region name shown as a neutral secondary tag beside the badge */
  scopeName?: string
  language?: 'en' | 'ar'
  className?: string
}

const SeverityChip = ({ severity, scopeName, language = 'en', className }: SeverityChipProps) => {
  const label = language === 'ar' ? SEVERITY_LABELS[severity].ar : SEVERITY_LABELS[severity].en

  return (
    <span
      className={cn('inline-flex items-center gap-2 flex-wrap', className)}
      aria-label={`${label}${scopeName ? ` · ${scopeName}` : ''}`}
    >
      {/* Severity badge: dot + label */}
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold leading-none tracking-wide uppercase',
          SEVERITY_BADGE[severity],
        )}
        aria-hidden="true"
      >
        <span
          className={cn('size-1.5 rounded-full shrink-0', SEVERITY_DOT[severity])}
          aria-hidden="true"
        />
        {label}
      </span>

      {/* Scope tag — neutral, separate chip so it never gets truncated */}
      {scopeName && (
        <span
          className="inline-flex items-center rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground"
          aria-hidden="true"
        >
          {scopeName}
        </span>
      )}
    </span>
  )
}
SeverityChip.displayName = 'SeverityChip'

export { SeverityChip, SEVERITY_LABELS, SEVERITY_CLASSES }
