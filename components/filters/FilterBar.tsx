"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, ChevronDown, GitCompareArrows, RefreshCw, Rows3 } from "lucide-react";
import type { ComparisonMode, DateRange } from "@/lib/types";

type FilterBarProps = {
  range: DateRange;
  availableRange: DateRange;
  comparisonMode: ComparisonMode;
  postType: string;
  postTypes: string[];
  onRangeChange: (range: DateRange) => void;
  onComparisonModeChange: (mode: ComparisonMode) => void;
  onPostTypeChange: (postType: string) => void;
};

type PeriodPreset = { label: string; description: string; range: DateRange };

const comparisonOptions: Array<{ value: ComparisonMode; label: string; description: string }> = [
  { value: "none", label: "Sem comparação", description: "Exibe somente o período selecionado" },
  { value: "previous", label: "Período anterior", description: "Intervalo anterior com a mesma duração" },
  { value: "yearAgo", label: "Mesmo período do ano anterior", description: "Mesmas datas, um ano antes" }
];

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function buildPresets(availableRange: DateRange): PeriodPreset[] {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const weekday = (today.getDay() + 6) % 7;
  const weekStart = addDays(today, -weekday);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1, 12);

  return [
    { label: "Hoje", description: "Somente o dia atual", range: { start: toDateInput(today), end: toDateInput(today) } },
    { label: "Ontem", description: "Somente o dia anterior", range: { start: toDateInput(addDays(today, -1)), end: toDateInput(addDays(today, -1)) } },
    { label: "Últimos 7 dias", description: "Hoje e os seis dias anteriores", range: { start: toDateInput(addDays(today, -6)), end: toDateInput(today) } },
    { label: "Últimos 30 dias", description: "Janela móvel até hoje", range: { start: toDateInput(addDays(today, -29)), end: toDateInput(today) } },
    { label: "Semana atual", description: "De segunda-feira até hoje", range: { start: toDateInput(weekStart), end: toDateInput(today) } },
    { label: "Mês atual", description: "Do primeiro dia do mês até hoje", range: { start: toDateInput(monthStart), end: toDateInput(today) } },
    { label: "Mês anterior", description: "Mês completo anterior", range: { start: toDateInput(new Date(today.getFullYear(), today.getMonth() - 1, 1, 12)), end: toDateInput(new Date(today.getFullYear(), today.getMonth(), 0, 12)) } },
    { label: "Todo o período", description: "Toda a base disponível", range: availableRange }
  ];
}

function formatShortDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

const controlClass = "flex h-11 min-w-0 items-center justify-between gap-3 rounded-md border border-white/12 bg-white/[0.045] px-3 text-sm font-semibold text-paper transition hover:border-white/25 hover:bg-white/[0.065] focus:outline-none focus-visible:border-apex";

