'use client'

import { useState, useMemo } from 'react'
import {
  Search, Database, Globe, Sparkles, Check, ChevronDown, ExternalLink,
  Brain, Microscope, Newspaper, FileText, Clock,
  X as XIcon, CircleDot,
} from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@togo-framework/ui-core'
import type { AgentStep } from './types'

// Re-export for consumers
export type { AgentStep }

// ── Types ──────────────────────────────────────────────────────────────────────

interface AgentStepsProps {
  steps: AgentStep[]
  isStreaming: boolean
  /** UI language. Defaults to 'en'. */
  language?: 'en' | 'ar'
  /** Text direction. Inferred from language when not provided. */
  dir?: 'ltr' | 'rtl'
}

// ── Translation maps ───────────────────────────────────────────────────────────

const STEP_MSG_AR: Record<string, string> = {
  'Searching internal knowledge...': 'البحث في قاعدة المعرفة الداخلية...',
  'No internal matches found': 'لا توجد نتائج داخلية',
  'Searching the web...': 'البحث في الويب...',
  'No web results found': 'لا توجد نتائج ويب',
  'Searching X/Twitter for public discourse...': 'البحث في منصة X عن الخطاب العام...',
  'No social posts found': 'لا توجد منشورات',
  'Searching latest news...': 'البحث في الأخبار الأخيرة...',
  'No news results found': 'لا توجد نتائج إخبارية',
  'Composing response...': 'صياغة الرد...',
  'Formulating response...': 'أصوغ الرد...',
  'Answering from screen context...': 'الإجابة من سياق الشاشة...',
  'Files processed': 'تم معالجة الملفات',
  'Documents loaded': 'تم قراءة المستندات',
  'Recalling from memory...': 'أستحضر من الذاكرة...',
  'Profile recalled': 'تم استحضار الملف الشخصي',
  'Reflecting on public record...': 'أتأمل في السجل العام...',
  'No additional context needed': 'لا توجد معلومات إضافية',
  'Deep research in progress...': 'بحث عميق قيد التنفيذ...',
  'No deep research results found': 'لم يتم العثور على نتائج',
  'Entity already exists': 'الجهة موجودة بالفعل',
  'New entity created': 'تم إنشاء جهة جديدة',
  'Narrative already exists': 'الرواية موجودة بالفعل',
  'New narrative added': 'تمت إضافة رواية جديدة',
  'Narrative enhanced': 'تم تحسين الرواية',
  'Narrative not found': 'الرواية غير موجودة',
  'Analysis complete': 'اكتمل التحليل',
}

const STEP_MSG_AR_PATTERNS: Array<{ pattern: RegExp; replace: (m: RegExpMatchArray) => string }> = [
  { pattern: /^Found (\d+) web sources?$/, replace: m => `تم العثور على ${m[1]} مصدر` },
  { pattern: /^Found (\d+) social posts?$/, replace: m => `تم العثور على ${m[1]} منشور` },
  { pattern: /^Found (\d+) news sources?$/, replace: m => `تم العثور على ${m[1]} مصدر إخباري` },
  { pattern: /^Reviewed (\d+) sources?$/, replace: m => `تم مراجعة ${m[1]} مصادر` },
  { pattern: /^(\d+) high-relevance.*$/, replace: m => `${m[1]} نتيجة عالية الصلة` },
  { pattern: /^Synthesizing from (\d+) sources?\.\.\.$/, replace: m => `تجميع من ${m[1]} مصدر...` },
  { pattern: /^Processing (\d+) attached files?\.\.\.$/,replace: m => `معالجة ${m[1]} ملف مرفق...` },
  { pattern: /^Reading (\d+) documents?\.\.\.$/,replace: m => `قراءة ${m[1]} مستند...` },
  { pattern: /^Profiling "(.+)" as (.+)\.\.\.$/, replace: m => `جارٍ تسجيل "${m[1]}" كـ ${m[2]}...` },
  { pattern: /^Adding narrative "(.+)"\.\.\.$/, replace: m => `جارٍ إضافة الرواية "${m[1]}"...` },
  { pattern: /^Enhancing narrative\.\.\.$/, replace: () => 'جارٍ تحسين الرواية...' },
  { pattern: /^Deep research complete: (\d+) sources? \((.+)\)$/, replace: m => `بحث عميق مكتمل: ${m[1]} مصدر (${m[2]})` },
  { pattern: /^Scanned (\d+) social posts/, replace: m => `تم مسح ${m[1]} منشور اجتماعي` },
  { pattern: /^Re-profiling as (.+)$/, replace: m => `إعادة تسجيل كـ ${m[1]}` },
  { pattern: /^Running (.+)\.\.\.$/, replace: m => `جارٍ تشغيل ${m[1]}...` },
  { pattern: /^(.+) complete$/, replace: m => `اكتمل ${m[1]}` },
]

