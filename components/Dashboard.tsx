"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Activity, BarChart3, Bookmark, Braces, CheckCircle2, ChevronLeft, ChevronRight, CircleDashed, ExternalLink, Eye, FileText, Gauge, Heart, Images, RefreshCw, Search, UserPlus } from "lucide-react";
import type { ComparisonMode, DateRange, InstagramPost, InstagramStory, MetricKey, SocialDataResult } from "@/lib/types";
import { formatCompactNumber, formatDate, formatDecimal, formatFullNumber, formatPercent } from "@/lib/format";
import { filterPosts, chooseAggregationMode, aggregateTimeline, aggregateByType, aggregateByWeekday, aggregateByHourBand, aggregatePerformanceDistribution, aggregateReachConcentration, aggregatePerformanceMatrix } from "@/lib/aggregations";
import { getPostsInRange, getPreviousMonthPeriodRange, getPreviousPeriodRange, getYearAgoPeriodRange, sumPosts, variation } from "@/lib/metrics";
import { FilterBar } from "@/components/filters/FilterBar";
import { KpiCard } from "@/components/cards/KpiCard";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { HorizontalBarChart, PerformanceMatrixChart, TimelineChart, TypePerformanceTable, VolumeReachChart } from "@/components/charts/Charts";
import { StoriesDashboard } from "@/components/StoriesDashboard";
import { SocialOverview } from "@/components/SocialOverview";
import { GlobalDateFilter } from "@/components/filters/GlobalDateFilter";

type DashboardProps = {
  posts: InstagramPost[];
  stories: InstagramStory[];
  socialData: SocialDataResult;
};

type ViewKey = "overview" | "content" | "analysis";

const views: Array<{ key: ViewKey; label: string; icon: typeof BarChart3 }> = [
  { key: "overview", label: "Visão geral", icon: BarChart3 },
  { key: "content", label: "Conteúdos", icon: FileText },
  { key: "analysis", label: "Análise", icon: Activity }
];

const metricLabels: Record<MetricKey, string> = {
  reach: "Alcance",
  views: "Visualizações",
  interactions: "Interações",
  follows: "Seguidores ganhos"
};

const SOURCE_SHEET_URL = "https://docs.google.com/spreadsheets/d/10wKKS6BEWh0x-calS693AshC9TgYId_sH3pO3C7BkL0/edit?gid=0#gid=0";

function getDefaultRange(posts: InstagramPost[]): DateRange {
  const timestamps = posts.map((post) => new Date(post.publishedAt).getTime()).sort((a, b) => a - b);
  return {
    start: new Date(timestamps[0] ?? Date.now()).toISOString().slice(0, 10),
    end: new Date(timestamps[timestamps.length - 1] ?? Date.now()).toISOString().slice(0, 10)
  };
}

function getGlobalAvailableRange(posts: InstagramPost[], stories: InstagramStory[], socialData: SocialDataResult): DateRange {
  const dates = [
    ...posts.map((post) => post.publishedAt.slice(0, 10)),
    ...stories.map((story) => story.publishedAt.slice(0, 10)),
    ...(socialData.status === "ready" ? socialData.data.sessionsDaily.map((day) => day.date) : [])
  ].filter(Boolean).sort();
  return { start: dates[0] ?? "", end: dates.at(-1) ?? "" };
}

function getInitialGlobalRange(available: DateRange): DateRange {
  const end = new Date(`${available.end}T12:00:00`);
  const startValue = new Date(end.getFullYear(), end.getMonth(), 1, 12).toISOString().slice(0, 10);
  return { start: startValue < available.start ? available.start : startValue, end: available.end };
}

