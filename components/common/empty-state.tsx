"use client";

/**
 * @file components/common/empty-state.tsx
 * @description Empty state component for various scenarios
 * @created 2025-10-18
 */

import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Empty state component for displaying when no content is available.
 * Shows an icon, title, description, and optional action button.
 * @param {EmptyStateProps} props - Component props
 * @returns {JSX.Element} Empty state component
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[400px] sm:min-h-[500px] flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/20 p-8 sm:p-12 text-center animate-in fade-in-50 duration-300 bg-muted/30">
      {Icon && (
        <div className="mx-auto flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-muted/50 backdrop-blur-sm">
          <Icon className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/60" />
        </div>
      )}
      <h3 className="mt-6 sm:mt-8 text-xl sm:text-2xl font-semibold text-foreground">{title}</h3>
      <p className="mb-6 sm:mb-8 mt-3 sm:mt-4 text-sm sm:text-base text-muted-foreground max-w-md leading-relaxed">
        {description}
      </p>
      {action && (
        <Button onClick={action.onClick} size="lg" className="px-6 py-2.5 text-base font-medium">
          {action.label}
        </Button>
      )}
    </div>
  );
}
