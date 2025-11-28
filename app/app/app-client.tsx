/**
 * @file app/app/app-client.tsx
 * @description Client component for app page with hydrated data
 * @created 2025-01-XX
 */

"use client";

import React, { useMemo, useState, useEffect, useCallback, useDeferredValue } from "react";
import { Star, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { usePerformanceMonitor } from "@/hooks/use-performance-monitor";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { LinkGrid } from "@/components/links/link-grid";
import { MobileFAB } from "@/components/common/mobile-fab";
import { EmptyState } from "@/components/common/empty-state";
import { BulkActionBar } from "@/components/common/bulk-action-bar";
import {
  LazyAddLinkModal,
  LazyCreateFolderModal,
  LazyEmptyTrashModal,
  LazyRestoreAllModal
} from "@/components/lazy";
import { useStore } from "@/store/useStore";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useSpecificFolderDescendants } from "@/hooks/use-folder-descendants";
import { useDebounce } from "@/hooks/use-debounce";
import { SEARCH_DEBOUNCE_DELAY } from "@/constants";
import { useAuth } from "@/lib/contexts/auth-context";
import { useRouter } from "next/navigation";
import { Link, Folder } from "@/types";

interface AppClientProps {
  initialLinks?: Link[];
  initialFolders?: Folder[];
}

/**
 * OPTIMIZED: Client component that receives server-rendered initial data
 * This improves initial load time and LCP
 */
