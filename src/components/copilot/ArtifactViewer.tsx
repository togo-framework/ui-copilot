'use client'

import type { ArtifactPayload } from './types'

// ── Types ──────────────────────────────────────────────────────────────────────

interface ArtifactViewerProps {
  artifact: ArtifactPayload
  /** UI language. Defaults to 'en'. */
  language?: 'en' | 'ar'
  /** Text direction. Inferred from language when not provided. */
  dir?: 'ltr' | 'rtl'
}

// ── Individual renderers ───────────────────────────────────────────────────────

const MapOfEventsArtifact = ({ data, language = 'en' }: { data: unknown; language?: string }) => (
  <div className="rounded-lg border border-border bg-muted/40 p-3">
    <p className="text-xs font-medium text-muted-foreground mb-2">
      {language === 'ar' ? 'خريطة الأحداث' : 'Map of Events'}
    </p>
    <pre className="text-xs text-foreground/80 overflow-auto max-h-48 whitespace-pre-wrap break-all">
      {JSON.stringify(data, null, 2)}
    </pre>
  </div>
)
MapOfEventsArtifact.displayName = 'MapOfEventsArtifact'

const TimelineArtifact = ({ data, language = 'en' }: { data: unknown; language?: string }) => (
  <div className="rounded-lg border border-border bg-muted/40 p-3">
    <p className="text-xs font-medium text-muted-foreground mb-2">
      {language === 'ar' ? 'الجدول الزمني' : 'Timeline'}
    </p>
    <pre className="text-xs text-foreground/80 overflow-auto max-h-48 whitespace-pre-wrap break-all">
      {JSON.stringify(data, null, 2)}
    </pre>
  </div>
)
TimelineArtifact.displayName = 'TimelineArtifact'

const NetworkGraphArtifact = ({ data, language = 'en' }: { data: unknown; language?: string }) => (
  <div className="rounded-lg border border-border bg-muted/40 p-3">
    <p className="text-xs font-medium text-muted-foreground mb-2">
      {language === 'ar' ? 'رسم الشبكة' : 'Network Graph'}
    </p>
    <pre className="text-xs text-foreground/80 overflow-auto max-h-48 whitespace-pre-wrap break-all">
      {JSON.stringify(data, null, 2)}
    </pre>
  </div>
)
NetworkGraphArtifact.displayName = 'NetworkGraphArtifact'

const KpiCardArtifact = ({ data, language = 'en' }: { data: unknown; language?: string }) => (
  <div className="rounded-lg border border-border bg-muted/40 p-3">
    <p className="text-xs font-medium text-muted-foreground mb-2">
      {language === 'ar' ? 'مؤشرات الأداء' : 'KPI Card'}
    </p>
    <pre className="text-xs text-foreground/80 overflow-auto max-h-48 whitespace-pre-wrap break-all">
      {JSON.stringify(data, null, 2)}
    </pre>
  </div>
)
KpiCardArtifact.displayName = 'KpiCardArtifact'

const FallbackArtifact = ({ slug, data, language = 'en' }: { slug: string; data: unknown; language?: string }) => (
  <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
    <p className="text-xs font-medium text-muted-foreground mb-1">
      {language === 'ar' ? `مكوّن: ${slug}` : `Artifact: ${slug}`}
    </p>
    <pre className="text-xs text-foreground/70 overflow-auto max-h-48 whitespace-pre-wrap break-all">
      {JSON.stringify(data, null, 2)}
    </pre>
  </div>
)
FallbackArtifact.displayName = 'FallbackArtifact'

// ── Main component ─────────────────────────────────────────────────────────────

/**
 * ArtifactViewer
 *
 * Switches on `artifact.controller_slug` to render the appropriate visualisation.
 * Supported slugs:
 *   - map-of-events
 *   - timeline
 *   - network-graph
 *   - kpi-card
 *
 * All others render a JSON fallback. All app dependencies removed — language/dir
 * are plain props.
 */
const ArtifactViewer = ({ artifact, language = 'en', dir }: ArtifactViewerProps) => {
  const resolvedDir = dir ?? (language === 'ar' ? 'rtl' : 'ltr')
  const title = language === 'ar'
    ? (artifact.title_ar || artifact.title || artifact.controller_slug)
    : (artifact.title || artifact.controller_slug)

  return (
    <div className="space-y-1.5" dir={resolvedDir}>
      {title && (
        <p className="text-xs font-semibold text-foreground/70 px-0.5">{title}</p>
      )}
      {(() => {
        switch (artifact.controller_slug) {
          case 'map-of-events':
            return <MapOfEventsArtifact data={artifact.data} language={language} />
          case 'timeline':
            return <TimelineArtifact data={artifact.data} language={language} />
          case 'network-graph':
            return <NetworkGraphArtifact data={artifact.data} language={language} />
          case 'kpi-card':
            return <KpiCardArtifact data={artifact.data} language={language} />
          default:
            return <FallbackArtifact slug={artifact.controller_slug} data={artifact.data} language={language} />
        }
      })()}
    </div>
  )
}

ArtifactViewer.displayName = 'ArtifactViewer'

export default ArtifactViewer
