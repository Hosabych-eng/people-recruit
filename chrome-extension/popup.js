const CRM_BASE_URL = "http://localhost:3000";

const jobSelect = document.getElementById("job-select");
const nameInput = document.getElementById("name-input");
const emailInput = document.getElementById("email-input");
const importBtn = document.getElementById("import-btn");
const statusEl = document.getElementById("status");
const previewEl = document.getElementById("preview");

/** @type {{ id: string; title: string; stageId: string }[]} */
let vacanciesCache = [];
let nameFieldTouched = false;

nameInput.addEventListener("input", () => {
  nameFieldTouched = true;
});

function setStatus(type, html) {
  statusEl.className = `status visible ${type}`;
  statusEl.innerHTML = html;
}

function clearStatus() {
  statusEl.className = "status";
  statusEl.textContent = "";
}

function getNameValue() {
  return nameInput.value.trim() || undefined;
}

function setNameFromScrape(value) {
  if (value && !nameFieldTouched) {
    nameInput.value = value;
  }
}

function getEmailValue() {
  return emailInput.value.trim() || undefined;
}

function setEmailValue(value) {
  if (value && !emailInput.value.trim()) {
    emailInput.value = value;
  }
}

function setPreview(scraped) {
  if (!scraped) {
    previewEl.textContent =
      "Open a LinkedIn or Djinni candidate profile, then click import.";
    return;
  }

  const lines = [
    scraped.name ? `<strong>Name:</strong> ${escapeHtml(scraped.name)}` : null,
    scraped.headline ? `<strong>Title:</strong> ${escapeHtml(scraped.headline)}` : null,
    scraped.email ? `<strong>Email:</strong> ${escapeHtml(scraped.email)}` : null,
    scraped.resumeLink
      ? `<strong>Profile:</strong> ${escapeHtml(scraped.resumeLink)}`
      : null,
    scraped.source ? `<strong>Source:</strong> ${escapeHtml(scraped.source)}` : null,
  ].filter(Boolean);

  previewEl.innerHTML =
    lines.join("<br />") ||
    "Could not parse profile fields from this page.";

  setNameFromScrape(scraped.name);

  if (scraped.email) {
    setEmailValue(scraped.email);
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${CRM_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (!response.ok) {
    throw new Error(data.error ?? `Request failed (${response.status})`);
  }

  return data;
}

function getSelectedVacancy() {
  const option = jobSelect.selectedOptions[0];
  if (!option?.value) return null;

  const stageId = option.dataset.stageId;
  if (!stageId) return null;

  return {
    jobId: option.value,
    stageId,
  };
}

async function loadVacancies() {
  try {
    const vacancies = await apiRequest("/api/vacancies");
    vacanciesCache = Array.isArray(vacancies) ? vacancies : [];

    jobSelect.innerHTML = "";

    if (vacanciesCache.length === 0) {
      jobSelect.innerHTML =
        '<option value="">No open vacancies found</option>';
      jobSelect.disabled = true;
      importBtn.disabled = true;
      setStatus("warning", "Create an open vacancy in PeopleRecruit first.");
      return;
    }

    for (const vacancy of vacanciesCache) {
      const option = document.createElement("option");
      option.value = vacancy.id;
      option.dataset.stageId = vacancy.stageId;
      option.textContent = vacancy.title;
      jobSelect.appendChild(option);
    }

    jobSelect.disabled = false;
    importBtn.disabled = false;
    clearStatus();
  } catch (error) {
    vacanciesCache = [];
    jobSelect.innerHTML = '<option value="">Unable to load vacancies</option>';
    jobSelect.disabled = true;
    importBtn.disabled = true;
    setStatus(
      "error",
      `${escapeHtml(error.message)}<br />Make sure you are logged into <a href="${CRM_BASE_URL}/login" target="_blank" rel="noreferrer">PeopleRecruit</a>.`,
    );
  }
}

function buildRawInput(scraped, name, email) {
  return [
    name,
    scraped.headline,
    email,
    scraped.phone,
    scraped.resumeLink,
    scraped.summary,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Injected into the active tab. Must be fully self-contained.
 */
function scrapeCandidateFromPage() {
  const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{7,}\d)/;

  function cleanText(value) {
    return (value ?? "").replace(/\s+/g, " ").trim();
  }

  function findEmail() {
    const mailto = document.querySelector('a[href^="mailto:"]');
    if (mailto) {
      return cleanText(mailto.getAttribute("href")?.replace(/^mailto:/i, "").split("?")[0]);
    }

    const bodyText = document.body?.innerText ?? "";
    const match = bodyText.match(EMAIL_PATTERN);
    return match ? match[0].toLowerCase() : undefined;
  }

  function findPhone() {
    const bodyText = document.body?.innerText ?? "";
    const match = bodyText.match(PHONE_PATTERN);
    return match ? cleanText(match[0]) : undefined;
  }

  function pickText(selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      const text = cleanText(element?.textContent);
      if (text) return text;
    }
    return undefined;
  }

  function isLikelyPersonName(value) {
    const text = cleanText(value);
    if (!text || text.length < 2 || text.length > 80) return false;
    if (!/[A-Za-z\u0400-\u04FF]/.test(text)) return false;
    if (/^[\d\s.,+]+$/.test(text)) return false;
    if (/^\d[\d\s.,]*$/.test(text)) return false;
    if (/^(followers?|following|connections?)$/i.test(text)) return false;
    return true;
  }

  function cleanPersonName(value) {
    let text = cleanText(value);
    if (!text) return "";

    text = text
      .replace(/\s*·\s*\d+(st|nd|rd|th)?.*$/i, "")
      .replace(/\s*\(\s*\d+[\d\s.,]*\s*\)\s*$/g, "")
      .replace(/\s+\d[\d\s.,]{2,}\s*$/g, "")
      .trim();

    return text;
  }

  function parseLinkedInName() {
    const selectors = [
      "main section:first-of-type h1.text-heading-xlarge",
      "main h1.text-heading-xlarge",
      "h1.text-heading-xlarge",
      'h1[class*="text-heading"]',
      ".pv-text-details__left-panel h1",
      "section.pv-top-card h1",
      ".ph5 h1",
      "main h1",
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const text = cleanPersonName(element.textContent);
        if (isLikelyPersonName(text)) return text;
      }
    }

    const titleFallback = cleanPersonName(
      document.title.replace(/\s*\|\s*LinkedIn.*$/i, "").trim(),
    );
    if (isLikelyPersonName(titleFallback)) return titleFallback;

    return undefined;
  }

  function normalizeProfileUrl(url) {
    try {
      const parsed = new URL(url);
      parsed.hash = "";
      parsed.search = "";
      const pathname = parsed.pathname.replace(/\/$/, "");
      return `${parsed.protocol}//${parsed.host}${pathname}`;
    } catch {
      return url;
    }
  }

  const host = window.location.hostname;
  const resumeLink = normalizeProfileUrl(window.location.href.split("?")[0]);

  if (host.includes("linkedin.com")) {
    const isProfile =
      /\/in\//i.test(window.location.pathname) ||
      /\/pub\//i.test(window.location.pathname);

    if (!isProfile) {
      return {
        error: "Open a LinkedIn candidate profile page (/in/username).",
      };
    }

    const name = parseLinkedInName();

    const headline = pickText([
      "main .text-body-medium.break-words",
      "div.text-body-medium.break-words",
      ".pv-text-details__left-panel .text-body-medium",
      "[data-generated-suggestion-target]",
      "main .text-body-medium",
    ]);

    return {
      source: "LINKEDIN",
      name,
      headline,
      email: findEmail(),
      phone: findPhone(),
      resumeLink,
      summary: headline,
    };
  }

  if (host.includes("djinni.co")) {
    const isCandidatePage =
      /\/q\//i.test(window.location.pathname) ||
      /\/developers\//i.test(window.location.pathname) ||
      /\/candidates\//i.test(window.location.pathname) ||
      document.querySelector("h1");

    if (!isCandidatePage) {
      return {
        error: "Open a Djinni candidate profile page.",
      };
    }

    const name = pickText([
      "h1.profile-header-name",
      ".candidate-header h1",
      ".profile-page h1",
      "main h1",
      "h1",
    ]);

    const headline = pickText([
      ".profile-header-role",
      ".profile-header-position",
      ".candidate-header .position",
      ".profile-page .position",
      ".text-muted",
    ]);

    const summary = pickText([
      ".profile-summary",
      ".candidate-summary",
      "[data-testid='profile-summary']",
      ".profile-page .card-body",
      "section.profile-about",
    ]);

    return {
      source: "DJINNI",
      name,
      headline,
      email: findEmail(),
      phone: findPhone(),
      resumeLink,
      summary: summary ?? headline,
    };
  }

  return {
    error: "Unsupported page. Open LinkedIn or Djinni candidate profile.",
  };
}

async function scrapeActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error("No active browser tab found.");
  }

  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: scrapeCandidateFromPage,
  });

  if (!result) {
    throw new Error("Could not read data from the active page.");
  }

  if (result.error) {
    throw new Error(result.error);
  }

  if (!result.name && !result.resumeLink) {
    throw new Error("Could not parse candidate name or profile URL.");
  }

  return result;
}

