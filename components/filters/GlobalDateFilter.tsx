"use client";

import { CalendarDays, GitCompareArrows } from "lucide-react";
import type { ComparisonMode, DateRange } from "@/lib/types";

function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function fullDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T12:00:00`));
}

function getReferenceRange(range: DateRange, mode: ComparisonMode): DateRange {
  if (mode === "previousMonth") {
    const shiftMonth = (value: string) => {
      const date = new Date(`${value}T12:00:00`);
      const day = date.getDate();
      const targetMonth = date.getMonth() - 1;
      const targetYear = date.getFullYear() + Math.floor(targetMonth / 12);
      const normalizedMonth = ((targetMonth % 12) + 12) % 12;
      const lastDay = new Date(targetYear, normalizedMonth + 1, 0).getDate();
      date.setFullYear(targetYear, normalizedMonth, Math.min(day, lastDay));
      return date.toISOString().slice(0, 10);
    };
    return { start: shiftMonth(range.start), end: shiftMonth(range.end) };
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

export function GlobalDateFilter({ range, availableRange, mode, onRangeChange, onModeChange }: { range: DateRange; availableRange: DateRange; mode: ComparisonMode; onRangeChange: (range: DateRange) => void; onModeChange: (mode: ComparisonMode) => void }) {
  const referenceRange = getReferenceRange(range, mode);
  const presets = [
    { value: "7", label: "7 dias", days: 7 },
    { value: "30", label: "30 dias", days: 30 },
    { value: "all", label: "Tudo", days: 0 }
  ];

  function applyPreset(value: string) {
    if (value === "all") return onRangeChange(availableRange);
    const days = Number(value);
    onRangeChange({ start: addDays(availableRange.end, -(days - 1)), end: availableRange.end });
  }

  return (
    <section className="mb-7 border-y border-white/12 bg-white/[0.015] px-1 py-4 sm:px-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 text-[11px] font-bold uppercase text-paper"><CalendarDays size={15} className="text-apex" /> Período global</div>
          <div className="flex gap-1">
            {presets.map((preset) => <button key={preset.value} type="button" onClick={() => applyPreset(preset.value)} className="h-8 border-b border-white/16 px-3 text-xs font-semibold text-white/52 transition hover:border-apex hover:text-paper">{preset.label}</button>)}
          </div>
        </div>
        <div className="grid min-w-0 gap-3 xl:grid-cols-[1fr_auto_1fr] xl:items-end">
          <div className="grid min-w-0 gap-1.5"><span className="text-[10px] font-bold uppercase text-apex">Analisado em todas as abas</span><div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><input aria-label="Início do período global" type="date" value={range.start} max={range.end} min={availableRange.start} onChange={(event) => onRangeChange({ ...range, start: event.target.value })} className="h-11 w-full min-w-0 border border-apex/30 bg-transparent px-3 text-sm text-paper outline-none focus:border-apex" /><input aria-label="Fim do período global" type="date" value={range.end} min={range.start} max={availableRange.end} onChange={(event) => onRangeChange({ ...range, end: event.target.value })} className="h-11 w-full min-w-0 border border-apex/30 bg-transparent px-3 text-sm text-paper outline-none focus:border-apex" /></div></div>
          <GitCompareArrows size={18} className="mb-3 hidden text-white/32 xl:block" />
          <div className="grid min-w-0 gap-2"><span className="text-[10px] font-bold uppercase text-white/42">Comparação global</span><div className="grid grid-cols-2 gap-1 text-[11px] font-semibold sm:grid-cols-4"><button type="button" onClick={() => onModeChange("previousMonth")} className={`border-b py-2 ${mode === "previousMonth" ? "border-apex text-apex" : "border-white/12 text-white/40"}`}>Mês anterior</button><button type="button" onClick={() => onModeChange("previous")} className={`border-b py-2 ${mode === "previous" ? "border-apex text-apex" : "border-white/12 text-white/40"}`}>Período anterior</button><button type="button" onClick={() => onModeChange("yearAgo")} className={`border-b py-2 ${mode === "yearAgo" ? "border-apex text-apex" : "border-white/12 text-white/40"}`}>Ano anterior</button><button type="button" onClick={() => onModeChange("none")} className={`border-b py-2 ${mode === "none" ? "border-apex text-apex" : "border-white/12 text-white/40"}`}>Desativar</button></div><div className="flex h-11 min-w-0 items-center border border-white/10 bg-white/[0.02] px-3 text-sm font-semibold text-white/65">{mode === "none" ? "Comparação desativada" : `${fullDate(referenceRange.start)} a ${fullDate(referenceRange.end)}`}</div></div>
        </div>
      </div>
    </section>
  );
}
