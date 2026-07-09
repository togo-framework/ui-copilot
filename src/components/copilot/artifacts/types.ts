'use client'

/**
 * A2UI artifact types — client-side mirror of cortex/internal/copilot/sse.go A2UIArtifact.
 *
 * Wire contract (version 1, additive):
 *   {"type":"artifact","artifact":{"version":1,"kind":"table|chart|card|actions|markdown",
 *     "title_en":"...","title_ar":"...","data":{...}}}
 *
 * Rule 8: bilingual — both title_en and title_ar carried; renderer picks by language prop.
 * Rule 25: product-agnostic — no fetching, no context reads, pure typed shapes.
 *
 * Adding a new kind: add its data type here, add a case in ArtifactRenderer.tsx.
 * The unknown-kind fallback in ArtifactRenderer renders a labeled JSON <details> block —
 * forward-compatible for future kinds without a consumer upgrade.
 */

// ── Per-kind data types ───────────────────────────────────────────────────────

/** A column descriptor in an A2UI table artifact. */
export interface A2UITableColumn {
  /** Stable accessor key — matches the property names in each row object. */
  key: string
  /** English column header. */
  label_en: string
  /** Arabic column header (optional; falls back to label_en). */
  label_ar?: string
}

/**
 * Data payload for kind: "table". Two wire shapes are accepted (ArtifactTable
 * normalizes both):
 *  - SIMPLE (what the model emits): columns: string[], rows: unknown[][]
 *  - RICH: columns: A2UITableColumn[], rows: Array<Record<string, unknown>>
 */
export interface A2UITableData {
  columns: Array<string | A2UITableColumn>
  rows: Array<Record<string, unknown> | unknown[]>
}

/** One data series in an A2UI chart. */
export interface A2UIChartSeries {
  label_en: string
  label_ar?: string
  points: Array<{ x: string | number; y: number }>
}

/** Data payload for kind: "chart". */
export interface A2UIChartData {
  type: 'bar' | 'line' | 'pie'
  series: A2UIChartSeries[]
}

/** One field row in an A2UI card. */
export interface A2UICardField {
  label: string
  value: string | number
}

/** Tone for a card metric tile — drives its color coding. */
export type A2UICardTone = 'positive' | 'negative' | 'neutral'

/** A named icon for a metric tile (resolved to a lucide icon by the renderer). */
export type A2UICardIcon =
  | 'trend' | 'users' | 'clock' | 'source' | 'shield' | 'chart' | 'alert' | 'check' | 'globe'

/** One metric tile in the rich card grid. */
export interface A2UICardMetric {
  label_en: string
  label_ar?: string
  value: string | number
  /** positive → green, negative → red, neutral → muted. Default neutral. */
  tone?: A2UICardTone
  icon?: A2UICardIcon
  /** Optional tiny sparkline values for the tile. */
  trend?: number[]
}

/**
 * Data payload for kind: "card".
 *
 * Two shapes are supported:
 *  - Simple: body_en/ar + fields (key/value rows).
 *  - Rich (intelligence card): summary_en/ar headline + a 2-col grid of metric
 *    tiles + a related-items list + a footer recommendation. The renderer prefers
 *    the rich shape when `metrics`/`summary` are present, else falls back to body.
 */
export interface A2UICardData {
  title_en?: string
  title_ar?: string
  body_en?: string
  body_ar?: string
  /** Headline finding sentence (rich card). */
  summary_en?: string
  summary_ar?: string
  /** Severity level — maps to SeverityChip tokens when provided. */
  severity?: 'critical' | 'high' | 'medium' | 'low'
  /** Key/value detail rows rendered below the body (simple shape). */
  fields?: A2UICardField[]
  /** Metric tiles rendered as a 2-column grid (rich shape). */
  metrics?: A2UICardMetric[]
  /** Related items list (rich shape). */
  related_en?: string[]
  related_ar?: string[]
  /** Footer recommendation / note (rich shape). */
  footer_en?: string
  footer_ar?: string
}

/** One action item in an A2UI actions artifact. */
export interface A2UIActionItem {
  id: string
  label_en: string
  label_ar?: string
  /**
   * When provided, clicking this action sends the prompt as a new user message
   * via the onAction callback. Use this to pre-fill follow-up questions.
   */
  prompt?: string
}

/** Data payload for kind: "actions". */
export interface A2UIActionsData {
  items: A2UIActionItem[]
}

/** Data payload for kind: "markdown". */
export interface A2UIMarkdownData {
  content: string
}

// ── Client-artifact data types ────────────────────────────────────────────────

/** One candidate client returned by the discovery tool. */
export interface A2UIClientCandidate {
  name: string
  website_url?: string
  sector?: string
  summary?: string
}

