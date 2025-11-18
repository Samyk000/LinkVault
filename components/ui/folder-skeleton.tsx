"use client";

/**
 * @file components/ui/folder-skeleton.tsx
 * @description Skeleton loading component for folder items
 * @created 2025-01-01
 */

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface FolderSkeletonProps {
  /**
   * Number of skeleton items to display
   */
  count?: number;
  /**
   * Whether to show nested folder structure
   */
  showNested?: boolean;
  /**
   * Size variant for different contexts
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Whether to animate the skeleton
   */
  animate?: boolean;
}

/**
 * Individual folder skeleton item component
 * @param {object} props - Component props
 * @returns {JSX.Element} Folder skeleton item
 */
function FolderSkeletonItem({ 
  size = 'md', 
  animate = true,
  isNested = false 
}: { 
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
  isNested?: boolean;
}) {
  const sizeClasses = {
    sm: {
      container: 'h-7 px-2 py-1',
      icon: 'size-3',
      text: 'h-3 w-16',
      chevron: 'size-3'
    },
    md: {
      container: 'h-8 px-3 py-1.5',
      icon: 'size-4',
      text: 'h-3 w-20',
      chevron: 'size-3'
    },
    lg: {
      container: 'h-10 px-4 py-2',
      icon: 'size-5',
      text: 'h-4 w-24',
      chevron: 'size-4'
    }
  };

  const classes = sizeClasses[size];

  return (
    <div 
      className={`
        flex items-center gap-2 rounded-md
        ${classes.container}
        ${isNested ? 'ml-4' : ''}
        ${animate ? 'animate-pulse' : ''}
      `}
      role="presentation"
      aria-hidden="true"
    >
      {/* Chevron/Expand Icon */}
      <Skeleton className={`${classes.chevron} rounded-sm`} />
      
      {/* Folder Icon */}
      <Skeleton className={`${classes.icon} rounded-sm`} />
      
      {/* Folder Name */}
      <Skeleton className={`${classes.text} rounded-sm flex-1`} />
      
      {/* Optional Action Button */}
      <Skeleton className="size-4 rounded-sm opacity-50" />
    </div>
  );
}

/**
 * Folder skeleton loading component with multiple items and nesting support
 * @param {FolderSkeletonProps} props - Component props
 * @returns {JSX.Element} Folder skeleton component
 */
export function FolderSkeleton({ 
  count = 3, 
  showNested = false, 
  size = 'md',
  animate = true 
}: FolderSkeletonProps) {
  const skeletonItems = Array.from({ length: count }, (_, index) => (
    <div key={`folder-skeleton-${index}`} className="space-y-1">
      <FolderSkeletonItem 
        size={size} 
        animate={animate}
        isNested={false}
      />
      {/* Show nested items for some folders */}
      {showNested && index < 2 && (
        <div className="space-y-1">
          <FolderSkeletonItem 
            size={size} 
            animate={animate}
            isNested={true}
          />
          {index === 0 && (
            <FolderSkeletonItem 
              size={size} 
              animate={animate}
              isNested={true}
            />
          )}
        </div>
      )}
    </div>
  ));

  return (
    <div 
      className="space-y-1"
      role="status" 
      aria-label="Loading folders"
    >
      {skeletonItems}
    </div>
  );
}

/**
 * Compact folder skeleton for smaller spaces
 * @param {object} props - Component props
 * @returns {JSX.Element} Compact folder skeleton
 */
export function FolderSkeletonCompact({ 
  count = 2,
  animate = true 
}: { 
  count?: number;
  animate?: boolean;
}) {
  return (
    <FolderSkeleton 
      count={count}
      size="sm"
      showNested={false}
      animate={animate}
    />
  );
}

/**
 * Detailed folder skeleton with nested structure
 * @param {object} props - Component props
 * @returns {JSX.Element} Detailed folder skeleton
 */
export function FolderSkeletonDetailed({ 
  count = 4,
  animate = true 
}: { 
  count?: number;
  animate?: boolean;
}) {
  return (
    <FolderSkeleton 
      count={count}
      size="md"
      showNested={true}
      animate={animate}
    />
  );
}

/**
 * Folder section skeleton with header
 * @param {object} props - Component props
 * @returns {JSX.Element} Folder section skeleton
 */
export function FolderSectionSkeleton({ 
  showHeader = true,
  folderCount = 3,
  animate = true 
}: { 
  showHeader?: boolean;
  folderCount?: number;
  animate?: boolean;
}) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading folders section">
      {showHeader && (
        <div className="flex items-center justify-between">
          <Skeleton 
            className={`h-4 w-16 ${animate ? 'animate-pulse' : ''}`} 
          />
          <Skeleton 
            className={`size-7 rounded-md ${animate ? 'animate-pulse' : ''}`} 
          />
        </div>
      )}
      <FolderSkeleton 
        count={folderCount}
        size="md"
        showNested={false}
        animate={animate}
      />
    </div>
  );
}