"use client";

import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import type { ComparisonMode, DateRange, InstagramStory } from "@/lib/types";
import { formatCompactNumber, formatDate, formatFullNumber, formatPercent } from "@/lib/format";
import { getPreviousPeriodRange, getYearAgoPeriodRange, safeRatio, variation } from "@/lib/metrics";
import { FilterBar } from "@/components/filters/FilterBar";
import { KpiCard } from "@/components/cards/KpiCard";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { HorizontalBarChart, TimelineChart } from "@/components/charts/Charts";

function defaultRange(stories: InstagramStory[]): DateRange {
  const dates = stories.map((story) => story.publishedAt.slice(0, 10)).sort();
  return { start: dates[0] ?? "", end: dates.at(-1) ?? "" };
}

function inRange(story: InstagramStory, range: DateRange) {
  const date = story.publishedAt.slice(0, 10);
  return date >= range.start && date <= range.end;
}

function totals(stories: InstagramStory[]) {
  const result = stories.reduce((sum, story) => ({
    stories: sum.stories + 1,
    views: sum.views + story.views,
    reach: sum.reach + story.reach,
    actions: sum.actions + story.actions,
    replies: sum.replies + story.replies,
    linkClicks: sum.linkClicks + story.linkClicks,
    profileVisits: sum.profileVisits + story.profileVisits,
    navigation: sum.navigation + story.navigation
  }), { stories: 0, views: 0, reach: 0, actions: 0, replies: 0, linkClicks: 0, profileVisits: 0, navigation: 0 });

  return {
    ...result,
    reachRate: safeRatio(result.reach, result.views),
    actionRate: safeRatio(result.actions, result.reach),
    avgReach: safeRatio(result.reach, result.stories)
  };
}

function dailyTimeline(stories: InstagramStory[]) {
  const days = new Map<string, number>();
  stories.forEach((story) => {
    const day = story.publishedAt.slice(0, 10);
    days.set(day, (days.get(day) ?? 0) + story.reach);
  });
  return Array.from(days, ([period, value]) => ({ period, value })).sort((a, b) => a.period.localeCompare(b.period));
}

function actionBreakdown(stories: InstagramStory[]) {
  const current = totals(stories);
  return [
    { label: "Visitas ao perfil", value: current.profileVisits },
    { label: "Cliques no link", value: current.linkClicks },
    { label: "Respostas", value: current.replies },
    { label: "Curtidas", value: stories.reduce((sum, item) => sum + item.likes, 0) },
    { label: "Compartilhamentos", value: stories.reduce((sum, item) => sum + item.shares, 0) },
    { label: "Figurinhas", value: stories.reduce((sum, item) => sum + item.stickerTaps, 0) }
  ];
}

