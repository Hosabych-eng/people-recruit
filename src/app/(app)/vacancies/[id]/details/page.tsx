import type { Metadata } from "next";
import { VacancyDetailsEditor } from "@/components/vacancies/VacancyDetailsEditor";

type VacancyDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: VacancyDetailsPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Деталі вакансії (${id})` };
}

export default async function VacancyDetailsPage({
  params,
}: VacancyDetailsPageProps) {
  const { id } = await params;

  return (
    <div className="min-h-full border-b border-border bg-background">
      <VacancyDetailsEditor jobId={id} />
    </div>
  );
}

