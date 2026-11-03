import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TrendPoint } from '@/types/api'

export function TrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
          <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            cursor={{ stroke: 'var(--line-strong)' }}
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--line-strong)',
              borderRadius: 6,
              fontSize: 12,
              color: 'var(--fg)',
            }}
          />
          <Area type="monotone" dataKey="low" name="Low" stroke="var(--muted)" fill="transparent" strokeWidth={1} dot={false} />
          <Area type="monotone" dataKey="medium" name="Medium" stroke="var(--warning)" fill="transparent" strokeWidth={1.25} dot={false} />
          <Area type="monotone" dataKey="high" name="High" stroke="var(--high)" fill="color-mix(in srgb, var(--high) 12%, transparent)" strokeWidth={1.5} dot={false} />
          <Area type="monotone" dataKey="critical" name="Critical" stroke="var(--critical)" fill="color-mix(in srgb, var(--critical) 14%, transparent)" strokeWidth={1.75} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