export function FilterBar({ range, availableRange, comparisonMode, postType, postTypes, onRangeChange, onComparisonModeChange, onPostTypeChange }: FilterBarProps) {
  const periodRef = useRef<HTMLDetailsElement>(null);
  const comparisonRef = useRef<HTMLDetailsElement>(null);
  const [draftRange, setDraftRange] = useState(range);
  const presets = useMemo(() => buildPresets(availableRange), [availableRange]);
  const activePreset = presets.find((preset) => preset.range.start === range.start && preset.range.end === range.end);
  const activeComparison = comparisonOptions.find((option) => option.value === comparisonMode) ?? comparisonOptions[0];

  useEffect(() => setDraftRange(range), [range]);

  useEffect(() => {
    function closeMenus(event: PointerEvent) {
      const target = event.target as Node;
      if (!periodRef.current?.contains(target)) periodRef.current?.removeAttribute("open");
      if (!comparisonRef.current?.contains(target)) comparisonRef.current?.removeAttribute("open");
    }

    document.addEventListener("pointerdown", closeMenus);
    return () => document.removeEventListener("pointerdown", closeMenus);
  }, []);

  function applyPreset(preset: PeriodPreset) {
    onRangeChange(preset.range);
    periodRef.current?.removeAttribute("open");
  }

  function applyCustomRange() {
    onRangeChange(draftRange);
    periodRef.current?.removeAttribute("open");
  }

  function selectComparison(mode: ComparisonMode) {
    onComparisonModeChange(mode);
    comparisonRef.current?.removeAttribute("open");
  }

  return (
    <section className="relative z-20 mb-1 flex min-w-0 flex-wrap items-center gap-2 rounded-lg border border-white/8 bg-[#1a1a18]/92 p-2.5 shadow-panel">
      <details ref={periodRef} className="group relative min-w-[190px] flex-1 sm:flex-none" onToggle={(event) => { if (event.currentTarget.open) comparisonRef.current?.removeAttribute("open"); }}>
        <summary className={`${controlClass} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
          <span className="flex min-w-0 items-center gap-2.5"><CalendarDays size={16} className="shrink-0 text-white/52" /><span className="truncate">{activePreset?.label ?? "Personalizado"}</span></span>
          <ChevronDown size={16} className="shrink-0 text-white/42 transition group-open:rotate-180" />
        </summary>
        <div className="absolute left-0 z-40 mt-2 w-[min(360px,calc(100vw-32px))] rounded-lg border border-white/12 bg-[#1d1d1b] p-3 shadow-[0_24px_80px_rgba(0,0,0,.62)]">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/42">Período</div>
          <div className="grid gap-1">
            {presets.map((preset) => {
              const selected = preset.range.start === range.start && preset.range.end === range.end;
              return (
                <button key={preset.label} type="button" className={`flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition ${selected ? "border-apex/70 bg-apex/10" : "border-white/8 bg-white/[0.035] hover:border-white/18 hover:bg-white/[0.06]"}`} onClick={() => applyPreset(preset)}>
                  <span><span className="block text-sm font-semibold text-paper">{preset.label}</span><span className="block text-xs text-white/38">{preset.description}</span></span>
                  {selected ? <Check size={16} className="shrink-0 text-apex" /> : null}
                </button>
              );
            })}
          </div>
          <div className="my-3 h-px bg-white/10" />
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/42">Personalizado</div>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-xs text-white/46">Início<input className="h-10 min-w-0 rounded-md border border-white/10 bg-white/[0.045] px-2 text-sm text-paper outline-none focus:border-apex" type="date" value={draftRange.start} max={draftRange.end} onChange={(event) => setDraftRange({ ...draftRange, start: event.target.value })} /></label>
            <label className="grid gap-1 text-xs text-white/46">Fim<input className="h-10 min-w-0 rounded-md border border-white/10 bg-white/[0.045] px-2 text-sm text-paper outline-none focus:border-apex" type="date" value={draftRange.end} min={draftRange.start} onChange={(event) => setDraftRange({ ...draftRange, end: event.target.value })} /></label>
          </div>
          <button type="button" className="mt-3 h-10 w-full rounded-md border border-apex/70 bg-apex/15 text-sm font-bold text-paper transition hover:bg-apex hover:text-pneu" onClick={applyCustomRange}>Aplicar período</button>
        </div>
      </details>

      <details ref={comparisonRef} className="group relative min-w-[220px] flex-1 sm:flex-none" onToggle={(event) => { if (event.currentTarget.open) periodRef.current?.removeAttribute("open"); }}>
        <summary className={`${controlClass} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
          <span className="flex min-w-0 items-center gap-2.5"><GitCompareArrows size={16} className="shrink-0 text-white/52" /><span className="truncate">{activeComparison.label}</span></span>
          <ChevronDown size={16} className="shrink-0 text-white/42 transition group-open:rotate-180" />
        </summary>
        <div className="absolute left-0 z-40 mt-2 w-[min(330px,calc(100vw-32px))] rounded-lg border border-white/12 bg-[#1d1d1b] p-3 shadow-[0_24px_80px_rgba(0,0,0,.62)]">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/42">Comparação</div>
          <div className="grid gap-1">
            {comparisonOptions.map((option) => (
              <button key={option.value} type="button" className={`flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-left transition ${comparisonMode === option.value ? "border-apex/70 bg-apex/10" : "border-white/8 bg-white/[0.035] hover:border-white/18 hover:bg-white/[0.06]"}`} onClick={() => selectComparison(option.value)}>
                <span><span className="block text-sm font-semibold text-paper">{option.label}</span><span className="block text-xs text-white/38">{option.description}</span></span>
                {comparisonMode === option.value ? <Check size={16} className="shrink-0 text-apex" /> : null}
              </button>
            ))}
          </div>
        </div>
      </details>

      <label className="relative min-w-[190px] flex-1 sm:flex-none">
        <Rows3 size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/52" />
        <select aria-label="Tipo de conteúdo" className={`${controlClass} w-full cursor-pointer appearance-none pl-10 pr-9`} value={postType} onChange={(event) => onPostTypeChange(event.target.value)}>
          <option value="Todos">Todos os conteúdos</option>
          {postTypes.map((type) => <option key={type}>{type}</option>)}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/42" />
      </label>

      <button type="button" className="flex h-11 items-center justify-center gap-2 rounded-md border border-apex/45 bg-apex/10 px-4 text-sm font-semibold text-paper transition hover:bg-apex hover:text-pneu" onClick={() => window.location.reload()}>
        <RefreshCw size={16} />
        <span className="hidden sm:inline">Atualizar</span>
      </button>

      <div className="ml-auto hidden text-right xl:block">
        <div className="text-[10px] uppercase tracking-[0.14em] text-white/32">Intervalo ativo</div>
        <div className="mt-0.5 text-xs text-white/56">{formatShortDate(range.start)} a {formatShortDate(range.end)}</div>
      </div>
    </section>
  );
}
