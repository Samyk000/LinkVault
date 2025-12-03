'use client';

import React, { useState } from 'react';
import { MoreVertical, Edit, Share2, Trash2, Lock, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { ShareFolderModal } from '@/components/modals/share-folder-modal';
import { useFreeUser } from '@/hooks/use-free-user';
import { useToast } from '@/hooks/use-toast';
import { useStore } from '@/store/useStore';

interface FolderActionsMenuProps {
    folder: {
        id: string;
        name: string;
        linkCount: number;
        shareable?: boolean;
        shareId?: string | null;
        parentId?: string | null;
    };
    onEdit: (folderId: string) => void;
    onDelete: (folderId: string) => void;
}

export function FolderActionsMenu({ folder, onEdit, onDelete }: FolderActionsMenuProps) {
    const [showShareModal, setShowShareModal] = useState(false);
    const { isFreeUser } = useFreeUser();
    const { toast } = useToast();
    const setParentFolder = useStore((state) => state.setParentFolder);
    const setCreateFolderModalOpen = useStore((state) => state.setCreateFolderModalOpen);

    // Check if this folder can have sub-folders (only root folders can)
    const canHaveSubFolders = folder.parentId === null || folder.parentId === undefined;

    const handleFreeUserAction = (action: string) => {
        toast({
            title: `${action} requires an account`,
            description: "Sign up to unlock this feature",
            variant: "default",
        });
    };

    const handleAddSubFolder = () => {
        if (isFreeUser) {
            handleFreeUserAction("Sub-folders");
            return;
        }
        setParentFolder(folder.id);
        setCreateFolderModalOpen(true);
    };

    const handleShareFolder = () => {
        if (isFreeUser) {
            handleFreeUserAction("Folder sharing");
            return;
        }
        setShowShareModal(true);
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-accent hover:text-accent-foreground transition-colors duration-200 opacity-0 group-hover/folder:opacity-100 focus:opacity-100">
                        <MoreVertical className="h-3.5 w-3.5" />
                        <span className="sr-only">Folder actions</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onSelect={() => onEdit(folder.id)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Folder
                    </DropdownMenuItem>

                    {/* Add Sub-folder option - only for root folders */}
                    {canHaveSubFolders && (
                        <DropdownMenuItem
                            onSelect={handleAddSubFolder}
                            className={isFreeUser ? "text-muted-foreground opacity-60" : ""}
                        >
                            {isFreeUser ? (
                                <Lock className="h-4 w-4 mr-2" />
                            ) : (
                                <FolderPlus className="h-4 w-4 mr-2" />
                            )}
                            Add Sub-folder
                        </DropdownMenuItem>
                    )}

                    {/* Share option */}
                    <DropdownMenuItem
                        onSelect={handleShareFolder}
                        className={isFreeUser 
                            ? "text-muted-foreground opacity-60" 
                            : "text-orange-600 focus:bg-orange-50 focus:text-orange-600"
                        }
                    >
                        {isFreeUser ? (
                            <Lock className="h-4 w-4 mr-2" />
                        ) : (
                            <Share2 className="h-4 w-4 mr-2" />
                        )}
                        {folder.shareable ? 'Manage Sharing' : 'Share Folder'}
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                        className="text-red-600 focus:bg-red-50 focus:text-red-600"
                        onSelect={() => onDelete(folder.id)}
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Folder
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {!isFreeUser && (
                <ShareFolderModal
                    folder={{
                        id: folder.id,
                        name: folder.name,
                        linkCount: folder.linkCount
                    }}
                    isOpen={showShareModal}
                    onClose={() => setShowShareModal(false)}
                />
            )}
        </>
    );
}