function resolveCandidateName(scraped) {
  return getNameValue() ?? scraped.name;
}

async function refreshPreview() {
  try {
    const scraped = await scrapeActiveTab();
    setPreview(scraped);
    clearStatus();
  } catch (error) {
    setPreview(null);
    setStatus("info", escapeHtml(error.message));
  }
}

async function handleImport() {
  const selection = getSelectedVacancy();

  if (!selection) {
    setStatus("error", "Select a vacancy with at least one pipeline stage.");
    return;
  }

  const { jobId, stageId } = selection;

  importBtn.disabled = true;
  jobSelect.disabled = true;
  clearStatus();
  setStatus("info", "Scraping profile and sending to CRM…");

  try {
    const scraped = await scrapeActiveTab();
    setPreview(scraped);

    const name = resolveCandidateName(scraped);
    const email = getEmailValue() ?? scraped.email;

    if (!name && !scraped.resumeLink) {
      setStatus("error", "Enter a candidate name or open a profile with a valid URL.");
      return;
    }

    const payload = {
      jobId,
      stageId,
      name,
      email,
      phone: scraped.phone,
      resumeLink: scraped.resumeLink,
      applicationSource: scraped.source,
      rawInput: buildRawInput(scraped, name, email),
    };

    const result = await apiRequest("/api/candidates/import", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const profileUrl = `${CRM_BASE_URL}/candidates/${result.candidate.id}`;

    if (result.isDuplicate) {
      setStatus(
        "warning",
        `Candidate already exists in DB!<br /><a href="${profileUrl}" target="_blank" rel="noreferrer">Open profile in CRM</a>`,
      );
      return;
    }

    setStatus(
      "success",
      `Successfully imported!<br /><a href="${profileUrl}" target="_blank" rel="noreferrer">Open profile in CRM</a>`,
    );
  } catch (error) {
    setStatus("error", escapeHtml(error.message));
  } finally {
    importBtn.disabled = vacanciesCache.length === 0;
    jobSelect.disabled = vacanciesCache.length === 0;
  }
}

importBtn.addEventListener("click", () => {
  void handleImport();
});

document.addEventListener("DOMContentLoaded", () => {
  void loadVacancies().then(() => refreshPreview());
});