const SOURCE_LABEL_AR: Record<string, string> = {
  'Internal Narrative': 'سردية داخلية',
  'Alert Record': 'سجل إشارة',
  'Entity Profile': 'ملف جهة',
  'Internal Document': 'مستند داخلي',
}

function translateStepMessage(message: string, language: string): string {
  if (language !== 'ar') return message
  if (STEP_MSG_AR[message]) return STEP_MSG_AR[message]
  for (const { pattern, replace } of STEP_MSG_AR_PATTERNS) {
    const match = message.match(pattern)
    if (match) return replace(match)
  }
  return message
}

function translateSource(source: string, language: string): string {
  if (language !== 'ar') return source
  return SOURCE_LABEL_AR[source] || source
}

// ── Step icons ─────────────────────────────────────────────────────────────────

const STEP_ICONS: Record<string, { active: typeof Search; complete: typeof Search }> = {
  rag_search:            { active: Search,     complete: Database   },
  rag_results:           { active: Database,   complete: Database   },
  web_search:            { active: Globe,      complete: Globe      },
  web_results:           { active: Globe,      complete: Globe      },
  news_search:           { active: Newspaper,  complete: Newspaper  },
  news_results:          { active: Newspaper,  complete: Newspaper  },
  social_search:         { active: CircleDot,  complete: CircleDot  },
  social_results:        { active: CircleDot,  complete: CircleDot  },
  deep_research:         { active: Microscope, complete: Microscope },
  deep_research_searching:{ active: Search,    complete: Search     },
  deep_research_reading: { active: Globe,      complete: Globe      },
  deep_research_thinking:{ active: Brain,      complete: Brain      },
  deep_research_progress:{ active: Clock,      complete: Clock      },
  deep_research_results: { active: Microscope, complete: Microscope },
  file_processing:       { active: FileText,   complete: FileText   },
  tool_check:            { active: Search,     complete: Check      },
  profile_entity:        { active: Search,     complete: Search     },
  profile_result:        { active: Search,     complete: Check      },
  track_narrative:       { active: Search,     complete: Search     },
  narrative_result:      { active: Search,     complete: Check      },
  composing:             { active: Sparkles,   complete: Sparkles   },
  twin_recall:           { active: Brain,      complete: Brain      },
  twin_reflect:          { active: Globe,      complete: Globe      },
  twin_composing:        { active: Sparkles,   complete: Sparkles   },
  compare_detect:        { active: Search,     complete: Search     },
  compare_profiling:     { active: Clock,      complete: Check      },
  compare_factors:       { active: Sparkles,   complete: Sparkles   },
  compare_running:       { active: Clock,      complete: Clock      },
  compare_result:        { active: Check,      complete: Check      },
  auto_profile:          { active: Search,     complete: Check      },
  compare_ready:         { active: Check,      complete: Check      },
}

type StepState = 'active' | 'complete' | 'error'

