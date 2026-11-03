import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TrendPoint } from '@/types/api'

export function TrendChart({ data }: { data: TrendPoint[] }) {
  const last = data.length - 1
  return (
    <div className="h-[240px] w-full px-2 pb-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 16, right: 12, left: -12, bottom: 0 }}>
          <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            cursor={{ stroke: 'var(--complement)', strokeDasharray: '3 3' }}
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--line-strong)',
              borderRadius: 0,
              fontSize: 12,
              color: 'var(--fg)',
            }}
          />
          <Area type="monotone" dataKey="low" name="Low" stroke="var(--muted)" fill="transparent" strokeWidth={1} animationDuration={900} dot={endDot(last, 'var(--muted)')} />
          <Area type="monotone" dataKey="medium" name="Medium" stroke="var(--warning)" fill="transparent" strokeWidth={1.25} animationDuration={1000} dot={endDot(last, 'var(--warning)')} />
          <Area type="monotone" dataKey="high" name="High" stroke="var(--high)" fill="color-mix(in srgb, var(--high) 16%, transparent)" strokeWidth={1.6} animationDuration={1100} dot={endDot(last, 'var(--high)')} />
          <Area type="monotone" dataKey="critical" name="Critical" stroke="var(--critical)" fill="color-mix(in srgb, var(--critical) 18%, transparent)" strokeWidth={2} animationDuration={1200} dot={endDot(last, 'var(--critical)')} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function endDot(last: number, fill: string) {
  return ({ cx, cy, index }: { cx?: number; cy?: number; index?: number }) => {
    if (index !== last || cx == null || cy == null) return <g />
    return (
      <g>
        <circle cx={cx} cy={cy} r={7} fill={fill} opacity={0.2} />
        <circle cx={cx} cy={cy} r={3} fill={fill} />
      </g>
    )
  }
}
