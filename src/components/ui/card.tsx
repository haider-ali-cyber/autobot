import { type ReactNode } from "react";
import { clsx } from "clsx";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={clsx("bg-white border border-gray-200 rounded-lg p-4", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: CardProps) {
  return <div className={clsx("mb-4", className)}>{children}</div>;
}

export function CardTitle({ children, className }: CardProps) {
  return <h3 className={clsx("text-base font-semibold text-gray-900", className)}>{children}</h3>;
}

export function CardDescription({ children, className }: CardProps) {
  return <p className={clsx("text-sm text-gray-500 mt-0.5", className)}>{children}</p>;
}

export function CardContent({ children, className }: CardProps) {
  return <div className={clsx(className)}>{children}</div>;
}
