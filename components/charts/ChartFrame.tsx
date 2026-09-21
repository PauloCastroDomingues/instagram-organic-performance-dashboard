import type { ReactNode } from "react";

type ChartFrameProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function ChartFrame({ title, subtitle, children }: ChartFrameProps) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.045] p-4 shadow-panel sm:p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="break-words font-display text-base font-black uppercase text-paper sm:text-lg">{title}</h2>
          {subtitle ? <p className="mt-1 break-words text-sm leading-5 text-white/48">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}
