"use client";

import { useState } from "react";
import type { CandidateInterview } from "@/types";
import { ScheduleInterviewModal } from "@/components/candidate/ScheduleInterviewModal";
import {
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_STATUS_STYLES,
  INTERVIEW_TYPE_LABELS,
} from "@/lib/candidate-profile";

type InterviewsTabProps = {
  candidateId: string;
  candidateName: string;
  candidateEmail: string | null;
  interviews: CandidateInterview[];
  jobTitle: string;
  recruiterName: string;
  recruiterEmail: string;
  onInterviewScheduled: () => void | Promise<void>;
};

function formatInterviewRange(scheduledAt: string, durationMinutes: number) {
  const start = new Date(scheduledAt);
  const end = new Date(start.getTime() + durationMinutes * 60_000);

  const datePart = new Intl.DateTimeFormat("uk-UA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(start);

  const timeFormatter = new Intl.DateTimeFormat("uk-UA", {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "shortOffset",
  });

  return `${datePart} ${timeFormatter.format(start)} - ${timeFormatter.format(end)}`;
}

export function InterviewsTab({
  candidateId,
  candidateName,
  candidateEmail,
  interviews,
  jobTitle,
  recruiterName,
  recruiterEmail,
  onInterviewScheduled,
}: InterviewsTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-slate-50"
        >
          <CalendarIcon />
          Запланувати інтерв&apos;ю
        </button>

        {interviews.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
            <p className="text-sm font-medium text-foreground">Інтерв&apos;ю ще не заплановано</p>
            <p className="mt-1 text-sm text-muted">
              Натисніть кнопку вище, щоб додати перший раунд.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {interviews.map((interview) => (
              <li
                key={interview.id}
                className="rounded-xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-foreground">
                      {interview.title}
                    </h3>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${INTERVIEW_STATUS_STYLES[interview.status]}`}
                    >
                      {INTERVIEW_STATUS_LABELS[interview.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <span>{INTERVIEW_TYPE_LABELS[interview.type]}</span>
                    <button
                      type="button"
                      aria-label="Дії з інтерв'ю"
                      className="rounded p-1 text-muted hover:bg-slate-100 hover:text-foreground"
                    >
                      ···
                    </button>
                  </div>
                </div>

                <p className="mt-2 text-sm text-muted">{jobTitle}</p>

                <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <BriefcaseIcon />
                    {jobTitle}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <ClockIcon />
                    {formatInterviewRange(interview.scheduledAt, interview.durationMinutes)}
                  </span>
                </div>

                {interview.messageBody && (
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                    {interview.messageBody}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ScheduleInterviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onScheduled={onInterviewScheduled}
        candidateId={candidateId}
        candidateName={candidateName}
        candidateEmail={candidateEmail}
        jobTitle={jobTitle}
        recruiterName={recruiterName}
        recruiterEmail={recruiterEmail}
      />
    </>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
