import type { ReactNode } from "react";
import { Info } from "lucide-react";

type ChartFrameProps = {
  title: string;
  subtitle?: string;
  tooltip?: string;
  children: ReactNode;
};

export function ChartFrame({ title, subtitle, tooltip, children }: ChartFrameProps) {
  const helpText = tooltip ?? subtitle;
  return (
    <section className="relative min-w-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.045] p-4 shadow-panel sm:p-5">
      <span className="absolute left-0 top-0 h-px w-16 bg-apex" aria-hidden="true" />
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-start gap-2">
            <h2 className="break-words font-display text-base font-black uppercase text-paper sm:text-lg">{title}</h2>
            {helpText ? (
              <span className="group/help relative mt-0.5 shrink-0" tabIndex={0} aria-label={`Ajuda sobre ${title}`}>
                <Info size={15} className="cursor-help text-white/38 transition group-hover/help:text-apex group-focus/help:text-apex" />
                <span role="tooltip" className="pointer-events-none absolute left-1/2 top-6 z-50 hidden w-64 -translate-x-1/2 rounded-md border border-white/12 bg-[#151514] px-3 py-2 text-left font-sans text-xs font-normal normal-case leading-5 text-white/72 shadow-panel group-hover/help:block group-focus/help:block sm:left-auto sm:right-0 sm:translate-x-0">
                  {helpText}
                </span>
              </span>
            ) : null}
          </div>
          {subtitle ? <p className="mt-1 break-words text-sm leading-5 text-white/48">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}
