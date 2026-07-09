'use client'

/**
 * InlineCitations — render text containing inline `[N]` citation markers as
 * clickable superscript source links.
 *
 * Pure & product-agnostic (Rule 25): no context, no hooks, no data fetching —
 * the caller passes the `citations` array (in any of the common shapes the
 * analysis/copilot models emit) and the raw text. Styling is semantic-token
 * only (`text-primary`, `text-muted-foreground`). `dir="auto"` keeps it
 * bilingual-correct without a language prop.
 *
 * Ported from app/src/components/analysis/InlineCitations.tsx.
 */

import React from 'react'

export type RawCitation = string | { url?: string; link?: string; href?: string; title?: string; name?: string; label?: string; headline?: string; summary?: string; description?: string; snippet?: string; excerpt?: string } | null | undefined

export interface NormalizedCitation {
  url: string
  title: string
  summary: string
}

/** Normalize heterogeneous citation shapes into a consistent `{url,title,summary}` array, preserving order. */
export function normalizeCitations(citations: RawCitation[] | null | undefined): NormalizedCitation[] {
  if (!Array.isArray(citations)) return []
  return citations.map((cite): NormalizedCitation => {
    if (typeof cite === 'string') return { url: cite, title: '', summary: '' }
    if (cite && typeof cite === 'object') {
      return {
        url: cite.url || cite.link || cite.href || '',
        title: cite.title || cite.name || cite.label || cite.headline || '',
        summary: cite.summary || cite.description || cite.snippet || cite.excerpt || '',
      }
    }
    return { url: '', title: '', summary: '' }
  })
}

/** Dedupe by url while preserving first-seen order. Filters out entries without a URL. */
export function dedupeCitations(list: NormalizedCitation[]): NormalizedCitation[] {
  const seen = new Set<string>()
  const out: NormalizedCitation[] = []
  for (const c of list) {
    if (!c.url) continue
    if (seen.has(c.url)) continue
    seen.add(c.url)
    out.push(c)
  }
  return out
}

/**
 * Returns true if `text` contains at least one `[N]` (or `[^N]`) citation
 * marker that resolves to a real URL in `citations`. Use this to decide
 * whether to render a source line at all.
 */
export function hasResolvableCitation(text: string, citations: RawCitation[] | null | undefined): boolean {
  if (!text) return false
  const normalized = normalizeCitations(citations)
  const deduped = dedupeCitations(normalized)
  const dedupedUrlSet = new Set(deduped.map((c) => c.url))
  const expanded = text.replace(/\[\^?\s*(\d+(?:\s*[,\s]\s*\d+)+)\s*\]/g, (_m, g: string) =>
    g.split(/[,\s]+/).filter(Boolean).map((n) => `[${n}]`).join(''),
  )
  const re = /\[\^?(\d+)\]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(expanded)) !== null) {
    const idx = parseInt(m[1], 10) - 1
    const url = normalized[idx]?.url
    if (url && dedupedUrlSet.has(url)) return true
  }
  return false
}

/**
 * Render text with inline citation markers `[N]` or `[^N]` converted into
 * clickable superscript links that point to the actual source URL (from the
 * deduped citations list). Consecutive markers are separated by a space.
 *
 * - `N` is the 1-based index referencing the ORIGINAL (pre-dedupe) citations
 *   array as emitted by the analysis model.
 * - The rendered label uses the 1-based index in the DEDUPED citation list so
 *   it stays in sync with the footer `[1] [2] [3]` source row.
 */
export const InlineCitationText: React.FC<{
  text: string
  citations: RawCitation[] | null | undefined
  className?: string
  /** When true, markers that don't resolve to a real URL are omitted entirely (no muted `[N]`). */
  hideUnresolved?: boolean
}> = ({ text, citations, className, hideUnresolved }) => {
  const normalized = normalizeCitations(citations)
  const deduped = dedupeCitations(normalized)
  const dedupedIndexByUrl = new Map(deduped.map((c, i) => [c.url, i]))

  if (!text) return null

  // Expand comma/space separated indices inside a single bracket pair:
  //   "[1,2,3]"  → "[1][2][3]"
  //   "[1, 2]"   → "[1][2]"
  // This lets the single-number regex below handle all the common shapes
  // the analysis model emits (`[1][2]`, `[1], [2]`, `[1,2]`, `[^1]`, ...).
  text = text.replace(/\[\^?\s*(\d+(?:\s*[,\s]\s*\d+)+)\s*\]/g, (_m, group: string) => {
    return group
      .split(/[,\s]+/)
      .filter(Boolean)
      .map((n) => `[${n}]`)
      .join('')
  })

  const regex = /\[\^?(\d+)\]/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let markerCount = 0

  while ((match = regex.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index)
    if (before) parts.push(before)

    const n = parseInt(match[1], 10)
    const original = normalized[n - 1]
    const url = original?.url
    const dedupIdx = url ? dedupedIndexByUrl.get(url) : undefined

    // If next char in original text is also a marker, we inserted a space — detect by peeking
    const afterIdx = match.index + match[0].length
    const rest = text.slice(afterIdx)
    const nextIsMarker = /^\s*\[\^?\d+\]/.test(rest)

    if (url && typeof dedupIdx === 'number') {
      parts.push(
        <a
          key={`cite-${match.index}-${markerCount++}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title={original?.title || url}
          className="text-primary hover:underline align-super text-[10px] font-semibold tabular-nums mx-0.5"
        >
          [{dedupIdx + 1}]
        </a>,
      )
    } else if (!hideUnresolved) {
      // Unknown citation — render a muted marker so we don't silently drop it.
      parts.push(
        <sup key={`cite-${match.index}-${markerCount++}`} className="text-[10px] text-muted-foreground mx-0.5">
          [{n}]
        </sup>,
      )
    }

    // Ensure space between consecutive markers (e.g. "[1][2]" → "[1] [2]")
    if (nextIsMarker && !/^\s/.test(rest)) {
      parts.push(' ')
    }

    lastIndex = afterIdx
  }

  const tail = text.slice(lastIndex)
  if (tail) parts.push(tail)

  return <span className={className} dir="auto">{parts}</span>
}

InlineCitationText.displayName = 'InlineCitationText'
