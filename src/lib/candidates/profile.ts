import prisma from "@/lib/prisma";
import { candidateProfileInclude } from "@/lib/candidates/profile-include";
import { notFound } from "next/navigation";

export async function getCandidateProfile(id: string) {
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: candidateProfileInclude,
  });

  if (!candidate) notFound();

  return candidate;
}
