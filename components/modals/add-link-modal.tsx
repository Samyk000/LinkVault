"use client";

/**
 * @file components/modals/add-link-modal.tsx
 * @description Modal for adding new links with metadata fetching
 * @created 2025-10-18
 */

import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Link2, Heading, FileText, RefreshCw, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/store/useStore";
import { detectPlatform, isValidUrl, normalizeUrl } from "@/utils/platform";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/utils/logger";
import { FolderTreeSelect } from "@/components/folders/folder-tree-select";
import { VALIDATION_LIMITS } from "@/constants";
import { detectMobileBrowser } from "@/lib/utils/platform";

// Delay before fetching metadata to avoid excessive API calls while user is typing
const METADATA_DEBOUNCE_DELAY = 800; // ms

const linkSchema = z.object({
  url: z.string()
    .min(1, "URL is required")
    .transform((val) => normalizeUrl(val))
    .refine((val) => isValidUrl(val), { message: "Please enter a valid URL" }),
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().max(VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH).optional(),
  folderId: z.string().nullable().optional(),
});

type LinkFormData = z.infer<typeof linkSchema>;

/**
* Modal component that allows users to add a new link or edit an existing one.
* @example
* AddLinkModal()
* // Renders a dialog with a form for entering a URL, fetching its metadata, and saving it.
* @param {void} None - This component does not accept any props.
* @returns {JSX.Element} A dialog element containing the link form UI.
**/
export function AddLinkModal() {
  const isOpen = useStore((state) => state.isAddLinkModalOpen);
  const setIsOpen = useStore((state) => state.setAddLinkModalOpen);
  const editingLinkId = useStore((state) => state.editingLinkId);
  const setEditingLink = useStore((state) => state.setEditingLink);
  const links = useStore((state) => state.links);
  const addLink = useStore((state) => state.addLink);
  const updateLink = useStore((state) => state.updateLink);
  const selectedFolderId = useStore((state) => state.selectedFolderId);
  const currentView = useStore((state) => state.currentView);
  const { toast } = useToast();

  const editingLink = editingLinkId ? links.find(l => l.id === editingLinkId) : null;
  const isEditMode = !!editingLink;

  const [thumbnail, setThumbnail] = useState("");
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [urlError, setUrlError] = useState("");
  const [initialUrl, setInitialUrl] = useState(""); // Track initial URL to detect actual changes
  const [metadataError, setMetadataError] = useState<string | null>(null); // Store error for retry
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  // Detect mobile browser for adaptive behavior
  const browserInfo = detectMobileBrowser();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = useForm<LinkFormData>({
    resolver: zodResolver(linkSchema),
    defaultValues: {
      url: "",
      title: "",
      description: "",
      folderId: null,
    },
  });

  const urlValue = watch("url");

  // Pre-fill form when editing, clear when adding new
  // Smart pre-selection: Auto-select current folder when on folder view
  useEffect(() => {
    if (isOpen) {
      if (editingLink) {
        // Editing mode: Use link's folder
        setInitialUrl(editingLink.url); // Store initial URL
        reset({
          url: editingLink.url,
          title: editingLink.title,
          description: editingLink.description,
          folderId: editingLink.folderId,
        });
        setThumbnail(editingLink.thumbnail);
        setUrlError("");
      } else {
        // Add mode: Smart pre-selection based on current view
        setInitialUrl(""); // Clear initial URL for new links
        const defaultFolderId =
          currentView === 'all' && selectedFolderId
            ? selectedFolderId
            : null;

        reset({
          url: "",
          title: "",
          description: "",
          folderId: defaultFolderId,
        });
        setThumbnail("");
        setUrlError("");
      }
    }
  }, [isOpen, editingLink, reset, currentView, selectedFolderId]);

  /**
   * Fetch metadata with enhanced retry mechanism and better error handling
   */
  const fetchMetadata = useCallback(async (url: string, isRetry = false) => {
    if (!isValidUrl(url)) return;

    setIsFetchingMetadata(true);
    setMetadataError(null);
    setUrlError("");

    try {
      // Enhanced timeout logic for better first-time success
      const baseTimeout = isRetry ? 15000 : 12000; // Longer timeout for first attempt
      const timeoutDuration = browserInfo.isMobile ? baseTimeout + 3000 : baseTimeout;

      const response = await fetch("/api/fetch-metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Add cache control headers to prevent interference with fresh requests
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(timeoutDuration),
      });

      if (response.ok) {
        const data = await response.json();
        setValue("title", data.title || "");
        setValue("description", data.description || "");
        setThumbnail(data.image || "");
        setUrlError("");
        setMetadataError(null);
        setRetryCount(0); // Reset retry count on success
      } else {
        // Enhanced error handling with more specific messages
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const isRestriction = errorData.restriction === true;
        let errorMessage = errorData.error || 'Unable to load link details.';

        if (response.status === 403 || isRestriction) {
          errorMessage = 'This website has restrictions preventing metadata fetching. You can still add the link manually by entering the title and description yourself.';
        } else if (response.status === 404) {
          errorMessage = 'URL not found. Please check the URL and try again.';
        } else if (response.status === 408) {
          errorMessage = 'Request timed out. The website took too long to respond. Click retry to try again.';
        } else if (response.status === 429) {
          errorMessage = 'Too many requests. Please wait a moment and try again.';
        } else if (response.status === 500) {
          errorMessage = 'The website is experiencing issues. Please try again later or add the link manually.';
        } else {
          errorMessage = errorData.error || 'Unable to load link details. You can still add the link manually.';
        }

        setMetadataError(errorMessage);
        setUrlError(errorMessage);

        // Don't clear metadata fields if it's a restriction - user can still use them
        // Only clear if it's a real error (not a restriction)
        if (!isRestriction) {
          setValue("title", "");
          setValue("description", "");
          setThumbnail("");
        }
      }
    } catch (error: unknown) {
      let errorMessage = 'Failed to fetch link details.';

      // Enhanced error handling with more specific messages
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.message.includes('timeout')) {
          errorMessage = 'Request timed out. The website took too long to respond.';
        } else if (error.message.includes('CORS') || error.message.includes('blocked')) {
          errorMessage = 'This website has restrictions preventing metadata fetching. You can still add the link manually.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Unable to connect to the website. Please check the URL and try again.';
        }
      }

      logger.error("Failed to fetch metadata:", error);
      setMetadataError(errorMessage);
      setUrlError(errorMessage);

      // Clear metadata fields on error (but preserve if it's a retry)
      if (!isRetry) {
        setValue("title", "");
        setValue("description", "");
        setThumbnail("");
      }
    } finally {
      setIsFetchingMetadata(false);
    }
  }, [setValue, browserInfo.isMobile]);

  // Safety effect to prevent stuck metadata loading state
  useEffect(() => {
    if (isFetchingMetadata) {
      const safetyTimer = setTimeout(() => {
        if (isFetchingMetadata) {
          logger.warn('Force clearing stuck metadata loading state');
          setIsFetchingMetadata(false);
        }
      }, 8000); // 8s safety timeout (reduced from 12s)
      return () => clearTimeout(safetyTimer);
    }
  }, [isFetchingMetadata]);

  /**
   * Handle retry button click
   */
  const handleRetryMetadata = useCallback(() => {
    if (!urlValue || !isValidUrl(urlValue)) return;
    if (retryCount >= MAX_RETRIES) {
      setUrlError(`Maximum retries (${MAX_RETRIES}) reached. Please check the URL or add the link manually.`);
      return;
    }
    setRetryCount(prev => prev + 1);
    fetchMetadata(urlValue, true);
  }, [urlValue, retryCount, fetchMetadata]);

  // Fetch metadata when URL changes (on actual user input changes, including edit mode)
  useEffect(() => {
    // Only fetch if:
    // 1. URL is valid
    // 2. URL has actually changed from initial value (user input, not programmatic)
    if (!urlValue || !isValidUrl(urlValue)) {
      setMetadataError(null);
      setRetryCount(0);
      return;
    }
    if (urlValue === initialUrl) return; // Don't fetch if URL hasn't changed from initial

    // Reset retry count when URL changes
    setRetryCount(0);
    setMetadataError(null);

    // Enhanced debounce logic for better first-time performance
    const baseDebounceDelay = 400; // Reduced from 800ms for faster response
    const adaptiveDelay = browserInfo.isMobile ? baseDebounceDelay * 2 : baseDebounceDelay;

    // Add slight randomness to prevent multiple tabs from hitting API simultaneously
    const finalDelay = adaptiveDelay + (Math.random() * 100);

    const timeoutId = setTimeout(() => {
      fetchMetadata(urlValue);
    }, finalDelay);

    return () => clearTimeout(timeoutId);
  }, [urlValue, initialUrl, fetchMetadata, browserInfo.isMobile]);

  /**
  * Adds a new link or updates an existing one using the provided form data, then shows a toast and closes the modal.
  * @example
  * saveLink({ url: "https://example.com", title: "Example", description: "Sample site", folderId: "abc123" })
  * // Displays a success toast and closes the modal
  * @param {LinkFormData} data - Object containing link details such as URL, title, description, and folder ID.
  * @returns {void} No return value.
  **/
  const onSubmit = async (data: LinkFormData) => {
    try {
      const platform = detectPlatform(data.url);

      if (isEditMode && editingLink) {
        // Update existing link
        await updateLink(editingLink.id, {
          url: data.url,
          title: data.title,
          description: data.description || "",
          thumbnail,
          platform,
          folderId: data.folderId || null,
          isFavorite: editingLink.isFavorite,
        });

        toast({
          title: "Link updated",
          variant: "success",
          icon: <Link2 className="size-4" />,
        });
      } else {
        // Add new link
        await addLink({
          url: data.url,
          title: data.title,
          description: data.description || "",
          thumbnail,
          platform,
          folderId: data.folderId || null,
          isFavorite: false,
        });

        toast({
          title: "Link added",
          variant: "success",
          icon: <Link2 className="size-4" />,
        });
      }

      handleClose();
    } catch (error) {
      logger.error('Error saving link:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save link. Please try again.';
      toast({
        title: "Error",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    reset();
    setThumbnail("");
    setEditingLink(null);
    setIsOpen(false);
    // Reset metadata error state when closing
    setMetadataError(null);
    setUrlError("");
    setRetryCount(0);
  };


  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] md:max-w-[650px] lg:max-w-[700px] max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{isEditMode ? 'Edit Link' : 'Add New Link'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update your link information below.'
              : "Paste a URL and we'll automatically fetch the metadata."
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="space-y-4 overflow-y-auto flex-1 px-1">
            {/* URL Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="url" className="text-sm font-medium flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                  URL
                </Label>
                <div className="flex items-center gap-2">
                  {/* Loading indicator for metadata fetch */}
                  {isFetchingMetadata && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin-gpu" />
                      <span>Getting link details...</span>
                    </div>
                  )}
                  {/* Retry button - show when there's an error and not currently fetching */}
                  {metadataError && !isFetchingMetadata && urlValue && isValidUrl(urlValue) && retryCount < MAX_RETRIES && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRetryMetadata}
                      className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                      title="Retry fetching metadata"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Retry</span>
                    </Button>
                  )}
                </div>
              </div>
              <div className="relative">
                <Input
                  id="url"
                  type="url"
                  placeholder="https://example.com"
                  {...register("url")}
                  className="h-10 text-base transition-all duration-200 pr-10"
                />
                {/* Inline retry icon for better UX */}
                {metadataError && !isFetchingMetadata && urlValue && isValidUrl(urlValue) && retryCount < MAX_RETRIES && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleRetryMetadata}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
                    title="Retry fetching metadata"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {errors.url && (
                <p className="text-xs text-destructive mt-1 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {errors.url.message}
                </p>
              )}
              {urlError && (
                <div className="text-xs text-destructive mt-1 flex items-start gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span className="flex-1">{urlError}</span>
                </div>
              )}
            </div>

            {/* Title Input */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium flex items-center gap-2">
                <Heading className="h-4 w-4 text-muted-foreground" />
                Title
              </Label>
              <Input
                id="title"
                placeholder="Link title"
                {...register("title")}
                className="h-10 text-base transition-all duration-200"
              />
              {errors.title && (
                <p className="text-xs text-destructive mt-1">{errors.title.message}</p>
              )}
            </div>

            {/* Description Input */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Optional description"
                rows={3}
                {...register("description")}
                className="text-sm sm:text-base resize-none overflow-hidden transition-all duration-200"
              />
              {errors.description && (
                <p className="text-xs text-destructive mt-1">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Folder Selection - Hierarchical Tree */}
            <div>
              <FolderTreeSelect
                value={watch("folderId") || null}
                onChange={useCallback((folderId: string | null) => setValue("folderId", folderId), [setValue])}
                placeholder="Optional: Select a folder to organize this link"
                allowClear
              />
            </div>

          </div>

          <DialogFooter className="flex-shrink-0 mt-6 gap-3">
            <Button type="button" variant="outline" onClick={handleClose} className="h-10 px-6">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isFetchingMetadata} className="h-10 px-6">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin-gpu" />
                  {isEditMode ? 'Updating...' : 'Saving...'}
                </>
              ) : (
                isEditMode ? 'Update Link' : 'Add Link'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
