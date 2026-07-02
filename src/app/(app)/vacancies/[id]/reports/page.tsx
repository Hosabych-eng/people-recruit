import { VacancyReportsDashboard } from "@/components/analytics/VacancyReportsDashboard";

type VacancyReportsPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mock?: string }>;
};

export default async function VacancyReportsPage({
  params,
  searchParams,
}: VacancyReportsPageProps) {
  const { id } = await params;
  const { mock } = await searchParams;

  return (
    <VacancyReportsDashboard jobId={id} initialMock={mock === "1"} />
  );
}
