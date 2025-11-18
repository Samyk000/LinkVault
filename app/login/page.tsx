/**
 * @file app/login/page.tsx
 * @description Main login page with sophisticated yet minimalist design
 * @created 2025-01-01
 */

import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { LoginForm } from '@/components/auth/login-form';
import { Link, Shield, Zap, Globe } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Login | LinkVault',
  description: 'Sign in to your LinkVault account to organize and manage your links.',
  keywords: ['login', 'sign in', 'authentication', 'link management', 'bookmark organizer'],
};

/**
 * Main login page component with hero section and authentication form
 * @returns {JSX.Element} Login page component
 */
export default function LoginPage(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-black">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10" />
      
      <div className="relative flex min-h-screen">
        {/* Left Side - Hero Section */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 flex-col justify-center px-12 xl:px-16 2xl:px-20">
          <div className="max-w-lg xl:max-w-xl">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3.5 mb-10">
              <div className="p-3.5 bg-orange-500 rounded-xl shadow-lg">
                <Link className="size-8 text-black" />
              </div>
              <div>
                <h1 className="text-3xl xl:text-4xl font-bold text-white tracking-tight">
                  LinkVault
                </h1>
                <p className="text-gray-400 text-sm sm:text-base mt-0.5">
                  Your personal link organizer
                </p>
              </div>
            </div>

            {/* Hero Content */}
            <div className="space-y-7">
              <h2 className="text-4xl xl:text-5xl 2xl:text-6xl font-bold text-white leading-[1.1] tracking-tight">
                Organize your digital world with{' '}
                <span className="text-orange-400">elegance</span>
              </h2>
              
              <p className="text-lg xl:text-xl text-gray-300 leading-relaxed max-w-xl">
                Transform the chaos of scattered bookmarks into a beautifully organized, 
                searchable collection that works across all your devices.
              </p>

              {/* Features */}
              <div className="space-y-5 pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-orange-500/20 rounded-lg backdrop-blur-sm flex-shrink-0">
                    <Shield className="size-5 xl:size-6 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-base xl:text-lg mb-1">
                      Secure & Private
                    </h3>
                    <p className="text-sm xl:text-base text-gray-400 leading-relaxed">
                      Your links are protected with enterprise-grade security
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-orange-500/20 rounded-lg backdrop-blur-sm flex-shrink-0">
                    <Zap className="size-5 xl:size-6 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-base xl:text-lg mb-1">
                      Lightning Fast
                    </h3>
                    <p className="text-sm xl:text-base text-gray-400 leading-relaxed">
                      Find any link instantly with powerful search and filters
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-orange-500/20 rounded-lg backdrop-blur-sm flex-shrink-0">
                    <Globe className="size-5 xl:size-6 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-base xl:text-lg mb-1">
                      Access Anywhere
                    </h3>
                    <p className="text-sm xl:text-base text-gray-400 leading-relaxed">
                      Sync seamlessly across all your devices and browsers
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex-1 lg:w-1/2 xl:w-2/5 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
              <div className="p-3 bg-orange-500 rounded-xl shadow-lg">
                <Link className="size-6 text-black" />
              </div>
              <div className="text-center">
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  LinkVault
                </h1>
                <p className="text-gray-400 text-sm sm:text-base mt-0.5">
                  Your personal link organizer
                </p>
              </div>
            </div>

            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              </div>
            }>
              <LoginForm />
            </Suspense>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-xs text-gray-400">
                By continuing, you agree to our{' '}
                <a 
                  href="/terms" 
                  className="text-orange-400 hover:text-orange-300 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Terms of Service
                </a>{' '}
                and{' '}
                <a 
                  href="/privacy" 
                  className="text-orange-400 hover:text-orange-300 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Privacy Policy
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}