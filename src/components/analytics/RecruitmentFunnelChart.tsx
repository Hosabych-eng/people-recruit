"use client";

import type { RecruitingFunnelStep } from "@/types";

const FUNNEL_COLORS = [
  "bg-sky-400",
  "bg-sky-500",
  "bg-indigo-500",
  "bg-indigo-600",
  "bg-violet-500",
  "bg-violet-600",
  "bg-fuchsia-500",
  "bg-pink-500",
  "bg-rose-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-yellow-500",
  "bg-lime-500",
];

type RecruitmentFunnelChartProps = {
  funnel: RecruitingFunnelStep[];
};

export function RecruitmentFunnelChart({ funnel }: RecruitmentFunnelChartProps) {
  const maxCount = Math.max(...funnel.map((step) => step.count), 1);

  if (funnel.every((step) => step.count === 0)) {
    return (
      <div className="flex h-[360px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted">
        Немає кандидатів у воронці.
      </div>
    );
  }

  return (
    <div className="max-h-[520px] space-y-2.5 overflow-y-auto py-1 pr-1">
      {funnel.map((step, index) => {
        const width = Math.max((step.count / maxCount) * 100, step.count > 0 ? 14 : 6);
        const color = FUNNEL_COLORS[index % FUNNEL_COLORS.length];

        return (
          <div key={step.stage} className="flex items-center gap-3">
            <div className="w-full">
              <div
                className={`relative flex h-10 items-center rounded-md px-4 text-sm font-medium text-white shadow-sm transition-all ${color}`}
                style={{ width: `${width}%`, minWidth: step.count > 0 ? "7rem" : "4rem" }}
              >
                <span className="truncate">
                  {step.stage}: {step.count} ({step.efficiency}%)
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
