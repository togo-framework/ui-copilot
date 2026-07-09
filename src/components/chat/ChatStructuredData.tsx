'use client'

import React, { useState, useEffect } from 'react'
import {
  Globe, AlertTriangle, TrendingUp, BookOpen, Calendar,
  ChevronRight, Shield, Building2, User as UserIcon,
  ArrowUpRight, ArrowDownRight, ArrowRight,
} from 'lucide-react'
import { cn } from '@togo-framework/ui-core'

// ── Types ──────────────────────────────────────────────────────────────────────

interface StructuredEntity {
  slug?: string
  name?: string
  name_en?: string
  name_ar?: string
  type?: string
}

interface StructuredAlert {
  slug?: string
  severity?: 'high' | 'medium' | 'low'
  title_en?: string
  title_ar?: string
  description_en?: string
  description_ar?: string
}

interface StructuredNarrative {
  slug?: string
  title_en?: string
  title_ar?: string
  dominant_narratives?: string
}

interface StructuredEvent {
  slug?: string
  title_en?: string
  title_ar?: string
}

interface StructuredTheme {
  name_en?: string
  name_ar?: string
  trend?: 'rising' | 'declining' | 'stable' | string
}

export interface StructuredData {
  entities?: StructuredEntity[]
  alerts?: StructuredAlert[]
  narratives?: StructuredNarrative[]
  events?: StructuredEvent[]
  themes?: StructuredTheme[]
  briefing?: string
  relationships?: unknown[]
  new_emerging_entities?: StructuredEntity[]
  sentiment_analysis?: unknown
}

// ── Seam: slug validation ──────────────────────────────────────────────────────
//
// The original ChatStructuredData in sentra-next calls bridge.get() to check
// which slugs actually exist in the DB before rendering clickable links.
// In the design-system package we cannot import the bridge. Instead, the
// consumer passes an optional `onCheckSlugs` callback. If not provided, all
// slugs are assumed valid (Storybook / standalone mode).
//
// Sentra product usage:
//
//   import { bridge } from '@/lib/bridge-client'
//   const checkSlugs: SlugChecker = async (table, slugs) => {
//     const joined = slugs.join(',')
//     const rows = await bridge.get<{ slug: string }[]>(
//       `/api/pg/${table}?slug=in.(${joined})&select=slug`
//     )
//     return rows.map(r => r.slug)
//   }
//   <ChatStructuredData data={data} onCheckSlugs={checkSlugs} />
//
export type SlugChecker = (
  table: 'entities' | 'alerts' | 'narratives' | 'events',
  slugs: string[],
) => Promise<string[]>

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Try to parse a JSON code-block string into StructuredData. */
function tryParseStructured(json: string): StructuredData | null {
  try {
    const obj = JSON.parse(json)
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return null
    const knownKeys = ['entities', 'alerts', 'narratives', 'events', 'themes', 'briefing', 'relationships', 'new_emerging_entities', 'sentiment_analysis']
    if (!knownKeys.some(k => k in obj)) return null
    return obj as StructuredData
  } catch {
    return null
  }
}