export function StoriesDashboard({ stories }: { stories: InstagramStory[] }) {
  const availableRange = useMemo(() => defaultRange(stories), [stories]);
  const [range, setRange] = useState<DateRange>(() => defaultRange(stories));
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("previous");
  const filtered = useMemo(() => stories.filter((story) => inRange(story, range)), [stories, range]);
  const current = useMemo(() => totals(filtered), [filtered]);
  const comparisonRange = useMemo(() => {
    const start = new Date(`${range.start}T00:00:00`);
    const end = new Date(`${range.end}T23:59:59`);
    const result = comparisonMode === "yearAgo" ? getYearAgoPeriodRange(start, end) : getPreviousPeriodRange(start, end);
    return { start: result.start.toISOString().slice(0, 10), end: result.end.toISOString().slice(0, 10) };
  }, [range, comparisonMode]);
  const previous = useMemo(() => totals(stories.filter((story) => inRange(story, comparisonRange))), [stories, comparisonRange]);
  const showVariation = comparisonMode !== "none";
  const helper = comparisonMode === "none" ? "Período selecionado" : comparisonMode === "previous" ? "vs. período anterior equivalente" : "vs. mesmo período do ano anterior";
  const topStories = [...filtered].sort((a, b) => b.reach - a.reach).slice(0, 10);

  const cards = [
    ["Stories publicados", formatFullNumber(current.stories), variation(current.stories, previous.stories)],
    ["Visualizações", formatCompactNumber(current.views), variation(current.views, previous.views)],
    ["Alcance", formatCompactNumber(current.reach), variation(current.reach, previous.reach)],
    ["Alcance médio", formatCompactNumber(current.avgReach), variation(current.avgReach, previous.avgReach)],
    ["Ações", formatCompactNumber(current.actions), variation(current.actions, previous.actions)],
    ["Taxa de ação", formatPercent(current.actionRate), variation(current.actionRate, previous.actionRate)],
    ["Cliques no link", formatFullNumber(current.linkClicks), variation(current.linkClicks, previous.linkClicks)]
  ] as const;

  return (
    <div>
      <FilterBar range={range} availableRange={availableRange} comparisonMode={comparisonMode} postType="Todos" postTypes={[]} contentLabel="Todos os stories" onRangeChange={setRange} onComparisonModeChange={setComparisonMode} onPostTypeChange={() => undefined} />

      <section className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
        {cards.map(([label, value, delta]) => <KpiCard key={label} label={label} value={value} variation={showVariation ? delta : undefined} showVariation={showVariation} helper={helper} />)}
      </section>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <ChartFrame title="Evolução do alcance dos Stories" subtitle="Soma do alcance dos stories publicados em cada dia.">
          <TimelineChart data={dailyTimeline(filtered)} label="Alcance" />
        </ChartFrame>
        <ChartFrame title="Ações geradas" subtitle="Sinais de resposta e intenção provocados pelos stories.">
          <HorizontalBarChart data={actionBreakdown(filtered)} dataKey="value" name="Ações" />
        </ChartFrame>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[.72fr_1.28fr]">
        <ChartFrame title="Eficiência da distribuição" subtitle="Leitura da relação entre visualizações, alcance e navegação.">
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <StoryRatio label="Alcance por visualização" value={current.reachRate} note="Quanto das visualizações se converteu em contas alcançadas." />
            <StoryRatio label="Ações por alcance" value={current.actionRate} note="Proporção de ações em relação às contas alcançadas." />
            <StoryRatio label="Navegação por visualização" value={safeRatio(current.navigation, current.views)} note="Volume de movimentos de navegação registrado pela Meta." />
          </div>
        </ChartFrame>

        <ChartFrame title="Stories com maior alcance" subtitle="Ranking do período selecionado, com sinais de resposta e tráfego.">
          <div className="scrollbar-soft overflow-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-white/10 text-left text-xs uppercase tracking-[0.1em] text-white/42">
                <tr><th className="px-3 py-3">Data</th><th className="px-3 py-3 text-right">Alcance</th><th className="px-3 py-3 text-right">Visualizações</th><th className="px-3 py-3 text-right">Ações</th><th className="px-3 py-3 text-right">Cliques</th><th className="px-3 py-3 text-right">Story</th></tr>
              </thead>
              <tbody className="divide-y divide-white/8">
                {topStories.map((story) => (
                  <tr key={story.id} className="text-white/68">
                    <td className="px-3 py-3 text-paper">{formatDate(story.publishedAt)}</td>
                    <td className="px-3 py-3 text-right">{formatCompactNumber(story.reach)}</td>
                    <td className="px-3 py-3 text-right">{formatCompactNumber(story.views)}</td>
                    <td className="px-3 py-3 text-right">{formatFullNumber(story.actions)}</td>
                    <td className="px-3 py-3 text-right">{formatFullNumber(story.linkClicks)}</td>
                    <td className="px-3 py-3 text-right"><a href={story.permanentLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-apex">Abrir <ExternalLink size={13} /></a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartFrame>
      </div>
    </div>
  );
}

function StoryRatio({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.025] p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.1em] text-white/44">{label}</div>
      <div className="mt-2 text-2xl font-black text-paper">{formatPercent(value)}</div>
      <p className="mt-2 text-xs leading-5 text-white/42">{note}</p>
    </div>
  );
}
