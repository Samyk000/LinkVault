"use client";

/**
 * @file hooks/use-keyboard-shortcuts.ts
 * @description Custom hook for global keyboard shortcuts
 * @created 2025-10-18
 */

import React, { useEffect } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  callback: () => void;
}

/**
* React hook that binds multiple keyboard shortcuts to their respective callback functions.
* @example
* useKeyboardShortcuts([
*   { key: 's', ctrlKey: true, shiftKey: false, altKey: false, callback: () => console.log('Save') }
* ])
* // Pressing Ctrl+S will log 'Save' to the console
* @param {{KeyboardShortcut[]}} shortcuts - Array of shortcut objects describing key combinations and callbacks.
* @returns {{void}} Returns nothing.
**/
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    /**
    * Handles registered keyboard shortcuts and executes their callbacks.
    * @example
    * handleKeyboardShortcuts(event)
    * // Executes the callback bound to the matching shortcut and prevents default browser behavior
    * @param {KeyboardEvent} event - Keyboard event captured from a keydown listener.
    * @returns {void} Function does not return anything.
    **/
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if event.key is not available (e.g., during paste events)
      if (!event.key) return;
      
      shortcuts.forEach((shortcut) => {
        const matchesKey = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const matchesCtrl = shortcut.ctrlKey ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const matchesShift = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;
        const matchesAlt = shortcut.altKey ? event.altKey : !event.altKey;

        if (matchesKey && matchesCtrl && matchesShift && matchesAlt) {
          event.preventDefault();
          shortcut.callback();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
}