export function AppClient({ initialLinks = [], initialFolders = [] }: AppClientProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Use selective store selectors with shallow comparison to minimize re-renders
  const links = useStore((state) => state.links.length > 0 ? state.links : initialLinks);
  const folders = useStore((state) => state.folders.length > 0 ? state.folders : initialFolders);
  const selectedFolderId = useStore((state) => state.selectedFolderId);
  const currentView = useStore((state) => state.currentView);
  const searchFilters = useStore((state) => state.searchFilters);
  const isHydrated = useStore((state) => state.isHydrated);
  const isLoadingLinks = useStore((state) => state.isLoadingLinks);

  const setSearchFilters = useStore((state) => state.setSearchFilters);
  const setAddLinkModalOpen = useStore((state) => state.setAddLinkModalOpen);
  const emptyTrash = useStore((state) => state.emptyTrash);
  const restoreAllFromTrash = useStore((state) => state.restoreAllFromTrash);
  const isAddLinkModalOpen = useStore((state) => state.isAddLinkModalOpen);
  const isCreateFolderModalOpen = useStore((state) => state.isCreateFolderModalOpen);
  const { toast } = useToast();

  // Show loading skeleton while store is hydrating OR while links are loading
  // OPTIMIZED: Use initial data to show content immediately
  const isInitialLoading = !isHydrated && initialLinks.length === 0;

  // Performance monitoring - disabled to reduce overhead
  const { trackMetric, trackInteraction, trackError } = usePerformanceMonitor({
    componentName: 'AppPage',
    trackRenders: false,
    trackInteractions: true,
    trackErrors: true
  });


  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showEmptyTrashModal, setShowEmptyTrashModal] = useState(false);
  const [showRestoreAllModal, setShowRestoreAllModal] = useState(false);

  // Debounce search query for better performance
  const debouncedSearchQuery = useDebounce(searchFilters.query, SEARCH_DEBOUNCE_DELAY);

  // Derived state for search loading
  const isDebouncing = searchFilters.query !== debouncedSearchQuery;

  // Defer expensive computations to avoid blocking initial render
  const deferredLinks = useDeferredValue(links);
  const deferredFolders = useDeferredValue(folders);
  const deferredSelectedFolderId = useDeferredValue(selectedFolderId);
  const deferredCurrentView = useDeferredValue(currentView);
  const deferredSearchQuery = useDeferredValue(debouncedSearchQuery);

  // Get all descendant folder IDs for the selected folder
  const descendantFolderIds = useSpecificFolderDescendants(
    isLoadingLinks ? null : deferredSelectedFolderId,
    deferredFolders
  );

  // Filter links based on view, folder, and search query
  const filteredLinks = useMemo(() => {
    if (isLoadingLinks && initialLinks.length === 0) {
      return [];
    }

    let filtered = deferredLinks;

    // Filter by view
    if (deferredCurrentView === 'trash') {
      filtered = filtered.filter((link) => link.deletedAt !== null);
    } else {
      filtered = filtered.filter((link) => link.deletedAt === null);

      if (deferredCurrentView === 'favorites') {
        filtered = filtered.filter((link) => link.isFavorite);
      } else {
        if (deferredSelectedFolderId && descendantFolderIds.length > 0) {
          filtered = filtered.filter((link) =>
            link.folderId && descendantFolderIds.includes(link.folderId)
          );
        }
      }
    }

    // Filter by search query
    if (deferredSearchQuery) {
      const query = deferredSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (link) =>
          link.title.toLowerCase().includes(query) ||
          link.description.toLowerCase().includes(query) ||
          link.url.toLowerCase().includes(query) ||
          (link.tags && link.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }

    // Sort by date (newest first)
    return [...filtered].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [deferredLinks, deferredSelectedFolderId, deferredCurrentView, deferredSearchQuery, descendantFolderIds, isLoadingLinks, initialLinks.length]);

  // Memoize callbacks
  const handleToggleSelect = useCallback((linkId: string) => {
    setSelectedIds(prev =>
      prev.includes(linkId)
        ? prev.filter(id => id !== linkId)
        : [...prev, linkId]
    );
  }, []);

  const handleClearSelection = useCallback(() => {
    trackInteraction('click', 'clear_selection', {
      selectedCount: selectedIds.length.toString()
    });
    setSelectedIds([]);
  }, [selectedIds.length, trackInteraction]);

  const handleSelectAllEvent = useCallback(() => {
    const startTime = performance.now();

    try {
      const visibleLinkIds = filteredLinks.map(link => link.id);
      setSelectedIds(prev => {
        const allSelected = visibleLinkIds.every(id => prev.includes(id));
        if (allSelected) {
          return prev.filter(id => !visibleLinkIds.includes(id));
        } else {
          const newSelection = [...prev];
          visibleLinkIds.forEach(id => {
            if (!newSelection.includes(id)) {
              newSelection.push(id);
            }
          });
          return newSelection;
        }
      });

      const duration = performance.now() - startTime;
      trackMetric('select_all_time', duration, {
        visibleLinksCount: visibleLinkIds.length.toString(),
        currentView
      });
    } catch (error) {
      trackError('Select all toggle error', {
        action: 'select_all_toggle',
        visibleLinksCount: filteredLinks.length
      });
    }
  }, [filteredLinks, currentView, trackMetric, trackError]); // trackInteraction removed - not used in callback

  useEffect(() => {
    window.addEventListener('selectAllVisible', handleSelectAllEvent);
    return () => window.removeEventListener('selectAllVisible', handleSelectAllEvent);
  }, [handleSelectAllEvent]);

  const handleEmptyTrash = useCallback(() => {
    emptyTrash();
    toast({
      title: "Trash emptied",
      description: `(${filteredLinks.length})`,
      variant: "success",
    });
  }, [emptyTrash, toast, filteredLinks.length]);

  const handleRestoreAll = useCallback(() => {
    const count = filteredLinks.length;
    restoreAllFromTrash();
    toast({
      title: "All items restored",
      description: `(${count})`,
      variant: "success",
      icon: <RotateCcw className="size-4" />,
    });
  }, [restoreAllFromTrash, toast, filteredLinks.length]);

  const pageTitle = useMemo(() => {
    if (isLoadingLinks) return 'Loading...';
    if (deferredCurrentView === 'favorites') return 'Favorites';
    if (deferredCurrentView === 'trash') return 'Trash';
    if (deferredSelectedFolderId) {
      const folder = deferredFolders.find(f => f.id === deferredSelectedFolderId);
      return folder?.name || 'All Links';
    }
    return 'All Links';
  }, [deferredCurrentView, deferredSelectedFolderId, deferredFolders, isLoadingLinks]);

  const titleClassName = useMemo(() => {
    const length = pageTitle.length;
    if (length > 30) return 'text-sm sm:text-base md:text-base lg:text-lg';
    if (length > 20) return 'text-base sm:text-lg md:text-lg lg:text-xl';
    if (length > 12) return 'text-lg sm:text-xl md:text-xl lg:text-2xl';
    return 'text-xl sm:text-2xl md:text-2xl lg:text-3xl';
  }, [pageTitle]);

  useEffect(() => {
    setSelectedIds([]);
  }, [currentView]);

  useKeyboardShortcuts([
    {
      key: 'k',
      ctrlKey: true,
      callback: () => setAddLinkModalOpen(true),
    },
  ]);

  if (isInitialLoading) {
    return (
      <div className="flex h-screen flex-col">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <div className="container p-4 md:p-6">
              <div className="mb-6 h-8 w-48 animate-pulse rounded bg-muted" />
              <div className="grid grid-cols-2 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-lg border bg-card overflow-hidden">
                    <div className="h-28 sm:h-32 w-full animate-pulse bg-muted" />
                    <div className="p-3 sm:p-4 space-y-2">
                      <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                      <div className="h-2.5 w-full animate-pulse rounded bg-muted" />
                      <div className="h-2.5 w-2/3 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Rest of the component JSX is the same as original AppPage
  return (
    <div className="flex h-screen flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="mb-8 sm:mb-10">
              <div className="flex flex-col gap-4 sm:gap-5 md:flex-row md:items-center md:justify-between md:gap-6">
                <div className="flex items-baseline gap-3 sm:gap-4 min-w-0 md:order-1 md:flex-1">
                  <h1 className={`${titleClassName} font-bold tracking-tight truncate text-foreground`}>
                    {pageTitle}
                  </h1>
                  <span className="text-sm sm:text-base text-muted-foreground flex-shrink-0 font-medium tabular-nums">
                    ({isLoadingLinks ? '...' : filteredLinks.length})
                  </span>
                </div>
              </div>

              {deferredCurrentView === 'trash' && !isLoadingLinks && filteredLinks.length > 0 && (
                <div className="flex justify-end mt-4 sm:mt-5">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowRestoreAllModal(true)}
                      className="h-11 w-11 text-green-600 hover:text-green-700 hover:bg-green-600/10 dark:text-green-500 dark:hover:text-green-400 dark:hover:bg-green-500/10 transition-all duration-200 rounded-lg"
                      title="Restore all"
                      aria-label="Restore all items"
                    >
                      <RotateCcw className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowEmptyTrashModal(true)}
                      className="h-11 w-11 text-destructive hover:text-destructive/90 hover:bg-destructive/10 transition-all duration-200 rounded-lg"
                      title="Empty trash"
                      aria-label="Empty trash permanently"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
            {!isLoadingLinks && deferredCurrentView === 'favorites' && filteredLinks.length === 0 && deferredLinks.length > 0 ? (
              <EmptyState
                icon={Star}
                title="No favorites yet"
                description="Click the star icon on any link card to mark it as a favorite and see it here."
              />
            ) : !isLoadingLinks && deferredCurrentView === 'trash' && filteredLinks.length === 0 ? (
              <EmptyState
                icon={Trash2}
                title="Trash is empty"
                description="Deleted links will appear here. You'll be able to restore them or delete them permanently."
              />
            ) : (
              <LinkGrid
                links={filteredLinks}
                isInTrash={deferredCurrentView === 'trash'}
                isLoading={isDebouncing || isLoadingLinks}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                isSelectionModeActive={selectedIds.length > 0}
              />
            )}
          </div>
        </main>
      </div>

      {/* Lazy-loaded modals */}
      {isAddLinkModalOpen && (
        <React.Suspense fallback={null}>
          <LazyAddLinkModal />
        </React.Suspense>
      )}

      {isCreateFolderModalOpen && (
        <React.Suspense fallback={null}>
          <LazyCreateFolderModal />
        </React.Suspense>
      )}

      {showEmptyTrashModal && (
        <React.Suspense fallback={null}>
          <LazyEmptyTrashModal
            isOpen={showEmptyTrashModal}
            onClose={() => setShowEmptyTrashModal(false)}
            onConfirm={handleEmptyTrash}
            trashCount={filteredLinks.length}
          />
        </React.Suspense>
      )}

      {showRestoreAllModal && (
        <React.Suspense fallback={null}>
          <LazyRestoreAllModal
            isOpen={showRestoreAllModal}
            onClose={() => setShowRestoreAllModal(false)}
            onConfirm={handleRestoreAll}
            trashCount={filteredLinks.length}
          />
        </React.Suspense>
      )}

      <MobileFAB />

      <BulkActionBar
        selectedIds={selectedIds}
        onClearSelection={handleClearSelection}
        totalVisibleItems={filteredLinks.length}
      />
    </div>
  );
}

