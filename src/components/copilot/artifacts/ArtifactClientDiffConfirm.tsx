'use client'

/**
 * ArtifactClientDiffConfirm — renders a "client_diff_confirm" artifact.
 *
 * Displays a two-column before/after diff table the user must confirm before
 * the save is committed. Posts a "confirm_diff" ArtifactInteraction with
 * { confirmed: true } or { confirmed: false }.
 *
 * Rules: Rule 7 (displayName), Rule 8 (bilingual/RTL), Rule 16 (Sentra style),
 *        Rule 25 (product-agnostic — no context reads, no fetching).
 */

import type { A2UIClientDiffConfirmData, ArtifactInteraction } from './types'

export interface ArtifactClientDiffConfirmProps {
  data: A2UIClientDiffConfirmData
  /** Fired when the user confirms or cancels the diff. Carries a "confirm_diff" interaction. */
  onInteract?: (interaction: ArtifactInteraction) => void
  language?: 'en' | 'ar'
  dir?: 'ltr' | 'rtl'
}

const ArtifactClientDiffConfirm = ({
  data,
  onInteract,
  language = 'en',
  dir,
}: ArtifactClientDiffConfirmProps) => {
  const resolvedDir = dir ?? (language === 'ar' ? 'rtl' : 'ltr')

  if (!data.rows || data.rows.length === 0) return null

  const title =
    language === 'ar' && data.title_ar ? data.title_ar : data.title_en
  const confirmLabel =
    language === 'ar' && data.confirm_label_ar
      ? data.confirm_label_ar
      : data.confirm_label_en
  const cancelLabel = language === 'ar' ? 'إلغاء' : 'Cancel'
  const oldColLabel = language === 'ar' ? 'القديم' : 'Before'
  const newColLabel = language === 'ar' ? 'الجديد' : 'After'

  const handleConfirm = () => {
    onInteract?.({ kind: 'confirm_diff', payload: { confirmed: true } })
  }

  const handleCancel = () => {
    onInteract?.({ kind: 'confirm_diff', payload: { confirmed: false } })
  }

  return (
    <div
      className="rounded-lg border border-border bg-card overflow-hidden"
      dir={resolvedDir}
    >
      {/* Title bar */}
      {title && (
        <div className="px-3 py-2 border-b border-border bg-muted/40">
          <p className="text-xs font-semibold text-foreground" dir="auto">
            {title}
          </p>
        </div>
      )}

      {/* Diff rows */}
      <div className="divide-y divide-border">
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 px-3 py-1.5 bg-muted/20 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
          <span>{language === 'ar' ? 'الحقل' : 'Field'}</span>
          <span>{oldColLabel}</span>
          <span className="text-success">{newColLabel}</span>
        </div>

        {data.rows.map(row => {
          const label = language === 'ar' && row.label_ar ? row.label_ar : row.label_en
          return (
            <div
              key={row.field}
              className="grid grid-cols-[1fr_1fr_1fr] gap-2 items-start px-3 py-2 text-xs"
            >
              <span className="text-muted-foreground font-medium leading-snug">
                {label}
              </span>
              <span
                className="text-foreground/50 line-through truncate leading-snug"
                aria-label={oldColLabel}
              >
                {row.old !== undefined && row.old !== '' ? row.old : '—'}
              </span>
              <span
                className="text-success font-medium truncate leading-snug"
                aria-label={newColLabel}
              >
                {row.new}
              </span>
            </div>
          )
        })}
      </div>

      {/* Action buttons */}
      <div
        className="px-3 py-2.5 border-t border-border bg-muted/20 flex items-center gap-2 justify-end"
        dir={resolvedDir}
      >
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-md border border-border bg-transparent px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  )
}

ArtifactClientDiffConfirm.displayName = 'ArtifactClientDiffConfirm'

export { ArtifactClientDiffConfirm }
