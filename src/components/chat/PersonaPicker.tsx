'use client'

/**
 * PersonaPicker — shared persona selector bar.
 *
 * Ported from sentra-next app/src/components/chat/PersonaPicker.tsx.
 *
 * App deps removed:
 *   useLanguage          → `language` prop (defaults to 'en')
 *   @/components/ui/*    → ../ui/*
 *   ChatPersona (hook)   → local re-export of the type from copilot/types
 *
 * Persona label translation is handled via an injected `t` function or a
 * default English-only fallback. Consumers that need Arabic labels pass a `t`
 * prop that reads from their i18n system.
 *
 * Used by: UnifiedCopilotDock collapsed bar, the full /chat page shell.
 */

import { Target, Compass, Pen, Scale, ShieldAlert } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@togo-framework/ui-core'
import type { ChatPersona } from '../copilot/types'

// Re-export so consumers can use the type from this module
export type { ChatPersona }

export interface PersonaDef {
  id: ChatPersona
  icon: React.ElementType
  color: string
}

export const PERSONAS: PersonaDef[] = [
  { id: 'analyst',    icon: Target,      color: 'text-blue-400' },
  { id: 'strategist', icon: Compass,     color: 'text-emerald-400' },
  { id: 'journalist', icon: Pen,         color: 'text-orange-400' },
  { id: 'diplomat',   icon: Scale,       color: 'text-violet-400' },
  { id: 'critic',     icon: ShieldAlert, color: 'text-red-400' },
]

// Default English labels — consumers override with a `t` prop.
const DEFAULT_LABELS: Record<string, { label: string; desc: string }> = {
  analyst:    { label: 'Analyst',    desc: 'Deep, data-driven intelligence analysis' },
  strategist: { label: 'Strategist', desc: 'Long-range strategic planning lens' },
  journalist: { label: 'Journalist', desc: 'Clear, factual reporting perspective' },
  diplomat:   { label: 'Diplomat',   desc: 'Balanced, multi-stakeholder framing' },
  critic:     { label: 'Critic',     desc: 'Contrarian stress-testing of assumptions' },
}

const DEFAULT_LABELS_AR: Record<string, { label: string; desc: string }> = {
  analyst:    { label: 'محلل',        desc: 'تحليل معلوماتي متعمق قائم على البيانات' },
  strategist: { label: 'استراتيجي',  desc: 'منظور تخطيط استراتيجي بعيد المدى' },
  journalist: { label: 'صحفي',       desc: 'منظور إعلامي واضح وموضوعي' },
  diplomat:   { label: 'دبلوماسي',   desc: 'إطار متوازن متعدد الأطراف' },
  critic:     { label: 'ناقد',       desc: 'اختبار افتراضات من منظور مضاد' },
}

export interface PersonaPickerProps {
  value: ChatPersona
  onChange: (persona: ChatPersona) => void
  disabled?: boolean
  /** UI language. Defaults to 'en'. */
  language?: 'en' | 'ar'
  /**
   * Optional translation function. Called with keys like `chat.persona.analyst`
   * and `chat.persona.analyst.desc`. When omitted, the built-in EN/AR labels
   * are used.
   */
  t?: (key: string) => string
}

const PersonaPicker = ({
  value,
  onChange,
  disabled = false,
  language = 'en',
  t,
}: PersonaPickerProps) => {
  const isAr = language === 'ar'

  const getLabel = (id: string): string => {
    if (t) return t(`chat.persona.${id}`)
    const map = isAr ? DEFAULT_LABELS_AR : DEFAULT_LABELS
    return map[id]?.label ?? id
  }

  const getDesc = (id: string): string => {
    if (t) return t(`chat.persona.${id}.desc`)
    const map = isAr ? DEFAULT_LABELS_AR : DEFAULT_LABELS
    return map[id]?.desc ?? id
  }

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex items-center gap-1" dir={isAr ? 'rtl' : 'ltr'}>
        {PERSONAS.map((p) => {
          const Icon = p.icon
          const isActive = value === p.id
          return (
            <Tooltip key={p.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onChange(p.id)}
                  disabled={disabled}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all duration-fast ease-standard ${
                    isActive
                      ? 'bg-primary/15 border border-primary/40 text-foreground'
                      : 'bg-muted/50 border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <Icon className={`w-3 h-3 ${isActive ? p.color : ''}`} />
                  <span>{getLabel(p.id)}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" dir={isAr ? 'rtl' : 'ltr'} className="text-xs max-w-[180px] text-center">
                {getDesc(p.id)}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}

PersonaPicker.displayName = 'PersonaPicker'
export default PersonaPicker