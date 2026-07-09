const CRM_BASE_URL = "https://people-recruit.vercel.app";

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
    scraped.avatarUrl
      ? `<strong>Photo:</strong> знайдено`
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

  function isLikelyDateString(value) {
    const text = cleanText(value);
    if (!text) return false;
    if (/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(text)) return true;
    if (/^\d{4}[./-]\d{1,2}[./-]\d{1,2}$/.test(text)) return true;
    if (/^\d{1,2}[./-][A-Za-z]{3}[./-]\d{2,4}$/i.test(text)) return true;
    if (/^[A-Za-z]{3,9}\s+\d{4}$/i.test(text)) return true;
    return false;
  }

  function digitCount(value) {
    return (value.match(/\d/g) ?? []).length;
  }

  function isValidPhone(value) {
    const text = cleanText(value);
    if (!text || text.length < 7 || text.length > 32) return false;
    if (isLikelyDateString(text)) return false;

    const digits = digitCount(text);
    if (digits < 7 || digits > 15) return false;

    // Dot-separated groups with no + or () are usually dates or IDs, not phones.
    if (/^\d{1,4}(\.\d{1,4}){1,3}$/.test(text) && !/[+()]/.test(text)) {
      return false;
    }

    if (/^\+[\d\s().-]{6,}$/.test(text)) return true;
    if (/\(\d{2,5}\)/.test(text) && digits >= 7) return true;
    if (/[\d\s().-]*\d{3}[\s.-]\d{2,4}[\s.-]?\d{2,4}/.test(text) && digits >= 9) {
      return true;
    }

    return digits >= 10;
  }

  function normalizePhone(value) {
    return cleanText(value).replace(/^tel:/i, "").split("?")[0].trim();
  }

  function findPhone() {
    const telLinks = document.querySelectorAll('a[href^="tel:"]');
    for (const link of telLinks) {
      const raw = link.getAttribute("href")?.replace(/^tel:/i, "") ?? "";
      const phone = normalizePhone(raw);
      if (isValidPhone(phone)) return phone;
    }

    const contactSelectors = [
      ".pv-contact-info__contact-item a[href^='tel:']",
      "section.pv-contact-info a[href^='tel:']",
      "#top-card-text-details-contact-info a[href^='tel:']",
      ".pv-top-card--list-bullet a[href^='tel:']",
      ".contact-info__phone",
      ".pv-contact-info__ci-container span.t-14",
      "[data-test-icon='phone-handset-medium'] ~ span",
      "[data-test-icon='phone-handset-medium'] + span",
    ];

    for (const selector of contactSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const href = element.getAttribute?.("href");
        const text = href?.startsWith("tel:")
          ? normalizePhone(href)
          : cleanText(element.textContent);
        if (isValidPhone(text)) return normalizePhone(text);
      }
    }

    const searchRoots = [
      document.querySelector(".pv-contact-info"),
      document.querySelector("#top-card-text-details-contact-info"),
      document.querySelector(".pv-top-card"),
      document.querySelector("main section:first-of-type"),
    ].filter(Boolean);

    const phonePattern =
      /\+?\d[\d\s().-]{6,}\d/g;

    for (const root of searchRoots) {
      const text = root?.textContent ?? "";
      const matches = text.match(phonePattern) ?? [];
      for (const match of matches) {
        const phone = normalizePhone(match);
        if (isValidPhone(phone)) return phone;
      }
    }

    return undefined;
  }

  function isUsableImageUrl(src) {
    if (!src || typeof src !== "string") return false;
    const trimmed = src.trim();
    if (!trimmed.startsWith("http")) return false;
    if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) return false;
    if (/ghost|placeholder|default-profile|static\.licdn\.com\/aero-v1\/images\/ghost/i.test(trimmed)) {
      return false;
    }
    return true;
  }

  function extractImageUrl(img) {
    if (!img) return undefined;

    const candidates = [];

    const directSrc = img.getAttribute("src");
    if (directSrc) candidates.push(directSrc);

    if (img.currentSrc) candidates.push(img.currentSrc);

    const delayed = img.getAttribute("data-delayed-url");
    if (delayed) candidates.push(delayed);

    const ghost = img.getAttribute("data-ghost-url");
    if (ghost) candidates.push(ghost);

    const srcset = img.getAttribute("srcset");
    if (srcset) {
      const parts = srcset
        .split(",")
        .map((part) => part.trim().split(/\s+/)[0])
        .filter(Boolean);
      candidates.push(...parts.reverse());
    }

    for (const candidate of candidates) {
      if (!isUsableImageUrl(candidate)) continue;
      try {
        const url = new URL(candidate);
        url.hash = "";
        return url.toString();
      } catch {
        return candidate.split("#")[0];
      }
    }

    return undefined;
  }

  function findProfileImage() {
    const selectors = [
      "img.pv-top-card-profile-picture__image",
      "button.pv-top-card-profile-picture__image-button img",
      "img.pv-top-card-profile-picture__image--show",
      ".pv-top-card-profile-picture__image img",
      ".pv-top-card-profile-picture img",
      "button.pv-top-card-profile-picture img",
      'img[class*="EntityPhoto-profile"]',
      'img[class*="profile-photo"]',
      'img[class*="profile-picture"]',
      'img[alt*="profile photo" i]',
      ".profile-photo-edit__preview",
      "img[data-test-profile-photo]",
      ".presence-entity__image",
      "img.main-avatar",
      'img[src*="profile-displayphoto"]',
      'img[src*="media.licdn.com"]',
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const url = extractImageUrl(element);
        if (url) return url;
      }
    }

    const topCard = document.querySelector(".pv-top-card, main section:first-of-type, main");
    if (topCard) {
      const images = topCard.querySelectorAll("img");
      for (const img of images) {
        const url = extractImageUrl(img);
        if (url && /profile-displayphoto|media\.licdn\.com/i.test(url)) {
          return url;
        }
      }
    }

    return undefined;
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

  function pickText(selectors) {
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
      avatarUrl: findProfileImage(),
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
      avatarUrl: scraped.avatarUrl,
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