/** Extract all ```json code blocks from markdown and merge their structured data. */
export function extractStructuredBlocks(content: string): {
  markdown: string
  structured: StructuredData | null
} {
  const jsonBlockRegex = /```json\s*\n([\s\S]*?)```/g
  const blocks: StructuredData[] = []
  let cleaned = content

  const matches: { full: string; body: string }[] = []
  let match: RegExpExecArray | null
  while ((match = jsonBlockRegex.exec(content)) !== null) {
    matches.push({ full: match[0], body: match[1] })
  }

  for (const m of matches) {
    const parsed = tryParseStructured(m.body.trim())
    if (parsed) {
      blocks.push(parsed)
      cleaned = cleaned.replace(m.full, '')
    }
  }

  if (blocks.length === 0) return { markdown: content, structured: null }

  const merged: StructuredData = {}
  for (const b of blocks) {
    if (b.entities?.length) merged.entities = [...(merged.entities || []), ...b.entities]
    if (b.alerts?.length) merged.alerts = [...(merged.alerts || []), ...b.alerts]
    if (b.narratives?.length) merged.narratives = [...(merged.narratives || []), ...b.narratives]
    if (b.events?.length) merged.events = [...(merged.events || []), ...b.events]
    if (b.themes?.length) merged.themes = [...(merged.themes || []), ...b.themes]
    if (b.new_emerging_entities?.length) merged.entities = [...(merged.entities || []), ...b.new_emerging_entities]
    if (b.briefing && !merged.briefing) merged.briefing = b.briefing
  }

  if (merged.entities) {
    const seen = new Set<string>()
    merged.entities = merged.entities.filter(e => {
      const key = e.slug || e.name_en || e.name || ''
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  return { markdown: cleaned.trim(), structured: merged }
}

// ── Entity / severity configs ─────────────────────────────────────────────────

const ENTITY_TYPE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  government:  { icon: Shield,    color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  institution: { icon: Building2, color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  individual:  { icon: UserIcon,  color: 'bg-violet-500/15 text-violet-400 border-violet-500/20' },
  media:       { icon: Globe,     color: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
}

const SEVERITY_CONFIG: Record<string, { color: string; bg: string }> = {
  high:   { color: 'text-red-400',   bg: 'bg-red-500/10 border-red-500/20' },
  medium: { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  low:    { color: 'text-blue-400',  bg: 'bg-blue-500/10 border-blue-500/20' },
}

const TREND_ICON: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  rising:   { icon: ArrowUpRight,   color: 'text-emerald-400' },
  declining:{ icon: ArrowDownRight, color: 'text-red-400' },
  stable:   { icon: ArrowRight,     color: 'text-muted-foreground' },
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const EntityChip = ({
  entity,
  lang,
  onNavigate,
}: {
  entity: StructuredEntity
  lang: string
  onNavigate?: (path: string) => void
}) => {
  const name = lang === 'ar'
    ? (entity.name_ar || entity.name_en || entity.name || '?')
    : (entity.name_en || entity.name || entity.name_ar || '?')
  const slug = entity.slug
  const typeConf = ENTITY_TYPE_CONFIG[entity.type || ''] || ENTITY_TYPE_CONFIG.institution
  const Icon = typeConf.icon

  const handleClick = () => {
    if (slug && onNavigate) onNavigate(`/entity/${slug}`)
  }

  return (
    <button
      onClick={handleClick}
      disabled={!slug || !onNavigate}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        typeConf.color,
        slug && onNavigate ? 'cursor-pointer hover:brightness-125' : 'cursor-default opacity-70',
      )}
    >
      <Icon className="w-3 h-3 shrink-0" />
      <span className="truncate max-w-[140px]">{name}</span>
      {slug && onNavigate && <ChevronRight className="w-3 h-3 shrink-0 opacity-50 rtl:rotate-180" />}
    </button>
  )
}
EntityChip.displayName = 'EntityChip'

const AlertCard = ({
  alert,
  lang,
  onNavigate,
}: {
  alert: StructuredAlert
  lang: string
  onNavigate?: (path: string) => void
}) => {
  const title = lang === 'ar'
    ? (alert.title_ar || alert.title_en || '')
    : (alert.title_en || alert.title_ar || '')
  const desc = lang === 'ar'
    ? (alert.description_ar || alert.description_en || '')
    : (alert.description_en || alert.description_ar || '')
  const sev = SEVERITY_CONFIG[alert.severity || 'low'] || SEVERITY_CONFIG.low

  return (
    <button
      onClick={() => alert.slug && onNavigate?.(`/alert/${alert.slug}`)}
      disabled={!alert.slug || !onNavigate}
      className={cn(
        'w-full text-start rounded-lg border p-2.5 transition-all duration-fast ease-standard group',
        sev.bg,
        alert.slug && onNavigate ? 'cursor-pointer hover:brightness-110' : 'cursor-default',
      )}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className={cn('w-3.5 h-3.5 shrink-0 mt-0.5', sev.color)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn('text-[10px] font-semibold uppercase tracking-wider', sev.color)}>
              {alert.severity}
            </span>
          </div>
          <p className="text-xs font-medium text-foreground mt-0.5 line-clamp-2">{title}</p>
          {desc && <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{desc}</p>}
        </div>
      </div>
    </button>
  )
}
AlertCard.displayName = 'AlertCard'

const NarrativeCard = ({
  narrative,
  lang,
  onNavigate,
}: {
  narrative: StructuredNarrative
  lang: string
  onNavigate?: (path: string) => void
}) => {
  const title = lang === 'ar'
    ? (narrative.title_ar || narrative.title_en || narrative.dominant_narratives || '')
    : (narrative.title_en || narrative.dominant_narratives || narrative.title_ar || '')
  const slug = narrative.slug

  return (
    <button
      onClick={() => slug && onNavigate?.(`/narrative/${slug}`)}
      className={cn(
        'w-full text-start rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 transition-all duration-fast ease-standard group',
        'cursor-pointer hover:bg-amber-500/10',
      )}
    >
      <div className="flex items-start gap-2">
        <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground line-clamp-2">{title}</p>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-amber-400/50 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-fast ease-standard rtl:rotate-180" />
      </div>
    </button>
  )
}
NarrativeCard.displayName = 'NarrativeCard'

const EventChip = ({
  event,
  lang,
  onNavigate,
}: {
  event: StructuredEvent
  lang: string
  onNavigate?: (path: string) => void
}) => {
  const title = lang === 'ar'
    ? (event.title_ar || event.title_en || '')
    : (event.title_en || event.title_ar || '')
  const slug = event.slug

  return (
    <button
      onClick={() => slug && onNavigate?.(`/event/${slug}`)}
      disabled={!slug || !onNavigate}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-purple-500/20 bg-purple-500/10 text-purple-400 text-xs font-medium transition-all duration-fast ease-standard',
        slug && onNavigate ? 'cursor-pointer hover:brightness-125' : 'cursor-default',
      )}
    >
      <Calendar className="w-3 h-3 shrink-0" />
      <span className="truncate max-w-[200px]">{title}</span>
      {slug && onNavigate && <ChevronRight className="w-3 h-3 shrink-0 opacity-50 rtl:rotate-180" />}
    </button>
  )
}
EventChip.displayName = 'EventChip'

const ThemeChip = ({ theme, lang }: { theme: StructuredTheme; lang: string }) => {
  const name = lang === 'ar'
    ? (theme.name_ar || theme.name_en || '')
    : (theme.name_en || theme.name_ar || '')
  const trendConf = TREND_ICON[theme.trend || 'stable'] || TREND_ICON.stable
  const TrendIcon = trendConf.icon

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-muted/50 text-xs font-medium text-foreground">
      <TrendIcon className={cn('w-3 h-3 shrink-0', trendConf.color)} />
      <span className="truncate max-w-[180px]">{name}</span>
    </span>
  )
}
ThemeChip.displayName = 'ThemeChip'

// ── Slug validation (injected seam) ───────────────────────────────────────────

function useExistingSlugs(data: StructuredData, onCheckSlugs?: SlugChecker) {
  const [existing, setExisting] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!onCheckSlugs) {
      // No checker provided — assume all slugs valid (standalone/Storybook mode)
      const all = new Set<string>()
      ;(data.entities || []).forEach(e => { if (e.slug) all.add(`entities:${e.slug}`) })
      ;(data.alerts || []).forEach(a => { if (a.slug) all.add(`alerts:${a.slug}`) })
      ;(data.narratives || []).forEach(n => { if (n.slug) all.add(`narratives:${n.slug}`) })
      ;(data.events || []).forEach(e => { if (e.slug) all.add(`events:${e.slug}`) })
      setExisting(all)
      return
    }

    const checks: { table: 'entities' | 'alerts' | 'narratives' | 'events'; slugs: string[] }[] = []

    const entitySlugs = (data.entities || []).map(e => e.slug).filter(Boolean) as string[]
    if (entitySlugs.length) checks.push({ table: 'entities', slugs: entitySlugs })

    const alertSlugs = (data.alerts || []).map(a => a.slug).filter(Boolean) as string[]
    if (alertSlugs.length) checks.push({ table: 'alerts', slugs: alertSlugs })

    const narrativeSlugs = (data.narratives || []).map(n => n.slug).filter(Boolean) as string[]
    if (narrativeSlugs.length) checks.push({ table: 'narratives', slugs: narrativeSlugs })

    const eventSlugs = (data.events || []).map(e => e.slug).filter(Boolean) as string[]
    if (eventSlugs.length) checks.push({ table: 'events', slugs: eventSlugs })

    if (checks.length === 0) return

    let cancelled = false

    Promise.all(
      checks.map(async ({ table, slugs }) => {
        const found = await onCheckSlugs(table, slugs).catch(() => [] as string[])
        return found.map(slug => `${table}:${slug}`)
      }),
    ).then(results => {
      if (cancelled) return
      setExisting(new Set(results.flat()))
    })

    return () => { cancelled = true }
  }, [data, onCheckSlugs])

  return existing
}

