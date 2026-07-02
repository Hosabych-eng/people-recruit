import { CandidateProfileView } from "@/components/candidate/CandidateProfileView";
import { serializeCandidateProfile } from "@/lib/candidate-profile";
import { getCandidateProfile } from "@/lib/candidates/profile";

type CandidateProfilePageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function CandidateProfilePage({
  params,
}: CandidateProfilePageProps) {
  const { id } = await params;
  const profile = await getCandidateProfile(id);

  return <CandidateProfileView profile={serializeCandidateProfile(profile)} />;
}
