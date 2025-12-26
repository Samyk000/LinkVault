"use client";

/**
 * @file app/page.tsx
 * @description Root page that shows landing page for unauthenticated users and redirects authenticated users to /app
 * @created 2025-01-01
 * @updated 2025-12-26 - Performance optimization with dynamic imports
 */

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/contexts/auth-context";

// PERFORMANCE: Dynamic import landing page to reduce initial bundle
// Dashboard code is completely separate in /app route
const LandingPage = dynamic(
  () => import("@/components/landing/landing-page").then(mod => ({ default: mod.LandingPage })),
  {
    loading: () => <LandingPageSkeleton />,
    ssr: true,
  }
);

/**
 * Lightweight skeleton for landing page loading state
 */
function LandingPageSkeleton() {
  return (
    <div className="min-h-screen bg-black">
      {/* Hero section skeleton */}
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-48 h-8 bg-gray-800 rounded animate-pulse mb-4" />
        <div className="w-96 h-12 bg-gray-800 rounded animate-pulse mb-2" />
        <div className="w-72 h-6 bg-gray-800 rounded animate-pulse" />
      </div>
    </div>
  );
}

/**
 * Root page component that handles authentication-based routing.
 * Shows landing page for unauthenticated users and redirects authenticated users to /app.
 * @returns {JSX.Element} Root page component
 */
export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Redirect authenticated users to /app
  useEffect(() => {
    if (!loading && user) {
      router.push('/app');
    }
  }, [user, loading, router]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show landing page for unauthenticated users
  if (!user) {
    return <LandingPage />;
  }

  // This should not be reached due to the redirect above, but just in case
  return null;
}
