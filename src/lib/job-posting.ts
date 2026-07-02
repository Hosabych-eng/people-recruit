export type PublicJobPosting = {
  id: string;
  title: string;
  description: string;
  responsibilities: string[];
  requiredSkills: string[];
  weOffer: string[];
  location: string;
  employmentType: string;
  status: "OPEN" | "DRAFT" | "CLOSED";
};

export function parseBulletLines(value: string | null | undefined): string[] {
  if (!value) return [];

  return value
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

export function toPublicJobPosting(job: {
  id: string;
  title: string;
  description: string;
  responsibilities: string | null;
  requiredSkills: string | null;
  weOffer: string | null;
  location: string | null;
  employmentType: string | null;
  status: "OPEN" | "DRAFT" | "CLOSED";
}): PublicJobPosting {
  return {
    id: job.id,
    title: job.title,
    description: job.description,
    responsibilities: parseBulletLines(job.responsibilities),
    requiredSkills: parseBulletLines(job.requiredSkills),
    weOffer: parseBulletLines(job.weOffer),
    location: job.location ?? "Europe",
    employmentType: job.employmentType ?? "Full-time employment",
    status: job.status,
  };
}
