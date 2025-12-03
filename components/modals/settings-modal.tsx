"use client";

/**
 * @file components/modals/settings-modal.tsx
 * @description Minimal settings modal with theme toggle and coming soon features
 * @created 2025-10-18
 */

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Button } from "@/components/ui/button";
import { Palette, Sparkles, Cloud, HardDrive, ArrowUpRight } from "lucide-react";
import { useFreeUser } from "@/hooks/use-free-user";

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
  const router = useRouter();
  const { isFreeUser } = useFreeUser();

  const handleUpgrade = () => {
    onClose();
    router.push('/signup');
  };

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
            {/* Upgrade option for free users */}
            {isFreeUser && (
              <div className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
                    <HardDrive className="size-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                      You&apos;re in Local Mode
                    </h4>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                      Your data is stored locally. Upgrade to sync across devices and enable sharing.
                    </p>
                    <Button
                      onClick={handleUpgrade}
                      size="sm"
                      className="mt-3 bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      <Cloud className="size-4 mr-2" />
                      Upgrade to Full Account
                      <ArrowUpRight className="size-3 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

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
