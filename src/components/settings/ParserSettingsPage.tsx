"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Heading } from "@/components/ui/Heading";
import {
  INSTALLATION_STEPS,
  LINKEDIN_PARSER_DOWNLOAD_PATH,
  LINKEDIN_PARSER_FILENAME,
  LINKEDIN_PARSER_VERSION,
} from "@/lib/parser-extension";

export function ParserSettingsPage() {
  const handleDownload = () => {
    const anchor = document.createElement("a");
    anchor.href = LINKEDIN_PARSER_DOWNLOAD_PATH;
    anchor.download = LINKEDIN_PARSER_FILENAME;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Heading level={2}>Download Parser</Heading>
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary ring-1 ring-primary/20">
                  v{LINKEDIN_PARSER_VERSION}
                </span>
              </div>
              <p className="max-w-2xl text-sm text-muted">
                Import LinkedIn and Djinni profiles directly into PeopleRecruit. Install the
                Chrome extension on your machine, then sign in with your CRM account when prompted.
              </p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0A66C2]/10 text-[#0A66C2]">
              <LinkedInIcon />
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 text-sm text-muted">
            <p>
              <span className="font-medium text-foreground">Package:</span>{" "}
              {LINKEDIN_PARSER_FILENAME}
            </p>
            <p>
              <span className="font-medium text-foreground">Format:</span> Chrome extension (MV3)
            </p>
          </div>
          <Button type="button" size="md" className="gap-2" onClick={handleDownload}>
            <DownloadIcon />
            Download Parser
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Heading
            level={2}
            subtitle="Follow these steps to load the extension in Google Chrome."
          >
            Installation Guide
          </Heading>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            {INSTALLATION_STEPS.map((step, index) => (
              <li key={step} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-sm">
                  {index + 1}
                </span>
                <div className="min-w-0 pt-1">
                  <p className="text-sm font-medium text-foreground">{step}</p>
                  {index === 1 && (
                    <p className="mt-1 text-xs text-muted">
                      Paste{" "}
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                        chrome://extensions/
                      </code>{" "}
                      into the address bar.
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Heading level={3}>Need help?</Heading>
            <p className="mt-1 text-sm text-muted">
              After installation, open a LinkedIn profile and click the PeopleRecruit extension icon
              to import a candidate.
            </p>
          </div>
          <Link href="/settings">
            <Button type="button" variant="outline" size="sm">
              Back to Settings
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
