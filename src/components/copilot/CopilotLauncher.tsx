'use client'

/**
 * CopilotLauncher — @prism/ui F3
 *
 * A composable button that calls useCopilot().open(). Two variants:
 *
 *   variant="fab"     — floating action button (fixed bottom-right, z-40).
 *                       Good for apps without a header slot.
 *   variant="header"  — compact icon+label button for embedding in AppHeader's
 *                       right cluster or any nav bar.
 *
 * Bilingual label from the shared 'nav:copilot' key (EN: "Copilot", AR: "المساعد الذكي").
 * Language follows the shared LanguageProvider context automatically.
 *
 * Rules: Rule 7 (displayName, handle* events), Rule 8 (bilingual),
 *        Rule 16 (Sentra style — Tailwind tokens only).
 */

import React from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@togo-framework/ui-core'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@togo-framework/ui-core'
import { useCopilot } from './CopilotProvider'
import { useT as _useT } from '@togo-framework/ui-core'
import { cn } from '@togo-framework/ui-core'

// Safely try the shared language context — won't throw when LanguageProvider
// is absent (Storybook, isolated renders).
function useSafeT(): ReturnType<typeof _useT> | null {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return _useT()
  } catch {
    return null
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface CopilotLauncherProps {
  /**
   * "fab"    — floating action button (position: fixed, bottom-right).
   * "header" — compact icon+label for embedding in a top-nav cluster.
   * Default: "header".
   */
  variant?: 'fab' | 'header'

  /** Additional Tailwind classes */
  className?: string

  /**
   * Override label (skips the i18n lookup). Useful when the consuming app
   * has its own translation layer and wants to pass a pre-resolved string.
   */
  label?: string
}

// ── Component ─────────────────────────────────────────────────────────────────

const CopilotLauncher = ({
  variant = 'header',
  className,
  label,
}: CopilotLauncherProps) => {
  const { open, isOpen } = useCopilot()
  const ctx = useSafeT()
  const language: 'en' | 'ar' = ctx?.language ?? 'en'
  const t = ctx?.t ?? ((key: string) => key)

  const resolvedLabel = label ?? t('nav:copilot')

  const handleClick = () => {
    open()
  }

  if (variant === 'fab') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleClick}
              aria-label={resolvedLabel}
              data-testid="copilot-launcher-fab"
              className={cn(
                'fixed bottom-20 end-4 z-40',
                'h-12 w-12 rounded-full',
                'bg-primary text-primary-foreground shadow-lg',
                'flex items-center justify-center',
                'hover:bg-primary/90 transition-colors duration-fast ease-standard',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isOpen && 'ring-2 ring-primary/30',
                className,
              )}
            >
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side={language === 'ar' ? 'left' : 'right'}
            className="text-xs"
          >
            {resolvedLabel}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // header variant
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      aria-label={resolvedLabel}
      aria-pressed={isOpen}
      data-testid="copilot-launcher-header"
      className={cn(
        'flex items-center gap-1.5 h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground',
        isOpen && 'text-primary hover:text-primary',
        className,
      )}
    >
      <Sparkles className="h-4 w-4" aria-hidden="true" />
      <span className="hidden sm:inline">{resolvedLabel}</span>
    </Button>
  )
}

CopilotLauncher.displayName = 'CopilotLauncher'

export { CopilotLauncher }
export default CopilotLauncher
