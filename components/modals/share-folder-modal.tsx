'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Link as LinkIcon, Eye, EyeOff, CheckCircle, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useStore } from '@/store/useStore';

interface ShareFolderModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  folder?: {
    id: string;
    name: string;
    linkCount: number;
  };
}

export function ShareFolderModal({ isOpen, onClose, folder }: ShareFolderModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Store-based state for global modal usage
  const isShareFolderModalOpen = useStore((state) => state.isShareFolderModalOpen);
  const setShareFolderModalOpen = useStore((state) => state.setShareFolderModalOpen);
  const folderToShare = useStore((state) => state.folderToShare);

  // Use props if provided, otherwise fall back to store
  const effectiveIsOpen = isOpen !== undefined ? isOpen : isShareFolderModalOpen;
  const effectiveFolder = folder || folderToShare;
  const effectiveOnClose = onClose || (() => setShareFolderModalOpen(false));

  const { toast } = useToast();

  // Clean component initialization (minimal logging)
  useEffect(() => {
    if (isOpen !== undefined || folder !== undefined) {
      console.log('ShareFolderModal: Initialized');
    }
  }, [isOpen, folder]);

  const generateShareUrl = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (!effectiveFolder || isGenerating || shareUrl) return;

    setIsGenerating(true);
    
    try {
      const response = await fetch(`/api/folders/${effectiveFolder.id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create share link (Status: ${response.status})`);
      }

      const data = await response.json();
      
      if (data.success) {
        setShareUrl(data.shareUrl);
        toast({
          title: "Share link created",
          description: "Your folder is now shareable with a secure link.",
        });
      } else {
        throw new Error('Failed to create share link');
      }
    } catch (error) {
      console.error('Share link creation failed:', error);
      toast({
        variant: "destructive",
        title: "Error creating share link",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [effectiveFolder, isGenerating, shareUrl, toast]);

  useEffect(() => {
    // Clear share URL when modal closes
    if (!effectiveIsOpen) {
      setShareUrl('');
      setCopySuccess(false);
    }
  }, [effectiveIsOpen]);

  useEffect(() => {
    // Auto-create share when modal opens (only once)
    if (effectiveIsOpen && effectiveFolder && !shareUrl && !isGenerating) {
      generateShareUrl();
    }
  }, [effectiveIsOpen, effectiveFolder, shareUrl, generateShareUrl, isGenerating]);

  const handleCopyUrl = useCallback(async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      
      toast({
        title: "Link copied",
        description: "Share link copied to clipboard.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to copy",
        description: "Please copy the link manually.",
      });
    }
  }, [shareUrl, toast]);

  const handleClose = useCallback(() => {
    effectiveOnClose();
    setShareUrl('');
    setCopySuccess(false);
  }, [effectiveOnClose]);

  // Removed excessive render logging for cleaner console

  return (
    <Dialog open={effectiveIsOpen || false} onOpenChange={(open) => {
      if (!open) {
        handleClose();
      }
    }}>
      <DialogContent className="sm:max-w-md max-w-full mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-orange-500" />
            Share Folder
          </DialogTitle>
          <DialogDescription>
            Share &ldquo;{effectiveFolder?.name}&rdquo; ({effectiveFolder?.linkCount} links)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Share URL Display */}
          <div className="space-y-2">
            <Label htmlFor="share-url">Share Link</Label>
            <div className="flex gap-2 flex-col sm:flex-row">
              <div className="flex-1">
                <Input
                  id="share-url"
                  value={shareUrl || ''}
                  readOnly
                  className="font-mono text-sm break-all"
                  placeholder={isGenerating ? "Generating share link..." : "Click Share to generate link"}
                />
              </div>
              {isGenerating && (
                <div className="flex items-center justify-center sm:justify-start">
                  <div className="animate-spin rounded-full border-2 border-orange-500 border-t-transparent h-4 w-4" />
                </div>
              )}
              <div className="sm:min-w-[80px]">
                <Button
                  onClick={handleCopyUrl}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={!shareUrl || isGenerating}
                >
                  {copySuccess ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <Copy className="h-4 w-4 mr-1" />
                  )}
                  Copy
                </Button>
              </div>
            </div>
          </div>

          {/* Share Actions */}
          <div className="flex gap-2 flex-col sm:flex-row">
            <Button
              variant="outline"
              size="sm"
              className="text-orange-500 hover:text-orange-600 flex-1 py-2"
              onClick={() => {
                if (shareUrl) {
                  window.open(shareUrl, '_blank');
                }
              }}
              disabled={!shareUrl}
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <Button
              onClick={handleClose}
              variant="outline"
              size="sm"
              className="flex-1 py-2"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}