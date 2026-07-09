import { GoogleGenerativeAI } from "@google/generative-ai";

export type CandidateAiAnalysis = {
  matchScore: number;
  topMatches: string[];
  redFlags: string[];
  screeningQuestions: string[];
  skills: string[];
  summaryMarkdown: string;
};

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenerativeAI(apiKey);
}

function buildJobDescription(input: {
  title: string;
  description: string;
  responsibilities?: string | null;
  requiredSkills?: string | null;
}) {
  return [
    `Title: ${input.title}`,
    `Description: ${input.description}`,
    input.responsibilities ? `Responsibilities: ${input.responsibilities}` : "",
    input.requiredSkills ? `Required skills: ${input.requiredSkills}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function parseAnalysisResponse(raw: string): CandidateAiAnalysis {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("AI response did not contain structured JSON");
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    matchScore?: number;
    topMatches?: string[];
    redFlags?: string[];
    screeningQuestions?: string[];
    skills?: string[];
  };

  const matchScore = Math.max(0, Math.min(100, Number(parsed.matchScore ?? 0)));
  const topMatches = (parsed.topMatches ?? []).map(String).slice(0, 6);
  const redFlags = (parsed.redFlags ?? []).map(String).slice(0, 6);
  const screeningQuestions = (parsed.screeningQuestions ?? []).map(String).slice(0, 3);
  const skills = (parsed.skills ?? []).map(String).slice(0, 12);

  const summaryMarkdown = [
    `## Match Score: ${matchScore}%`,
    "",
    "### Top Match Criteria",
    ...topMatches.map((item) => `- ${item}`),
    "",
    "### Red Flags",
    ...(redFlags.length > 0 ? redFlags.map((item) => `- ${item}`) : ["- None identified"]),
    "",
    "### Screening Questions",
    ...screeningQuestions.map((item, index) => `${index + 1}. ${item}`),
    "",
    "### Core Skills",
    ...(skills.length > 0 ? skills.map((item) => `- ${item}`) : ["- None identified"]),
  ].join("\n");

  return {
    matchScore,
    topMatches,
    redFlags,
    screeningQuestions,
    skills,
    summaryMarkdown,
  };
}

export async function analyzeCandidateResume(input: {
  candidateName: string;
  job: {
    title: string;
    description: string;
    responsibilities?: string | null;
    requiredSkills?: string | null;
  };
  resumeText: string;
}) {
  const model = getGeminiClient().getGenerativeModel({ model: "gemini-1.5-flash" });
  const jobDescription = buildJobDescription(input.job);

  const prompt = [
    "You are an expert technical recruiter assistant.",
    "Analyze the candidate resume against the job description.",
    "Respond ONLY with valid JSON (no markdown fences) using this shape:",
    '{"matchScore":0-100,"topMatches":["..."],"redFlags":["..."],"screeningQuestions":["...","...","..."],"skills":["React","TypeScript"]}',
    "topMatches: 3-5 strongest alignment points.",
    "redFlags: risks like job hopping, skill gaps, short tenures (empty array if none).",
    "screeningQuestions: exactly 3 tailored interview questions.",
    "skills: 5-10 core hard skills extracted from resume.",
    "",
    `Candidate: ${input.candidateName}`,
    "",
    "Job description:",
    jobDescription,
    "",
    "Resume text:",
    input.resumeText.slice(0, 24000),
  ].join("\n");

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return parseAnalysisResponse(text);
}

export async function extractPdfText(buffer: Buffer) {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text?.trim() ?? "";
  } finally {
    await parser.destroy();
  }
}
