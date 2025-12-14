/**
 * @file app/login/page.tsx
 * @description Main login page with sophisticated yet minimalist design
 * @created 2025-01-01
 * @updated 2025-12-06
 */

import React, { Suspense } from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { Share2, FolderTree, Zap, Search, Globe, ChevronRight } from 'lucide-react';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = {
  title: 'Login | LinksVault',
  description: 'Sign in to your LinksVault account to organize and manage your links.',
  keywords: ['login', 'sign in', 'authentication', 'link management', 'bookmark organizer'],
};

/**
 * Mini Feature Card with Animated SVG
 */
/**
 * Mini Feature Card with Animated SVG
 */
const FeatureCard = ({ title, desc, icon: Icon, delay, type }: { title: string, desc: string, icon: any, delay: number, type: 'share' | 'nest' | 'fetch' | 'search' }) => (
  <div className="bg-white dark:bg-[#0A0A0A] p-4 rounded-xl border border-gray-100 dark:border-white/10 shadow-sm flex flex-col gap-3 group hover:border-[#FF4D00]/30 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards" style={{ animationDelay: `${delay}ms` }}>
    <div className="h-24 bg-gray-50 dark:bg-[#111] rounded-lg relative overflow-hidden flex items-center justify-center border border-gray-100 dark:border-white/5 group-hover:bg-white dark:group-hover:bg-[#0A0A0A] transition-colors">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#000000_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:8px_8px]"></div>

      {type === 'share' && (
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border border-[#FF4D00] flex items-center justify-center text-[#FF4D00] z-10 bg-white dark:bg-[#111] shadow-sm">
            <Globe className="w-4 h-4" />
          </div>
          <div className="absolute w-16 h-16 border border-dashed border-gray-300 dark:border-white/20 rounded-full animate-[spin_10s_linear_infinite]">
            <div className="absolute top-0 right-0 w-2 h-2 bg-[#FF4D00] rounded-full"></div>
          </div>
        </div>
      )}
      {type === 'nest' && (
        <div className="flex flex-col gap-2 scale-90">
          <div className="flex items-center gap-2 text-xs font-bold text-black dark:text-white"><FolderTree className="w-3 h-3 text-[#FF4D00]" /> Root</div>
          <div className="flex items-center gap-2 text-[10px] text-gray-500 ml-4"><div className="w-2 h-px bg-gray-300 dark:bg-gray-700"></div>Work</div>
          <div className="flex items-center gap-2 text-[10px] text-gray-500 ml-8 animate-pulse"><div className="w-2 h-px bg-gray-300 dark:bg-gray-700"></div>Archive</div>
        </div>
      )}
      {type === 'fetch' && (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-800 dark:bg-white rounded flex items-center justify-center text-white dark:text-black"><Zap className="w-4 h-4 text-[#FF4D00] fill-current animate-pulse" /></div>
          <div className="flex flex-col gap-1">
            <div className="w-12 h-1.5 bg-gray-200 dark:bg-white/20 rounded animate-[width_2s_ease-out_infinite]"></div>
            <div className="w-8 h-1.5 bg-gray-200 dark:bg-white/20 rounded"></div>
          </div>
        </div>
      )}
      {type === 'search' && (
        <div className="w-3/4 bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded px-2 py-1.5 flex items-center gap-2 shadow-sm group-hover:border-[#FF4D00] transition-colors">
          <Search className="w-3 h-3 text-gray-400" />
          <div className="w-1.5 h-3 bg-[#FF4D00] animate-pulse"></div>
        </div>
      )}
    </div>
    <div>
      <h3 className="font-bold text-sm uppercase tracking-wider mb-1 text-black dark:text-white group-hover:text-[#FF4D00] dark:group-hover:text-[#FF4D00] transition-colors">{title}</h3>
      <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed font-mono">{desc}</p>
    </div>
  </div>
);

/**
 * Main login page component
 */
export default function LoginPage(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] text-black dark:text-white font-sans selection:bg-[#FF4D00] selection:text-white flex flex-col relative overflow-x-hidden transition-colors duration-300">

      {/* Background Grid - Using global utility for implementation */}
      <div className="absolute inset-0 pointer-events-none z-0 bg-grid"></div>

      {/* Navigation - Unified Style */}
      <nav className="fixed w-full z-50 top-0 left-0 bg-white/80 dark:bg-[#050505]/80 backdrop-blur-md border-b border-gray-100 dark:border-white/10 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-16 md:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-4 h-4 bg-[#FF3E00] rounded-sm rotate-45"></div>
            <span className="font-bold text-xl tracking-tight text-black dark:text-white">LINKSVAULT<span className="text-[#FF3E00]">.</span></span>
          </Link>

          <Link href="/" className="flex items-center gap-2 group">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-black dark:text-white hover:text-[#FF3E00] dark:hover:text-[#FF3E00] transition-colors">
              Back to Home
            </span>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 relative z-10 px-6 sm:px-8 lg:px-12 items-center min-h-screen py-24 md:py-12 lg:py-0">

        {/* Left Column: Compact Hero Options - Visible on Tablet (md) */}
        <div className="hidden md:flex flex-col justify-center gap-8 order-2 md:order-1">
          <div>
            <div className="flex flex-col lg:flex-row lg:items-end gap-6 mb-6">
              <h1 className="font-display text-5xl xl:text-6xl font-bold leading-[0.9] tracking-tighter uppercase shrink-0 text-black dark:text-white">
                Enter <br />
                <span className="text-gray-900 dark:text-gray-400">The Vault.</span>
              </h1>

              <div className="lg:mb-2 lg:pb-1 max-w-xs">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D00] animate-pulse"></span>
                  <span className="font-mono text-[10px] uppercase font-bold text-[#FF4D00] tracking-widest">System Access</span>
                </div>
                <p className="font-sans text-sm text-gray-500 dark:text-gray-400 leading-relaxed border-l border-gray-200 dark:border-white/10 pl-3">
                  The operating system for your digital memory. Organize, share, and sync.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-lg">
            <FeatureCard
              type="share"
              title="Share"
              desc="Public collections."
              icon={Globe}
              delay={100}
            />
            <FeatureCard
              type="nest"
              title="Nest"
              desc="Infinite depth."
              icon={FolderTree}
              delay={200}
            />
            <FeatureCard
              type="fetch"
              title="Auto-Fetch"
              desc="Instant parsing."
              icon={Zap}
              delay={300}
            />
            <FeatureCard
              type="search"
              title="Search"
              desc="Global lookup."
              icon={Search}
              delay={400}
            />
          </div>
        </div>

        {/* Right Column: Login Form */}
        <div className="flex flex-col justify-center items-center w-full order-1 md:order-2">
          <div className="w-full max-w-md relative">
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF3E00]"></div>
              </div>
            }>
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}