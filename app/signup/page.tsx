/**
 * @file app/signup/page.tsx
 * @description Signup page that redirects to login page with signup tab active
 * @created 2025-01-01
 */

'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Signup page component that redirects to login with signup tab
 * @returns {JSX.Element} Signup page component
 */
export default function SignupPage(): React.JSX.Element {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login page with signup tab active
    router.replace('/login?tab=signup');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Redirecting to signup...</p>
      </div>
    </div>
  );
}