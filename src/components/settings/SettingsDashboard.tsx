"use client";

import { useEffect, useState } from "react";
import { CandidateFieldConfigPanel } from "@/components/settings/CandidateFieldConfigPanel";
import { RejectionReasonsPanel } from "@/components/settings/RejectionReasonsPanel";
import { Button } from "@/components/ui/Button";
import { formControlClassName, formLabelClassName } from "@/components/ui/formStyles";

type SettingsTab = "general" | "fields" | "rejections" | "dictionaries";

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "general", label: "Загальні налаштування" },
  { id: "fields", label: "Налаштування полів кандидата" },
  { id: "rejections", label: "Причини відмов" },
  { id: "dictionaries", label: "Теги та словники" },
];

type SettingsData = {
  tags: { id: string; name: string; color: string }[];
  interviewTemplates: {
    id: string;
    title: string;
    subject: string | null;
    body: string;
    durationMinutes: number;
    type: string;
  }[];
  languageLevels: { id: string; language: string; label: string; sortOrder: number }[];
};

export function SettingsDashboard() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [data, setData] = useState<SettingsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tagName, setTagName] = useState("");
  const [interviewTitle, setInterviewTitle] = useState("");
  const [interviewBody, setInterviewBody] = useState("");
  const [englishLevel, setEnglishLevel] = useState("");
  const [chineseLevel, setChineseLevel] = useState("");

  const load = async () => {
    const response = await fetch("/api/settings");
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Failed to load settings");
    setData(payload);
  };

  useEffect(() => {
    void load().catch((err) =>
      setError(err instanceof Error ? err.message : "Failed to load settings"),
    );
  }, []);

  const post = async (url: string, body: Record<string, unknown>) => {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Request failed");
    await load();
  };

  const remove = async (url: string) => {
    const response = await fetch(url, { method: "DELETE" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Delete failed");
    await load();
  };

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "border-primary bg-primary/5 text-primary"
                : "border-border bg-card text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="min-w-0 rounded-lg border border-border bg-card p-4 shadow-sm">
        {!data ? (
          <p className="text-sm text-muted">Завантаження…</p>
        ) : (
          <>
            {activeTab === "general" && (
              <Panel title="Загальні налаштування">
                <div className="space-y-4">
                  <div>
                    <h3 className="mb-2 text-xs font-semibold text-foreground">
                      Шаблони інтерв&apos;ю
                    </h3>
                    <ul className="mb-2 space-y-1 text-xs">
                      {data.interviewTemplates.map((tpl) => (
                        <li
                          key={tpl.id}
                          className="flex justify-between rounded border border-border px-2 py-1"
                        >
                          <span>
                            {tpl.title} · {tpl.durationMinutes} хв
                          </span>
                          <button
                            type="button"
                            className="text-red-600"
                            onClick={() =>
                              void remove(`/api/settings/interview-templates?id=${tpl.id}`)
                            }
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                    <form
                      className="space-y-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void post("/api/settings/interview-templates", {
                          title: interviewTitle,
                          body: interviewBody,
                        }).then(() => {
                          setInterviewTitle("");
                          setInterviewBody("");
                        });
                      }}
                    >
                      <input
                        className={formControlClassName}
                        placeholder="Назва шаблону"
                        value={interviewTitle}
                        onChange={(e) => setInterviewTitle(e.target.value)}
                      />
                      <textarea
                        className={formControlClassName}
                        rows={3}
                        placeholder="Текст запрошення"
                        value={interviewBody}
                        onChange={(e) => setInterviewBody(e.target.value)}
                      />
                      <Button type="submit" size="sm">
                        Додати шаблон
                      </Button>
                    </form>
                  </div>
                </div>
              </Panel>
            )}

            {activeTab === "fields" && (
              <Panel title="Налаштування полів кандидата">
                <CandidateFieldConfigPanel />
              </Panel>
            )}

            {activeTab === "rejections" && (
              <Panel title="Причини відмов">
                <RejectionReasonsPanel />
              </Panel>
            )}

            {activeTab === "dictionaries" && (
              <Panel title="Теги та словники">
                <div className="space-y-4">
                  <div>
                    <h3 className="mb-2 text-xs font-semibold text-foreground">Теги кандидатів</h3>
                    <div className="mb-2 flex flex-wrap gap-1">
                      {data.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-white"
                          style={{ background: tag.color }}
                        >
                          {tag.name}
                          <button
                            type="button"
                            onClick={() => void remove(`/api/settings/tags?id=${tag.id}`)}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <form
                      className="flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void post("/api/settings/tags", { name: tagName }).then(() =>
                          setTagName(""),
                        );
                      }}
                    >
                      <input
                        className={formControlClassName}
                        placeholder="Новий тег"
                        value={tagName}
                        onChange={(e) => setTagName(e.target.value)}
                      />
                      <Button type="submit" size="sm">
                        Додати
                      </Button>
                    </form>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <LanguageColumn
                      title="Рівні англійської"
                      levels={data.languageLevels.filter((l) => l.language === "ENGLISH")}
                      onDelete={(id) => void remove(`/api/settings/language-levels?id=${id}`)}
                      value={englishLevel}
                      onChange={setEnglishLevel}
                      onAdd={() =>
                        void post("/api/settings/language-levels", {
                          language: "ENGLISH",
                          label: englishLevel,
                        }).then(() => setEnglishLevel(""))
                      }
                    />
                    <LanguageColumn
                      title="Рівні китайської"
                      levels={data.languageLevels.filter((l) => l.language === "CHINESE")}
                      onDelete={(id) => void remove(`/api/settings/language-levels?id=${id}`)}
                      value={chineseLevel}
                      onChange={setChineseLevel}
                      onAdd={() =>
                        void post("/api/settings/language-levels", {
                          language: "CHINESE",
                          label: chineseLevel,
                        }).then(() => setChineseLevel(""))
                      }
                    />
                  </div>
                </div>
              </Panel>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  );
}

function LanguageColumn({
  title,
  levels,
  onDelete,
  value,
  onChange,
  onAdd,
}: {
  title: string;
  levels: { id: string; label: string }[];
  onDelete: (id: string) => void;
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
}) {
  return (
    <div>
      <p className={formLabelClassName}>{title}</p>
      <ul className="mb-2 space-y-1 text-xs">
        {levels.map((level) => (
          <li
            key={level.id}
            className="flex justify-between rounded border border-border px-2 py-1"
          >
            {level.label}
            <button type="button" className="text-red-600" onClick={() => onDelete(level.id)}>
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          className={formControlClassName}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Рівень"
        />
        <Button type="button" size="sm" onClick={onAdd}>
          +
        </Button>
      </div>
    </div>
  );
}
