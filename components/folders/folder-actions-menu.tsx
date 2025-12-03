'use client';

import React, { useState } from 'react';
import { MoreVertical, Edit, Share2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { ShareFolderModal } from '@/components/modals/share-folder-modal';

interface FolderActionsMenuProps {
    folder: {
        id: string;
        name: string;
        linkCount: number;
        shareable?: boolean;
        shareId?: string | null;
    };
    onEdit: (folderId: string) => void;
    onDelete: (folderId: string) => void;
}

export function FolderActionsMenu({ folder, onEdit, onDelete }: FolderActionsMenuProps) {
    const [showShareModal, setShowShareModal] = useState(false);

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

                    <DropdownMenuItem
                        onSelect={() => setShowShareModal(true)}
                        className="text-orange-600 focus:bg-orange-50 focus:text-orange-600"
                    >
                        <Share2 className="h-4 w-4 mr-2" />
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

            <ShareFolderModal
                folder={{
                    id: folder.id,
                    name: folder.name,
                    linkCount: folder.linkCount
                }}
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
            />
        </>
    );
}