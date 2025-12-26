"use client";

/**
 * @file app/page.tsx
 * @description Root page - Landing page for all visitors, auth redirect handled by middleware
 * @created 2025-01-01
 * @updated 2025-12-26 - Performance optimization: removed auth blocking
 */

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/contexts/auth-context";

// PERFORMANCE: Dynamic import landing page to reduce initial bundle
const LandingPage = dynamic(
  () => import("@/components/landing/landing-page").then(mod => ({ default: mod.LandingPage })),
  {
    loading: () => <LandingPageSkeleton />,
    ssr: true,
  }
);

/**
 * Lightweight skeleton for landing page loading state
 * PERFORMANCE: Minimal DOM, no animations, instant render
 */
function LandingPageSkeleton() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#050505]">
      {/* Nav skeleton */}
      <div className="h-16 border-b border-gray-100 dark:border-white/10" />
      {/* Hero section skeleton */}
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-48 h-8 bg-gray-100 dark:bg-gray-800 rounded mb-4" />
        <div className="w-96 h-12 bg-gray-100 dark:bg-gray-800 rounded mb-2" />
        <div className="w-72 h-6 bg-gray-100 dark:bg-gray-800 rounded" />
      </div>
    </div>
  );
}

/**
 * Root page component - Shows landing page immediately
 * Auth redirect is handled in the background without blocking render
 * @returns {JSX.Element} Root page component
 */
export default function Home() {
  const router = useRouter();
  const { user, loading, isSessionReady } = useAuth();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  // PERFORMANCE: Non-blocking auth check
  // Show landing page immediately, redirect in background if authenticated
  useEffect(() => {
    // Only redirect when we're certain user is authenticated
    // Don't block render while checking
    if (!loading && isSessionReady && user) {
      setShouldRedirect(true);
      // Use replace to avoid back button issues
      router.replace('/app');
    }
  }, [user, loading, isSessionReady, router]);

  // PERFORMANCE: Always render landing page immediately
  // Don't show loading spinner - let landing page render while auth checks in background
  // If user is authenticated, they'll be redirected seamlessly
  if (shouldRedirect) {
    // Show minimal loading only when actively redirecting
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#050505]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  // Show landing page immediately - no auth blocking
  return <LandingPage />;
}
