'use client'

/**
 * ArtifactClientFieldPicker — renders a "client_field_picker" artifact.
 *
 * Displays a list of client profile fields that the user can individually
 * toggle on/off before confirming. Posts a "pick_fields" ArtifactInteraction
 * with the array of selected field keys.
 *
 * Rules: Rule 7 (displayName), Rule 8 (bilingual/RTL), Rule 16 (Sentra style),
 *        Rule 25 (product-agnostic — no context reads, no fetching).
 */

import { useState } from 'react'
import type { A2UIClientFieldPickerData, ArtifactInteraction } from './types'

export interface ArtifactClientFieldPickerProps {
  data: A2UIClientFieldPickerData
  /** Fired when the user confirms the selected fields. Carries a "pick_fields" interaction. */
  onInteract?: (interaction: ArtifactInteraction) => void
  language?: 'en' | 'ar'
  dir?: 'ltr' | 'rtl'
}

const ArtifactClientFieldPicker = ({
  data,
  onInteract,
  language = 'en',
  dir,
}: ArtifactClientFieldPickerProps) => {
  const resolvedDir = dir ?? (language === 'ar' ? 'rtl' : 'ltr')

  // All fields selected by default
  const [selected, setSelected] = useState<Set<string>>(
    new Set((data.fields ?? []).map(f => f.key)),
  )

  if (!data.fields || data.fields.length === 0) return null

  const handleToggle = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleConfirm = () => {
    const fields = data.fields.filter(f => selected.has(f.key)).map(f => f.key)
    onInteract?.({ kind: 'pick_fields', payload: { fields } })
  }

  const confirmLabel = language === 'ar' ? 'تأكيد الحقول المختارة' : 'Confirm selected fields'
  const currentLabel = language === 'ar' ? 'الحالي:' : 'Current:'
  const suggestedLabel = language === 'ar' ? 'مقترح:' : 'Suggested:'

  return (
    <div className="space-y-1.5" dir={resolvedDir}>
      {data.fields.map(field => {
        const label = language === 'ar' && field.label_ar ? field.label_ar : field.label_en
        const isChecked = selected.has(field.key)

        return (
          <button
            key={field.key}
            type="button"
            onClick={() => handleToggle(field.key)}
            aria-pressed={isChecked}
            className={`w-full text-start rounded-lg border px-3 py-2 transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
              isChecked
                ? 'border-primary/40 bg-primary/5'
                : 'border-border bg-card hover:bg-muted/40'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {/* Checkbox indicator */}
              <span
                className={`mt-0.5 w-4 h-4 rounded shrink-0 flex items-center justify-center border transition-colors duration-fast ease-standard ${
                  isChecked
                    ? 'bg-primary border-primary'
                    : 'border-border bg-background'
                }`}
                aria-hidden="true"
              >
                {isChecked && (
                  <svg
                    className="w-2.5 h-2.5 text-primary-foreground"
                    fill="none"
                    viewBox="0 0 12 12"
                    aria-hidden="true"
                  >
                    <path
                      d="M2 6l3 3 5-5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground leading-snug">
                  {label}
                </p>

                {field.current && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                    <span className="font-medium">{currentLabel}</span>{' '}
                    {field.current}
                  </p>
                )}

                {field.suggested && (
                  <p className="text-[10px] text-primary mt-0.5 truncate">
                    <span className="font-medium">{suggestedLabel}</span>{' '}
                    {field.suggested}
                  </p>
                )}
              </div>
            </div>
          </button>
        )
      })}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={selected.size === 0}
        className="mt-2 w-full rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
      >
        {confirmLabel}
      </button>
    </div>
  )
}

ArtifactClientFieldPicker.displayName = 'ArtifactClientFieldPicker'

export { ArtifactClientFieldPicker }
