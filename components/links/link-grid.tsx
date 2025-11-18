"use client";

/**
 * @file components/links/link-grid.tsx
 * @description Grid view for displaying links with lazy loading
 * @created 2025-10-18
 * @updated 2025-10-18 - Added lazy loading and improved skeleton
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link } from "@/types";
import { LinkCard } from "./link-card";
import { LinkCardList } from "./link-card-list";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { useUIStore, useSettingsStore } from "@/store";
import { Sparkles } from "lucide-react";
import { INITIAL_LOAD_DELAY } from "@/constants";

const INITIAL_LOAD = 8; // Load 8 cards initially
const LOAD_MORE = 8; // Load 8 more when scrolling

interface LinkGridProps {
  links: Link[];
  isLoading?: boolean;
  isInTrash?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (linkId: string) => void;
  isSelectionModeActive?: boolean;
}

// Skeleton component that matches LinkCard layout
/**
* Renders a skeleton placeholder for a link card while its actual content is loading.
* @example
* LinkCardSkeleton()
* // <div className="rounded-lg border bg-card overflow-hidden">…</div>
* @returns {JSX.Element} Skeleton placeholder component for a link card.
**/
function LinkCardSkeleton() {
  return (
    <div className="rounded-lg bg-card overflow-hidden">
      {/* Thumbnail skeleton */}
      <Skeleton className="h-28 sm:h-32 w-full rounded-none" />
      {/* Content skeleton */}
      <div className="p-3 sm:p-4 space-y-2">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-2.5 w-full" />
        <Skeleton className="h-2.5 w-2/3" />
      </div>
      {/* Footer skeleton */}
      <div className="px-3 sm:px-4 pb-3 sm:pb-4 flex items-center justify-between">
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="h-2.5 w-12" />
      </div>
    </div>
  );
}

