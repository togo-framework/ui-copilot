'use client'

/**
 * ArtifactChart — renders an A2UI "chart" artifact.
 *
 * Uses recharts (already in package.json) for bar / line / pie. Lightweight
 * responsive wrappers — no new heavy dependency. All styling via semantic tokens.
 *
 * Supports:
 *   - bar   — BarChart (multiple series = grouped bars)
 *   - line  — LineChart (multiple series = multiple lines)
 *   - pie   — PieChart (single series, points[i].x = label, points[i].y = value)
 *
 * Bilingual: legend labels use series.label_ar when language === 'ar'.
 * RTL: recharts is LTR-native; we wrap in a div with dir="ltr" and position
 * labels manually so the chart internals stay correct regardless of page dir.
 *
 * Rules: Rule 7 (displayName), Rule 8 (bilingual/RTL), Rule 16 (Sentra style).
 */

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { A2UIChartData, A2UIChartSeries } from './types'

// ── Palette — maps to Sentra primary / accent / semantic colors ───────────────
// Values are CSS colour strings that contrast on bg-card / bg-muted surfaces.
// We avoid hex literals where possible; these are the computed outputs of the
// --primary (navy) and --gold tokens at typical dark-mode luminance values.
// Token-driven series palette — re-themes with the active theme (ToGO Flow + status).
const CHART_PALETTE = [
  'hsl(var(--primary))',
  'hsl(var(--info))',
  'hsl(var(--warning))',
  'hsl(var(--success))',
  'hsl(var(--alert-cyan))',
  'hsl(var(--muted-foreground))',
  'hsl(var(--destructive))',
]

// ── Label resolution ──────────────────────────────────────────────────────────

function seriesLabel(s: A2UIChartSeries, language: 'en' | 'ar'): string {
  return language === 'ar' && s.label_ar ? s.label_ar : s.label_en
}

// ── Bar chart ─────────────────────────────────────────────────────────────────

interface BarChartViewProps {
  series: A2UIChartSeries[]
  language: 'en' | 'ar'
}

const BarChartView = ({ series, language }: BarChartViewProps) => {
  // Reshape: [{x, s0, s1, ...}]
  const allX = Array.from(new Set(series.flatMap(s => s.points.map(p => String(p.x)))))
  const chartData = allX.map(x => {
    const row: Record<string, string | number> = { x }
    series.forEach((s, i) => {
      const pt = s.points.find(p => String(p.x) === x)
      row[`s${i}`] = pt ? pt.y : 0
    })
    return row
  })

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
        <XAxis dataKey="x" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
        <Tooltip
          contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 11 }}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
        />
        {series.length > 1 && (
          <Legend
            formatter={(value: string) => {
              const idx = Number(value.slice(1))
              return seriesLabel(series[idx], language)
            }}
            wrapperStyle={{ fontSize: 10 }}
          />
        )}
        {series.map((s, i) => (
          <Bar key={`s${i}`} dataKey={`s${i}`} fill={CHART_PALETTE[i % CHART_PALETTE.length]} radius={[2, 2, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
BarChartView.displayName = 'BarChartView'

// ── Line chart ────────────────────────────────────────────────────────────────

interface LineChartViewProps {
  series: A2UIChartSeries[]
  language: 'en' | 'ar'
}

const LineChartView = ({ series, language }: LineChartViewProps) => {
  const allX = Array.from(new Set(series.flatMap(s => s.points.map(p => String(p.x)))))
  const chartData = allX.map(x => {
    const row: Record<string, string | number> = { x }
    series.forEach((s, i) => {
      const pt = s.points.find(p => String(p.x) === x)
      row[`s${i}`] = pt ? pt.y : 0
    })
    return row
  })

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
        <XAxis dataKey="x" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
        <Tooltip
          contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 11 }}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
        />
        {series.length > 1 && (
          <Legend
            formatter={(value: string) => {
              const idx = Number(value.slice(1))
              return seriesLabel(series[idx], language)
            }}
            wrapperStyle={{ fontSize: 10 }}
          />
        )}
        {series.map((s, i) => (
          <Line
            key={`s${i}`}
            type="monotone"
            dataKey={`s${i}`}
            stroke={CHART_PALETTE[i % CHART_PALETTE.length]}
            dot={false}
            strokeWidth={2}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
LineChartView.displayName = 'LineChartView'

// ── Pie chart ─────────────────────────────────────────────────────────────────

interface PieChartViewProps {
  series: A2UIChartSeries[]
  language: 'en' | 'ar'
}

const PieChartView = ({ series, language }: PieChartViewProps) => {
  // Pie uses the first series only — each point is one slice.
  const first = series[0]
  if (!first) return null

  const pieData = first.points.map(p => ({
    name: String(p.x),
    value: p.y,
  }))

  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={70}
          paddingAngle={2}
          dataKey="value"
          label={({ name, percent }: { name: string; percent: number }) =>
            `${name} ${(percent * 100).toFixed(0)}%`
          }
          labelLine={false}
        >
          {pieData.map((_, idx) => (
            <Cell key={`cell-${idx}`} fill={CHART_PALETTE[idx % CHART_PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 11 }}
        />
        {series.length > 1 && (
          <Legend
            wrapperStyle={{ fontSize: 10 }}
          />
        )}
        {series.length === 1 && first.label_ar && language === 'ar' && first.label_ar !== first.label_en && (
          <Legend wrapperStyle={{ fontSize: 10 }} />
        )}
      </PieChart>
    </ResponsiveContainer>
  )
}
PieChartView.displayName = 'PieChartView'

// ── Main export ───────────────────────────────────────────────────────────────

export interface ArtifactChartProps {
  data: A2UIChartData
  language?: 'en' | 'ar'
  dir?: 'ltr' | 'rtl'
}

const ArtifactChart = ({ data, language = 'en' }: ArtifactChartProps) => {
  // ── Normalize both wire shapes ──────────────────────────────────────────────
  // The model (per the a2ui prompt) emits the SIMPLE Chart.js shape:
  //   {labels:["A","B"], datasets:[{label:"Series", data:[1,2]}], type?:"bar"}
  // The rich shape is: {type, series:[{label_en, points:[{x,y}]}]}.
  const raw = data as unknown as {
    type?: string
    series?: A2UIChartSeries[]
    labels?: Array<string | number>
    datasets?: Array<{ label?: string; data?: number[] }>
  }
  const type = (raw.type === 'line' || raw.type === 'pie' ? raw.type : 'bar') as 'bar' | 'line' | 'pie'
  let series: A2UIChartSeries[] = Array.isArray(raw.series) ? raw.series : []
  if (series.length === 0 && Array.isArray(raw.datasets) && Array.isArray(raw.labels)) {
    const labels = raw.labels
    series = raw.datasets.map((ds, di) => ({
      label_en: ds.label ?? `Series ${di + 1}`,
      points: (ds.data ?? []).map((y, i) => ({ x: labels[i] ?? i, y })),
    }))
  }

  if (series.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        {language === 'ar' ? 'لا توجد بيانات' : 'No data'}
      </p>
    )
  }

  // recharts is LTR-native — always render chart internals in LTR and rely on
  // bilingual labels only for legend/tooltip text.
  return (
    <div className="w-full" dir="ltr">
      {type === 'bar'  && <BarChartView  series={series} language={language} />}
      {type === 'line' && <LineChartView series={series} language={language} />}
      {type === 'pie'  && <PieChartView  series={series} language={language} />}
    </div>
  )
}

ArtifactChart.displayName = 'ArtifactChart'

export { ArtifactChart }
