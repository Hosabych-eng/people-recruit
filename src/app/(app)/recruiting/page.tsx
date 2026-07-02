import { Suspense } from "react";
import { PipelineView } from "@/components/pipeline/PipelineView";
import { Spinner } from "@/components/ui/Spinner";

export default function RecruitingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[320px] items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      }
    >
      <PipelineView />
    </Suspense>
  );
}
