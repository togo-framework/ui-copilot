'use client'

/**
 * ArtifactRenderer — top-level dispatcher for A2UI artifacts.
 *
 * Switches on artifact.kind and delegates to the appropriate per-kind renderer.
 * Unknown kinds render a labeled JSON <details> block — forward-compatible for
 * future server kinds without a client upgrade.
 *
 * Each artifact is wrapped in a titled card shell so all kinds share a consistent
 * heading layout (title_en / title_ar from the artifact envelope). Per-kind
 * renderers focus purely on their data — they don't re-render the title.
 *
 * Props:
 *   artifact   — A2UIArtifact from the SSE stream
 *   onAction   — fired when an "actions" artifact chip is clicked; passes
 *                the A2UIActionItem. CopilotProvider wires this to send
 *                item.prompt as a new user message via the standard send path.
 *   language   — 'en' | 'ar'
 *   dir        — 'ltr' | 'rtl' (inferred from language when omitted)
 *
 * Rules: Rule 7 (displayName), Rule 8 (bilingual/RTL), Rule 16 (Sentra style),
 *        Rule 25 (product-agnostic — no context reads, no fetching).
 */

import { ArtifactTable }              from './ArtifactTable'
import { ArtifactChart }              from './ArtifactChart'
import { ArtifactCard }               from './ArtifactCard'
import { ArtifactActions }            from './ArtifactActions'
import { ArtifactMarkdown }           from './ArtifactMarkdown'
import { ArtifactClientCandidates }   from './ArtifactClientCandidates'
import { ArtifactClientFieldPicker }  from './ArtifactClientFieldPicker'
import { ArtifactClientDiffConfirm }  from './ArtifactClientDiffConfirm'
import { ArtifactPersonaStarters }    from './ArtifactPersonaStarters'
import type {
  A2UIArtifact,
  A2UIActionItem,
  ArtifactInteraction,
  A2UITableData,
  A2UIChartData,
  A2UICardData,
  A2UIActionsData,
  A2UIMarkdownData,
  A2UIClientCandidatesData,
  A2UIClientFieldPickerData,
  A2UIClientDiffConfirmData,
  A2UIPersonaStartersData,
} from './types'

export interface ArtifactRendererProps {
  artifact: A2UIArtifact
  /** Fired when the user clicks an "actions" chip — sends item.prompt as a text message. */
  onAction?: (item: A2UIActionItem) => void
  /**
   * Fired when an interactive artifact (client_candidates, client_field_picker,
   * client_diff_confirm, persona_starters) posts a structured interaction.
   * CopilotProvider wires this to handleArtifactInteract which forwards the
   * interaction to the dispatch request and suppresses the user bubble.
   */
  onInteract?: (interaction: ArtifactInteraction) => void
  language?: 'en' | 'ar'
  dir?: 'ltr' | 'rtl'
}

// ── Fallback for unknown kinds ─────────────────────────────────────────────────

interface UnknownArtifactProps {
  artifact: A2UIArtifact
  language: 'en' | 'ar'
}

const UnknownArtifact = ({ artifact, language }: UnknownArtifactProps) => (
  <details className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-xs">
    <summary className="cursor-pointer text-muted-foreground font-medium select-none">
      {language === 'ar'
        ? `عنصر غير معروف: ${artifact.kind}`
        : `Unknown artifact kind: ${artifact.kind}`}
    </summary>
    <pre className="mt-2 text-foreground/70 overflow-auto max-h-48 whitespace-pre-wrap break-all">
      {JSON.stringify(artifact.data, null, 2)}
    </pre>
  </details>
)
UnknownArtifact.displayName = 'UnknownArtifact'

// ── Main renderer ─────────────────────────────────────────────────────────────

const ArtifactRenderer = ({
  artifact,
  onAction,
  onInteract,
  language = 'en',
  dir,
}: ArtifactRendererProps) => {
  const resolvedDir = dir ?? (language === 'ar' ? 'rtl' : 'ltr')

  // Prefer artifact-envelope title in the active language.
  const titleText =
    language === 'ar'
      ? (artifact.title_ar || artifact.title_en || '')
      : (artifact.title_en || '')

  const renderBody = () => {
    switch (artifact.kind) {
      case 'table':
        return (
          <ArtifactTable
            data={artifact.data as A2UITableData}
            language={language}
            dir={resolvedDir}
          />
        )

      case 'chart':
        return (
          <ArtifactChart
            data={artifact.data as A2UIChartData}
            language={language}
            dir={resolvedDir}
          />
        )

      case 'card':
        return (
          <ArtifactCard
            data={artifact.data as A2UICardData}
            artifactTitle={titleText}
            language={language}
            dir={resolvedDir}
          />
        )

      case 'actions':
        return (
          <ArtifactActions
            data={artifact.data as A2UIActionsData}
            onAction={onAction}
            language={language}
            dir={resolvedDir}
          />
        )

      case 'markdown':
        return (
          <ArtifactMarkdown
            data={artifact.data as A2UIMarkdownData}
            language={language}
            dir={resolvedDir}
          />
        )

      case 'client_candidates':
        return (
          <ArtifactClientCandidates
            data={artifact.data as A2UIClientCandidatesData}
            onInteract={onInteract}
            language={language}
            dir={resolvedDir}
          />
        )

      case 'client_field_picker':
        return (
          <ArtifactClientFieldPicker
            data={artifact.data as A2UIClientFieldPickerData}
            onInteract={onInteract}
            language={language}
            dir={resolvedDir}
          />
        )

      case 'client_diff_confirm':
        return (
          <ArtifactClientDiffConfirm
            data={artifact.data as A2UIClientDiffConfirmData}
            onInteract={onInteract}
            language={language}
            dir={resolvedDir}
          />
        )

      case 'persona_starters':
        return (
          <ArtifactPersonaStarters
            data={artifact.data as A2UIPersonaStartersData}
            onInteract={onInteract}
            language={language}
            dir={resolvedDir}
          />
        )

      default:
        return <UnknownArtifact artifact={artifact} language={language} />
    }
  }

  return (
    <div
      className="mt-2 space-y-1.5"
      dir={resolvedDir}
      data-artifact-kind={artifact.kind}
      data-artifact-version={artifact.version}
    >
      {/* Envelope title — shown for all kinds except "card" which owns its own title */}
      {titleText && artifact.kind !== 'card' && (
        <p className="text-xs font-semibold text-foreground/70 leading-none px-0.5">
          {titleText}
        </p>
      )}

      {renderBody()}
    </div>
  )
}

ArtifactRenderer.displayName = 'ArtifactRenderer'

export { ArtifactRenderer }
