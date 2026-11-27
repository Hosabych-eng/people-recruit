"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { isLinkedInUrl, isPdfUrl } from "@/lib/resume-helpers";

const CandidateAiAnalysisPanel = dynamic(
  () =>
    import("@/components/candidate/CandidateAiAnalysisPanel").then((mod) => ({
      default: mod.CandidateAiAnalysisPanel,
    })),
  { ssr: false, loading: () => <AiPanelSkeleton compact /> },
);

type CandidateResumeAiSectionProps = {
  candidateId: string;
  resumeViewerUrl: string | null;
  hasPdfResume: boolean;
};

function isEmbeddableResumeUrl(url: string | null): boolean {
  if (!url) return false;
  if (url.startsWith("/api/candidates/")) return true;
  if (isLinkedInUrl(url)) return false;
  return isPdfUrl(url);
}

function SplitSkeleton({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="space-y-3">
        <div className="h-24 animate-pulse rounded border border-border bg-slate-100" />
        <div className="h-20 animate-pulse rounded border border-border bg-slate-100" />
      </div>
    );
  }

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

function AiPanelSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div
      className={`flex animate-pulse flex-col gap-2 rounded border border-violet-100 bg-violet-50/40 p-3 ${
        compact ? "min-h-[5rem]" : "h-full min-h-[28rem]"
      }`}
    >
      <div className="h-4 w-24 rounded bg-violet-200/60" />
      <div className="h-10 flex-1 rounded bg-violet-100/60" />
    </div>
  );
}

function LinkedInResumeCard({ url }: { url: string }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-gradient-to-b from-slate-50 to-white px-4 py-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0A66C2] text-white shadow-sm">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
            <path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S.02 4.88.02 3.5 1.14 1 2.5 1s2.48 1.12 2.48 2.5zM.22 8.5h4.56V23H.22V8.5zM8.34 8.5h4.37v1.98h.06c.61-1.15 2.1-2.36 4.32-2.36 4.62 0 5.47 3.04 5.47 7V23h-4.56v-6.58c0-1.57-.03-3.59-2.19-3.59-2.19 0-2.53 1.71-2.53 3.48V23H8.34V8.5z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Профіль LinkedIn</p>
          <p className="text-xs text-muted">
            LinkedIn блокує вбудований перегляд — відкрийте профіль у новій вкладці.
          </p>
        </div>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg bg-[#0A66C2] px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#004182]"
      >
        Відкрити LinkedIn у новій вкладці
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <path d="M15 3h6v6" />
          <path d="M10 14 21 3" />
        </svg>
      </a>
    </div>
  );
}

function EmptyResumeCard() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-slate-50/80 px-4 py-4 text-center">
      <p className="text-sm font-medium text-foreground">Резюме не додано</p>
      <p className="mt-1 text-xs text-muted">
        Завантажте PDF або додайте посилання на портфоліо.
      </p>
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

  const linkedInUrl =
    resumeViewerUrl && isLinkedInUrl(resumeViewerUrl) ? resumeViewerUrl : null;
  const canEmbed = isEmbeddableResumeUrl(resumeViewerUrl);
  const useTallLayout = Boolean(canEmbed || hasPdfResume);

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
    if (!isVisible || !useTallLayout) return;
    const timer = window.setTimeout(() => setShowPdf(true), 80);
    return () => window.clearTimeout(timer);
  }, [isVisible, useTallLayout]);

  return (
    <section ref={containerRef} className="rounded-lg border border-border bg-card p-2.5">
      <h3 className="mb-2 text-xs font-semibold">Резюме та AI-аналіз</h3>
      {!isVisible ? (
        <SplitSkeleton compact={!useTallLayout} />
      ) : useTallLayout ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="min-h-[28rem] rounded border border-border bg-white p-1">
            {showPdf && canEmbed && resumeViewerUrl ? (
              <iframe
                title="Резюме"
                src={resumeViewerUrl}
                loading="lazy"
                className="h-full min-h-[28rem] w-full rounded"
              />
            ) : showPdf ? (
              <EmptyResumeCard />
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
      ) : (
        <div className="space-y-3">
          {linkedInUrl ? <LinkedInResumeCard url={linkedInUrl} /> : <EmptyResumeCard />}
          <CandidateAiAnalysisPanel
            candidateId={candidateId}
            hasResume={hasPdfResume}
            layout="stacked"
          />
        </div>
      )}
    </section>
  );
}
