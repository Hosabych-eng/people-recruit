import prisma from "@/lib/prisma";

export async function assignTalentPoolTags(candidateId: string, tagIds: string[]) {
  const uniqueIds = [...new Set(tagIds.filter(Boolean))];
  if (uniqueIds.length === 0) return;

  await prisma.candidateTagAssignment.createMany({
    data: uniqueIds.map((tagId) => ({ candidateId, tagId })),
    skipDuplicates: true,
  });
}
