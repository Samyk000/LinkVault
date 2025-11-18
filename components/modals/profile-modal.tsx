/**
 * @file components/modals/profile-modal.tsx
 * @description Compact profile modal with user info and logout functionality
 * @created 2025-01-01
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Calendar, Link2, FolderOpen, HardDrive, Download, Upload, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/modals/confirm-modal';
import { useAuth } from '@/lib/contexts/auth-context';
import { useStore } from '@/store/useStore';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/utils/logger';
import { storage } from '@/services/storage';
import { supabaseDatabaseService } from '@/lib/services/supabase-database.service';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Compact profile modal component with user info and logout
 * @param {ProfileModalProps} props - Component props
 * @returns {JSX.Element} Profile modal component
 */
export function ProfileModal({ isOpen, onClose }: ProfileModalProps): React.JSX.Element {
  const { user } = useAuth();
  const router = useRouter();
  const links = useStore((state) => state.links);
  const folders = useStore((state) => state.folders);
  const importData = useStore((state) => state.importData);
  const exportData = useStore((state) => state.exportData);
  const { toast } = useToast();

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Calculate statistics
  const storageSize = storage.getStorageSize();
  const storageKB = storageSize / 1024;
  const storageMB = storageSize / (1024 * 1024);
  
  const formattedStorage = storageMB >= 1 
    ? `${storageMB.toFixed(2)} MB` 
    : `${storageKB.toFixed(2)} KB`;
  
  // Count only user-created folders (exclude platform folders)
  const userCreatedFolders = folders.filter(f => !f.isPlatformFolder).length;
  
  // Format join date
  const joinDate = user?.created_at 
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Unknown';

  // Get display name or fallback
  const displayName = user?.profile?.display_name || user?.email?.split('@')[0] || 'User';
  const email = user?.email || 'No email';

  /**
   * Handle data export
   */
  const handleExport = () => {
    try {
      const data = exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `linkvault-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Exported",
        variant: "success",
      });
    } catch (error) {
      logger.error('Export failed:', error);
        toast({
          title: "Export failed",
          description: "Please try again",
          variant: "destructive",
        });
    }
  };

  /**
   * Handle data import
   */
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        importData(data);
        toast({
          title: "Imported",
          variant: "success",
        });
      } catch (error) {
        logger.error('Import failed:', error);
        toast({
          title: "Import failed",
          description: "Invalid file format",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Handle clear all data
   */
  const handleClearData = () => {
    setShowClearConfirm(true);
  };

  /**
   * Confirm clear all data - delete from Supabase database
   */
  const confirmClearData = async () => {
    setIsClearing(true);
    
    try {
      // Delete from Supabase database
      await Promise.all([
        supabaseDatabaseService.deleteAllLinks(),
        supabaseDatabaseService.deleteAllFolders(),
        supabaseDatabaseService.deleteUserSettings(),
      ]);
      
      storage.clear();
      
      toast({
        title: "Data deleted",
        variant: "info",
      });
      
      // Close modal and redirect to login
      setShowClearConfirm(false);
      onClose();
      
      // Redirect after a short delay to show toast
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
    } catch (error) {
      logger.error('Error clearing data:', error);
      toast({
        title: "Error",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };



  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] border border-gray-200 dark:border-gray-800" aria-describedby="profile-dialog-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="size-5" />
            Profile
          </DialogTitle>
          <DialogDescription id="profile-dialog-description" className="sr-only">
            Manage your profile and data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Info */}
          <div className="space-y-3 p-4 rounded-lg bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 dark:text-white">{displayName}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Mail className="size-3 text-gray-600 dark:text-gray-300" />
              <span>{email}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Calendar className="size-3 text-gray-600 dark:text-gray-300" />
              <span>Joined {joinDate}</span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-lg bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800">
            <div className="text-center">
              <Link2 className="size-4 text-blue-500 dark:text-blue-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-900 dark:text-white">{links.length}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Links</p>
            </div>
            
            <div className="text-center">
              <FolderOpen className="size-4 text-green-500 dark:text-green-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-900 dark:text-white">{userCreatedFolders}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Folders</p>
            </div>
            
            <div className="text-center">
              <HardDrive className="size-4 text-purple-500 dark:text-purple-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-900 dark:text-white">{formattedStorage}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Storage</p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleExport} variant="outline" size="sm" className="gap-2">
                <Download className="size-3" />
                Export
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Upload className="size-3" />
                Import
              </Button>
            </div>
            
            <Button
              onClick={handleClearData}
              variant="destructive"
              size="sm"
              className="w-full gap-2 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 border-red-600 dark:border-red-700 text-white font-semibold"
            >
              <Trash2 className="size-3" />
              Clear All Data
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImport}
            className="hidden"
          />
        </div>
      </DialogContent>

      {/* Clear All Data Confirmation Modal */}
      <ConfirmModal
        isOpen={showClearConfirm}
        onClose={() => !isClearing && setShowClearConfirm(false)}
        onConfirm={confirmClearData}
        title="Permanently delete all data?"
        description="⚠️ WARNING: All your links, folders, and settings will be PERMANENTLY DELETED from the database. This will affect all your devices and CANNOT be undone!"
        confirmText={isClearing ? "Clearing..." : "Delete Everything"}
        variant="destructive"
      />
    </Dialog>
  );
}