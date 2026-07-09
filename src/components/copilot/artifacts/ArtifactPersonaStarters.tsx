'use client'

/**
 * ArtifactPersonaStarters — renders a "persona_starters" artifact.
 *
 * Displays suggested opening questions for a persona chat as pill chips.
 * Clicking a chip fires onInteract with kind "persona_start" and the chip's
 * prompt — the provider sends it as the first message of the conversation.
 *
 * Mirrors ArtifactActions visually (same chip style) but posts a structured
 * ArtifactInteraction instead of a plain onAction callback.
 *
 * Rules: Rule 7 (displayName), Rule 8 (bilingual/RTL), Rule 16 (Sentra style),
 *        Rule 25 (product-agnostic — no context reads, no fetching).
 */

import type { A2UIPersonaStartersData, ArtifactInteraction } from './types'

export interface ArtifactPersonaStartersProps {
  data: A2UIPersonaStartersData
  /** Fired when the user clicks a starter chip. Carries a "persona_start" interaction. */
  onInteract?: (interaction: ArtifactInteraction) => void
  language?: 'en' | 'ar'
  dir?: 'ltr' | 'rtl'
}

const ArtifactPersonaStarters = ({
  data,
  onInteract,
  language = 'en',
  dir,
}: ArtifactPersonaStartersProps) => {
  const resolvedDir = dir ?? (language === 'ar' ? 'rtl' : 'ltr')

  if (!data.starters || data.starters.length === 0) return null

  const handleClick = (prompt: string) => {
    onInteract?.({ kind: 'persona_start', payload: { prompt } })
  }

  return (
    <div
      className="flex flex-wrap gap-2"
      dir={resolvedDir}
      role="group"
      aria-label={language === 'ar' ? 'أسئلة افتتاحية مقترحة' : 'Suggested opening questions'}
    >
      {data.starters.map((starter, idx) => {
        const label =
          language === 'ar' && starter.label_ar
            ? starter.label_ar
            : starter.label_en

        return (
          <button
            key={idx}
            type="button"
            onClick={() => handleClick(starter.prompt)}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 hover:border-primary/50 transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
            aria-label={label}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

ArtifactPersonaStarters.displayName = 'ArtifactPersonaStarters'

export { ArtifactPersonaStarters }
