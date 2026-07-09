"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

type AiAnalysis = {
  matchScore: number;
  topMatches: string[];
  redFlags: string[];
  screeningQuestions: string[];
  summaryMarkdown: string;
};

type CandidateAiAnalysisPanelProps = {
  candidateId: string;
  hasResume: boolean;
  layout?: "stacked" | "split";
};

export function CandidateAiAnalysisPanel({
  candidateId,
  hasResume,
  layout = "stacked",
}: CandidateAiAnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/candidates/${candidateId}/ai-analysis`, {
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Не вдалося виконати аналіз");
      }
      setAnalysis(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося виконати аналіз");
    } finally {
      setIsLoading(false);
    }
  };

  const isSplit = layout === "split";

  return (
    <div
      className={`flex flex-col gap-2 ${
        isSplit ? "h-full min-h-[28rem]" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-foreground">Аналіз AI</h3>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!hasResume || isLoading}
          onClick={() => void runAnalysis()}
        >
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <Spinner className="h-3.5 w-3.5" />
              Аналіз…
            </span>
          ) : (
            "Запустити"
          )}
        </Button>
      </div>

      {!hasResume && (
        <p className="text-[11px] text-muted">Завантажте PDF-резюме для AI-аналізу.</p>
      )}

      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-700">
          {error}
        </p>
      )}

      <div
        className={`flex-1 overflow-y-auto rounded border border-violet-200 bg-violet-50/40 p-3 text-xs text-foreground ${
          isSplit ? "min-h-0" : ""
        }`}
      >
        {!analysis && !isLoading && (
          <p className="text-muted">
            Натисніть «Запустити», щоб отримати оцінку відповідності, критерії та питання для скринінгу.
          </p>
        )}

        {analysis && (
          <>
            <div className="mb-3 flex items-center justify-between rounded-lg bg-violet-600 px-3 py-2 text-white">
              <span className="font-semibold">Match Score</span>
              <span className="text-lg font-bold">{analysis.matchScore}%</span>
            </div>

            <div className="space-y-2">
              <Section title="Top Match Criteria" items={analysis.topMatches} />
              <Section
                title="Red Flags"
                items={analysis.redFlags.length > 0 ? analysis.redFlags : ["Не виявлено"]}
                tone="danger"
              />
              <div>
                <h5 className="mb-1 font-semibold text-violet-900">Screening Questions</h5>
                <ol className="list-decimal space-y-1 pl-4">
                  {analysis.screeningQuestions.map((question, index) => (
                    <li key={index}>{question}</li>
                  ))}
                </ol>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  items,
  tone = "default",
}: {
  title: string;
  items: string[];
  tone?: "default" | "danger";
}) {
  return (
    <div>
      <h5
        className={`mb-1 font-semibold ${
          tone === "danger" ? "text-red-800" : "text-violet-900"
        }`}
      >
        {title}
      </h5>
      <ul className="space-y-0.5">
        {items.map((item, index) => (
          <li key={index} className="flex gap-1.5">
            <span className="text-muted">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
