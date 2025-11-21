/**
 * @file app/login/page.tsx
 * @description Main login page with sophisticated yet minimalist design
 * @created 2025-01-01
 */

import React, { Suspense } from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { Share2, FolderTree, DownloadCloud, Search } from 'lucide-react';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = {
  title: 'Login | LinksVault',
  description: 'Sign in to your LinksVault account to organize and manage your links.',
  keywords: ['login', 'sign in', 'authentication', 'link management', 'bookmark organizer'],
};

/**
 * Main login page component with hero section and authentication form
 * @returns {JSX.Element} Login page component
 */
export default function LoginPage(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-[#FF4D00] selection:text-white overflow-hidden relative flex flex-col">
      {/* Background Grid */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-50" style={{
        backgroundImage: `
            linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)
          `,
        backgroundSize: '40px 40px'
      }}></div>

      {/* Navigation / Logo */}
      <nav className="fixed top-0 left-0 w-full z-50 h-20 flex items-center justify-center pointer-events-none">
        <div className="w-full max-w-[1600px] px-6 flex items-center justify-between">
          <div className="flex items-center gap-4 pointer-events-auto">
            <div className="w-3 h-3 bg-[#FF4D00]"></div>
            <span className="font-display font-bold text-xl tracking-tight uppercase">LinksVault<span className="text-[#FF4D00]">.</span></span>
          </div>
          <Link href="/" className="pointer-events-auto font-mono text-xs font-bold uppercase tracking-wider hover:text-[#FF4D00] transition-colors">
            Back to Home
          </Link>
        </div>
      </nav>

      <div className="flex-1 w-full max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-0 relative z-10 px-6">
        {/* Left Column: Typography / Hero (Hidden on mobile/tablet to focus on login) */}
        <div className="hidden lg:flex flex-col justify-center p-12 xl:p-20 border-r border-gray-100 bg-white/50 backdrop-blur-sm">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 border border-black px-3 py-1 rounded-full mb-8 bg-white">
              <span className="w-2 h-2 rounded-full bg-[#FF4D00] animate-pulse"></span>
              <span className="font-mono text-xs uppercase font-bold">Secure Access</span>
            </div>

            <h1 className="font-display text-6xl xl:text-7xl font-bold leading-[0.9] tracking-tighter mb-8 uppercase">
              Enter <br />
              <span className="text-transparent" style={{ WebkitTextStroke: '2px black' }}>The Vault</span>
            </h1>

            <p className="font-sans text-lg text-gray-600 leading-relaxed border-l-2 border-[#FF4D00] pl-6 mb-12">
              Stop emailing yourself links. It's embarrassing.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-mono text-xs text-gray-500">
              <div className="flex gap-4 items-start group">
                <div className="p-2 border border-black bg-white group-hover:bg-[#FF4D00] group-hover:text-white transition-colors duration-300">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-black font-bold mb-1 uppercase tracking-wider">Shareable Collections</span>
                  <p className="leading-relaxed max-w-xs">
                    Turn any folder into a public link.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start group">
                <div className="p-2 border border-black bg-white group-hover:bg-[#FF4D00] group-hover:text-white transition-colors duration-300">
                  <FolderTree className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-black font-bold mb-1 uppercase tracking-wider">Infinite Nesting</span>
                  <p className="leading-relaxed max-w-xs">
                    Nest folders until you forget where you are.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start group">
                <div className="p-2 border border-black bg-white group-hover:bg-[#FF4D00] group-hover:text-white transition-colors duration-300">
                  <DownloadCloud className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-black font-bold mb-1 uppercase tracking-wider">Auto-Fetch</span>
                  <p className="leading-relaxed max-w-xs">
                    Paste a URL, we grab the rest.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start group">
                <div className="p-2 border border-black bg-white group-hover:bg-[#FF4D00] group-hover:text-white transition-colors duration-300">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-black font-bold mb-1 uppercase tracking-wider">Semantic Search</span>
                  <p className="leading-relaxed max-w-xs">
                    Find things by how you remember them.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Login Form */}
        <div className="flex flex-col justify-center items-center p-6 sm:p-12 lg:p-20">
          <div className="w-full max-w-md">
            {/* Mobile Logo removed to prevent overlap with fixed header */}
            <div className="lg:hidden mb-8"></div>

            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF4D00]"></div>
              </div>
            }>
              <LoginForm />
            </Suspense>

            <div className="mt-8 text-center font-mono text-[10px] text-gray-400 uppercase">
              <p>
                By accessing the system, you agree to our{' '}
                <a href="/terms" className="text-black hover:text-[#FF4D00] underline decoration-1 underline-offset-2">Terms</a>
                {' '}and{' '}
                <a href="/privacy" className="text-black hover:text-[#FF4D00] underline decoration-1 underline-offset-2">Privacy Policy</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}