function getStepState(step: AgentStep, allSteps: AgentStep[], isStreaming?: boolean): StepState {
  if (isStreaming === false) return 'complete'
  if (step.step.endsWith('_results') || step.step === 'profile_result' || step.step === 'narrative_result' || step.step === 'deep_research_results') return 'complete'
  if (step.step === 'rag_search'    && allSteps.some(s => s.step === 'rag_results'))    return 'complete'
  if (step.step === 'web_search'    && allSteps.some(s => s.step === 'web_results'))    return 'complete'
  if (step.step === 'news_search'   && allSteps.some(s => s.step === 'news_results'))   return 'complete'
  if (step.step === 'social_search' && allSteps.some(s => s.step === 'social_results')) return 'complete'
  if (step.step === 'deep_research' && allSteps.some(s => s.step === 'deep_research_results')) return 'complete'
  if (['deep_research_searching', 'deep_research_reading', 'deep_research_thinking', 'deep_research_progress'].includes(step.step)) {
    const idx = allSteps.indexOf(step)
    if (allSteps.slice(idx + 1).some(s => s.step.startsWith('deep_research_'))) return 'complete'
  }
  if (step.step === 'tool_check' && allSteps.some(s => s.step === 'composing' || s.step === 'profile_entity' || s.step === 'track_narrative')) return 'complete'
  if (step.step === 'profile_entity' && allSteps.some(s => s.step === 'profile_result')) return 'complete'
  if (step.step === 'track_narrative' && allSteps.some(s => s.step === 'narrative_result')) return 'complete'
  if ((step.step === 'twin_recall' || step.step === 'twin_reflect' || step.step === 'twin_composing' || step.step === 'composing' || step.step === 'auto_profile' || step.step === 'file_processing') && step.done) return 'complete'
  if (step.step === 'compare_factors' || step.step === 'compare_result') return 'complete'
  if (step.step === 'compare_detect' && allSteps.some(s => s.step === 'compare_factors' || s.step === 'compare_ready')) return 'complete'
  if (step.step === 'compare_profiling' && allSteps.some(s => s.step === 'compare_factors')) return 'complete'
  if (step.step === 'compare_running' && allSteps.some(s => s.step === 'compare_result')) return 'complete'
  if (step.done) return 'complete'
  return 'active'
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StepIndicator({ state, step }: { state: StepState; step: string }) {
  const icons = STEP_ICONS[step] || { active: Sparkles, complete: Sparkles }

  if (state === 'error') return <XIcon className="w-3 h-3 text-destructive" />

  if (state === 'complete') {
    return <Check className="w-3 h-3 text-emerald-400" />
  }

  const Icon = icons.active
  return (
    <span className="relative flex h-3 w-3 items-center justify-center">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/40" />
      <Icon className="relative w-2.5 h-2.5 text-emerald-400" />
    </span>
  )
}

function TimingBadge({ ms }: { ms?: number }) {
  if (!ms) return null
  const display = ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
  return <span className="text-[10px] text-muted-foreground/60 tabular-nums ms-1">({display})</span>
}

function SourcePills({ sources, language }: { sources?: string[]; language: string }) {
  if (!sources || sources.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {sources.slice(0, 4).map((s, i) => (
        <span key={i} className="inline-flex items-center px-1.5 py-0.5 bg-muted/50 rounded text-[10px] text-muted-foreground leading-tight">
          {translateSource(s, language)}
        </span>
      ))}
    </div>
  )
}

function DomainPills({ domains, citations }: { domains?: string[]; citations?: string[] }) {
  if (!domains || domains.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {domains.slice(0, 4).map((domain, i) => {
        const url = citations?.[i]
        return (
          <a
            key={i}
            href={url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-muted/50 rounded text-[10px] text-muted-foreground hover:text-foreground transition-colors duration-fast ease-standard leading-tight"
          >
            <ExternalLink className="w-2 h-2" />
            {domain}
          </a>
        )
      })}
    </div>
  )
}

function HandlePills({ handles }: { handles?: string[] }) {
  if (!handles || handles.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {handles.slice(0, 4).map((h, i) => (
        <a
          key={i}
          href={`https://x.com/${h}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-1.5 py-0.5 bg-muted/50 rounded text-[10px] text-muted-foreground hover:text-foreground transition-colors duration-fast ease-standard leading-tight"
        >
          @{h}
        </a>
      ))}
    </div>
  )
}

function StepLine({
  step,
  allSteps,
  isRTL,
  isStreaming,
  language,
}: {
  step: AgentStep
  allSteps: AgentStep[]
  isRTL: boolean
  isStreaming: boolean
  language: string
}) {
  const state = getStepState(step, allSteps, isStreaming)
  const isComplete = state === 'complete'

  return (
    <div className={`flex items-start gap-2 text-xs transition-opacity duration-300 ${isComplete ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
      <div className="mt-0.5 flex-shrink-0">
        <StepIndicator state={state} step={step.step} />
      </div>
      <div className={`flex-1 min-w-0 text-start`}>
        <span>{translateStepMessage(step.message, language)}</span>
        <TimingBadge ms={step.duration_ms} />
        {step.query && (
          <span className={`ms-1 text-foreground/50 font-mono text-[10px]`}>"{step.query}"</span>
        )}
        {step.subQuery && (
          <span className={`ms-1 text-foreground/50 font-mono text-[10px]`}>"{step.subQuery}"</span>
        )}
        <SourcePills sources={step.sources} language={language} />
        <DomainPills domains={step.domains} citations={step.citations} />
        <HandlePills handles={step.handles} />
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

/**
 * AgentSteps
 *
 * Collapsible list of streaming agent tool-call steps with real-time state
 * indicators (active/complete/error). Bilingual EN/AR, RTL-aware.
 *
 * All app deps removed — language/dir are plain props.
 */
const AgentSteps = ({ steps, isStreaming, language = 'en', dir }: AgentStepsProps) => {
  const [isExpanded, setIsExpanded] = useState(true)
  const isAr = language === 'ar'
  const isRTL = dir === 'rtl' || (dir === undefined && isAr)

  const displaySteps = useMemo(() => {
    const resultTypes = new Set(steps.filter(s => s.step.endsWith('_results')).map(s => s.step.replace('_results', '_search')))
    const hasDeepResults = steps.some(s => s.step === 'deep_research_results')
    return steps.filter(s => {
      if (s.step.endsWith('_search') && !s.step.startsWith('deep_research_') && resultTypes.has(s.step)) return false
      if (s.step === 'deep_research' && steps.some(ss => ss.step.startsWith('deep_research_') && ss.step !== 'deep_research' && ss.step !== 'deep_research_results')) return false
      if (hasDeepResults && ['deep_research_searching', 'deep_research_reading', 'deep_research_thinking', 'deep_research_progress'].includes(s.step)) return false
      return true
    })
  }, [steps])

  if (steps.length === 0) return null

  const ragResult    = steps.find(s => s.step === 'rag_results')
  const webResult    = steps.find(s => s.step === 'web_results')
  const socialResult = steps.find(s => s.step === 'social_results')

  const summaryParts: string[] = []
  if (ragResult?.count)    summaryParts.push(isAr ? `${ragResult.count} داخلي`    : `${ragResult.count} internal`)
  if (webResult?.count)    summaryParts.push(isAr ? `${webResult.count} ويب`       : `${webResult.count} web`)
  if (socialResult?.count) summaryParts.push(isAr ? `${socialResult.count} تواصل`  : `${socialResult.count} social`)

  const totalDuration = [ragResult, webResult, socialResult].reduce((sum, s) => sum + (s?.duration_ms || 0), 0)

  const allDone = !isStreaming || steps.some(s => s.step === 'composing' || s.step === 'twin_composing')
  const summary = summaryParts.length > 0
    ? (isAr
      ? `تم تحليل ${summaryParts.join('، ')} مصادر${totalDuration ? ` (${(totalDuration / 1000).toFixed(1)}ث)` : ''}`
      : `Analyzed ${summaryParts.join(', ')} sources${totalDuration ? ` (${(totalDuration / 1000).toFixed(1)}s)` : ''}`)
    : allDone
      ? (isAr ? 'اكتمل التحليل' : 'Analysis complete')
      : (isAr ? 'جارٍ البحث...' : 'Searching...')

  const triggerIcon = !isStreaming || allDone
    ? <Check className="w-3 h-3 text-emerald-400" />
    : (
      <span className="relative flex h-3 w-3 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/40" />
        <Search className="relative w-2.5 h-2.5 text-emerald-400" />
      </span>
    )

  return (
    // dir set locally so flex order, borders, and text alignment mirror natively
    // in RTL without manual flex-row-reverse flips (which double-flip when an
    // ancestor already sets dir="rtl", e.g. inside UnifiedCopilotDock).
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded} dir={isRTL ? 'rtl' : 'ltr'}>
      <CollapsibleTrigger
        className={`flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-fast ease-standard cursor-pointer py-1`}
      >
        {triggerIcon}
        <span>{summary}</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-fast ease-standard ${isExpanded ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className={`mt-1 space-y-1.5 border-border ps-1 border-s-2 ms-1.5`}>
          {displaySteps.map((s, i) => (
            <StepLine
              key={`${s.step}-${i}`}
              step={s}
              allSteps={steps}
              isRTL={isRTL}
              isStreaming={isStreaming}
              language={language}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

AgentSteps.displayName = 'AgentSteps'

export default AgentSteps