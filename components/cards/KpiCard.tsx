import clsx from "clsx";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { formatPercent } from "@/lib/format";

type KpiCardProps = {
  label: string;
  value: string;
  variation?: number | null;
  helper?: string;
};

export function KpiCard({ label, value, variation, helper }: KpiCardProps) {
  const hasVariation = variation !== undefined && variation !== null;
  const isPositive = hasVariation && variation >= 0;
  const Icon = !hasVariation ? Minus : isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.045] p-4 shadow-panel">
      <div className="min-h-8 break-words text-xs uppercase tracking-[0.14em] text-white/48">{label}</div>
      <div className="mt-3 flex min-w-0 flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 break-words font-display text-2xl font-black leading-none text-paper xl:text-3xl">{value}</div>
        <div
          className={clsx(
            "flex min-w-0 items-center justify-end gap-1 whitespace-nowrap text-sm",
            !hasVariation && "text-white/36",
            hasVariation && isPositive && "text-emerald-300",
            hasVariation && !isPositive && "text-red-300"
          )}
          title="Comparação com o período anterior equivalente"
        >
          <Icon size={16} />
          {hasVariation ? formatPercent(variation) : "sem base"}
        </div>
      </div>
      {helper ? <div className="mt-3 text-xs text-white/44">{helper}</div> : null}
    </div>
  );
}
