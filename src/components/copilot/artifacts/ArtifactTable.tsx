'use client'

/**
 * ArtifactTable — renders an A2UI "table" artifact.
 *
 * Uses the plain shadcn Table primitives (appropriate for small copilot-response
 * data — the feature-heavy DataTable is overkill for 5–50 row AI output).
 * Bilingual column headers (label_en / label_ar). RTL-safe via logical props.
 * Semantic tokens only, no hex literals.
 *
 * Rules: Rule 7 (displayName), Rule 8 (bilingual/RTL), Rule 16 (Sentra style).
 */

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@togo-framework/ui-core'
import type { A2UITableData } from './types'

export interface ArtifactTableProps {
  data: A2UITableData
  language?: 'en' | 'ar'
  dir?: 'ltr' | 'rtl'
}

const ArtifactTable = ({ data, language = 'en', dir }: ArtifactTableProps) => {
  const resolvedDir = dir ?? (language === 'ar' ? 'rtl' : 'ltr')

  // ── Normalize both wire shapes ──────────────────────────────────────────────
  // The model (per the a2ui prompt) emits the SIMPLE shape:
  //   columns: ["Provider","Models"], rows: [["Google","Gemini"], ...]
  // The rich shape is: columns: [{key,label_en,label_ar}], rows: [{key: value}].
  // Accept either so the table renders regardless of which the model produced.
  const rawCols = (data?.columns ?? []) as unknown[]
  const cols = rawCols.map((c, i) =>
    typeof c === 'string'
      ? { key: String(i), label_en: c, label_ar: c }
      : (c as { key: string; label_en: string; label_ar?: string }),
  )
  const rawRows = (data?.rows ?? []) as unknown[]
  const cellOf = (row: unknown, col: { key: string }, colIdx: number): unknown =>
    Array.isArray(row) ? row[colIdx] : (row as Record<string, unknown>)?.[col.key]

  if (cols.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        {language === 'ar' ? 'لا توجد بيانات' : 'No data'}
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border" dir={resolvedDir}>
      <Table>
        <TableHeader>
          <TableRow>
            {cols.map((col, colIdx) => (
              <TableHead
                key={col.key ?? colIdx}
                className="text-start text-xs font-semibold text-muted-foreground bg-muted/40 px-3 py-2"
              >
                {language === 'ar' && col.label_ar ? col.label_ar : col.label_en}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rawRows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={cols.length}
                className="text-center text-xs text-muted-foreground py-4"
              >
                {language === 'ar' ? 'لا توجد صفوف' : 'No rows'}
              </TableCell>
            </TableRow>
          ) : (
            rawRows.map((row, rowIdx) => (
              <TableRow key={rowIdx} className="hover:bg-muted/30 transition-colors duration-fast ease-standard">
                {cols.map((col, colIdx) => {
                  const v = cellOf(row, col, colIdx)
                  return (
                    <TableCell
                      key={col.key ?? colIdx}
                      className="text-start text-xs text-foreground px-3 py-2"
                    >
                      {v !== undefined && v !== null ? String(v) : '—'}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

ArtifactTable.displayName = 'ArtifactTable'

export { ArtifactTable }
