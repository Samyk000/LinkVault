"use client";

/**
 * @file components/modals/settings-modal.tsx
 * @description Minimal settings modal with Theme, Font, and Security options
 * @created 2025-10-18
 * @updated 2025-12-06 - Simplified to Theme + Font + Security only
 */

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "next-themes";
import {
  Palette,
  Shield,
  Sun,
  Moon,
  Monitor,
  Key,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  Type
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FONT_OPTIONS = [
  { id: 'system', name: 'System', fontFamily: 'system-ui, -apple-system, sans-serif' },
  { id: 'inter', name: 'Inter', fontFamily: 'Inter, system-ui, sans-serif' },
  { id: 'roboto', name: 'Roboto', fontFamily: 'Roboto, system-ui, sans-serif' },
  { id: 'mono', name: 'Mono', fontFamily: 'ui-monospace, SFMono-Regular, monospace' },
  { id: 'serif', name: 'Serif', fontFamily: 'Georgia, Times New Roman, serif' },
];

/**
 * Minimal settings modal with Theme, Font, and Security
 */
export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("appearance");
  const [selectedFont, setSelectedFont] = useState('system');

  // Security tab state (UI only)
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load saved font on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedFont = localStorage.getItem('linkvault_font') || 'system';
      setSelectedFont(savedFont);
      const font = FONT_OPTIONS.find(f => f.id === savedFont);
      if (font) {
        document.body.style.fontFamily = font.fontFamily;
      }
    }
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChangingPassword(true);
    setTimeout(() => {
      setIsChangingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }, 1500);
  };

  const handleFontChange = (fontId: string) => {
    setSelectedFont(fontId);
    const font = FONT_OPTIONS.find(f => f.id === fontId);
    if (font && typeof document !== 'undefined') {
      document.body.style.fontFamily = font.fontFamily;
      localStorage.setItem('linkvault_font', fontId);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[380px] p-0 gap-0"
        aria-describedby={undefined}
      >
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-base font-semibold">Settings</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-4">
            <TabsList className="grid w-full grid-cols-2 mb-3">
              <TabsTrigger value="appearance" className="text-xs gap-1.5">
                <Palette className="h-3.5 w-3.5" />
                Appearance
              </TabsTrigger>
              <TabsTrigger value="security" className="text-xs gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                Security
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="px-4 pb-4 mt-0 space-y-4">
            {/* Theme */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Theme</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'light', icon: Sun, label: 'Light' },
                  { id: 'dark', icon: Moon, label: 'Dark' },
                  { id: 'system', icon: Monitor, label: 'System' },
                ].map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => setTheme(id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-md border text-xs transition-all ${theme === id
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Font */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Type className="h-3.5 w-3.5" />
                Font Style
              </Label>
              <div className="grid grid-cols-5 gap-1.5">
                {FONT_OPTIONS.map((font) => (
                  <button
                    key={font.id}
                    onClick={() => handleFontChange(font.id)}
                    className={`py-1.5 px-1 rounded text-[10px] border transition-all ${selectedFont === font.id
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-border hover:border-primary/50 text-muted-foreground'
                      }`}
                    style={{ fontFamily: font.fontFamily }}
                  >
                    {font.name}
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="px-4 pb-4 mt-0 space-y-3">
            {/* Change Password */}
            <form onSubmit={handlePasswordChange} className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5" />
                Change Password
              </Label>

              <div className="space-y-2">
                <div className="relative">
                  <Input
                    type={showPasswords ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Current password"
                    className="h-8 text-xs pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPasswords ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <Input
                  type={showPasswords ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className="h-8 text-xs"
                />
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="h-8 text-xs"
                />
              </div>

              <Button
                type="submit"
                size="sm"
                className="w-full h-8 text-xs"
                disabled={!currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword || isChangingPassword}
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>

            <div className="h-px bg-border" />

            {/* Delete Account */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-destructive flex items-center gap-1.5">
                <Trash2 className="h-3.5 w-3.5" />
                Delete Account
              </Label>

              <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-xs border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    Delete My Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-sm">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-destructive text-base">
                      <AlertTriangle className="h-4 w-4" />
                      Delete Account?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete your account and all data. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
