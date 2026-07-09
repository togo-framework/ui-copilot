'use client'

/**
 * ArtifactActions — renders an A2UI "actions" artifact as a set of action chips.
 *
 * Clicking a chip fires onAction(item). The parent (UnifiedCopilotDock) wires
 * onAction to send item.prompt (when set) as a new user message — the standard
 * copilot send path. Bilingual labels. RTL-safe.
 *
 * Rules: Rule 7 (displayName), Rule 8 (bilingual/RTL), Rule 16 (Sentra style).
 */

import type { A2UIActionItem, A2UIActionsData } from './types'

export interface ArtifactActionsProps {
  data: A2UIActionsData
  /** Called when the user clicks an action chip. */
  onAction?: (item: A2UIActionItem) => void
  language?: 'en' | 'ar'
  dir?: 'ltr' | 'rtl'
}

const ArtifactActions = ({ data, onAction, language = 'en', dir }: ArtifactActionsProps) => {
  const resolvedDir = dir ?? (language === 'ar' ? 'rtl' : 'ltr')

  if (!data.items || data.items.length === 0) {
    return null
  }

  const handleClick = (item: A2UIActionItem) => {
    onAction?.(item)
  }

  return (
    <div
      className="flex flex-wrap gap-2"
      dir={resolvedDir}
      role="group"
      aria-label={language === 'ar' ? 'إجراءات مقترحة' : 'Suggested actions'}
    >
      {data.items.map(item => {
        const label = language === 'ar' && item.label_ar ? item.label_ar : item.label_en
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleClick(item)}
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

ArtifactActions.displayName = 'ArtifactActions'

export { ArtifactActions }
