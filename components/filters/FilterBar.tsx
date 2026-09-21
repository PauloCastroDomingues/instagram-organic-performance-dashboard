"use client";

import { useMemo, useRef } from "react";
import { ArrowRight, CalendarDays, Check, ChevronDown, Database } from "lucide-react";
import type { DateRange } from "@/lib/types";

type FilterBarProps = {
  range: DateRange;
  availableRange: DateRange;
  postType: string;
  postTypes: string[];
  onRangeChange: (range: DateRange) => void;
  onPostTypeChange: (postType: string) => void;
};

type PeriodPreset = { label: string; description: string; range: DateRange };

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
  const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1, 12);
  const previousMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 12);

  return [
    { label: "Hoje", description: "Somente o dia atual", range: { start: toDateInput(today), end: toDateInput(today) } },
    { label: "Últimos 7 dias", description: "Hoje e os seis dias anteriores", range: { start: toDateInput(addDays(today, -6)), end: toDateInput(today) } },
    { label: "Semana atual", description: "De segunda-feira até hoje", range: { start: toDateInput(weekStart), end: toDateInput(today) } },
    { label: "Semana anterior", description: "Semana completa anterior", range: { start: toDateInput(addDays(weekStart, -7)), end: toDateInput(addDays(weekStart, -1)) } },
    { label: "Mês atual", description: "Do primeiro dia do mês até hoje", range: { start: toDateInput(monthStart), end: toDateInput(today) } },
    { label: "Mês anterior", description: "Mês completo anterior", range: { start: toDateInput(previousMonthStart), end: toDateInput(previousMonthEnd) } },
    { label: "Todo o período", description: "Toda a base disponível", range: availableRange }
  ];
}

function formatShortDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function FilterBar({ range, availableRange, postType, postTypes, onRangeChange, onPostTypeChange }: FilterBarProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const presets = useMemo(() => buildPresets(availableRange), [availableRange]);
  const activePreset = presets.find((preset) => preset.range.start === range.start && preset.range.end === range.end);

  function applyPreset(preset: PeriodPreset) {
    onRangeChange(preset.range);
    detailsRef.current?.removeAttribute("open");
  }

  return (
    <section className="rounded-lg border border-white/10 bg-[#1a1a18]/95 p-3 shadow-panel sm:p-4">
      <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-[minmax(250px,.9fr)_minmax(360px,1.35fr)_minmax(190px,.7fr)_auto] xl:items-end">
        <div className="grid min-w-0 gap-1.5">
          <span className="text-xs uppercase tracking-[0.14em] text-white/44">Período</span>
          <details ref={detailsRef} className="group relative min-w-0">
            <summary className="flex h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-md border border-white/12 bg-white/[0.055] px-3 text-left transition hover:border-white/25 focus:outline-none focus-visible:border-apex [&::-webkit-details-marker]:hidden">
              <span className="flex min-w-0 items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-md bg-apex/12 text-apex"><CalendarDays size={17} /></span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-paper">{activePreset?.label ?? "Período personalizado"}</span>
                  <span className="block truncate text-xs text-white/42">{formatShortDate(range.start)} a {formatShortDate(range.end)}</span>
                </span>
              </span>
              <ChevronDown size={17} className="shrink-0 text-white/42 transition group-open:rotate-180" />
            </summary>

            <div className="absolute left-0 z-30 mt-2 w-full min-w-[300px] overflow-hidden rounded-lg border border-white/12 bg-[#171715] p-1.5 shadow-[0_22px_70px_rgba(0,0,0,.55)] sm:w-[360px]">
              <div className="px-3 pb-2 pt-2 text-[11px] uppercase tracking-[0.14em] text-white/36">Atalhos de período</div>
              {presets.map((preset) => {
                const selected = preset.range.start === range.start && preset.range.end === range.end;
                return (
                  <button key={preset.label} type="button" className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left transition hover:bg-white/[0.06]" onClick={() => applyPreset(preset)}>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-paper">{preset.label}</span>
                      <span className="block text-xs text-white/42">{preset.description}</span>
                    </span>
                    {selected ? <Check size={16} className="shrink-0 text-apex" /> : null}
                  </button>
                );
              })}
            </div>
          </details>
        </div>

        <div className="grid min-w-0 gap-1.5">
          <span className="text-xs uppercase tracking-[0.14em] text-white/44">Intervalo personalizado</span>
          <div className="grid min-w-0 grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-md border border-white/10 bg-white/[0.035] p-1.5">
            <input aria-label="Data inicial" className="h-9 min-w-0 w-full rounded border border-transparent bg-transparent px-2 text-sm text-paper outline-none transition hover:bg-white/[0.04] focus:border-apex/65 focus:bg-white/[0.05]" type="date" value={range.start} max={range.end} onChange={(event) => onRangeChange({ ...range, start: event.target.value })} />
            <ArrowRight size={15} className="text-white/28" />
            <input aria-label="Data final" className="h-9 min-w-0 w-full rounded border border-transparent bg-transparent px-2 text-sm text-paper outline-none transition hover:bg-white/[0.04] focus:border-apex/65 focus:bg-white/[0.05]" type="date" value={range.end} min={range.start} onChange={(event) => onRangeChange({ ...range, end: event.target.value })} />
          </div>
        </div>

        <label className="grid min-w-0 gap-1.5 text-xs uppercase tracking-[0.14em] text-white/44">
          Tipo de conteúdo
          <select className="h-12 min-w-0 w-full rounded-md border border-white/12 bg-[#242320] px-3 text-sm font-semibold normal-case tracking-normal text-paper outline-none transition hover:border-white/25 focus:border-apex" value={postType} onChange={(event) => onPostTypeChange(event.target.value)}>
            <option>Todos</option>
            {postTypes.map((type) => <option key={type}>{type}</option>)}
          </select>
        </label>

        <div className="flex min-h-12 items-center gap-3 rounded-md border border-white/8 bg-white/[0.025] px-3 xl:min-w-[205px]">
          <Database size={16} className="shrink-0 text-apex" />
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.14em] text-white/38">Fonte de dados</div>
            <div className="truncate text-xs text-white/62">CSV local · pronto para API</div>
          </div>
        </div>
      </div>
    </section>
  );
}
