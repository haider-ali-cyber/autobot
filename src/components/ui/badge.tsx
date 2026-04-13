import { type ReactNode } from "react";
import { clsx } from "clsx";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "purple" | "blue" | "outline";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  default:  "bg-gray-100 text-gray-600 border border-gray-200",
  success:  "bg-green-50 text-green-700 border border-green-200",
  warning:  "bg-amber-50 text-amber-700 border border-amber-200",
  danger:   "bg-red-50 text-red-600 border border-red-200",
  purple:   "bg-purple-50 text-purple-700 border border-purple-200",
  blue:     "bg-blue-50 text-blue-700 border border-blue-200",
  outline:  "border border-gray-300 text-gray-600",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span className={clsx("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", variants[variant], className)}>
      {children}
    </span>
  );
}
