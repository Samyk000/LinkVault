import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QuickAccessSection } from "./quick-access-section";
import { FoldersSection } from "./folders-section";
import { FolderDeleteModal } from "./folder-delete-modal";
import { useAuth } from "@/lib/contexts/auth-context";

export function Sidebar() {
  const { user } = useAuth();

  return (
    <>
      <aside className="hidden md:flex w-64 lg:w-72 max-w-72 flex-col border-r border-border/40 bg-background/50 backdrop-blur-sm">
        <div className="p-4 lg:p-5 pb-0">
          {/* Quick Access Section - Pinned to top */}
          <QuickAccessSection />
        </div>

        <ScrollArea className="flex-1">
          <div className="px-4 lg:px-5 pb-2 space-y-2">
            {/* Folders Section - Scrollable */}
            <FoldersSection />
          </div>
        </ScrollArea>
      </aside>

      {/* Folder Delete Confirmation Modal */}
      <FolderDeleteModal />
    </>
  );
}
