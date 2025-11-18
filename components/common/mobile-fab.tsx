/**
 * @file components/common/mobile-fab.tsx
 * @description Floating Action Button for mobile devices
 * @author LinkVault Team
 * @created 2025-10-18
 * @modified 2025-10-19
 */

"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store";

/**
 * Mobile Floating Action Button
 * Displays a fixed button in the bottom-right corner on mobile devices
 * Opens the Add Link modal when clicked
 */
export function MobileFAB() {
  const { setAddLinkModalOpen } = useUIStore();

  return (
    <Button
      size="lg"
      className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 hover:scale-110 hover:shadow-2xl active:scale-95 md:hidden"
      onClick={() => setAddLinkModalOpen(true)}
      aria-label="Add new link"
    >
      <Plus className="h-6 w-6" />
      <span className="sr-only">Add Link</span>
    </Button>
  );
}
