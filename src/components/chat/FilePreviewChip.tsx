'use client'

import { X, FileText, Image, File } from 'lucide-react'
import type { ChatAttachment } from '../copilot/types'

// Re-export type for consumers who import from this module
export type { ChatAttachment }

// ── Helpers ────────────────────────────────────────────────────────────────────

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return Image
  if (type === 'application/pdf' || type.startsWith('text/')) return FileText
  return File
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface FilePreviewChipProps {
  attachment: ChatAttachment
  onRemove: () => void
  /** UI language — used for aria labels */
  language?: 'en' | 'ar'
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * FilePreviewChip
 *
 * Compact chip showing an attached file with a remove button.
 * Image files show a thumbnail; others show a type icon.
 *
 * AuthImage dep removed — uses a plain <img> which is fine inside the design
 * system (no Next.js Image optimisation needed here).
 */
const FilePreviewChip = ({ attachment, onRemove, language = 'en' }: FilePreviewChipProps) => {
  const Icon = getFileIcon(attachment.type)
  const isImage = attachment.type.startsWith('image/')
  const previewSrc = attachment.data || attachment.url || ''

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-muted border border-border rounded-lg text-xs max-w-[180px] group">
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
        <img src={previewSrc} alt={attachment.name} className="w-5 h-5 rounded object-cover shrink-0" />
      ) : (
        <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      )}
      <span className="truncate text-foreground">{attachment.name}</span>
      <button
        onClick={onRemove}
        className="ms-auto shrink-0 p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors duration-fast ease-standard"
        aria-label={language === 'ar' ? 'إزالة' : 'Remove'}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

FilePreviewChip.displayName = 'FilePreviewChip'

export default FilePreviewChip