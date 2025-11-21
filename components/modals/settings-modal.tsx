"use client";

/**
 * @file components/modals/settings-modal.tsx
 * @description Minimal settings modal with theme toggle and coming soon features
 * @created 2025-10-18
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Palette, Sparkles } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
* Minimal settings modal with theme toggle and coming soon features.
* @param {SettingsModalProps} props - Props object containing modal visibility flag and close handler.
* @returns {JSX.Element} JSX element representing the rendered settings modal.
**/
export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px] border border-border/50 backdrop-blur-sm" aria-describedby="settings-dialog-description">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-semibold">Settings</DialogTitle>
          <DialogDescription id="settings-dialog-description" className="sr-only">
            Configure app settings and preferences
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="appearance" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="appearance" className="flex items-center gap-2 text-sm">
              <Palette className="h-4 w-4" />
              Theme
            </TabsTrigger>
            <TabsTrigger value="coming-soon" className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4" />
              More
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appearance" className="space-y-6 mt-0">
            <div className="flex items-center justify-between py-4 px-1">
              <div className="space-y-1">
                <p className="text-sm font-medium">Appearance</p>
                <p className="text-xs text-muted-foreground">
                  Switch between light and dark themes
                </p>
              </div>
              <div className="transform transition-transform duration-200 hover:scale-105">
                <ThemeToggle />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="coming-soon" className="space-y-6 mt-0">
            <div className="text-center py-8 px-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <h3 className="text-lg font-semibold mb-2">More Features Coming Soon</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We&apos;re working on exciting new features to enhance your LinksVault experience.
                Stay tuned for updates!
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
