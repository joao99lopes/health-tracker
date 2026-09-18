import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * What a page shows when it has nothing to show.
 *
 * Every one of these states in the app is stated plainly - "Not enough data
 * yet." - rather than drawn as an empty chart or a zero, both of which would
 * read as a measurement that was never taken. The icon is decorative and the
 * text carries the whole message.
 *
 * `bordered` draws the dashed frame used where a chart or a list would
 * otherwise be; inside a card the frame is left off.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  bordered = false,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  bordered?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-6 py-10 text-center",
        bordered && "border-border rounded-xl border border-dashed",
        className,
      )}
    >
      {Icon && (
        <span
          className="bg-muted text-muted-foreground mb-1 flex size-10 items-center justify-center rounded-full"
          aria-hidden
        >
          <Icon className="size-5" />
        </span>
      )}
      <p className="font-medium">{title}</p>
      {description && (
        <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
