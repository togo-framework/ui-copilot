'use client'

/**
 * ArtifactClientCandidates — renders a "client_candidates" artifact.
 *
 * Displays a list of candidate clients returned by the discovery tool. Each
 * card is fully clickable and posts a structured ArtifactInteraction of kind
 * "select_candidate" with the chosen candidate's data.
 *
 * Rules: Rule 7 (displayName), Rule 8 (bilingual/RTL), Rule 16 (Sentra style),
 *        Rule 25 (product-agnostic — no context reads, no fetching).
 */

import type { A2UIClientCandidatesData, A2UIClientCandidate, ArtifactInteraction } from './types'

export interface ArtifactClientCandidatesProps {
  data: A2UIClientCandidatesData
  /** Fired when the user selects a candidate. Carries a "select_candidate" interaction. */
  onInteract?: (interaction: ArtifactInteraction) => void
  language?: 'en' | 'ar'
  dir?: 'ltr' | 'rtl'
}

const ArtifactClientCandidates = ({
  data,
  onInteract,
  language = 'en',
  dir,
}: ArtifactClientCandidatesProps) => {
  const resolvedDir = dir ?? (language === 'ar' ? 'rtl' : 'ltr')

  if (!data.candidates || data.candidates.length === 0) return null

  const handleSelect = (candidate: A2UIClientCandidate) => {
    const payload: Record<string, unknown> = { name: candidate.name }
    if (candidate.website_url) payload.website_url = candidate.website_url
    if (candidate.sector) payload.sector = candidate.sector
    onInteract?.({ kind: 'select_candidate', payload })
  }

  const chooseLabel = language === 'ar' ? 'اختر هذا العميل' : 'Select this client'

  return (
    <div
      className="space-y-2"
      dir={resolvedDir}
      role="list"
      aria-label={language === 'ar' ? 'عملاء مرشحون' : 'Candidate clients'}
    >
      {data.prompt && (
        <p className="text-xs text-muted-foreground mb-2" dir="auto">
          {data.prompt}
        </p>
      )}

      {data.candidates.map((candidate, idx) => (
        <button
          key={idx}
          type="button"
          role="listitem"
          onClick={() => handleSelect(candidate)}
          className="w-full text-start rounded-lg border border-border bg-card hover:bg-accent/50 hover:border-primary/40 px-3 py-2.5 transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
          aria-label={`${chooseLabel}: ${candidate.name}`}
        >
          <p className="text-sm font-semibold text-foreground leading-snug">
            {candidate.name}
          </p>

          {candidate.website_url && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {candidate.website_url}
            </p>
          )}

          {candidate.sector && (
            <span className="mt-1 inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {candidate.sector}
            </span>
          )}

          {candidate.summary && (
            <p className="text-xs text-foreground/70 mt-1.5 line-clamp-2 leading-relaxed" dir="auto">
              {candidate.summary}
            </p>
          )}
        </button>
      ))}
    </div>
  )
}

ArtifactClientCandidates.displayName = 'ArtifactClientCandidates'

export { ArtifactClientCandidates }
