import { VacancyReportsDashboard } from "@/components/analytics/VacancyReportsDashboard";

type VacancyReportsPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mock?: string }>;
};

const allowDemo = process.env.NODE_ENV !== "production";

export default async function VacancyReportsPage({
  params,
  searchParams,
}: VacancyReportsPageProps) {
  const { id } = await params;
  const { mock } = await searchParams;

  return (
    <VacancyReportsDashboard
      jobId={id}
      allowDemo={allowDemo}
      initialMock={allowDemo && mock === "1"}
    />
  );
}
