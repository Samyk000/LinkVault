"use client";

/**
 * @file components/modals/create-folder-modal.tsx
 * @description Modal for creating and editing folders
 * @created 2025-10-18
 * @updated 2025-10-18 - Added edit mode functionality
 */

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, AlertCircle, Folder, FolderPlus } from "lucide-react";
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
import { useStore } from "@/store/useStore";
import { logger } from "@/lib/utils/logger";
import { useToast } from "@/hooks/use-toast";
import { FOLDER_ICONS } from "@/constants/folder-icons";
import { canAddSubFolder, getSubFolderCount, MAX_SUB_FOLDERS_PER_FOLDER } from "@/utils/folder-utils";
import { useGuestMode } from "@/lib/contexts/guest-mode-context";
import { UpgradePromptDialog } from "@/components/modals/upgrade-prompt-dialog";

const folderSchema = z.object({
  name: z.string().min(1, "Name is required").max(30, "Name must be 30 characters or less"),
  iconName: z.string().min(1, "Icon is required"),
});

type FolderFormData = z.infer<typeof folderSchema>;

/**
* Renders a modal dialog that allows users to create, edit, and validate folders (or sub-folders) with customizable icons.
* @example
* <CreateFolderModal />
* Renders the modal for creating or editing a folder and returns the corresponding JSX element.
* @returns {JSX.Element} The rendered create/edit folder modal component.
**/
export function CreateFolderModal() {
  const isOpen = useStore((state) => state.isCreateFolderModalOpen);
  const setIsOpen = useStore((state) => state.setCreateFolderModalOpen);
  const editingFolderId = useStore((state) => state.editingFolderId);
  const setEditingFolder = useStore((state) => state.setEditingFolder);
  const parentFolderId = useStore((state) => state.parentFolderId);
  const setParentFolder = useStore((state) => state.setParentFolder);
  const folders = useStore((state) => state.folders);
  const addFolder = useStore((state) => state.addFolder);
  const updateFolder = useStore((state) => state.updateFolder);
  const { toast } = useToast();

  const editingFolder = editingFolderId ? folders.find(f => f.id === editingFolderId) : null;
  const isEditMode = !!editingFolder;
  const isSubFolder = !!parentFolderId;
  const parentFolder = parentFolderId ? folders.find(f => f.id === parentFolderId) : null;

  // Guest mode check - use context to avoid hydration issues
  const { isGuestMode } = useGuestMode();
  const [showUpgradePrompt, setShowUpgradePrompt] = React.useState(false);

  // Check if parent folder has reached the sub-folder limit
  const canAddMoreSubFolders = parentFolderId ? canAddSubFolder(parentFolderId, folders) : true;
  const currentSubFolderCount = parentFolderId ? getSubFolderCount(parentFolderId, folders) : 0;
  const hasReachedLimit = !canAddMoreSubFolders && !isEditMode;

  // Guest mode restriction for sub-folders
  const isGuestSubFolderRestricted = isGuestMode && isSubFolder && !isEditMode;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<FolderFormData>({
    resolver: zodResolver(folderSchema),
    defaultValues: {
      name: "",
      iconName: "Folder",
    },
  });

  const selectedIconName = watch("iconName") || "Folder";
  const selectedIcon = FOLDER_ICONS.find(icon => icon.name === selectedIconName) || FOLDER_ICONS[15];

  // Pre-fill form when editing, clear when adding new
  React.useEffect(() => {
    if (isOpen) {
      if (editingFolder) {
        reset({
          name: editingFolder.name,
          iconName: editingFolder.icon,
        });
      } else {
        // Clear form when opening in add mode
        reset({
          name: "",
          iconName: "Folder",
        });
      }
    }
  }, [isOpen, editingFolder, reset]);

  /**
  * Validates folder form input, then creates a new folder or updates an existing one while displaying toast notifications.
  * @example
  * handleFolderFormSubmit({ name: "Projects", iconName: "briefcase" })
  * // Folder created/updated and success toast displayed
  * @param {{FolderFormData}} {{data}} - Folder form data containing name, iconName and other fields.
  * @returns {{void}} Returns nothing.
  **/
  const onSubmit = async (data: FolderFormData) => {
    // PHASE 2B FIX: Safety timeout to prevent stuck loading state
    const safetyTimeout = setTimeout(() => {
      logger.warn('[CreateFolder] Safety timeout triggered - clearing stuck state');
      toast({
        title: "Request timeout",
        description: "The operation took too long. Please try again.",
        variant: "destructive",
        icon: <AlertCircle className="size-4" />,
      });
      handleClose();
    }, 20000); // 20 second safety timeout

    try {
      // Validate: Cannot create sub-folder inside a sub-folder
      if (!isEditMode && parentFolderId) {
        const parent = folders.find(f => f.id === parentFolderId);
        if (parent?.parentId !== null) {
          clearTimeout(safetyTimeout);
          toast({
            title: "Invalid location",
            description: "Sub-folders can only be created under main folders",
            variant: "destructive",
            icon: <AlertCircle className="size-4" />,
          });
          return;
        }

        // Validate sub-folder limit (now 10)
        if (!canAddSubFolder(parentFolderId, folders)) {
          const count = getSubFolderCount(parentFolderId, folders);
          clearTimeout(safetyTimeout);
          toast({
            title: "Limit reached",
            description: `Maximum ${MAX_SUB_FOLDERS_PER_FOLDER} sub-folders allowed`,
            variant: "destructive",
            icon: <AlertCircle className="size-4" />,
          });
          return;
        }
      }

      const iconOption = FOLDER_ICONS.find(icon => icon.name === data.iconName);
      const color = iconOption?.color || "#F59E0B";

      if (isEditMode && editingFolder) {
        // Update existing folder
        await updateFolder(editingFolder.id, {
          name: data.name,
          icon: data.iconName,
          color: color,
        });

        clearTimeout(safetyTimeout);
        toast({
          title: "Folder updated",
          variant: "success",
          icon: <Folder className="size-4" />,
        });

        handleClose();
      } else {
        // Create new folder or sub-folder
        await addFolder({
          name: data.name,
          description: "",
          color: color,
          icon: data.iconName,
          parentId: parentFolderId ?? null,
          isPlatformFolder: false,
        });

        clearTimeout(safetyTimeout);
        toast({
          title: "Folder created",
          variant: "success",
          icon: isSubFolder ? <FolderPlus className="size-4" /> : <Folder className="size-4" />,
        });

        handleClose();
      }
    } catch (error) {
      clearTimeout(safetyTimeout);
      logger.error('Error saving folder:', error);

      // OPTIMIZED: Handle duplicate folder name error
      const isDuplicate = error instanceof Error && (
        error.message?.includes('already exists') ||
        error.message?.includes('duplicate') ||
        error.message?.includes('unique')
      );

      const isTimeout = error instanceof Error && error.message?.includes('timeout');

      toast({
        title: isDuplicate ? "Duplicate folder" : isTimeout ? "Request timeout" : "Error",
        description: isDuplicate 
          ? "A folder with this name already exists" 
          : isTimeout 
            ? "The operation took too long. Please check your connection and try again."
            : (error instanceof Error ? error.message : "Please try again"),
        variant: "destructive",
        icon: <AlertCircle className="size-4" />,
      });
      // Don't close modal on error - let user retry
    }
  };

  const handleClose = () => {
    reset();
    setEditingFolder(null);
    setParentFolder(null);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px] md:max-w-[600px] lg:max-w-[650px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Folder' : isSubFolder ? `Create Sub-folder ${parentFolder ? `under "${parentFolder.name}"` : ''}` : 'Create Folder'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update your folder name and icon.'
              : 'Choose an icon and name for your folder.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 flex-1 min-h-0">
          {/* Warning: Guest mode sub-folder restriction */}
          {isGuestSubFolderRestricted && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-3">
              <AlertCircle className="size-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-medium text-amber-700">Sub-folders not available in Guest Mode</p>
                <p className="text-xs text-amber-600/80 mt-1">
                  Sign up for a free account to create sub-folders and organize your links hierarchically.
                </p>
                <button
                  type="button"
                  onClick={() => setShowUpgradePrompt(true)}
                  className="text-xs text-amber-700 underline mt-2 hover:text-amber-800"
                >
                  Learn more about full features
                </button>
              </div>
            </div>
          )}

          {/* Warning: Sub-folder limit reached */}
          {hasReachedLimit && !isGuestSubFolderRestricted && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3">
              <AlertCircle className="size-4 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-medium text-destructive">Maximum sub-folders reached</p>
                <p className="text-xs text-destructive/80 mt-1">
                  &quot;{parentFolder?.name}&quot; already has {currentSubFolderCount} sub-folders.
                  Maximum is {MAX_SUB_FOLDERS_PER_FOLDER} sub-folders per folder.
                </p>
              </div>
            </div>
          )}

          {/* Name Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="name" className="text-sm font-medium">Folder Name</Label>
              <span className="text-xs text-muted-foreground tabular-nums">{watch("name")?.length || 0}/30</span>
            </div>
            <Input
              id="name"
              placeholder="My Folder"
              {...register("name")}
              maxLength={30}
              className="h-10 text-base transition-all duration-200 ease-in-out"
            />
            {errors.name && (
              <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Icon Selector */}
          <div className="flex-1 min-h-0 flex flex-col gap-2.5">
            <Label className="text-sm font-medium">Select Icon</Label>

            <div className="grid grid-cols-9 gap-1.5">
              {FOLDER_ICONS.map((iconOption) => {
                const IconComponent = iconOption.icon;
                const isSelected = selectedIconName === iconOption.name;
                return (
                  <button
                    key={iconOption.name}
                    type="button"
                    onClick={() => setValue("iconName", iconOption.name)}
                    className={`aspect-square p-1.5 rounded-md border-2 transition-all duration-250 ease-in-out hover:scale-105 active:scale-95 flex items-center justify-center will-change-transform ${isSelected
                      ? "border-primary bg-primary/10 scale-105"
                      : "border-border hover:border-primary/50"
                      }`}
                    title={iconOption.name}
                  >
                    <IconComponent
                      className="size-4"
                      style={{ color: iconOption.color }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter className="mt-6 gap-3">
            <Button type="button" variant="outline" onClick={handleClose} className="h-10 px-6">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || hasReachedLimit || isGuestSubFolderRestricted} className="h-10 px-6">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin-gpu" />
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditMode ? 'Update Folder' : 'Create Folder'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Upgrade Prompt for Guest Users */}
      <UpgradePromptDialog
        isOpen={showUpgradePrompt}
        feature="sub-folders"
        onClose={() => setShowUpgradePrompt(false)}
      />
    </Dialog>
  );
}
