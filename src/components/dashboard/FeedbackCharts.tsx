import { useId } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { HourlyChartRow, WeekChartRow } from '@/lib/dashboardChartData'

const grid = '#2a2a2a'
const muted = '#9e9e9e'
const primary = '#00c853'
const primaryGlow = 'rgba(0, 200, 83, 0.35)'
const yesterday = '#5c8f6e'
const errorC = '#ff5252'
const neutralC = '#757575'
const gold = '#c8e6c9'

type TooltipPayload = { name?: string; value?: number; color?: string; dataKey?: string }

function DarkTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean
  label?: string
  payload?: TooltipPayload[]
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{label}</p>
      <ul className="chart-tooltip__list">
        {payload.map((p) => (
          <li key={String(p.dataKey)} style={{ color: p.color }}>
            <span>{p.name}</span>
            <strong>{typeof p.value === 'number' ? p.value : '—'}</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function HourlyVolumeChart({ data }: { data: HourlyChartRow[] }) {
  const gid = useId().replace(/\W/g, '')
  return (
    <div className="dash-chart-wrap">
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 12, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id={`fillHoje${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={primary} stopOpacity={0.45} />
              <stop offset="100%" stopColor={primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={grid} strokeDasharray="3 6" vertical={false} />
          <XAxis
            dataKey="h"
            tick={{ fill: muted, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: grid }}
            interval={2}
          />
          <YAxis
            yAxisId="vol"
            tick={{ fill: muted, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: grid }}
            allowDecimals={false}
            width={36}
          />
          <YAxis
            yAxisId="rating"
            orientation="right"
            domain={[0, 5]}
            tick={{ fill: muted, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: grid }}
            width={32}
          />
          <Tooltip content={<DarkTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: 16, fontSize: 12 }}
            formatter={(value) => <span style={{ color: muted }}>{value}</span>}
          />
          <Area
            yAxisId="vol"
            type="monotone"
            dataKey="hoje"
            name="Hoje (volume)"
            stroke={primary}
            strokeWidth={2.5}
            fill={`url(#fillHoje${gid})`}
            dot={false}
            activeDot={{ r: 5, fill: primary, stroke: '#0a0a0a', strokeWidth: 2 }}
          />
          <Line
            yAxisId="vol"
            type="monotone"
            dataKey="ontem"
            name="Ontem (volume)"
            stroke={yesterday}
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            yAxisId="rating"
            type="monotone"
            dataKey="media"
            name="Média hoje (1–5)"
            stroke={gold}
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export function HourlySentimentLines({ data }: { data: HourlyChartRow[] }) {
  return (
    <div className="dash-chart-wrap dash-chart-wrap--compact">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid stroke={grid} strokeDasharray="3 6" vertical={false} />
          <XAxis
            dataKey="h"
            tick={{ fill: muted, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: grid }}
            interval={3}
          />
          <YAxis
            tick={{ fill: muted, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: grid }}
            allowDecimals={false}
            width={36}
          />
          <Tooltip content={<DarkTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
            formatter={(value) => <span style={{ color: muted }}>{value}</span>}
          />
          <Line
            type="monotone"
            dataKey="positivos"
            name="Positivos"
            stroke={primary}
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="neutros"
            name="Neutros"
            stroke={neutralC}
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="negativos"
            name="Negativos"
            stroke={errorC}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function WeekVolumeChart({ data }: { data: WeekChartRow[] }) {
  const gid = useId().replace(/\W/g, '')
  return (
    <div className="dash-chart-wrap">
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 12, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id={`fillWeek${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={primaryGlow} stopOpacity={1} />
              <stop offset="100%" stopColor={primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={grid} strokeDasharray="3 6" vertical={false} />
          <XAxis
            dataKey="dia"
            tick={{ fill: muted, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: grid }}
          />
          <YAxis
            yAxisId="v"
            tick={{ fill: muted, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: grid }}
            allowDecimals={false}
            width={36}
          />
          <YAxis
            yAxisId="m"
            orientation="right"
            domain={[0, 5]}
            tick={{ fill: muted, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: grid }}
            width={32}
          />
          <Tooltip content={<DarkTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: 16, fontSize: 12 }}
            formatter={(value) => <span style={{ color: muted }}>{value}</span>}
          />
          <Area
            yAxisId="v"
            type="monotone"
            dataKey="volume"
            name="Feedbacks"
            stroke={primary}
            strokeWidth={2.5}
            fill={`url(#fillWeek${gid})`}
            dot={{ fill: primary, strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            yAxisId="m"
            type="monotone"
            dataKey="media"
            name="Média"
            stroke={gold}
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
