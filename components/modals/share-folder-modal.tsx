'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Link as LinkIcon, Eye, EyeOff, CheckCircle, Share2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useToast } from '@/hooks/use-toast';

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

  const { toast } = useToast();

  const generateShareUrl = useCallback(async () => {
    if (!folder) return;

    setIsGenerating(true);
    
    try {
      console.log('Generating share URL for folder:', {
        folderId: folder.id,
        folderName: folder.name
      });

      const response = await fetch('/api/shares', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folderId: folder.id,
        }),
      });

      console.log('Share API response received:', {
        status: response.status,
        ok: response.ok
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Share API error:', { status: response.status, error: errorData });
        throw new Error(errorData.error || `Failed to create share link (Status: ${response.status})`);
      }

      const data = await response.json();
      console.log('Share API success response:', data);
      
      if (data.success) {
        setShareUrl(data.data.shareUrl);
        
        console.log('Share URL set successfully:', {
          shareUrl: data.data.shareUrl,
          shareId: data.data.id
        });
        
        toast({
          title: "Share link created",
          description: "Your folder is now shareable with a secure link.",
        });
      } else {
        throw new Error('Failed to create share link');
      }
    } catch (error) {
      console.error('Error in generateShareUrl:', error);
      toast({
        variant: "destructive",
        title: "Error creating share link",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [folder, toast]);

  useEffect(() => {
    // Clear share URL when modal closes
    if (!isOpen) {
      setShareUrl('');
      setCopySuccess(false);
    }
  }, [isOpen]);

  useEffect(() => {
    // Auto-create share when modal opens
    if (isOpen && folder && !shareUrl && !isGenerating) {
      generateShareUrl();
    }
  }, [isOpen, folder, shareUrl, generateShareUrl, isGenerating]);

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

  const handleClose = () => {
    onClose?.();
    setShareUrl('');
    setCopySuccess(false);
  };

  return (
    <Dialog open={isOpen || false} onOpenChange={(open) => {
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
            Share &ldquo;{folder?.name}&rdquo; ({folder?.linkCount} links)
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