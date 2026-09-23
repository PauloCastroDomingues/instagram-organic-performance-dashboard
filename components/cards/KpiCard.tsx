import clsx from "clsx";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { formatPercent } from "@/lib/format";

type KpiCardProps = {
  label: string;
  value: string;
  variation?: number | null;
  showVariation?: boolean;
  helper?: string;
  lowerIsBetter?: boolean;
};

export function KpiCard({ label, value, variation, showVariation = true, helper, lowerIsBetter = false }: KpiCardProps) {
  const hasVariation = variation !== undefined && variation !== null;
  const isPositive = hasVariation && variation >= 0;
  const isFavorable = hasVariation && (lowerIsBetter ? variation <= 0 : variation >= 0);
  const Icon = !hasVariation ? Minus : isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="min-w-0 border-l border-white/14 bg-white/[0.018] px-5 py-4 first:border-l-0">
      <div className="min-h-7 break-words text-[11px] font-bold uppercase text-white/45">{label}</div>
      <div className="mt-3 flex min-w-0 flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 break-words font-display text-2xl font-bold leading-none text-paper xl:text-[28px]">{value}</div>
        {showVariation ? (
          <div
            className={clsx(
              "flex min-w-0 items-center justify-end gap-1 whitespace-nowrap text-sm",
              !hasVariation && "text-white/36",
              hasVariation && isFavorable && "text-emerald-300",
              hasVariation && !isFavorable && "text-red-300"
            )}
            title="Comparação com o período de referência"
          >
            <Icon size={16} />
            {hasVariation ? formatPercent(variation) : "sem base"}
          </div>
        ) : null}
      </div>
      {helper ? <div className="mt-3 text-xs text-white/44">{helper}</div> : null}
    </div>
  );
}
