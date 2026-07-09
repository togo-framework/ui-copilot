'use client'

import { MarkdownRenderer } from '@togo-framework/ui-markdown'
import { cn } from '@togo-framework/ui-core'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface MarkdownContentProps {
  /** Markdown source — typically an assistant chat message. */
  content: string
  /** Text direction. RTL maps to the Arabic locale of the renderer. Default 'ltr'. */
  dir?: 'ltr' | 'rtl'
  /** Extra classes merged onto the wrapper. */
  className?: string
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * MarkdownContent — shared markdown renderer for assistant chat messages
 * (copilot dock, chat thread, project chat).
 *
 * Delegates to the kit's `MarkdownRenderer`, so a full assistant reply parses
 * over the SAME rich pipeline as standalone markdown: GFM tables render through
 * the sortable **DataTable** (with CSV export), fenced code blocks become the
 * **CodeBlock** (copy + PNG export, syntax-highlighted), ```mermaid fences render
 * as diagrams. Raw HTML is not rendered (no rehype-raw). Artifacts (a2ui blocks)
 * are stripped by the provider and rendered separately, so an assistant turn
 * shows BOTH its markdown text and its artifacts.
 */
const MarkdownContent = ({ content, dir = 'ltr', className }: MarkdownContentProps) => (
  <MarkdownRenderer
    content={content}
    language={dir === 'rtl' ? 'ar' : 'en'}
    className={cn('text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0', className)}
  />
)

MarkdownContent.displayName = 'MarkdownContent'

export default MarkdownContent
