/**
 * @file components/lazy/lazy-modal-wrapper.tsx
 * @description Wrapper component for lazy-loaded modals with Suspense
 * @created 2025-01-27
 */

import React, { Suspense } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

interface LazyModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * Loading fallback component for lazy-loaded modals
 * @returns {JSX.Element} Loading spinner in modal format
 */
function ModalLoadingFallback() {
  return (
    <DialogContent className="sm:max-w-[425px]">
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
      </div>
    </DialogContent>
  );
}

/**
 * Wrapper component for lazy-loaded modals with Suspense boundary
 * @param isOpen - Whether the modal is open
 * @param onClose - Function to close the modal
 * @param children - Lazy-loaded modal component
 * @param className - Additional CSS classes
 * @returns {JSX.Element} Modal wrapper with loading state
 */
export function LazyModalWrapper({ 
  isOpen, 
  onClose, 
  children, 
  className 
}: LazyModalWrapperProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <Suspense fallback={<ModalLoadingFallback />}>
        {children}
      </Suspense>
    </Dialog>
  );
}