export function Dashboard({ posts, stories, socialData }: DashboardProps) {
  const availableRange = useMemo(() => getGlobalAvailableRange(posts, stories, socialData), [posts, stories, socialData]);
  const [view, setView] = useState<ViewKey>("overview");
  const [metric, setMetric] = useState<MetricKey>("reach");
  const [range, setRange] = useState<DateRange>(() => getInitialGlobalRange(getGlobalAvailableRange(posts, stories, socialData)));
  const [postType, setPostType] = useState("Todos");
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("previousMonth");
  const [contentSource, setContentSource] = useState<"traffic" | "posts" | "stories">("traffic");
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [urlReady, setUrlReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const source = params.get("view");
    const compare = params.get("compare");
    const start = params.get("start");
    const end = params.get("end");
    if (source === "traffic" || source === "posts" || source === "stories") setContentSource(source);
    if (compare === "none" || compare === "previous" || compare === "previousMonth" || compare === "yearAgo") setComparisonMode(compare);
    if (start && end && start >= availableRange.start && end <= availableRange.end && start <= end) setRange({ start, end });
    const type = params.get("type");
    if (type) setPostType(type);
    setUrlReady(true);
  }, [availableRange]);

  useEffect(() => {
    if (!urlReady) return;
    const params = new URLSearchParams();
    params.set("view", contentSource);
    params.set("start", range.start);
    params.set("end", range.end);
    params.set("compare", comparisonMode);
    if (contentSource === "posts" && postType !== "Todos") params.set("type", postType);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [comparisonMode, contentSource, postType, range, urlReady]);

  const postTypes = useMemo(() => Array.from(new Set(posts.map((post) => post.postType))).sort(), [posts]);
  const filteredPosts = useMemo(() => filterPosts(posts, range.start, range.end, postType), [posts, range, postType]);
  const totals = useMemo(() => sumPosts(filteredPosts), [filteredPosts]);
  const comparisonRange = useMemo(() => {
    const start = new Date(`${range.start}T00:00:00`);
    const end = new Date(`${range.end}T23:59:59`);
    return comparisonMode === "yearAgo" ? getYearAgoPeriodRange(start, end) : comparisonMode === "previousMonth" ? getPreviousMonthPeriodRange(start, end) : getPreviousPeriodRange(start, end);
  }, [range, comparisonMode]);
  const comparisonTotals = useMemo(() => {
    const comparisonPosts = getPostsInRange(posts, comparisonRange.start, comparisonRange.end);
    const typeFiltered = postType === "Todos" ? comparisonPosts : comparisonPosts.filter((post) => post.postType === postType);
    return sumPosts(typeFiltered);
  }, [posts, comparisonRange, postType]);
  const aggregationMode = chooseAggregationMode(range.start, range.end);
  const timeline = useMemo(() => aggregateTimeline(filteredPosts, metric, aggregationMode), [filteredPosts, metric, aggregationMode]);
  const typePerformance = useMemo(() => aggregateByType(filteredPosts), [filteredPosts]);

  return (
    <div className="flex min-h-screen">
      <aside className={clsx("fixed inset-y-0 left-0 z-40 flex flex-col border-r border-white/12 bg-[#191918] px-1.5 py-5 transition-[width] duration-200 sm:px-2", sidebarExpanded ? "w-[218px] px-4" : "w-[54px] sm:w-[68px]")} aria-label="Navegação principal">
        <div className="flex items-center gap-2">
          <div className={clsx("flex h-11 flex-1 items-center border border-white/14 font-display text-sm font-bold text-paper", sidebarExpanded ? "justify-start px-3" : "justify-center")}>R<span className={clsx(!sidebarExpanded && "hidden")}>EISE</span><span className="ml-1 text-apex">.</span></div>
          {sidebarExpanded ? <button type="button" onClick={() => setSidebarExpanded(false)} className="flex size-9 shrink-0 items-center justify-center border border-white/10 text-white/45 hover:border-apex hover:text-paper" title="Recolher menu" aria-label="Recolher menu"><ChevronLeft size={17} /></button> : null}
        </div>
        <div className="mt-8 space-y-2">
          <SideNavButton active={contentSource === "traffic"} expanded={sidebarExpanded} label="Visão geral" icon={Gauge} onClick={() => setContentSource("traffic")} />
          <SideNavButton active={contentSource === "posts"} expanded={sidebarExpanded} label="Posts" icon={FileText} onClick={() => setContentSource("posts")} />
          <SideNavButton active={contentSource === "stories"} expanded={sidebarExpanded} label="Stories" icon={Images} onClick={() => setContentSource("stories")} />
        </div>
        <div className="mt-auto border-t border-white/10 pt-4">
          {sidebarExpanded ? <div className="text-left text-[9px] font-bold uppercase leading-4 text-white/28">Social<br />Intelligence</div> : <div className="mx-auto size-1 bg-apex/60" aria-hidden="true" />}
        </div>
        {!sidebarExpanded ? <button type="button" onClick={() => setSidebarExpanded(true)} className="mt-4 flex h-10 items-center justify-center border border-white/10 text-white/45 hover:border-apex hover:text-paper" title="Expandir menu" aria-label="Expandir menu"><ChevronRight size={17} /></button> : null}
      </aside>
    <main className={clsx("dashboard-shell min-h-screen max-w-[1560px] overflow-x-clip py-6 transition-[margin] duration-200 sm:px-7 lg:px-10 lg:py-9", sidebarExpanded ? "ml-[54px] sm:ml-[218px]" : "ml-[54px] sm:ml-[68px]")}>
      <header className="mb-8 flex flex-col gap-6 border-b border-white/12 pb-7 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
        <div className="min-w-0">
          <div className="mb-4 flex items-center gap-3 text-[11px] font-bold uppercase text-apex"><span className="h-px w-10 bg-apex" /> Reise Social Intelligence</div>
          <h1 className="max-w-full font-display text-xl font-bold uppercase leading-tight text-paper sm:text-3xl lg:text-[38px]"><span className="block sm:inline">Performance no</span><span className="block sm:ml-2 sm:inline">Instagram</span></h1>
          <p className="mt-3 max-w-[calc(100vw-2rem)] break-words text-sm leading-6 text-white/52 sm:max-w-3xl">
            Alcance, tráfego e eficiência de mídia em uma leitura executiva da página.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 lg:w-auto lg:items-end">
          <div className="flex w-full flex-wrap gap-2 lg:justify-end">
            <button
              type="button"
              className="flex h-9 items-center gap-2 border-b border-white/18 px-2 text-xs font-semibold text-white/62 transition hover:border-apex hover:text-paper"
              title="Recarrega os dados disponíveis nesta versão. A sincronização automática será ativada com a API."
              onClick={() => window.location.reload()}
            >
              <RefreshCw size={14} />
              <span className="max-[480px]:hidden">Atualizar dados</span>
            </button>
            <a
              className="flex h-9 items-center gap-2 border-b border-white/18 px-2 text-xs font-semibold text-white/62 transition hover:border-apex hover:text-paper"
              href={SOURCE_SHEET_URL}
              target="_blank"
              rel="noreferrer"
              title="Abre a planilha usada como fonte dos dados"
            >
              <ExternalLink size={14} />
              <span className="max-[480px]:hidden">Abrir base</span>
            </a>
            <a
              className="flex h-9 items-center gap-2 border-b border-white/18 px-2 text-xs font-semibold text-white/62 transition hover:border-apex hover:text-paper"
              href={`/api/dashboard?start=${range.start}&end=${range.end}&compare=${comparisonMode}`}
              target="_blank"
              rel="noreferrer"
              title="Abre os dados estruturados do período para leitura por inteligência artificial"
            >
              <Braces size={14} /> <span className="max-[480px]:hidden">Dados para IA</span>
            </a>
          </div>
          <div className="w-full border-l-2 border-apex pl-3 text-left lg:min-w-[170px] lg:text-right">
            <div className="text-[10px] font-bold uppercase text-white/38">Fonte ativa</div>
            <div className="mt-1 font-display text-lg font-bold text-paper">{contentSource === "traffic" ? "SSOT" : formatFullNumber(contentSource === "posts" ? posts.length : stories.length)}</div>
            <div className="text-xs text-white/44">{contentSource === "traffic" ? "BigQuery + Meta" : contentSource === "posts" ? "posts únicos" : "stories únicos"}</div>
          </div>
        </div>
      </header>

      <GlobalDateFilter range={range} availableRange={availableRange} mode={comparisonMode} onRangeChange={setRange} onModeChange={setComparisonMode} />

      {contentSource === "traffic" ? <SocialOverview result={socialData} posts={posts} stories={stories} range={range} mode={comparisonMode} /> : contentSource === "stories" ? <StoriesDashboard stories={stories} range={range} comparisonMode={comparisonMode} /> : (
      <>

      <div className="mb-5 min-w-0 overflow-x-auto pb-1">
        <nav className="flex w-max min-w-full border-b border-white/12 sm:min-w-0">
          {views.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                className={clsx(
                  "flex h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap border-b-2 px-3 text-sm font-semibold transition sm:flex-none sm:px-4",
                  view === item.key ? "border-apex text-paper" : "border-transparent text-white/52 hover:text-paper"
                )}
                onClick={() => setView(item.key)}
              >
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      <FilterBar range={range} availableRange={availableRange} comparisonMode={comparisonMode} postType={postType} postTypes={postTypes} onRangeChange={setRange} onComparisonModeChange={setComparisonMode} onPostTypeChange={setPostType} hideDateControls />

      {view === "overview" ? (
        <Overview
          totals={totals}
          comparisonTotals={comparisonTotals}
          range={range}
          comparisonRange={comparisonRange}
          comparisonMode={comparisonMode}
          timeline={timeline}
          typePerformance={typePerformance}
          metric={metric}
          setMetric={setMetric}
        />
      ) : null}
      {view === "content" ? <ContentView posts={filteredPosts} /> : null}
      {view === "analysis" ? <AnalysisView posts={filteredPosts} timeline={timeline} /> : null}
      </>
      )}
    </main>
    </div>
  );
}

function SideNavButton({ active, expanded, label, icon: Icon, onClick }: { active: boolean; expanded: boolean; label: string; icon: typeof Gauge; onClick: () => void }) {
  return <button type="button" onClick={onClick} title={label} aria-current={active ? "page" : undefined} className={clsx("relative flex h-12 w-full items-center gap-3 border-l-2 text-sm font-bold transition", expanded ? "justify-start px-3" : "justify-center", active ? "border-apex bg-white/[0.06] text-paper" : "border-transparent text-white/38 hover:bg-white/[0.03] hover:text-paper")}><Icon size={18} className={active ? "text-apex" : "text-white/36"} />{expanded ? <span>{label}</span> : null}</button>;
}

function Overview({
  totals,
  comparisonTotals,
  range,
  comparisonRange,
  comparisonMode,
  timeline,
  typePerformance,
  metric,
  setMetric
}: {
  totals: ReturnType<typeof sumPosts>;
  comparisonTotals: ReturnType<typeof sumPosts>;
  range: DateRange;
  comparisonRange: { start: Date; end: Date };
  comparisonMode: ComparisonMode;
  timeline: any[];
  typePerformance: any[];
  metric: MetricKey;
  setMetric: (metric: MetricKey) => void;
}) {
  const kpis = [
    ["Publicações", formatFullNumber(totals.publications), comparisonMode === "none" ? undefined : variation(totals.publications, comparisonTotals.publications)],
    ["Visualizações", formatCompactNumber(totals.views), comparisonMode === "none" ? undefined : variation(totals.views, comparisonTotals.views)],
    ["Alcance", formatCompactNumber(totals.reach), comparisonMode === "none" ? undefined : variation(totals.reach, comparisonTotals.reach)],
    ["Interações", formatCompactNumber(totals.interactions), comparisonMode === "none" ? undefined : variation(totals.interactions, comparisonTotals.interactions)],
    ["Salvamentos", formatCompactNumber(totals.saves), comparisonMode === "none" ? undefined : variation(totals.saves, comparisonTotals.saves)],
    ["Compartilhamentos", formatCompactNumber(totals.shares), comparisonMode === "none" ? undefined : variation(totals.shares, comparisonTotals.shares)],
    ["Seguidores ganhos", formatCompactNumber(totals.follows), comparisonMode === "none" ? undefined : variation(totals.follows, comparisonTotals.follows)]
  ] as const;

  return (
    <div className="mt-5 space-y-5">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
        {kpis.map(([label, value, delta]) => (
          <KpiCard key={label} label={label} value={value} variation={delta} showVariation={comparisonMode !== "none"} helper={comparisonMode === "none" ? "Período selecionado" : comparisonMode === "previousMonth" ? "vs. mesmos dias do mês anterior" : comparisonMode === "previous" ? "vs. período anterior equivalente" : "vs. mesmo período do ano anterior"} />
        ))}
      </section>

      {comparisonMode !== "none" ? <PeriodComparison totals={totals} comparisonTotals={comparisonTotals} range={range} comparisonRange={comparisonRange} comparisonMode={comparisonMode} /> : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <ChartFrame title="Evolução da performance" subtitle="A agregação muda entre diária, semanal e mensal conforme o intervalo.">
          <div className="mb-4 flex flex-wrap gap-2">
            {(Object.keys(metricLabels) as MetricKey[]).map((key) => (
              <button
                key={key}
                className={clsx(
                  "h-9 rounded-md border px-3 text-sm font-semibold",
                  metric === key ? "border-apex bg-apex text-pneu" : "border-white/10 bg-white/[0.04] text-white/58 hover:text-paper"
                )}
                onClick={() => setMetric(key)}
              >
                {metricLabels[key]}
              </button>
            ))}
          </div>
          <TimelineChart data={timeline} label={metricLabels[metric]} />
        </ChartFrame>

        <ChartFrame title="Volume x alcance médio" subtitle="Separa frequência de publicação e eficiência média.">
          <VolumeReachChart data={timeline} />
        </ChartFrame>
      </div>

      <ChartFrame title="Performance por tipo de post" subtitle="Referências operacionais sem criar uma pontuação geral arbitrária.">
        <TypePerformanceTable data={typePerformance} />
      </ChartFrame>
    </div>
  );
}

function PeriodComparison({
  totals,
  comparisonTotals,
  range,
  comparisonRange,
  comparisonMode
}: {
  totals: ReturnType<typeof sumPosts>;
  comparisonTotals: ReturnType<typeof sumPosts>;
  range: DateRange;
  comparisonRange: { start: Date; end: Date };
  comparisonMode: ComparisonMode;
}) {
  const rows = [
    { label: "Publicações", current: totals.publications, previous: comparisonTotals.publications, format: formatFullNumber },
    { label: "Alcance", current: totals.reach, previous: comparisonTotals.reach, format: formatCompactNumber },
    { label: "Visualizações", current: totals.views, previous: comparisonTotals.views, format: formatCompactNumber },
    { label: "Interações", current: totals.interactions, previous: comparisonTotals.interactions, format: formatCompactNumber },
    { label: "Taxa de engajamento", current: totals.engagementRate, previous: comparisonTotals.engagementRate, format: formatPercent }
  ];

  return (
    <ChartFrame
      title="Comparação entre períodos"
      subtitle={comparisonMode === "previousMonth" ? "Compara com os mesmos dias do mês anterior." : comparisonMode === "previous" ? "Compara com o intervalo imediatamente anterior, de mesma duração." : "Compara com as mesmas datas do ano anterior."}
    >
      <div className="mb-4 grid grid-cols-1 gap-2 rounded-md bg-white/[0.035] p-3 text-xs text-white/52 sm:grid-cols-2 md:hidden">
        <span><strong className="text-paper">Atual:</strong> {formatDate(range.start)} a {formatDate(range.end)}</span>
        <span><strong className="text-paper">Comparação:</strong> {formatDate(comparisonRange.start)} a {formatDate(comparisonRange.end)}</span>
      </div>
      <div className="hidden grid-cols-[1.2fr_repeat(3,.8fr)] border-b border-white/10 pb-3 text-xs uppercase tracking-[0.12em] text-white/44 md:grid">
        <span>Métrica</span>
        <span className="text-right">{formatDate(range.start)} a {formatDate(range.end)}</span>
        <span className="text-right">{formatDate(comparisonRange.start)} a {formatDate(comparisonRange.end)}</span>
        <span className="text-right">Variação</span>
      </div>
      <div className="divide-y divide-white/8">
        {rows.map((row) => {
          const delta = variation(row.current, row.previous);
          return (
            <div key={row.label} className="grid grid-cols-2 items-center gap-x-3 gap-y-2 py-3 text-sm md:grid-cols-[1.2fr_repeat(3,.8fr)] md:gap-0">
              <span className="font-semibold text-paper">{row.label}</span>
              <span className="text-right text-paper"><span className="mr-2 text-xs text-white/36 md:hidden">Atual</span>{row.format(row.current)}</span>
              <span className="text-left text-white/58 md:text-right"><span className="mr-2 text-xs text-white/36 md:hidden">Anterior</span>{row.format(row.previous)}</span>
              <span className={clsx("text-right font-semibold", delta === null ? "text-white/38" : delta >= 0 ? "text-emerald-300" : "text-red-300")}>
                {delta === null ? "Sem base" : formatPercent(delta)}
              </span>
            </div>
          );
        })}
      </div>
    </ChartFrame>
  );
}

function ContentView({ posts }: { posts: InstagramPost[] }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof InstagramPost>("reach");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const searchedPosts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return posts
      .filter((post) => !query || post.description.toLowerCase().includes(query))
      .sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (typeof av === "number" && typeof bv === "number") return bv - av;
        return String(bv).localeCompare(String(av));
      });
  }, [posts, search, sortKey]);

  const pageCount = Math.max(1, Math.ceil(searchedPosts.length / pageSize));
  const visibleRows = searchedPosts.slice((page - 1) * pageSize, page * pageSize);

  const rankings = [
    { label: "Alcance", key: "reach" as const },
    { label: "Visualizações", key: "views" as const },
    { label: "Compartilhamentos", key: "shares" as const },
    { label: "Salvamentos", key: "saves" as const },
    { label: "Seguidores ganhos", key: "follows" as const },
    { label: "Taxa de engajamento", key: "engagementRate" as const, percent: true }
  ];

  return (
    <div className="mt-5 space-y-5">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rankings.map((ranking) => (
          <RankingCard
            key={ranking.key}
            title={`Top por ${ranking.label}`}
            posts={[...posts].sort((a, b) => Number(b[ranking.key]) - Number(a[ranking.key])).slice(0, 5)}
            metricKey={ranking.key}
            percent={ranking.percent}
          />
        ))}
      </section>

      <ChartFrame title="Publicações" subtitle="Busca por descrição, ordenação por métrica e link direto para o post.">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md border border-white/10 bg-white/[0.05] px-3 text-sm text-white/60 sm:max-w-[360px]">
            <Search size={16} />
            <input
              className="w-full bg-transparent text-paper outline-none placeholder:text-white/34"
              placeholder="Buscar na descrição"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <select
            className="h-10 w-full rounded-md border border-white/10 bg-[#242320] px-3 text-sm text-paper outline-none focus:border-apex sm:w-auto"
            value={String(sortKey)}
            onChange={(event) => setSortKey(event.target.value as keyof InstagramPost)}
          >
            <option value="reach">Alcance</option>
            <option value="views">Visualizações</option>
            <option value="likes">Curtidas</option>
            <option value="comments">Comentários</option>
            <option value="shares">Compartilhamentos</option>
            <option value="saves">Salvamentos</option>
            <option value="follows">Seguidores ganhos</option>
            <option value="engagementRate">Taxa de engajamento</option>
          </select>
        </div>
        <PostsTable posts={visibleRows} />
        <div className="mt-4 flex flex-col gap-3 text-sm text-white/52 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Página {page} de {pageCount} | {formatFullNumber(searchedPosts.length)} posts
          </span>
          <div className="flex gap-2">
            <button className="rounded-md border border-white/10 px-3 py-2 disabled:opacity-35" disabled={page <= 1} onClick={() => setPage((item) => Math.max(1, item - 1))}>
              Anterior
            </button>
            <button className="rounded-md border border-white/10 px-3 py-2 disabled:opacity-35" disabled={page >= pageCount} onClick={() => setPage((item) => Math.min(pageCount, item + 1))}>
              Próxima
            </button>
          </div>
        </div>
      </ChartFrame>
    </div>
  );
}

