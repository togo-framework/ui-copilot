'use client'

import { Wrench, Loader2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@togo-framework/ui-core'
import { Badge } from '@togo-framework/ui-core'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CopilotTool {
  slug: string
  kind: string
  name_en: string
  name_ar: string
  manifest?: Record<string, unknown>
}

interface CopilotToolsPanelProps {
  /** Tool list — fetched by the product from its own endpoint */
  tools?: CopilotTool[]
  isLoading?: boolean
  isError?: boolean
  /** UI language. Defaults to 'en'. */
  language?: 'en' | 'ar'
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const KIND_LABELS: Record<string, { en: string; ar: string; color: string }> = {
  tool:  { en: 'Tool',  ar: 'أداة',  color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  agent: { en: 'Agent', ar: 'وكيل',  color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  skill: { en: 'Skill', ar: 'مهارة', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  mcp:   { en: 'MCP',   ar: 'MCP',   color: 'bg-purple-500/15 text-purple-600 dark:text-purple-400' },
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * CopilotToolsPanel
 *
 * Displays the list of ADK tools available to the copilot. Pure presentation —
 * the product fetches the tool list and passes it as props. No bridge import.
 *
 * RTL-aware: logical Tailwind classes (ms-*, me-*, ps-*, pe-*).
 * Bilingual: name resolved from name_ar / name_en by language prop.
 */
const CopilotToolsPanel = ({
  tools = [],
  isLoading = false,
  isError = false,
  language = 'en',
}: CopilotToolsPanelProps) => {
  const isAR = language === 'ar'
  const heading = isAR ? 'الأدوات المتاحة' : 'Available Tools'
  const emptyMsg = isAR ? 'لا توجد أدوات مفعّلة لدورك.' : 'No tools enabled for your role.'
  const errorMsg = isAR ? 'تعذّر تحميل الأدوات.' : 'Failed to load tools.'

  return (
    <Card className="rounded-xl border border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Wrench className="w-4 h-4 shrink-0 text-muted-foreground" />
          {heading}
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {isAR ? 'جارٍ التحميل...' : 'Loading…'}
          </div>
        )}

        {isError && !isLoading && (
          <div className="flex items-center gap-2 text-sm text-destructive py-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {errorMsg}
          </div>
        )}

        {!isLoading && !isError && tools.length === 0 && (
          <p className="text-sm text-muted-foreground py-2">{emptyMsg}</p>
        )}

        {!isLoading && !isError && tools.length > 0 && (
          <ul className="space-y-2">
            {tools.map((tool) => {
              const name = isAR ? tool.name_ar || tool.name_en : tool.name_en
              const kindMeta = KIND_LABELS[tool.kind] ?? KIND_LABELS.tool
              const kindLabel = isAR ? kindMeta.ar : kindMeta.en

              return (
                <li
                  key={tool.slug}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <span className="font-medium text-foreground truncate">{name}</span>
                  <Badge
                    variant="outline"
                    className={`shrink-0 text-[11px] px-1.5 py-0.5 border-0 ${kindMeta.color}`}
                  >
                    {kindLabel}
                  </Badge>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

CopilotToolsPanel.displayName = 'CopilotToolsPanel'

export default CopilotToolsPanel
