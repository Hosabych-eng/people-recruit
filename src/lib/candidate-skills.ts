import prisma from "@/lib/prisma";

const SKILL_TAG_COLORS = [
  "#6366f1",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
];

function colorForSkill(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SKILL_TAG_COLORS[Math.abs(hash) % SKILL_TAG_COLORS.length]!;
}

export async function saveCandidateSkills(candidateId: string, skills: string[]) {
  const normalized = [...new Set(skills.map((s) => s.trim()).filter(Boolean))].slice(0, 12);
  if (normalized.length === 0) return [];

  await prisma.candidate.update({
    where: { id: candidateId },
    data: { skills: normalized },
  });

  for (const skill of normalized) {
    const tag = await prisma.candidateTag.upsert({
      where: { name: skill },
      create: { name: skill, color: colorForSkill(skill) },
      update: {},
    });

    await prisma.candidateTagAssignment.upsert({
      where: { candidateId_tagId: { candidateId, tagId: tag.id } },
      create: { candidateId, tagId: tag.id },
      update: {},
    });
  }

  return normalized;
}
