'use client'

/**
 * ArtifactCard — renders an A2UI "card" artifact.
 *
 * Two layouts:
 *  - **Rich** (intelligence card): a summary headline, a 2-column grid of metric
 *    tiles (label + big value + icon, tone-color-coded green/red/neutral, optional
 *    sparkline), a related-items list, and a footer recommendation. Used when the
 *    payload carries `metrics`/`summary`.
 *  - **Simple**: title + body + key/value fields. Backward-compatible fallback.
 *
 * Bilingual (title/summary/related/footer _en/_ar), RTL-safe (logical props),
 * token-themed for dark/light. displayName set (Rule 7).
 */

import * as React from 'react'
import {
  TrendingUp, Users, Clock, Crosshair, ShieldCheck, BarChart3,
  AlertTriangle, Check, Globe, Sparkles,
} from 'lucide-react'
import { cn } from '@togo-framework/ui-core'
import { SeverityChip } from '../../intel/SeverityChip'
import type { IntelSeverity } from '../../intel/types'
import type { A2UICardData, A2UICardMetric, A2UICardTone, A2UICardIcon } from './types'

export interface ArtifactCardProps {
  data: A2UICardData
  /** Outer artifact title (title_en / title_ar from the A2UIArtifact envelope). */
  artifactTitle?: string
  language?: 'en' | 'ar'
  dir?: 'ltr' | 'rtl'
}

const ICONS: Record<A2UICardIcon, React.ElementType> = {
  trend: TrendingUp, users: Users, clock: Clock, source: Crosshair,
  shield: ShieldCheck, chart: BarChart3, alert: AlertTriangle, check: Check, globe: Globe,
}

const TONE: Record<A2UICardTone, { tile: string; value: string; icon: string }> = {
  positive: { tile: 'border-success/30 bg-success/10', value: 'text-success', icon: 'text-success' },
  negative: { tile: 'border-destructive/30 bg-destructive/10', value: 'text-destructive', icon: 'text-destructive' },
  neutral:  { tile: 'border-border bg-muted/40', value: 'text-foreground', icon: 'text-muted-foreground' },
}

// Tiny dependency-free sparkline.
function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (!values || values.length < 2) return null
  const w = 56, h = 18
  const min = Math.min(...values), max = Math.max(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / span) * h}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className={className} aria-hidden>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MetricTile({ m, language }: { m: A2UICardMetric; language: 'en' | 'ar' }) {
  const tone = TONE[m.tone ?? 'neutral']
  const Icon = m.icon ? ICONS[m.icon] : null
  const label = language === 'ar' && m.label_ar ? m.label_ar : m.label_en
  return (
    <div className={cn('flex items-start justify-between gap-2 rounded-lg border p-3', tone.tile)}>
      <span className="min-w-0">
        <span className="block truncate text-[11px] text-muted-foreground">{label}</span>
        <span className={cn('mt-0.5 block text-lg font-bold leading-tight', tone.value)}>{String(m.value)}</span>
        {m.trend && m.trend.length > 1 && <Sparkline values={m.trend} className={cn('mt-1', tone.icon)} />}
      </span>
      {Icon && <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', tone.icon)} />}
    </div>
  )
}

const ArtifactCard = ({ data, artifactTitle, language = 'en', dir }: ArtifactCardProps) => {
  const resolvedDir = dir ?? (language === 'ar' ? 'rtl' : 'ltr')
  const pick = (en?: string, ar?: string) => (language === 'ar' ? ar || en || '' : en || '')

  const cardTitle = pick(data.title_en, data.title_ar) || artifactTitle || ''
  const summary = pick(data.summary_en, data.summary_ar)
  const related = (language === 'ar' ? data.related_ar || data.related_en : data.related_en) || []
  const footer = pick(data.footer_en, data.footer_ar)
  const cardBody = pick(data.body_en, data.body_ar)

  const validSeverities: IntelSeverity[] = ['critical', 'high', 'medium', 'low']
  const severity: IntelSeverity | null =
    data.severity && validSeverities.includes(data.severity as IntelSeverity)
      ? (data.severity as IntelSeverity) : null

  const isRich = (data.metrics && data.metrics.length > 0) || !!summary || related.length > 0 || !!footer

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4 text-foreground" dir={resolvedDir}>
      {/* Header */}
      {(cardTitle || severity) && (
        <div className="flex items-start justify-between gap-2">
          {cardTitle && <p className="min-w-0 flex-1 text-sm font-semibold leading-snug">{cardTitle}</p>}
          {severity && <SeverityChip severity={severity} language={language} className="mt-0.5 shrink-0" />}
        </div>
      )}

      {isRich ? (
        <>
          {summary && <p className="text-sm leading-relaxed text-foreground/90" dir="auto">{summary}</p>}

          {data.metrics && data.metrics.length > 0 && (
            <div className="grid grid-cols-2 gap-2.5">
              {data.metrics.map((m, i) => <MetricTile key={i} m={m} language={language} />)}
            </div>
          )}

          {related.length > 0 && (
            <ul className="space-y-1.5 border-t border-border/60 pt-3">
              {related.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
                  <span className="min-w-0" dir="auto">{r}</span>
                </li>
              ))}
            </ul>
          )}

          {footer && (
            <div className="flex items-start gap-2 border-t border-border/60 pt-3 text-xs font-medium text-success">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0" dir="auto">{footer}</span>
            </div>
          )}
        </>
      ) : (
        <>
          {cardBody && <p className="text-xs leading-relaxed text-muted-foreground" dir="auto">{cardBody}</p>}
          {data.fields && data.fields.length > 0 && (
            <dl className="space-y-1 border-t border-border/50 pt-2">
              {data.fields.map((field, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <dt className="min-w-[6rem] max-w-[8rem] shrink-0 truncate font-medium text-muted-foreground">{field.label}</dt>
                  <dd className="min-w-0 flex-1 break-words text-foreground" dir="auto">{String(field.value)}</dd>
                </div>
              ))}
            </dl>
          )}
        </>
      )}
    </div>
  )
}

ArtifactCard.displayName = 'ArtifactCard'

export { ArtifactCard }