/**
 * Data payload for kind: "client_candidates".
 * Renders a list of candidate clients the user can pick from.
 */
export interface A2UIClientCandidatesData {
  candidates: A2UIClientCandidate[]
  /** Optional prompt shown above the list (instruction / clarification). */
  prompt?: string
}

/** One field entry in a client field picker. */
export interface A2UIClientField {
  /** Stable field key (maps to the DB column / API field name). */
  key: string
  /** English label. */
  label_en: string
  /** Arabic label (optional; falls back to label_en). */
  label_ar?: string
  /** Current stored value (may be empty/absent). */
  current?: string
  /** AI-suggested value for this field. */
  suggested?: string
}

/**
 * Data payload for kind: "client_field_picker".
 * Lets the user select which fields to fill / confirm before saving.
 */
export interface A2UIClientFieldPickerData {
  fields: A2UIClientField[]
}

/** One diff row in a client save confirmation. */
export interface A2UIClientDiffRow {
  /** Stable field key. */
  field: string
  /** English label. */
  label_en: string
  /** Arabic label (optional). */
  label_ar?: string
  /** Current stored value (absent = field is new). */
  old?: string
  /** New / proposed value. */
  new: string
}

/**
 * Data payload for kind: "client_diff_confirm".
 * Shows a before/after diff the user must confirm before the save is committed.
 */
export interface A2UIClientDiffConfirmData {
  /** Dialog title in English. */
  title_en: string
  /** Dialog title in Arabic (optional). */
  title_ar?: string
  rows: A2UIClientDiffRow[]
  /** Confirm button label in English. */
  confirm_label_en: string
  /** Confirm button label in Arabic (optional). */
  confirm_label_ar?: string
}

/** One opening question / starter for a persona chat. */
export interface A2UIPersonaStarter {
  /** English chip label. */
  label_en: string
  /** Arabic chip label (optional; falls back to label_en). */
  label_ar?: string
  /** The prompt sent to the copilot when the user clicks this chip. */
  prompt: string
}

/**
 * Data payload for kind: "persona_starters".
 * Renders suggested opening questions that launch a persona conversation.
 */
export interface A2UIPersonaStartersData {
  starters: A2UIPersonaStarter[]
}

// ── Structured interaction post-back ─────────────────────────────────────────

/**
 * ArtifactInteraction — a structured post-back emitted by interactive artifact
 * renderers when the user makes a selection or confirms an action.
 *
 * Sent from the renderer → ArtifactRenderer → UnifiedCopilotDock →
 * CopilotProvider.handleArtifactInteract → CopilotRequest.interaction.
 *
 * Kind strings used by the four Phase-3 renderers:
 *   "select_candidate"  — user picked a client candidate
 *   "pick_fields"       — user selected fields to fill/update
 *   "confirm_diff"      — user confirmed (or cancelled) a before/after diff save
 *   "persona_start"     — user clicked a persona opening prompt chip
 *
 * The type is open (string) so future renderers can extend without a breaking
 * change; consumers should handle unknown kinds defensively.
 */
export interface ArtifactInteraction {
  kind: 'select_candidate' | 'pick_fields' | 'confirm_diff' | 'persona_start' | string
  payload: Record<string, unknown>
}

// ── Discriminated union ───────────────────────────────────────────────────────

export type A2UIKind =
  | 'table'
  | 'chart'
  | 'card'
  | 'actions'
  | 'markdown'
  | 'client_candidates'
  | 'client_field_picker'
  | 'client_diff_confirm'
  | 'persona_starters'

/**
 * A2UIArtifact — the versioned structured artifact the Cortex copilot stream emits.
 *
 * Mirrors internal/copilot/sse.go A2UIArtifact (version 1).
 *
 * `kind` is the rendering discriminator. Renderers pattern-match on it.
 * Unknown kinds are forwarded to the fallback renderer — never crash.
 *
 * `data` is typed per kind. Consumers narrow via `artifact.kind`:
 *
 * ```ts
 * if (artifact.kind === 'table') {
 *   const d = artifact.data as A2UITableData
 * }
 * ```
 */
export interface A2UIArtifact {
  /** Schema version. Currently 1. */
  version: number
  /** Rendering hint: "table" | "chart" | "card" | "actions" | "markdown" | unknown future kinds. */
  kind: string
  /** Display title in English. */
  title_en?: string
  /** Display title in Arabic. Fallback to title_en when absent. */
  title_ar?: string
  /**
   * Kind-specific payload. Cast to the matching A2UI*Data type after narrowing kind.
   * Use `unknown` to stay forward-compatible with future kinds.
   */
  data: unknown
}
