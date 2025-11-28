"use client";

/**
 * @file components/layout/quick-access-section.tsx
 * @description Quick access navigation section component
 * @created 2025-10-28
 */

import { QuickAccessNav } from "./shared-folder-nav";
import { useLinkCounts } from "@/hooks/use-link-counts";

interface QuickAccessSectionProps {
  onViewClick?: (view: 'all' | 'favorites' | 'trash') => void;
}

/**
 * Quick Access section with navigation for All Links, Favorites, and Trash.
 * @param {QuickAccessSectionProps} props - Component props
 * @returns {JSX.Element} Quick access section component
 */
export function QuickAccessSection({ onViewClick }: QuickAccessSectionProps) {
  const { allLinksCount, favoritesCount, trashCount } = useLinkCounts();

  return (
    <div>
      <QuickAccessNav
        allLinksCount={allLinksCount}
        favoritesCount={favoritesCount}
        trashCount={trashCount}
        onViewClick={onViewClick}
      />
    </div>
  );
}
