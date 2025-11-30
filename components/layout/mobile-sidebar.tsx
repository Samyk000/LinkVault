import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Menu, PanelLeftClose } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { useStore } from '@/store/useStore';
import { QuickAccessSection } from './quick-access-section';
import { FoldersSection } from './folders-section';
import { FolderDeleteModal } from './folder-delete-modal';

export function MobileSidebar() {
  const [isOpen, setIsOpen] = React.useState(false);
  const { user } = useAuth();
  const setSelectedFolder = useStore((state) => state.setSelectedFolder);
  const setCurrentView = useStore((state) => state.setCurrentView);

  const handleFolderClick = (folderId: string) => {
    setCurrentView('all');
    setSelectedFolder(folderId);
    setIsOpen(false);
  };

  const handleViewClick = (view: 'all' | 'favorites' | 'trash') => {
    setCurrentView(view);
    setSelectedFolder(null);
    setIsOpen(false);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden focus:outline-none focus-visible:ring-0"
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </Button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="left" className="w-72 p-0 [&>button]:hidden">
          <SheetHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0">
            <SheetTitle>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <span className="text-lg font-bold">L</span>
                </div>
                <span className="text-lg font-semibold">LinksVault</span>
              </div>
            </SheetTitle>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <PanelLeftClose className="h-5 w-5" />
                <span className="sr-only">Close sidebar</span>
              </Button>
            </SheetClose>
            <SheetDescription className="sr-only">
              Navigation menu for LinksVault
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col h-[calc(100vh-80px)]">
            <div className="p-4 pb-0">
              {/* Quick Access - Pinned */}
              <QuickAccessSection onViewClick={handleViewClick} />
            </div>

            <ScrollArea className="flex-1">
              <div className="px-4 pb-4 space-y-1">
                {/* Folders - Scrollable */}
                <FoldersSection onFolderClick={handleFolderClick} />
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      {/* Folder Delete Confirmation Modal */}
      <FolderDeleteModal />
    </>
  );
}
