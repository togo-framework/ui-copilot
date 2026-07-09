'use client'

/**
 * ArtifactMarkdown — renders an A2UI "markdown" artifact.
 *
 * Reuses the existing MarkdownContent component — no duplication.
 * Bilingual dir attribute passed through.
 *
 * Rules: Rule 7 (displayName), Rule 8 (RTL), Rule 16 (Sentra style).
 */

import MarkdownContent from '../../chat/MarkdownContent'
import type { A2UIMarkdownData } from './types'

export interface ArtifactMarkdownProps {
  data: A2UIMarkdownData
  language?: 'en' | 'ar'
  dir?: 'ltr' | 'rtl'
}

const ArtifactMarkdown = ({ data, language = 'en', dir }: ArtifactMarkdownProps) => {
  const resolvedDir = dir ?? (language === 'ar' ? 'rtl' : 'ltr')

  if (!data.content) {
    return null
  }

  return (
    <div className="rounded-md bg-muted/30 border border-border/60 p-3" dir={resolvedDir}>
      <MarkdownContent content={data.content} dir={resolvedDir} />
    </div>
  )
}

ArtifactMarkdown.displayName = 'ArtifactMarkdown'

export { ArtifactMarkdown }
