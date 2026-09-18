import { LoadingRegion } from "@/components/loading-region";
import { DashboardSkeleton } from "@/components/page-skeleton";

export default function DashboardLoading() {
  return (
    <LoadingRegion>
      <DashboardSkeleton />
    </LoadingRegion>
  );
}
