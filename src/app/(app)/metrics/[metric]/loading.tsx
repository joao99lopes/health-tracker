import { LoadingRegion } from "@/components/loading-region";
import { FormSkeleton } from "@/components/page-skeleton";

export default function MetricLoading() {
  return (
    <LoadingRegion>
      <FormSkeleton rows={4} />
    </LoadingRegion>
  );
}
