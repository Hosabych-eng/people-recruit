import { CandidateProfileView } from "@/components/candidate/CandidateProfileView";
import { serializeCandidateProfile } from "@/lib/candidate-profile";
import { getCandidateProfile } from "@/lib/candidates/profile";
import { getSessionUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";

type CandidateProfilePageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function CandidateProfilePage({
  params,
}: CandidateProfilePageProps) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const profile = await getCandidateProfile(id, user);

  return <CandidateProfileView profile={serializeCandidateProfile(profile)} />;
}
