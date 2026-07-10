import { ParserSettingsPage } from "@/components/settings/ParserSettingsPage";

export const dynamic = "force-dynamic";

export default function ParserSettingsRoutePage() {
  return (
    <div className="crm-compact mx-auto w-full max-w-4xl px-3 py-3">
      <header className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
          Settings · Tools
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
          LinkedIn Parser
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Central hub for the PeopleRecruit Chrome extension — download the latest build and
          follow the installation steps below.
        </p>
      </header>

      <ParserSettingsPage />
    </div>
  );
}