function RankingCard({
  title,
  posts,
  metricKey,
  percent
}: {
  title: string;
  posts: InstagramPost[];
  metricKey: keyof InstagramPost;
  percent?: boolean;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.045] p-4 shadow-panel">
      <h2 className="mb-4 font-display text-base font-black uppercase text-paper">{title}</h2>
      <div className="space-y-3">
        {posts.map((post, index) => {
          const value = Number(post[metricKey]);
          return (
            <a key={post.id} className="block rounded-md border border-white/8 bg-white/[0.035] p-3 hover:border-apex/50" href={post.permanentLink} target="_blank" rel="noreferrer">
              <div className="flex justify-between gap-3">
              <span className="min-w-0 break-words text-xs uppercase tracking-[0.12em] text-white/42">#{index + 1} {post.postType}</span>
                <strong className="text-sm text-apex">{percent ? formatPercent(value) : formatCompactNumber(value)}</strong>
              </div>
              <p className="mt-2 line-clamp-2 text-sm leading-5 text-white/72">{post.description || "Sem descrição"}</p>
            </a>
          );
        })}
      </div>
    </section>
  );
}

function PostsTable({ posts }: { posts: InstagramPost[] }) {
  return (
    <div className="scrollbar-soft overflow-auto rounded-lg border border-white/10">
      <table className="w-full min-w-[1320px] border-collapse text-sm">
        <thead className="bg-white/[0.06] text-left text-xs uppercase tracking-[0.12em] text-white/44">
          <tr>
            <th className="px-3 py-3">Data</th>
            <th className="px-3 py-3">Tipo</th>
            <th className="px-3 py-3">Descrição</th>
            <th className="px-3 py-3 text-right">Visualizações</th>
            <th className="px-3 py-3 text-right">Alcance</th>
            <th className="px-3 py-3 text-right">Curt.</th>
            <th className="px-3 py-3 text-right">Com.</th>
            <th className="px-3 py-3 text-right">Comp.</th>
            <th className="px-3 py-3 text-right">Salv.</th>
            <th className="px-3 py-3 text-right">Seg.</th>
            <th className="px-3 py-3 text-right">Engaj.</th>
            <th className="px-3 py-3 text-right">Índice</th>
            <th className="px-3 py-3 text-right">Post</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/8">
          {posts.map((post) => (
            <tr key={post.id} className="text-white/72">
              <td className="whitespace-nowrap px-3 py-3">{formatDate(post.publishedAt)}</td>
              <td className="whitespace-nowrap px-3 py-3 text-paper">{post.postType}</td>
              <td className="max-w-[420px] px-3 py-3">
                <span className="line-clamp-2">{post.description || "Sem descrição"}</span>
              </td>
              <td className="px-3 py-3 text-right">{formatCompactNumber(post.views)}</td>
              <td className="px-3 py-3 text-right">{formatCompactNumber(post.reach)}</td>
              <td className="px-3 py-3 text-right">{formatFullNumber(post.likes)}</td>
              <td className="px-3 py-3 text-right">{formatFullNumber(post.comments)}</td>
              <td className="px-3 py-3 text-right">{formatFullNumber(post.shares)}</td>
              <td className="px-3 py-3 text-right">{formatFullNumber(post.saves)}</td>
              <td className="px-3 py-3 text-right">{formatFullNumber(post.follows)}</td>
              <td className="px-3 py-3 text-right">{formatPercent(post.engagementRate)}</td>
              <td className="px-3 py-3 text-right">{post.reachIndex ? `${formatDecimal(post.reachIndex)}x` : "-"}</td>
              <td className="px-3 py-3 text-right">
                <a className="font-semibold text-apex hover:text-orange-300" href={post.permanentLink} target="_blank" rel="noreferrer">
                  Abrir
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AnalysisView({ posts, timeline }: { posts: InstagramPost[]; timeline: any[] }) {
  const weekday = aggregateByWeekday(posts);
  const hourBands = aggregateByHourBand(posts);
  const distribution = aggregatePerformanceDistribution(posts);
  const concentration = aggregateReachConcentration(posts);
  const matrix = aggregatePerformanceMatrix(posts);
  const bestByIndex = [...posts].filter((post) => post.reachIndex).sort((a, b) => Number(b.reachIndex) - Number(a.reachIndex)).slice(0, 8);
  const objectiveGroups = [
    { title: "Descoberta", description: "Conteúdos que ampliam a distribuição.", icon: Eye, posts: [...posts].sort((a, b) => b.reach - a.reach).slice(0, 5), value: (post: InstagramPost) => formatCompactNumber(post.reach), metric: "alcance" },
    { title: "Interesse", description: "Conteúdos que geram reação proporcional.", icon: Heart, posts: [...posts].sort((a, b) => b.engagementRate - a.engagementRate).slice(0, 5), value: (post: InstagramPost) => formatPercent(post.engagementRate), metric: "engajamento" },
    { title: "Intenção", description: "Conteúdos que estimulam salvar ou compartilhar.", icon: Bookmark, posts: [...posts].sort((a, b) => (b.saves + b.shares) - (a.saves + a.shares)).slice(0, 5), value: (post: InstagramPost) => formatFullNumber(post.saves + post.shares), metric: "salv. + comp." },
    { title: "Crescimento", description: "Conteúdos associados a novos seguidores.", icon: UserPlus, posts: [...posts].sort((a, b) => b.follows - a.follows).slice(0, 5), value: (post: InstagramPost) => formatFullNumber(post.follows), metric: "seguidores" }
  ];

  return (
    <div className="mt-5 space-y-5">
      <ChartFrame title="Média x mediana por formato" subtitle="A mediana mostra o resultado típico sem deixar poucos conteúdos virais dominarem a leitura.">
        <TypePerformanceTable data={aggregateByType(posts)} />
      </ChartFrame>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[.72fr_1.28fr]">
        <ChartFrame title="Concentração do alcance" subtitle="Participação dos conteúdos líderes no alcance total do período.">
          <div className="space-y-5 py-2">
            {concentration.map((group, index) => (
              <div key={group.label}>
                <div className="mb-2 flex items-end justify-between gap-3">
                  <div><div className="text-sm font-semibold text-paper">{group.label}</div><div className="text-xs text-white/40">{group.posts} posts · {formatCompactNumber(group.reach)} de alcance</div></div>
                  <strong className={index === 0 ? "text-xl text-apex" : "text-lg text-paper"}>{formatPercent(group.share)}</strong>
                </div>
                <div className="h-2 overflow-hidden rounded-sm bg-white/[0.06]"><div className={index === 0 ? "h-full bg-apex" : "h-full bg-white/45"} style={{ width: `${Math.max(1, group.share * 100)}%` }} /></div>
              </div>
            ))}
          </div>
        </ChartFrame>

        <ChartFrame title="Matriz alcance x engajamento" subtitle="As linhas tracejadas representam as medianas do período. O tamanho do ponto indica visualizações." tooltip="Cada ponto representa um post do período filtrado. Passe o cursor para ver os dados e clique no ponto para abrir o conteúdo no Instagram.">
          <PerformanceMatrixChart data={matrix.points} reachMedian={matrix.reachMedian} engagementMedian={matrix.engagementMedian} />
        </ChartFrame>
      </div>

      <ChartFrame title="Conteúdos por objetivo" subtitle="Rankings separados evitam tratar alcance, interesse, intenção e crescimento como a mesma meta.">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {objectiveGroups.map((group) => <ObjectiveCard key={group.title} {...group} />)}
        </div>
      </ChartFrame>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ChartFrame title="Performance por dia" subtitle="Médias calculadas por dia da semana de publicação.">
          <HorizontalBarChart data={weekday} dataKey="avgReach" name="Alcance médio" />
        </ChartFrame>
        <ChartFrame title="Performance por horário" subtitle="Faixas úteis para leitura editorial e operacional.">
          <HorizontalBarChart data={hourBands} dataKey="avgReach" name="Alcance médio" />
        </ChartFrame>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_.82fr]">
        <ChartFrame title="Frequência semanal" subtitle="Quantidade de posts por período e alcance médio correspondente.">
          <VolumeReachChart data={timeline} />
        </ChartFrame>
        <ChartFrame title="Distribuição de performance" subtitle="Referência: mediana de alcance do mesmo tipo de post.">
          <HorizontalBarChart data={distribution} dataKey="posts" name="Posts" />
        </ChartFrame>
      </div>

      <ChartFrame title="Posts acima da referência interna" subtitle="Índice de alcance = alcance do post / mediana de alcance do mesmo tipo.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {bestByIndex.map((post) => (
            <a key={post.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-4 hover:border-apex/50" href={post.permanentLink} target="_blank" rel="noreferrer">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-[0.12em] text-white/44">{post.postType}</span>
                <strong className="text-lg text-apex">{post.reachIndex ? `${formatDecimal(post.reachIndex)}x` : "-"}</strong>
              </div>
              <p className="mt-3 line-clamp-3 text-sm leading-5 text-white/70">{post.description || "Sem descrição"}</p>
              <div className="mt-3 text-xs text-white/44">{formatDate(post.publishedAt)} | {formatCompactNumber(post.reach)} alcance</div>
            </a>
          ))}
        </div>
      </ChartFrame>

      <ChartFrame title="Cobertura analítica" subtitle="O dashboard distingue métricas disponíveis de análises que dependem de novos campos.">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <CoverageCard available title="Performance editorial" fields="Alcance, visualizações, interações e seguidores" />
          <CoverageCard title="Taxonomia editorial" fields="Campanha, tema, produto, CTA e creator" />
          <CoverageCard title="Retenção de Reels" fields="Tempo assistido, retenção e conclusão" />
          <CoverageCard title="Impacto no negócio" fields="Visitas, cliques, sessões, pedidos e receita" />
        </div>
      </ChartFrame>
    </div>
  );
}

function ObjectiveCard({ title, description, icon: Icon, posts, value, metric }: { title: string; description: string; icon: typeof Eye; posts: InstagramPost[]; value: (post: InstagramPost) => string; metric: string }) {
  return (
    <section className="min-w-0 rounded-md border border-white/10 bg-white/[0.025] p-4">
      <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-md bg-apex/10 text-apex"><Icon size={17} /></span><div><h3 className="font-display text-sm font-black uppercase text-paper">{title}</h3><p className="mt-1 text-xs leading-5 text-white/42">{description}</p></div></div>
      <div className="mt-4 space-y-2">
        {posts.map((post, index) => (
          <a key={post.id} href={post.permanentLink} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-md border border-transparent px-2 py-2 transition hover:border-white/10 hover:bg-white/[0.035]">
            <span className="w-5 shrink-0 text-xs text-white/32">{index + 1}</span>
            <span className="min-w-0 flex-1 truncate text-xs text-white/62">{post.description || post.postType}</span>
            <span className="shrink-0 text-right"><strong className="block text-sm text-paper">{value(post)}</strong><span className="block text-[10px] text-white/32">{metric}</span></span>
          </a>
        ))}
      </div>
    </section>
  );
}

function CoverageCard({ title, fields, available = false }: { title: string; fields: string; available?: boolean }) {
  const Icon = available ? CheckCircle2 : CircleDashed;
  return (
    <section className="rounded-md border border-white/10 bg-white/[0.025] p-4">
      <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-bold text-paper">{title}</h3><Icon size={17} className={available ? "text-emerald-300" : "text-apex"} /></div>
      <p className="mt-3 text-xs leading-5 text-white/46">{fields}</p>
      <div className={`mt-4 text-xs font-semibold uppercase tracking-[0.1em] ${available ? "text-emerald-300" : "text-apex"}`}>{available ? "Disponível" : "Pendente de dados"}</div>
    </section>
  );
}
