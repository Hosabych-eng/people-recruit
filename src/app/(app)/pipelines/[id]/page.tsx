import { PipelineConfiguratorView } from "@/components/pipelines/PipelineConfiguratorView";

type PipelineDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PipelineDetailPage({
  params,
}: PipelineDetailPageProps) {
  const { id } = await params;

  return (
    <div className="min-h-full border-b border-border bg-background">
      <PipelineConfiguratorView jobId={id} />
    </div>
  );
}
