"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const CandidateAiAnalysisPanel = dynamic(
  () =>
    import("@/components/candidate/CandidateAiAnalysisPanel").then((mod) => ({
      default: mod.CandidateAiAnalysisPanel,
    })),
  { ssr: false, loading: () => <AiPanelSkeleton /> },
);

type CandidateResumeAiSectionProps = {
  candidateId: string;
  resumeViewerUrl: string | null;
  hasPdfResume: boolean;
};

function SplitSkeleton() {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="min-h-[28rem] animate-pulse rounded border border-border bg-slate-100" />
      <div className="min-h-[28rem] animate-pulse rounded border border-border bg-slate-100" />
    </div>
  );
}

function PdfSkeleton() {
  return (
    <div className="flex h-full min-h-[28rem] items-center justify-center rounded bg-slate-50 text-xs text-muted">
      Завантаження резюме…
    </div>
  );
}

function AiPanelSkeleton() {
  return (
    <div className="flex h-full min-h-[28rem] animate-pulse flex-col gap-2 rounded border border-violet-100 bg-violet-50/40 p-3">
      <div className="h-4 w-24 rounded bg-violet-200/60" />
      <div className="h-10 flex-1 rounded bg-violet-100/60" />
    </div>
  );
}

export function CandidateResumeAiSection({
  candidateId,
  resumeViewerUrl,
  hasPdfResume,
}: CandidateResumeAiSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showPdf, setShowPdf] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const timer = window.setTimeout(() => setShowPdf(true), 80);
    return () => window.clearTimeout(timer);
  }, [isVisible]);

  return (
    <section ref={containerRef} className="rounded-lg border border-border bg-card p-2.5">
      <h3 className="mb-2 text-xs font-semibold">Резюме та AI-аналіз</h3>
      {!isVisible ? (
        <SplitSkeleton />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="min-h-[28rem] rounded border border-border bg-white p-1">
            {showPdf && resumeViewerUrl ? (
              <iframe
                title="Резюме"
                src={resumeViewerUrl}
                loading="lazy"
                className="h-full min-h-[28rem] w-full rounded"
              />
            ) : showPdf ? (
              <div className="flex h-full min-h-[28rem] flex-col items-center justify-center gap-3 bg-gradient-to-b from-slate-50 to-white px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 ring-1 ring-border">
                  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">No valid resume attached</p>
                  <p className="max-w-xs text-xs text-muted">
                    Upload a PDF resume or add a valid portfolio link to preview it here.
                  </p>
                </div>
              </div>
            ) : (
              <PdfSkeleton />
            )}
          </div>
          <CandidateAiAnalysisPanel
            candidateId={candidateId}
            hasResume={hasPdfResume}
            layout="split"
          />
        </div>
      )}
    </section>
  );
}
