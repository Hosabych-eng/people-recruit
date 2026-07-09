"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

type BulkResumeDropzoneProps = {
  jobId: string;
  stageId: string;
  onComplete?: () => void;
};

type BulkResult = {
  created: number;
  analyzed: number;
  skippedDuplicate: number;
  failed: number;
  items: {
    fileName: string;
    candidateId?: string;
    candidateName?: string;
    matchScore?: number;
    error?: string;
    skippedDuplicate?: boolean;
  }[];
};

export function BulkResumeDropzone({ jobId, stageId, onComplete }: BulkResumeDropzoneProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkResult | null>(null);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setIsUploading(true);
      setError(null);
      setResult(null);

      try {
        const formData = new FormData();
        formData.set("jobId", jobId);
        formData.set("stageId", stageId);
        for (const file of files.slice(0, 20)) {
          formData.append("files", file);
        }

        const response = await fetch("/api/candidates/bulk-resume", {
          method: "POST",
          body: formData,
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Не вдалося завантажити резюме");
        }

        setResult(payload);
        onComplete?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не вдалося завантажити резюме");
      } finally {
        setIsUploading(false);
      }
    },
    [jobId, onComplete, stageId],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      void uploadFiles(acceptedFiles);
    },
    [uploadFiles],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 20,
    disabled: isUploading,
    noClick: true,
  });

  return (
    <section className="rounded-lg border border-dashed border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Масове завантаження PDF</h3>
          <p className="text-xs text-muted">До 20 резюме — профілі + AI match score</p>
        </div>
        <Button type="button" size="sm" variant="outline" disabled={isUploading} onClick={open}>
          Обрати PDF
        </Button>
      </div>

      <div
        {...getRootProps()}
        className={`rounded-lg border px-4 py-8 text-center text-sm transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5 text-primary"
            : "border-border bg-slate-50/60 text-muted"
        }`}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <span className="inline-flex items-center gap-2">
            <Spinner className="h-4 w-4" />
            Обробка резюме…
          </span>
        ) : (
          <p>Перетягніть PDF сюди або натисніть «Обрати PDF»</p>
        )}
      </div>

      {error && (
        <p className="mt-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-3 space-y-2 text-xs">
          <p className="text-muted">
            Створено: {result.created} · AI: {result.analyzed} · Дублікати:{" "}
            {result.skippedDuplicate} · Помилки: {result.failed}
          </p>
          <ul className="max-h-40 space-y-1 overflow-y-auto">
            {result.items.map((item) => (
              <li key={item.fileName} className="rounded border border-border px-2 py-1">
                <span className="font-medium">{item.fileName}</span>
                {item.candidateName && <span> → {item.candidateName}</span>}
                {item.matchScore != null && <span> · {item.matchScore}%</span>}
                {item.error && <span className="text-red-600"> · {item.error}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
