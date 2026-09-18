import { LoadingRegion } from "@/components/loading-region";
import { FormSkeleton } from "@/components/page-skeleton";

export default function NewMeasurementLoading() {
  return (
    <LoadingRegion>
      <FormSkeleton rows={6} />
    </LoadingRegion>
  );
}
