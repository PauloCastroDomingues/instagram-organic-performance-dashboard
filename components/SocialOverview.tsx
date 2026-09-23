"use client";

import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, Database, Info } from "lucide-react";
import { Area, Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ComparisonMode, DateRange, InstagramPaidDay, InstagramPost, InstagramSessionDay, InstagramStory, SocialDataResult } from "@/lib/types";
import { formatCompactNumber, formatFullNumber, formatPercent } from "@/lib/format";
import { getPreviousMonthPeriodRange, variation } from "@/lib/metrics";
import { KpiCard } from "@/components/cards/KpiCard";
import { ChartFrame } from "@/components/charts/ChartFrame";

const axisStyle = { fill: "rgba(244,244,244,.48)", fontSize: 11 };

function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function initialRange(days: InstagramSessionDay[]): DateRange {
  const end = days.at(-1)?.date ?? new Date().toISOString().slice(0, 10);
  const first = days[0]?.date ?? end;
  const start = addDays(end, -29);
  return { start: start < first ? first : start, end };
}

function comparisonRange(range: DateRange, mode: ComparisonMode): DateRange {
  if (mode === "previousMonth") {
    const shifted = getPreviousMonthPeriodRange(new Date(`${range.start}T12:00:00`), new Date(`${range.end}T12:00:00`));
    return { start: shifted.start.toISOString().slice(0, 10), end: shifted.end.toISOString().slice(0, 10) };
  }
  if (mode === "yearAgo") {
    const start = new Date(`${range.start}T12:00:00`);
    const end = new Date(`${range.end}T12:00:00`);
    start.setFullYear(start.getFullYear() - 1);
    end.setFullYear(end.getFullYear() - 1);
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
  }
  const duration = Math.round((new Date(range.end).getTime() - new Date(range.start).getTime()) / 86400000) + 1;
  return { start: addDays(range.start, -duration), end: addDays(range.start, -1) };
}

function within<T extends { date: string }>(rows: T[], range: DateRange) {
  return rows.filter((row) => row.date >= range.start && row.date <= range.end);
}

function sessionTotals(rows: InstagramSessionDay[]) {
  return rows.reduce((sum, row) => ({
    organic: sum.organic + row.organic,
    paid: sum.paid + row.paid,
    unknown: sum.unknown + row.unknown,
    total: sum.total + row.total,
    visitors: sum.visitors + row.visitors
  }), { organic: 0, paid: 0, unknown: 0, total: 0, visitors: 0 });
}

function paidTotals(rows: InstagramPaidDay[]) {
  return rows.reduce((sum, row) => ({
    spend: sum.spend + row.spend,
    clicks: sum.clicks + row.clicks,
    impressions: sum.impressions + row.impressions
  }), { spend: 0, clicks: 0, impressions: 0 });
}

function ratio(value: number, total: number) {
  return total > 0 ? value / total : 0;
}

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}

function decimalMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(value);
}

function dateLabel(value: string) {
  const [, month, day] = value.split("-");
  return `${day}/${month}`;
}

function fullDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T12:00:00`));
}

function contentReach(posts: InstagramPost[], stories: InstagramStory[], range: DateRange) {
  const postReach = posts.filter((item) => item.publishedAt.slice(0, 10) >= range.start && item.publishedAt.slice(0, 10) <= range.end).reduce((sum, item) => sum + item.reach, 0);
  const storyReach = stories.filter((item) => item.publishedAt.slice(0, 10) >= range.start && item.publishedAt.slice(0, 10) <= range.end).reduce((sum, item) => sum + item.reach, 0);
  return { postReach, storyReach, total: postReach + storyReach };
}

function reachTimeline(posts: InstagramPost[], stories: InstagramStory[], range: DateRange) {
  const days = new Map<string, { date: string; posts: number; stories: number; total: number }>();
  posts.forEach((item) => {
    const date = item.publishedAt.slice(0, 10);
    if (date < range.start || date > range.end) return;
    const day = days.get(date) ?? { date, posts: 0, stories: 0, total: 0 };
    day.posts += item.reach;
    day.total += item.reach;
    days.set(date, day);
  });
  stories.forEach((item) => {
    const date = item.publishedAt.slice(0, 10);
    if (date < range.start || date > range.end) return;
    const day = days.get(date) ?? { date, posts: 0, stories: 0, total: 0 };
    day.stories += item.reach;
    day.total += item.reach;
    days.set(date, day);
  });
  return Array.from(days.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function TrafficTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[190px] rounded-md border border-white/12 bg-[#151514]/95 px-3 py-2.5 text-sm shadow-panel">
      <div className="mb-2 text-xs font-semibold text-white/45">{dateLabel(label)}</div>
      {payload.map((item: any) => <div key={item.dataKey} className="flex justify-between gap-5 text-white/70"><span>{item.name}</span><strong className="text-paper">{item.dataKey === "cpc" ? decimalMoney(item.value) : item.dataKey === "spend" ? money(item.value) : formatFullNumber(item.value)}</strong></div>)}
    </div>
  );
}

function TrafficChart({ data }: { data: InstagramSessionDay[] }) {
  return (
    <div className="h-[330px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="rgba(244,244,244,.065)" vertical={false} strokeDasharray="3 5" strokeLinecap="round" />
          <XAxis dataKey="date" tick={axisStyle} tickFormatter={dateLabel} tickLine={false} axisLine={false} minTickGap={28} />
          <YAxis tick={axisStyle} tickFormatter={formatCompactNumber} tickLine={false} axisLine={false} width={54} />
          <Tooltip content={<TrafficTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, color: "rgba(244,244,244,.6)" }} />
          <Bar name="Orgânico" dataKey="organic" stackId="sessions" fill="#34D399" maxBarSize={26} isAnimationActive={false} />
          <Bar name="Pago" dataKey="paid" stackId="sessions" fill="#FB5D06" maxBarSize={26} isAnimationActive={false} />
          <Bar name="Não classificado" dataKey="unknown" stackId="sessions" fill="#8B8682" radius={[3, 3, 0, 0]} maxBarSize={26} isAnimationActive={false} />
          <Line name="Sessões totais" type="monotone" dataKey="total" stroke="#F4F4F4" strokeWidth={2} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function PaidChart({ data }: { data: Array<InstagramPaidDay & { cpc: number }> }) {
  return (
    <div className="h-[330px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="rgba(244,244,244,.065)" vertical={false} strokeDasharray="3 5" strokeLinecap="round" />
          <XAxis dataKey="date" tick={axisStyle} tickFormatter={dateLabel} tickLine={false} axisLine={false} minTickGap={28} />
          <YAxis yAxisId="left" tick={axisStyle} tickFormatter={formatCompactNumber} tickLine={false} axisLine={false} width={54} />
          <YAxis yAxisId="right" orientation="right" tick={axisStyle} tickFormatter={(value) => `R$ ${Number(value).toFixed(2)}`} tickLine={false} axisLine={false} width={62} />
          <Tooltip content={<TrafficTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, color: "rgba(244,244,244,.6)" }} />
          <Area yAxisId="left" name="Cliques" type="monotone" dataKey="clicks" stroke="#F4F4F4" fill="rgba(244,244,244,.08)" strokeWidth={2} isAnimationActive={false} />
          <Line yAxisId="right" name="CPC" type="monotone" dataKey="cpc" stroke="#FB5D06" strokeWidth={2.5} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function ReachChart({ data }: { data: ReturnType<typeof reachTimeline> }) {
  return (
    <div className="h-[330px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="rgba(244,244,244,.065)" vertical={false} strokeDasharray="3 5" strokeLinecap="round" />
          <XAxis dataKey="date" tick={axisStyle} tickFormatter={dateLabel} tickLine={false} axisLine={false} minTickGap={28} />
          <YAxis tick={axisStyle} tickFormatter={formatCompactNumber} tickLine={false} axisLine={false} width={54} />
          <Tooltip content={<TrafficTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, color: "rgba(244,244,244,.6)" }} />
          <Bar name="Posts" dataKey="posts" stackId="reach" fill="#FB5D06" maxBarSize={28} isAnimationActive={false} />
          <Bar name="Stories" dataKey="stories" stackId="reach" fill="#34D399" radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          <Line name="Alcance acumulado" type="monotone" dataKey="total" stroke="#F4F4F4" strokeWidth={2} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SocialOverview({ result, posts, stories, range, mode }: { result: SocialDataResult; posts: InstagramPost[]; stories: InstagramStory[]; range: DateRange; mode: ComparisonMode }) {
  if (result.status !== "ready") {
    return (
      <section className="rounded-lg border border-white/10 bg-white/[0.045] p-6 shadow-panel">
        <div className="flex items-start gap-3"><Database className="mt-0.5 shrink-0 text-apex" size={20} /><div><h2 className="font-display text-lg font-black uppercase text-paper">Fonte de tráfego indisponível</h2><p className="mt-2 text-sm leading-6 text-white/55">{result.message}</p><p className="mt-2 text-xs text-white/38">Posts e Stories continuam disponíveis nas abas ao lado.</p></div></div>
      </section>
    );
  }

  return <SocialOverviewReady data={result.data} posts={posts} stories={stories} range={range} mode={mode} />;
}

function SocialOverviewReady({ data, posts, stories, range, mode }: { data: Extract<SocialDataResult, { status: "ready" }>['data']; posts: InstagramPost[]; stories: InstagramStory[]; range: DateRange; mode: ComparisonMode }) {
  const currentSessions = useMemo(() => within(data.sessionsDaily, range), [data.sessionsDaily, range]);
  const currentPaid = useMemo(() => within(data.paidDaily, range), [data.paidDaily, range]);
  const referenceRange = useMemo(() => comparisonRange(range, mode), [range, mode]);
  const previousSessions = useMemo(() => mode === "none" ? [] : within(data.sessionsDaily, referenceRange), [data.sessionsDaily, referenceRange, mode]);
  const previousPaid = useMemo(() => mode === "none" ? [] : within(data.paidDaily, referenceRange), [data.paidDaily, referenceRange, mode]);
  const current = sessionTotals(currentSessions);
  const previous = sessionTotals(previousSessions);
  const media = paidTotals(currentPaid);
  const previousMedia = paidTotals(previousPaid);
  const cpc = ratio(media.spend, media.clicks);
  const previousCpc = ratio(previousMedia.spend, previousMedia.clicks);
  const reach = useMemo(() => contentReach(posts, stories, range), [posts, stories, range]);
  const previousReach = useMemo(() => mode === "none" ? { postReach: 0, storyReach: 0, total: 0 } : contentReach(posts, stories, referenceRange), [posts, stories, referenceRange, mode]);
  const reachByDay = useMemo(() => reachTimeline(posts, stories, range), [posts, stories, range]);
  const paidChart = currentPaid.map((row) => ({ ...row, cpc: ratio(row.spend, row.clicks) }));
  const helper = mode === "none" ? "Período selecionado" : mode === "previousMonth" ? "vs. mesmos dias do mês anterior" : mode === "previous" ? "vs. período anterior equivalente" : "vs. mesmo período do ano anterior";
  const partialDay = range.end === data.sourceUpdatedAt.slice(0, 10);
  const organicShare = ratio(current.organic, current.total);
  const paidShare = ratio(current.paid, current.total);
  const unknownShare = ratio(current.unknown, current.total);
  const sessionDelta = variation(current.total, previous.total);
  const reachDelta = variation(reach.total, previousReach.total);
  const postReachDelta = variation(reach.postReach, previousReach.postReach);
  const storyReachDelta = variation(reach.storyReach, previousReach.storyReach);
  const trafficDirection = sessionDelta === null ? "sem comparação disponível" : sessionDelta < 0 ? `caiu ${formatPercent(Math.abs(sessionDelta))}` : `cresceu ${formatPercent(sessionDelta)}`;
  const statusTitle = reachDelta === null
    ? "Alcance dos conteúdos no período selecionado"
    : `O alcance acumulado ${reachDelta < 0 ? "caiu" : "cresceu"} ${formatPercent(Math.abs(reachDelta))}`;

  return (
    <div>
      {partialDay ? <div className="mt-4 flex items-start gap-2 border-l-2 border-amber-300/55 bg-amber-300/[0.035] px-4 py-3 text-sm text-amber-100/72"><AlertTriangle size={17} className="mt-0.5 shrink-0" /><span className="min-w-0 break-words">O último dia pode estar incompleto. Evite compará-lo isoladamente com dias fechados.</span></div> : null}

      <section className="mt-7 grid gap-4 border-y border-white/12 py-6 lg:grid-cols-[180px_1fr] lg:items-start">
        <div className="flex items-center gap-3 text-[11px] font-bold uppercase text-apex"><span className="h-px w-8 bg-apex" /> Status</div>
          <div className="min-w-0"><h2 className="max-w-4xl break-all font-display text-lg font-bold uppercase leading-tight text-paper sm:break-words sm:text-2xl">{statusTitle}</h2>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-white/58">
          Os conteúdos somaram {formatFullNumber(reach.total)} de alcance reportado. Posts chegaram a {formatFullNumber(reach.postReach)} ({postReachDelta === null ? "sem comparação" : formatPercent(postReachDelta)}) e Stories a {formatFullNumber(reach.storyReach)} ({storyReachDelta === null ? "sem comparação" : formatPercent(storyReachDelta)}). É alcance acumulado por conteúdo, não pessoas únicas da conta.
        </p></div>
      </section>

      <section className="mt-0 grid grid-cols-1 border-b border-white/12 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Sessões geradas" value={formatFullNumber(current.total)} variation={sessionDelta} showVariation={mode !== "none"} helper={helper} />
        <KpiCard label="Alcance dos conteúdos" value={formatCompactNumber(reach.total)} variation={reachDelta} showVariation={mode !== "none"} helper="Soma de Posts e Stories, não pessoas únicas" />
        <KpiCard label="Participação orgânica" value={formatPercent(organicShare)} variation={variation(organicShare, ratio(previous.organic, previous.total))} showVariation={mode !== "none"} helper="Sessões orgânicas / sessões totais" />
        <KpiCard label="Participação paga" value={formatPercent(paidShare)} variation={variation(paidShare, ratio(previous.paid, previous.total))} showVariation={mode !== "none"} helper="Sessões pagas / sessões totais" />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <ChartFrame title="Alcance dos conteúdos" subtitle="Evolução do alcance acumulado de Posts e Stories publicados no período." tooltip="Soma o alcance informado pela Meta para cada conteúdo. A mesma pessoa pode ser contada em mais de um conteúdo; portanto, não representa alcance único da conta.">
          <ReachChart data={reachByDay} />
        </ChartFrame>
        <ChartFrame title="Leitura do alcance" subtitle="Onde a distribuição aconteceu no período.">
          <div className="space-y-3">
            <ReachBreakdown label="Posts" value={reach.postReach} total={reach.total} color="bg-apex" />
            <ReachBreakdown label="Stories" value={reach.storyReach} total={reach.total} color="bg-emerald-400" />
            <div className="border-l-2 border-amber-300/35 bg-amber-300/[0.035] p-4 text-xs leading-5 text-amber-100/65">
              O alcance único da página e o alcance pago ainda não estão disponíveis. Eles dependem da ampliação do coletor da API da Meta.
            </div>
          </div>
        </ChartFrame>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <ChartFrame title="Origem das sessões do Instagram" subtitle="Mostra o volume diário e quanto veio de orgânico, pago ou origem não classificada." tooltip="As barras são sessões atribuídas ao Instagram na Shopify. A linha branca mostra o total. Esta leitura mede tráfego, não vendas nem alcance dentro do Instagram.">
          <TrafficChart data={currentSessions} />
        </ChartFrame>
        <ChartFrame title="Leitura executiva" subtitle="Diagnóstico objetivo do período selecionado." tooltip="São sinais descritivos. A base não prova, sozinha, que uma publicação ou campanha causou as sessões.">
          <div className="space-y-3">
            <Insight status={reach.total > 0 ? "ok" : "warning"} title="Distribuição dos conteúdos" text={`${formatCompactNumber(reach.postReach)} de alcance em Posts e ${formatCompactNumber(reach.storyReach)} em Stories. É alcance acumulado, sem deduplicação entre pessoas.`} />
            <Insight status={organicShare < 0.05 ? "warning" : "ok"} title="Dependência de mídia paga" text={paidShare >= 0.8 ? `${formatPercent(paidShare)} das sessões atribuídas ao Instagram vieram do pago.` : "O tráfego está menos concentrado em mídia paga neste período."} />
            <Insight status={unknownShare > 0.05 ? "warning" : "ok"} title="Qualidade da atribuição" text={unknownShare > 0.05 ? `${formatPercent(unknownShare)} ficou sem classificação. Revise UTMs e regras de canal.` : `A parcela não classificada está em ${formatPercent(unknownShare)}.`} />
            <Insight status={current.organic === 0 ? "warning" : "ok"} title="Contribuição orgânica" text={current.organic === 0 ? "Não há sessões orgânicas identificadas no intervalo." : `${formatFullNumber(current.organic)} sessões orgânicas foram identificadas no intervalo.`} />
            <div className="flex items-start gap-2 border-t border-white/8 pt-4 text-xs leading-5 text-white/42"><Info size={15} className="mt-0.5 shrink-0" />Alcance e engajamento explicam distribuição e resposta dentro do Instagram. Sessões mostram a chegada ao site; a ponte entre ambos depende de links, CTAs e marcação correta.</div>
          </div>
        </ChartFrame>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ChartFrame title="Cliques e eficiência da mídia" subtitle="Compara o volume de cliques com o custo por clique diário." tooltip="CPC = investimento Meta dividido pelos cliques registrados. Não equivale a custo por sessão nem comprova conversão no site.">
          <div className="mb-4 grid grid-cols-2 gap-3">
            <KpiCard label="Investimento Meta" value={money(media.spend)} variation={variation(media.spend, previousMedia.spend)} showVariation={mode !== "none"} helper={helper} />
            <KpiCard label="Custo por clique" value={decimalMoney(cpc)} variation={variation(cpc, previousCpc)} showVariation={mode !== "none"} helper="Investimento / cliques" lowerIsBetter />
          </div>
          <PaidChart data={paidChart} />
        </ChartFrame>
        <ChartFrame title="Funil disponível" subtitle="O que a integração consegue afirmar hoje." tooltip="Alcance pago e visualizações de página de destino não existem no coletor atual; por isso não são estimados.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <FunnelMetric label="Impressões" value={formatCompactNumber(media.impressions)} available />
            <FunnelMetric label="Cliques" value={formatCompactNumber(media.clicks)} available />
            <FunnelMetric label="Sessões pagas" value={formatCompactNumber(current.paid)} available />
            <FunnelMetric label="Alcance pago" value="Pendente" />
            <FunnelMetric label="Views da página" value="Pendente" />
            <FunnelMetric label="Visitantes" value={formatCompactNumber(current.visitors)} available />
          </div>
        </ChartFrame>
      </div>

      <div className="mt-4 text-right text-xs text-white/35">Fonte atualizada em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(data.sourceUpdatedAt))}</div>
    </div>
  );
}

function ReachBreakdown({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const share = ratio(value, total);
  return <div className="border-b border-white/10 px-1 py-4"><div className="flex items-center justify-between gap-4"><span className="text-sm font-bold text-paper">{label}</span><strong className="font-display text-lg text-paper">{formatCompactNumber(value)}</strong></div><div className="mt-3 h-1 overflow-hidden bg-white/8"><div className={`h-full ${color}`} style={{ width: `${Math.min(100, share * 100)}%` }} /></div><div className="mt-2 text-xs text-white/42">{formatPercent(share)} do alcance acumulado</div></div>;
}

function Insight({ status, title, text }: { status: "ok" | "warning"; title: string; text: string }) {
  const Icon = status === "ok" ? CheckCircle2 : AlertTriangle;
  return <div className="flex items-start gap-3 border-b border-white/9 px-1 py-3"><Icon size={17} className={status === "ok" ? "mt-0.5 shrink-0 text-emerald-300" : "mt-0.5 shrink-0 text-amber-300"} /><div><div className="text-sm font-bold text-paper">{title}</div><p className="mt-1 text-xs leading-5 text-white/48">{text}</p></div></div>;
}

function FunnelMetric({ label, value, available = false }: { label: string; value: string; available?: boolean }) {
  return <div className="min-w-0 rounded-md border border-white/9 bg-white/[0.025] p-3"><div className="text-[10px] font-semibold uppercase text-white/40">{label}</div><div className={`mt-2 break-words text-lg font-black ${available ? "text-paper" : "text-white/32"}`}>{value}</div></div>;
}
