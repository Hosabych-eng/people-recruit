"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { CandidateDocument, CandidateEmailMessage, CandidateProfile, EmailTemplate } from "@/types";
import { CandidateApplicationsPanel } from "@/components/candidate/CandidateApplicationsPanel";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formControlClassName, formLabelClassName } from "@/components/ui/formStyles";
import { compileEmailTemplate } from "@/lib/email-template-compile";
import { formatRelativeTimeUk } from "@/lib/format-relative-time";
import { api } from "@/lib/api/client";

type CandidateOffersTabProps = {
  profile: CandidateProfile;
  onProfileChange: (profile: CandidateProfile) => void;
  candidateId: string;
  candidateName: string;
  candidateEmail: string | null;
  jobTitle: string;
  recruiterName: string;
  documents: CandidateDocument[];
  emails: CandidateEmailMessage[];
  onDocumentsChange: (documents: CandidateDocument[]) => void;
  onEmailSent: (email: CandidateEmailMessage) => void;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function CandidateOffersTab({
  profile,
  onProfileChange,
  candidateId,
  candidateName,
  candidateEmail,
  jobTitle,
  recruiterName,
  documents,
  emails,
  onDocumentsChange,
  onEmailSent,
}: CandidateOffersTabProps) {
  const offerDocuments = useMemo(
    () => documents.filter((doc) => doc.category === "OFFER"),
    [documents],
  );

  const offerEmails = useMemo(
    () => emails.filter((message) => message.direction === "OUTBOUND"),
    [emails],
  );

  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [isComposing, setIsComposing] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [cc, setCc] = useState("");
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const templateContext = { candidateName, jobTitle, recruiterName };

  useEffect(() => {
    if (!isComposing) return;

    setIsLoadingTemplates(true);
    void api.emailTemplates
      .list()
      .then((data) => {
        setTemplates(data);
        const first = data[0];
        if (first) {
          setSelectedTemplateId(first.id);
          setSubject(compileEmailTemplate(first.subject, templateContext));
          setBody(compileEmailTemplate(first.body, templateContext));
        }
      })
      .catch((err) => {
        setEmailError(err instanceof Error ? err.message : "Не вдалося завантажити шаблони");
      })
      .finally(() => setIsLoadingTemplates(false));
  }, [isComposing, candidateName, jobTitle, recruiterName]);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    setSubject(compileEmailTemplate(template.subject, templateContext));
    setBody(compileEmailTemplate(template.body, templateContext));
  };

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const created = await api.candidates.documents.upload(candidateId, {
        title: title.trim() || file.name,
        category: "OFFER",
        file,
      });
      onDocumentsChange([created, ...documents]);
      setTitle("");
      setFile(null);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Не вдалося завантажити файл");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!window.confirm("Видалити цей документ пропозиції?")) return;

    try {
      await api.candidates.documents.delete(candidateId, documentId);
      onDocumentsChange(documents.filter((doc) => doc.id !== documentId));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Не вдалося видалити документ");
    }
  };

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setEmailError(null);

    try {
      const sent = await api.candidates.emails.send(candidateId, {
        subject: subject.trim(),
        body: body.trim(),
        cc: cc.trim() || undefined,
      });
      onEmailSent(sent);
      setIsComposing(false);
      setCc("");
      setSubject("");
      setBody("");
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Не вдалося надіслати лист");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <CandidateApplicationsPanel profile={profile} onProfileChange={onProfileChange} />

      <section className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">Документи пропозиції</h2>
          <p className="text-sm text-muted">Оферти, контракти та інші файли пропозиції</p>
        </div>

        <form onSubmit={handleUpload} className="space-y-4 border-b border-border px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="offer-title" className={formLabelClassName}>
                Назва документа
              </label>
              <input
                id="offer-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Напр. Офер Frontend Developer"
                className={formControlClassName}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="offer-file" className={formLabelClassName}>
                Файл
              </label>
              <input
                id="offer-file"
                type="file"
                required
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className={formControlClassName}
              />
            </div>
          </div>

          {uploadError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {uploadError}
            </div>
          )}

          <Button type="submit" size="sm" disabled={isUploading || !file}>
            {isUploading ? "Завантаження…" : "Додати документ"}
          </Button>
        </form>

        {offerDocuments.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">
            Документів пропозиції ще немає.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {offerDocuments.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{doc.title}</p>
                  <p className="mt-1 text-xs text-muted">
                    {doc.fileName} · {formatFileSize(doc.fileSize)} ·{" "}
                    {formatRelativeTimeUk(doc.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <a
                    href={`/api/candidates/${candidateId}/documents/${doc.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Відкрити
                  </a>
                  <button
                    type="button"
                    onClick={() => void handleDeleteDocument(doc.id)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Видалити
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
          <div>
            <h2 className="text-base font-semibold text-foreground">Листування щодо пропозиції</h2>
            <p className="mt-1 text-sm text-muted">
              {candidateEmail
                ? `Надіслати пропозицію на ${candidateEmail} з копією колегам`
                : "Додайте email кандидата в профілі перед надсиланням"}
            </p>
          </div>
          {!isComposing && (
            <Button size="sm" onClick={() => setIsComposing(true)}>
              Надіслати пропозицію
            </Button>
          )}
        </div>

        {isComposing && (
          <form
            onSubmit={handleEmailSubmit}
            className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">Новий лист пропозиції</h3>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsComposing(false)}>
                Скасувати
              </Button>
            </div>

            <div className="space-y-2">
              <label htmlFor="offer-template" className={formLabelClassName}>
                Шаблон
              </label>
              {isLoadingTemplates ? (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Spinner className="h-4 w-4" />
                  Завантаження шаблонів…
                </div>
              ) : (
                <select
                  id="offer-template"
                  value={selectedTemplateId}
                  onChange={(event) => handleTemplateChange(event.target.value)}
                  className={formControlClassName}
                >
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="offer-cc" className={formLabelClassName}>
                CC / Додати в листування
              </label>
              <input
                id="offer-cc"
                value={cc}
                onChange={(event) => setCc(event.target.value)}
                placeholder="manager@company.com, hr@company.com"
                className={formControlClassName}
              />
              <p className="text-xs text-muted">Кілька адрес через кому</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="offer-subject" className={formLabelClassName}>
                Тема
              </label>
              <input
                id="offer-subject"
                required
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className={formControlClassName}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="offer-body" className={formLabelClassName}>
                Текст листа
              </label>
              <textarea
                id="offer-body"
                required
                rows={10}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                className={formControlClassName}
              />
            </div>

            {emailError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {emailError}
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting || !subject.trim() || !body.trim()}>
                {isSubmitting ? "Надсилання…" : "Надіслати через Gmail"}
              </Button>
            </div>
          </form>
        )}

        {offerEmails.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center">
            <p className="text-sm text-muted">Листування щодо пропозиції ще не велось.</p>
          </div>
        ) : (
          <ol className="space-y-3">
            {offerEmails.map((message) => (
              <li key={message.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{message.subject}</h3>
                    <p className="mt-1 text-xs text-muted">{formatTimestamp(message.sentAt)}</p>
                  </div>
                </div>
                {message.ccEmails && (
                  <p className="mt-2 text-xs text-muted">
                    <span className="font-medium text-foreground">CC:</span> {message.ccEmails}
                  </p>
                )}
                <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">{message.body}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
