'use client'

/**
 * TimelineSourceCitation — renders a timeline/narrative event's source as a
 * clickable affordance. Resolves `[N]` citation markers (via InlineCitationText),
 * explicit source URLs, named sources, and category slugs — and NEVER renders
 * empty (falls back to a localised "Unknown source").
 *
 * Pure & product-agnostic (Rule 25): `lang` is a prop, no context. The source
 * category label map is inlined so the component carries no lib dependency.
 *
 * Ported from app/src/components/timeline/TimelineSourceCitation.tsx
 * + app/src/lib/timelineSourceLabel.ts.
 * Refs #322 (bilingual category labels), #323 (never drop a source).
 */

import { ExternalLink } from 'lucide-react'
import { InlineCitationText, hasResolvableCitation, type RawCitation } from './InlineCitations'

type Language = 'en' | 'ar'

// ── Source category label map ───────────────────────────────────────────────
// Canonical category slugs produced by the bridge normaliseTimelineSource guard
// plus legacy display-form variants from older pipelines.
const SOURCE_CATEGORY_LABELS: Record<string, { en: string; ar: string }> = {
  press: { en: 'Press', ar: 'صحافة' },
  official_statement: { en: 'Official Statement', ar: 'بيان رسمي' },
  social_media: { en: 'Social Media', ar: 'تواصل اجتماعي' },
  analysis: { en: 'Analysis', ar: 'تحليل' },
  other: { en: 'Other', ar: 'أخرى' },
  inferred: { en: 'Inferred', ar: 'مستنتج' },
  'News Article': { en: 'News Article', ar: 'مقال إخباري' },
  'news article': { en: 'News Article', ar: 'مقال إخباري' },
  'Social Media': { en: 'Social Media', ar: 'تواصل اجتماعي' },
  'Official Statement': { en: 'Official Statement', ar: 'بيان رسمي' },
  'official statement': { en: 'Official Statement', ar: 'بيان رسمي' },
  'Intelligence Assessment': { en: 'Intelligence Assessment', ar: 'تقييم استخباراتي' },
  'intelligence assessment': { en: 'Intelligence Assessment', ar: 'تقييم استخباراتي' },
  'Narrative Description': { en: 'Narrative Description', ar: 'وصف سردي' },
  'narrative description': { en: 'Narrative Description', ar: 'وصف سردي' },
  Inferred: { en: 'Inferred', ar: 'مستنتج' },
  inferred_from_context: { en: 'Inferred', ar: 'مستنتج' },
}

const UNKNOWN_SOURCE_LABEL: Record<Language, string> = {
  en: 'Unknown source',
  ar: 'مصدر غير معروف',
}

/**
 * Resolve a display label for a timeline event's source string.
 * 1. Known category slug / display-form variant → localised label.
 * 2. Non-empty non-category string → treat as proper-noun origin, return as-is.
 * 3. Absent / empty → localised "Unknown source" fallback.
 */
export function resolveTimelineSourceLabel(
  source: string | null | undefined,
  lang: Language,
): { label: string; isCategory: boolean; isUnknown: boolean } {
  const raw = typeof source === 'string' ? source.trim() : ''
  if (!raw) {
    return { label: UNKNOWN_SOURCE_LABEL[lang], isCategory: false, isUnknown: true }
  }
  const entry = SOURCE_CATEGORY_LABELS[raw] ?? SOURCE_CATEGORY_LABELS[raw.toLowerCase()]
  if (entry) {
    return { label: entry[lang], isCategory: true, isUnknown: false }
  }
  return { label: raw, isCategory: false, isUnknown: false }
}

/** Returns true when the source string is a known category label (not a named origin). */
export function isSourceCategoryLabel(source: string | null | undefined): boolean {
  if (!source) return false
  const raw = source.trim()
  return raw in SOURCE_CATEGORY_LABELS || raw.toLowerCase() in SOURCE_CATEGORY_LABELS
}

// ── Component ───────────────────────────────────────────────────────────────

export interface TimelineSourceCitationProps {
  /** Raw source value — may be a URL, a plain name, a category slug, or a `[N]` marker string. */
  source: string | undefined | null
  /** Explicit URL override (e.g. from event.source_url or event.url). */
  sourceUrl?: string | undefined | null
  /** Resolved citations list used to turn `[N]` markers into clickable links. */
  citations?: RawCitation[] | null
  /** 1-based step number, used as fallback badge label when no name is available. */
  stepIndex?: number
  /** Active display language. Defaults to 'en'. */
  lang?: Language
}

export const TimelineSourceCitation = ({
  source,
  sourceUrl,
  citations,
  stepIndex,
  lang = 'en',
}: TimelineSourceCitationProps) => {
  const srcStr = typeof source === 'string' ? source : ''

  // Case 1: source contains `[N]` citation markers — defer to InlineCitationText.
  if (srcStr && /\[\^?\d/.test(srcStr)) {
    if (!hasResolvableCitation(srcStr, citations)) return null
    return (
      <p className="text-xs text-muted-foreground mt-0.5">
        <InlineCitationText text={srcStr} citations={citations} hideUnresolved />
      </p>
    )
  }

  // Case 2: explicit sourceUrl, or source that is itself a URL → clickable anchor.
  const isUrl = typeof (sourceUrl || srcStr) === 'string' && /^https?:\/\//i.test(sourceUrl || srcStr)
  const resolvedUrl = isUrl ? (sourceUrl || srcStr) : (sourceUrl || null)

  if (resolvedUrl) {
    const { label: anchorLabel } = resolveTimelineSourceLabel(
      !(/^https?:\/\//i.test(srcStr)) && srcStr ? srcStr : null,
      lang,
    )
    const displayLabel = !(/^https?:\/\//i.test(srcStr)) && srcStr
      ? anchorLabel
      : (resolvedUrl ?? `[${stepIndex ?? '?'}]`)

    return (
      <a
        href={resolvedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-0.5"
        title={resolvedUrl}
      >
        {displayLabel}
        <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
      </a>
    )
  }

  // Case 3 & 4: no URL — resolve the display label (translates category slugs,
  // returns "Unknown source" when empty).
  const { label, isCategory, isUnknown } = resolveTimelineSourceLabel(srcStr || null, lang)

  return (
    <span
      className={[
        'inline-flex items-center gap-1 text-xs mt-0.5 cursor-default',
        isCategory || isUnknown ? 'text-muted-foreground italic' : 'text-muted-foreground',
      ].join(' ')}
      title={isUnknown ? undefined : 'Source URL unavailable'}
    >
      {label}
    </span>
  )
}

TimelineSourceCitation.displayName = 'TimelineSourceCitation'
export default TimelineSourceCitation
