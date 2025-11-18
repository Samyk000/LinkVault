/**
 * @file hooks/use-link-counts.ts
 * @description Custom hook for calculating link counts
 * @created 2025-10-28
 */

import { useStore } from "@/store/useStore";

/**
 * Custom hook to calculate counts for links, favorites, and trash.
 * @returns Object containing allLinksCount, favoritesCount, and trashCount
 */
export function useLinkCounts() {
  const links = useStore((state) => state.links);
  
  const allLinksCount = links.filter(link => link.deletedAt === null).length;
  const favoritesCount = links.filter(link => link.isFavorite && link.deletedAt === null).length;
  const trashCount = links.filter(link => link.deletedAt !== null).length;

  return {
    allLinksCount,
    favoritesCount,
    trashCount,
  };
}
