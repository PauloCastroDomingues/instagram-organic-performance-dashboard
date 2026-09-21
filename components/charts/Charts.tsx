"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { formatCompactNumber, formatFullNumber, formatPercent } from "@/lib/format";

const axisStyle = { fill: "rgba(244,244,244,.52)", fontSize: 12 };
const gridColor = "rgba(244,244,244,.08)";

function SoftTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-white/10 bg-[#151514] px-3 py-2 text-sm shadow-panel">
      <div className="mb-1 text-xs uppercase tracking-[0.12em] text-white/40">{label}</div>
      {payload.map((item: any) => (
        <div key={item.dataKey} className="flex min-w-[170px] justify-between gap-4 text-white/78">
          <span>{item.name}</span>
          <strong className="text-paper">
            {String(item.dataKey).toLowerCase().includes("rate") ? formatPercent(item.value) : formatFullNumber(item.value)}
          </strong>
        </div>
      ))}
    </div>
  );
}

export function TimelineChart({ data, label }: { data: any[]; label: string }) {
  return (
    <div className="h-[310px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="timelineFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FB5D06" stopOpacity={0.42} />
              <stop offset="95%" stopColor="#FB5D06" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={gridColor} vertical={false} />
          <XAxis dataKey="period" tick={axisStyle} tickLine={false} axisLine={false} />
          <YAxis tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={formatCompactNumber} />
          <Tooltip content={<SoftTooltip />} />
          <Area name={label} type="monotone" dataKey="value" stroke="#FB5D06" fill="url(#timelineFill)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function VolumeReachChart({ data }: { data: any[] }) {
  return (
    <div className="h-[310px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid stroke={gridColor} vertical={false} />
          <XAxis dataKey="period" tick={axisStyle} tickLine={false} axisLine={false} />
          <YAxis yAxisId="left" tick={axisStyle} tickLine={false} axisLine={false} />
          <YAxis yAxisId="right" orientation="right" tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={formatCompactNumber} />
          <Tooltip content={<SoftTooltip />} />
          <Legend />
          <Bar yAxisId="left" name="Posts" dataKey="posts" fill="#F4F4F4" radius={[4, 4, 0, 0]} />
          <Line yAxisId="right" name="Alcance médio" dataKey="avgReach" stroke="#FB5D06" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HorizontalBarChart({
  data,
  dataKey,
  name,
  percent = false
}: {
  data: any[];
  dataKey: string;
  name: string;
  percent?: boolean;
}) {
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 18 }}>
          <CartesianGrid stroke={gridColor} horizontal={false} />
          <XAxis type="number" tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={percent ? formatPercent : formatCompactNumber} />
          <YAxis dataKey="label" type="category" width={92} tick={axisStyle} tickLine={false} axisLine={false} />
          <Tooltip content={<SoftTooltip />} />
          <Bar name={name} dataKey={dataKey} radius={[0, 4, 4, 0]}>
            {data.map((_, index) => (
              <Cell key={index} fill={index % 2 === 0 ? "#FB5D06" : "#F4F4F4"} opacity={index % 2 === 0 ? 0.92 : 0.78} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TypePerformanceTable({ data }: { data: any[] }) {
  return (
    <div className="scrollbar-soft overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full min-w-[920px] border-collapse text-sm">
        <thead className="bg-white/[0.06] text-left text-xs uppercase tracking-[0.12em] text-white/46">
          <tr>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3 text-right">Posts</th>
            <th className="px-4 py-3 text-right">Alcance médio</th>
            <th className="px-4 py-3 text-right">Visualizações médias</th>
            <th className="px-4 py-3 text-right">Engajamento</th>
            <th className="px-4 py-3 text-right">Compartilhamento</th>
            <th className="px-4 py-3 text-right">Salvamento</th>
            <th className="px-4 py-3 text-right">Seguidores médios</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/8">
          {data.map((row) => (
            <tr key={row.type} className="text-white/76">
              <td className="px-4 py-3 font-semibold text-paper">{row.type}</td>
              <td className="px-4 py-3 text-right">{formatFullNumber(row.posts)}</td>
              <td className="px-4 py-3 text-right">{formatCompactNumber(row.avgReach)}</td>
              <td className="px-4 py-3 text-right">{formatCompactNumber(row.avgViews)}</td>
              <td className="px-4 py-3 text-right">{formatPercent(row.engagementRate)}</td>
              <td className="px-4 py-3 text-right">{formatPercent(row.shareRate)}</td>
              <td className="px-4 py-3 text-right">{formatPercent(row.saveRate)}</td>
              <td className="px-4 py-3 text-right">{formatCompactNumber(row.avgFollows)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
