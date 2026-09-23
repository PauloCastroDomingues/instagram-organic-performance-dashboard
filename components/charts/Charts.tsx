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
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis
} from "recharts";
import { formatCompactNumber, formatFullNumber, formatPercent } from "@/lib/format";

const axisStyle = { fill: "rgba(244,244,244,.48)", fontSize: 11 };
const gridColor = "rgba(244,244,244,.065)";

function formatPeriodLabel(value: string) {
  if (/^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-");
    return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" }).format(new Date(Number(year), Number(month) - 1, 1)).replace(" de ", "/");
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year.slice(2)}`;
  }
  return value;
}

function CleanLegend({ payload }: any) {
  if (!payload?.length) return null;
  return (
    <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-white/54">
      {payload.map((item: any) => (
        <span key={item.value} className="flex items-center gap-2">
          <span className="size-2 rounded-sm" style={{ backgroundColor: item.color }} />
          {item.value}
        </span>
      ))}
    </div>
  );
}

function SoftTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[190px] rounded-md border border-white/12 bg-[#151514]/95 px-3 py-2.5 text-sm shadow-panel backdrop-blur-sm">
      <div className="mb-2 border-b border-white/8 pb-2 text-xs font-semibold uppercase tracking-[0.1em] text-white/42">{typeof label === "string" ? formatPeriodLabel(label) : label}</div>
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
        <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 4, left: 0 }}>
          <defs>
            <linearGradient id="timelineFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FB5D06" stopOpacity={0.42} />
              <stop offset="95%" stopColor="#FB5D06" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={gridColor} vertical={false} strokeDasharray="3 5" strokeLinecap="round" />
          <XAxis dataKey="period" tick={axisStyle} tickLine={false} axisLine={false} tickMargin={10} tickFormatter={formatPeriodLabel} minTickGap={28} />
          <YAxis tick={axisStyle} tickLine={false} axisLine={false} tickMargin={8} width={54} tickFormatter={formatCompactNumber} />
          <Tooltip content={<SoftTooltip />} cursor={{ stroke: "rgba(244,244,244,.18)", strokeDasharray: "3 3" }} />
          <Area name={label} type="monotone" dataKey="value" stroke="#FB5D06" fill="url(#timelineFill)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "#FB5D06", stroke: "#1D1D1B", strokeWidth: 3 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function VolumeReachChart({ data }: { data: any[] }) {
  return (
    <div className="h-[310px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 6, bottom: 4, left: 0 }}>
          <CartesianGrid stroke={gridColor} vertical={false} strokeDasharray="3 5" strokeLinecap="round" />
          <XAxis dataKey="period" tick={axisStyle} tickLine={false} axisLine={false} tickMargin={10} tickFormatter={formatPeriodLabel} minTickGap={28} />
          <YAxis yAxisId="left" tick={axisStyle} tickLine={false} axisLine={false} tickMargin={8} width={30} allowDecimals={false} />
          <YAxis yAxisId="right" orientation="right" tick={axisStyle} tickLine={false} axisLine={false} tickMargin={8} width={52} tickFormatter={formatCompactNumber} />
          <Tooltip content={<SoftTooltip />} />
          <Legend content={<CleanLegend />} />
          <Bar yAxisId="left" name="Publicações" dataKey="posts" fill="rgba(244,244,244,.42)" radius={[3, 3, 0, 0]} maxBarSize={28} />
          <Line yAxisId="right" name="Alcance médio" type="monotone" dataKey="avgReach" stroke="#FB5D06" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: "#FB5D06", stroke: "#1D1D1B", strokeWidth: 2 }} />
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
  const maxValue = Math.max(...data.map((item) => Number(item[dataKey]) || 0));
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 10 }}>
          <CartesianGrid stroke={gridColor} horizontal={false} strokeDasharray="3 5" strokeLinecap="round" />
          <XAxis type="number" tick={axisStyle} tickLine={false} axisLine={false} tickMargin={8} tickFormatter={percent ? formatPercent : formatCompactNumber} />
          <YAxis dataKey="label" type="category" width={84} tick={axisStyle} tickLine={false} axisLine={false} tickMargin={8} />
          <Tooltip content={<SoftTooltip />} />
          <Bar name={name} dataKey={dataKey} radius={[0, 3, 3, 0]} maxBarSize={24}>
            {data.map((item, index) => (
              <Cell key={index} fill={Number(item[dataKey]) === maxValue && maxValue > 0 ? "#FB5D06" : "#F4F4F4"} opacity={Number(item[dataKey]) === maxValue && maxValue > 0 ? 0.95 : 0.48} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MatrixTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]?.payload) return null;
  const point = payload[0].payload;
  return (
    <div className="max-w-[290px] rounded-md border border-white/12 bg-[#151514]/95 px-3 py-2.5 text-sm shadow-panel backdrop-blur-sm">
      <div className="text-xs uppercase tracking-[0.12em] text-apex">{point.quadrant} · {point.type}</div>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/58">{point.description || "Sem descrição"}</p>
      <div className="mt-2 flex justify-between gap-5 text-white/72"><span>Alcance</span><strong className="text-paper">{formatFullNumber(point.reach)}</strong></div>
      <div className="flex justify-between gap-5 text-white/72"><span>Engajamento</span><strong className="text-paper">{formatPercent(point.engagement)}</strong></div>
      <div className="mt-2 border-t border-white/8 pt-2 text-[11px] font-semibold text-apex">Clique no ponto para abrir o conteúdo</div>
    </div>
  );
}

export function PerformanceMatrixChart({ data, reachMedian, engagementMedian }: { data: any[]; reachMedian: number; engagementMedian: number }) {
  const colors: Record<string, string> = {
    Destaques: "#FB5D06",
    Alcance: "#F4F4F4",
    Profundidade: "#34D399",
    "A desenvolver": "#6B6764"
  };
  const groups = Object.keys(colors).map((quadrant) => ({ quadrant, points: data.filter((point) => point.quadrant === quadrant) }));

  return (
    <div className="h-[390px]">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 14, right: 20, bottom: 28, left: 12 }}>
          <CartesianGrid stroke={gridColor} strokeDasharray="3 5" strokeLinecap="round" />
          <XAxis type="number" dataKey="reach" name="Alcance" tick={axisStyle} tickLine={false} axisLine={false} tickMargin={9} tickFormatter={formatCompactNumber} label={{ value: "Alcance", position: "insideBottom", offset: -18, fill: "rgba(244,244,244,.38)", fontSize: 11 }} />
          <YAxis type="number" dataKey="engagement" name="Engajamento" tick={axisStyle} tickLine={false} axisLine={false} tickMargin={8} width={55} tickFormatter={formatPercent} label={{ value: "Taxa de engajamento", angle: -90, position: "insideLeft", offset: -2, fill: "rgba(244,244,244,.38)", fontSize: 11 }} />
          <ZAxis type="number" dataKey="views" range={[42, 180]} />
          <ReferenceLine x={reachMedian} stroke="rgba(244,244,244,.28)" strokeDasharray="4 4" label={{ value: "Mediana", position: "insideTopRight", fill: "rgba(244,244,244,.38)", fontSize: 10 }} />
          <ReferenceLine y={engagementMedian} stroke="rgba(244,244,244,.28)" strokeDasharray="4 4" />
          <Tooltip content={<MatrixTooltip />} />
          <Legend content={<CleanLegend />} />
          {groups.map((group) => (
            <Scatter
              key={group.quadrant}
              name={group.quadrant}
              data={group.points}
              fill={colors[group.quadrant]}
              opacity={0.84}
              cursor="pointer"
              onClick={(point: any) => {
                const link = point?.link ?? point?.payload?.link;
                if (link) window.open(link, "_blank", "noopener,noreferrer");
              }}
            />
          ))}
        </ScatterChart>
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
            <th className="px-4 py-3 text-right">Alcance mediano</th>
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
              <td className="px-4 py-3 text-right">{formatCompactNumber(row.medianReach)}</td>
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