/**
* Renders a responsive, lazy-loaded grid or list of link cards with selection and trash-view support.
* @example
* LinkGrid({ links: fetchedLinks, isLoading: false, selectedIds: ['abc'], onToggleSelect: handleToggle })
* // Renders the initial batch of links and loads more items as you scroll
* @param {Link[]} links - Array of link objects to display.
* @param {boolean} [isLoading=false] - Displays skeleton placeholders while data is loading.
* @param {boolean} [isInTrash=false] - Indicates the component is shown inside the trash section.
* @param {string[]} [selectedIds=[]] - List of currently selected link IDs.
* @param {(id: string) => void} onToggleSelect - Callback invoked when a link's selection state is toggled.
* @param {boolean} [isSelectionModeActive=false] - Enables selection mode UI when set to true.
* @returns {JSX.Element} React element containing the rendered link grid or list.
**/
function LinkGridComponent({ links, isLoading = false, isInTrash = false, selectedIds = [], onToggleSelect, isSelectionModeActive = false }: LinkGridProps) {
  const { setAddLinkModalOpen } = useUIStore();
  const { settings } = useSettingsStore();
  const [displayedLinks, setDisplayedLinks] = useState<Link[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  // Debug: Log link IDs to help identify duplicates
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && links.length > 0) {
      const linkIds = links.map(link => link.id);
      const duplicates = linkIds.filter((id, index) => linkIds.indexOf(id) !== index);
      
      if (duplicates.length > 0) {
        console.warn('🔗 Duplicate link IDs detected:', {
          totalLinks: links.length,
          uniqueLinks: new Set(linkIds).size,
          duplicates: [...new Set(duplicates)],
          allIds: linkIds
        });
      }
    }
  }, [links]);
  
  const isListView = settings.viewMode === 'list';

  // Reset displayed links when links change
  useEffect(() => {
    // Deduplicate links by ID to prevent React key conflicts
    const uniqueLinks = Array.from(new Map(links.map(link => [link.id, link])).values());
    
    // Log duplicate detection for debugging
    if (uniqueLinks.length !== links.length) {
      console.warn(`🔗 LinkGrid: Detected ${links.length - uniqueLinks.length} duplicate links. Original count: ${links.length}, deduplicated count: ${uniqueLinks.length}`);
    }
    
    setDisplayedLinks(uniqueLinks.slice(0, INITIAL_LOAD));
  }, [links]);

  // Lazy loading with intersection observer
  useEffect(() => {
    // Don't set up observer if all links are displayed
    if (displayedLinks.length >= links.length) {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      return;
    }

    // Create observer if it doesn't exist
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setIsLoadingMore(true);
            // Fast loading for better UX
            setTimeout(() => {
              setDisplayedLinks(prev => {
                // Deduplicate links to prevent React key conflicts
                const uniqueLinks = Array.from(new Map(links.map(link => [link.id, link])).values());
                const nextIndex = prev.length;
                const nextBatch = uniqueLinks.slice(nextIndex, nextIndex + LOAD_MORE);
                
                // Check for duplicates in the new batch
                const newLinkIds = new Set(prev.map(link => link.id));
                const filteredBatch = nextBatch.filter(link => !newLinkIds.has(link.id));
                
                return [...prev, ...filteredBatch];
              });
              setIsLoadingMore(false);
            }, INITIAL_LOAD_DELAY);
          }
        },
        { 
          rootMargin: '300px',
          threshold: 0.1 
        }
      );
    }

    // Observe the load more ref
    const currentRef = loadMoreRef.current;
    if (currentRef && observerRef.current) {
      observerRef.current.observe(currentRef);
    }

    return () => {
      // Cleanup: unobserve but keep the observer instance
      if (observerRef.current && currentRef) {
        observerRef.current.unobserve(currentRef);
      }
    };
  }, [displayedLinks.length, links.length, links]);

  if (isLoading) {
    return (
      <div className={isListView ? "flex flex-col gap-4" : "grid grid-cols-2 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}>
        {Array.from({ length: INITIAL_LOAD }).map((_, i) => (
          <LinkCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No links yet"
        description="Start building your collection by adding your first link. Paste any URL and we'll automatically fetch the title and thumbnail!"
        action={{
          label: "Add Your First Link",
          onClick: () => setAddLinkModalOpen(true),
        }}
      />
    );
  }

  return (
    <>
      <div className={`transition-all duration-300 ease-in-out ${
        isListView 
          ? "flex flex-col gap-4" 
          : "grid grid-cols-2 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      }`}>
        {displayedLinks.map((link, index) => {
          // OPTIMIZED: Prioritize first 3 images for LCP optimization
          // This is critical for Largest Contentful Paint performance
          // Only the first visible row should be prioritized to avoid waterfall loading
          const isPriority = index < 3;
          
          return isListView ? (
            <LinkCardList
              key={link.id}
              link={link}
              isInTrash={isInTrash}
              isSelected={selectedIds.includes(link.id)}
              onToggleSelect={onToggleSelect}
              isSelectionModeActive={isSelectionModeActive}
              priority={isPriority}
            />
          ) : (
            <LinkCard
              key={link.id}
              link={link}
              isInTrash={isInTrash}
              isSelected={selectedIds.includes(link.id)}
              onToggleSelect={onToggleSelect}
              isSelectionModeActive={isSelectionModeActive}
              priority={isPriority}
            />
          );
        })}
        
        {/* Loading more skeletons */}
        {isLoadingMore && Array.from({ length: 6 }).map((_, i) => (
          <LinkCardSkeleton key={`loading-${i}`} />
        ))}
      </div>
      
      {/* Intersection observer target */}
      {displayedLinks.length < links.length && !isLoadingMore && (
        <div ref={loadMoreRef} className="h-10 mt-6" />
      )}
    </>
  );
}

// Memoize LinkGrid to prevent unnecessary re-renders
export const LinkGrid = React.memo(LinkGridComponent);
