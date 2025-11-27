"use client";

/**
 * @file app/page.tsx
 * @description Root page that shows landing page for unauthenticated users and redirects authenticated users to /app
 * @created 2025-01-01
 */

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/auth-context";
import { LandingPage } from "@/components/landing/landing-page";

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
          <div className="animate-spin-gpu rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
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