// ── Main component ─────────────────────────────────────────────────────────────

interface ChatStructuredDataProps {
  data: StructuredData
  /** UI language. Defaults to 'en'. */
  language?: 'en' | 'ar'
  /** Text direction. Inferred from language when not provided. */
  dir?: 'ltr' | 'rtl'
  /**
   * Navigation callback. When provided, entity/alert/narrative/event chips
   * become clickable and call this with the target path (e.g. '/entity/slug').
   * The product wires this to router.push (Next.js) or window.location.
   */
  onNavigate?: (path: string) => void
  /**
   * Optional: batch-check which slugs actually exist in the DB.
   * When omitted, all slugs are assumed valid (safe for Storybook/standalone).
   */
  onCheckSlugs?: SlugChecker
}

const ChatStructuredData = ({
  data,
  language = 'en',
  dir,
  onNavigate,
  onCheckSlugs,
}: ChatStructuredDataProps) => {
  const lang = language
  const isRTL = lang === 'ar'
  const resolvedDir = dir ?? (isRTL ? 'rtl' : 'ltr')
  const existingSlugs = useExistingSlugs(data, onCheckSlugs)

  const validEntities  = (data.entities  || []).filter(e => e.slug && existingSlugs.has(`entities:${e.slug}`))
  const validAlerts    = (data.alerts    || []).filter(a => a.slug && existingSlugs.has(`alerts:${a.slug}`))
  const validNarratives= (data.narratives|| []).filter(n => n.slug && existingSlugs.has(`narratives:${n.slug}`))
  const validEvents    = (data.events    || []).filter(e => e.slug && existingSlugs.has(`events:${e.slug}`))
  const themes         = data.themes || []

  const hasEntities   = validEntities.length > 0
  const hasAlerts     = validAlerts.length > 0
  const hasNarratives = validNarratives.length > 0
  const hasEvents     = validEvents.length > 0
  const hasThemes     = themes.length > 0

  if (!hasEntities && !hasAlerts && !hasNarratives && !hasEvents && !hasThemes) return null

  return (
    <div className="mt-3 space-y-3 not-prose" dir={resolvedDir}>
      {hasEntities && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {isRTL ? 'الجهات المذكورة' : 'Mentioned Entities'}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {validEntities.map((e, i) => (
              <EntityChip key={e.slug || i} entity={e} lang={lang} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      )}

      {hasAlerts && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {isRTL ? 'إشارات' : 'Alerts'}
            </span>
          </div>
          <div className="space-y-1.5">
            {validAlerts.map((a, i) => (
              <AlertCard key={a.slug || i} alert={a} lang={lang} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      )}

      {hasNarratives && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {isRTL ? 'السرديات' : 'Narratives'}
            </span>
          </div>
          <div className="space-y-1.5">
            {validNarratives.map((n, i) => (
              <NarrativeCard key={i} narrative={n} lang={lang} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      )}

      {hasEvents && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Calendar className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {isRTL ? 'الأحداث' : 'Events'}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {validEvents.map((e, i) => (
              <EventChip key={e.slug || i} event={e} lang={lang} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      )}

      {hasThemes && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-foreground/60" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {isRTL ? 'المواضيع' : 'Themes'}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {themes.map((th, i) => (
              <ThemeChip key={i} theme={th} lang={lang} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
ChatStructuredData.displayName = 'ChatStructuredData'

export default ChatStructuredData