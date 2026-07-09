"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { formControlClassName, formLabelClassName } from "@/components/ui/formStyles";
import { compileEmailTemplate } from "@/lib/email-template-compile";
import { api } from "@/lib/api/client";

type StageEmailKind = "offered" | "rejected";

type StageEmailConfirmModalProps = {
  isOpen: boolean;
  kind: StageEmailKind;
  candidateId: string;
  candidateName: string;
  candidateEmail?: string | null;
  jobTitle: string;
  recruiterName: string;
  onClose: () => void;
};

const TEMPLATES: Record<
  StageEmailKind,
  { subject: string; body: string }
> = {
  offered: {
    subject: "Job offer for {{job_title}}",
    body: `Hi {{candidate_name}},

We are pleased to move forward with your application for {{job_title}}.

Our team will share the next steps shortly.

Best regards,
{{recruiter_name}}`,
  },
  rejected: {
    subject: "Update on your application for {{job_title}}",
    body: `Hi {{candidate_name}},

Thank you for your interest in {{job_title}}.

After careful review, we will not be moving forward at this time. We appreciate your time and wish you success in your search.

Best regards,
{{recruiter_name}}`,
  },
};

export function StageEmailConfirmModal({
  isOpen,
  kind,
  candidateId,
  candidateName,
  candidateEmail,
  jobTitle,
  recruiterName,
  onClose,
}: StageEmailConfirmModalProps) {
  const template = TEMPLATES[kind];
  const context = { candidateName, jobTitle, recruiterName };
  const [subject, setSubject] = useState(compileEmailTemplate(template.subject, context));
  const [body, setBody] = useState(compileEmailTemplate(template.body, context));
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!candidateEmail) {
      setError("Candidate has no email address");
      return;
    }

    setIsSending(true);
    setError(null);
    try {
      await api.candidates.emails.send(candidateId, { subject, body });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-foreground">Send email notification?</h2>
        <p className="mt-1 text-sm text-muted">
          {kind === "offered" ? "Offered" : "Rejected"} stage for {candidateName}
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className={formLabelClassName}>Subject</label>
            <input className={formControlClassName} value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <label className={formLabelClassName}>Body</label>
            <textarea
              className={formControlClassName}
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Skip
          </Button>
          <Button type="button" onClick={() => void handleSend()} disabled={isSending}>
            {isSending ? "Sending…" : "Send now"}
          </Button>
        </div>
      </div>
    </div>
  );
}
