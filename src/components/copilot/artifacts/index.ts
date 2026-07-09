'use client'

// A2UI artifact renderer — copilot client-side rendering for structured artifacts
// streamed via the Cortex SSE channel.
//
// Public API (re-exported via src/index.ts):
//   ArtifactRenderer — top-level kind dispatcher
//   ArtifactTable, ArtifactChart, ArtifactCard, ArtifactActions, ArtifactMarkdown
//   A2UIArtifact + per-kind data types

export { ArtifactRenderer } from './ArtifactRenderer'
export type { ArtifactRendererProps } from './ArtifactRenderer'

export { ArtifactTable } from './ArtifactTable'
export type { ArtifactTableProps } from './ArtifactTable'

export { ArtifactChart } from './ArtifactChart'
export type { ArtifactChartProps } from './ArtifactChart'

export { ArtifactCard } from './ArtifactCard'
export type { ArtifactCardProps } from './ArtifactCard'

export { ArtifactActions } from './ArtifactActions'
export type { ArtifactActionsProps } from './ArtifactActions'

export { ArtifactMarkdown } from './ArtifactMarkdown'
export type { ArtifactMarkdownProps } from './ArtifactMarkdown'

export { ArtifactClientCandidates } from './ArtifactClientCandidates'
export type { ArtifactClientCandidatesProps } from './ArtifactClientCandidates'

export { ArtifactClientFieldPicker } from './ArtifactClientFieldPicker'
export type { ArtifactClientFieldPickerProps } from './ArtifactClientFieldPicker'

export { ArtifactClientDiffConfirm } from './ArtifactClientDiffConfirm'
export type { ArtifactClientDiffConfirmProps } from './ArtifactClientDiffConfirm'

export { ArtifactPersonaStarters } from './ArtifactPersonaStarters'
export type { ArtifactPersonaStartersProps } from './ArtifactPersonaStarters'

export type {
  A2UIArtifact,
  A2UIKind,
  ArtifactInteraction,
  A2UITableColumn,
  A2UITableData,
  A2UIChartSeries,
  A2UIChartData,
  A2UICardField,
  A2UICardData,
  A2UIActionItem,
  A2UIActionsData,
  A2UIMarkdownData,
  A2UIClientCandidate,
  A2UIClientCandidatesData,
  A2UIClientField,
  A2UIClientFieldPickerData,
  A2UIClientDiffRow,
  A2UIClientDiffConfirmData,
  A2UIPersonaStarter,
  A2UIPersonaStartersData,
} from './types'
