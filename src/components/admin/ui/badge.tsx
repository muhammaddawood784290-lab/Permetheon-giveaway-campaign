import * as LabelPrimitive from "@radix-ui/react-label";

export type ReviewBadgeProps = {
  status: string;
  className?: string;
};

export function ReviewBadge({ status, className }: ReviewBadgeProps) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return <LabelPrimitive.Root className={className}>{label}</LabelPrimitive.Root>;
}
