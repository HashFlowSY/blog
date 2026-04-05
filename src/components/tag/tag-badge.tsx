import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TagBadgeProps {
  tag: string;
  size?: "sm" | "md";
  className?: string;
}

const sizeStyles = {
  sm: "h-5 px-2 py-0.5 text-xs",
  md: "h-7 px-3 py-1 text-sm",
} as const;

export function TagBadge({ tag, size = "sm", className }: TagBadgeProps) {
  return (
    <Badge variant="secondary" className={cn(sizeStyles[size], className)}>
      {tag}
    </Badge>
  );
}
