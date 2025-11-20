/**
 * @file components/landing/landing-page.tsx
 * @description System 2.0 landing page component with architectural/brutalist design
 * @created 2025-11-20
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, DownloadCloud, Search, FolderInput, Share2, Asterisk, Twitter, Github, Linkedin, Disc } from 'lucide-react';

/**
 * Landing page component for unauthenticated users
 * @returns {JSX.Element} Landing page component
 */
export function LandingPage(): React.JSX.Element {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-[#FF4D00] selection:text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed w-full z-50 border-b border-gray-200 bg-white/90 backdrop-blur-md">
        <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo Area */}
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 bg-[#FF4D00]"></div>
            <span className="font-display font-bold text-xl tracking-tight uppercase">LinkVault<span className="text-[#FF4D00]">.</span></span>

          </div>

          {/* Center Links (Hidden on Mobile) */}


          {/* Right Actions */}
          <div className="flex items-center gap-6">
            <Link href="/login" className="font-display font-medium hover:text-[#FF4D00] transition">Login</Link>
            <Link href="/login?tab=signup" className="bg-black text-white px-6 py-2.5 font-mono text-xs font-bold uppercase tracking-wider hover:bg-[#FF4D00] transition-colors duration-300">
              Start Archiving
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-20 relative min-h-screen flex flex-col">
        {/* Background Grid */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-50" style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}></div>

        <div className="flex-1 max-w-[1600px] mx-auto w-full px-6 grid grid-cols-1 lg:grid-cols-12 gap-0 h-full z-10 pt-12 lg:pt-20">

          {/* Left Column: Typography */}
          <div className="col-span-1 lg:col-span-7 flex flex-col justify-between pb-20">
            <div>
              <div className="inline-flex items-center gap-2 border border-black px-3 py-1 rounded-full mb-8 bg-white">
                <span className="w-2 h-2 rounded-full bg-[#FF4D00] animate-pulse"></span>
                <span className="font-mono text-xs uppercase font-bold">System Operational</span>
              </div>

              <h1 className="font-display text-6xl md:text-8xl lg:text-[6.5rem] font-bold leading-[0.9] tracking-tighter mb-8 uppercase">
                Archive <br />
                <span className="text-transparent" style={{ WebkitTextStroke: '2px black' }}>The Void</span> <br />
                Into Matter
              </h1>

              <p className="font-sans text-lg md:text-xl text-gray-600 max-w-lg leading-relaxed border-l-2 border-[#FF4D00] pl-6">
                Constructing your digital memory through parametric organization.
                LinkVault captures URLs, extracts metadata, and builds your personal knowledge graph.
              </p>
            </div>

            <div className="mt-12 flex items-center gap-8">
              <button
                onClick={() => router.push('/login')}
                className="group relative px-8 py-4 bg-[#FF4D00] text-white overflow-hidden"
              >
                <div className="absolute inset-0 w-full h-full bg-black transform translate-y-full transition-transform duration-300 group-hover:translate-y-0"></div>
                <span className="relative font-mono font-bold uppercase text-sm tracking-widest flex items-center gap-2">
                  Initialize Vault <ArrowRight className="w-4 h-4" />
                </span>
              </button>
              <div className="hidden md:block">
                <span className="font-mono text-xs text-gray-400 block mb-1">// AUTO-FETCH ENABLED</span>
                <span className="font-mono text-xs text-gray-400 block">// SECURE ENCRYPTION</span>
              </div>
            </div>
          </div>

          {/* Right Column: Illustration */}
          <div className="col-span-1 lg:col-span-5 relative mt-12 lg:mt-0 flex flex-col justify-end lg:justify-center">
            {/* Decorative Circle */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gray-100 rounded-full -z-10 mix-blend-multiply"></div>

            {/* The Card Container */}
            <div className="relative border border-black bg-white p-2 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:shadow-[15px_15px_0px_0px_#FF4D00] transition-shadow duration-500">
              <div className="border border-gray-100 bg-gray-50 aspect-square relative overflow-hidden flex items-center justify-center group">

                {/* Technical Overlay UI */}
                <div className="absolute top-4 left-4 z-20 font-mono text-[10px] flex flex-col gap-1">
                  <span className="bg-black text-white px-1">FIG 01. INTERFACE</span>
                  <span className="bg-[#FF4D00] text-white px-1 opacity-0 group-hover:opacity-100 transition-opacity">SCANNING...</span>
                </div>

                {/* User Illustration Image */}
                <div className="relative w-4/5 h-4/5 transition-transform duration-700 group-hover:scale-105">
                  <Image
                    src="/hero-illustration.png"
                    alt="Digital Archive Illustration"
                    fill
                    className="object-contain mix-blend-multiply grayscale contrast-125"
                    priority
                  />
                </div>
              </div>

              {/* Bottom Label */}
              <div className="mt-2 pt-2 border-t border-black flex justify-between items-center font-mono text-xs">
                <span>INPUT_SOURCE: URL</span>
                <span>STATUS: ACTIVE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scrolling Marquee Border */}
        <div className="border-y border-black bg-black text-white py-3 mt-12 lg:mt-0 overflow-hidden">
          <div className="whitespace-nowrap animate-marquee">
            <div className="inline-block font-mono text-sm uppercase tracking-[0.2em] font-bold">
              &nbsp; /// Capture Everything /// Organize The Web /// Knowledge Is Power /// Search Logic /// Social Sharing /// Secure Vault /// &nbsp;
              &nbsp; /// Capture Everything /// Organize The Web /// Knowledge Is Power /// Search Logic /// Social Sharing /// Secure Vault /// &nbsp;
            </div>
          </div>
        </div>
      </header>

      {/* Bento Grid Features Section */}
      <section id="functionality" className="py-24 lg:py-32 px-6 max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-20 border-b border-black pb-6">
          <h2 className="font-display text-5xl md:text-7xl font-bold uppercase tracking-tighter">
            System<br />Architecture
          </h2>
          <p className="font-mono text-sm text-right max-w-xs mt-6 md:mt-0 text-gray-500">
            // MODULES LOADED<br />
            Optimized structures at every node.
          </p>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 grid-rows-2 gap-6 h-auto md:h-[800px]">

          {/* Feature 1: Auto Fetch */}
          <div className="col-span-1 md:col-span-2 row-span-2 border border-black p-8 lg:p-12 bg-gray-50 hover:bg-white transition-colors duration-300 flex flex-col justify-between relative group overflow-hidden">
            <div className="absolute top-0 right-0 p-6">
              <DownloadCloud className="w-10 h-10 opacity-20 group-hover:opacity-100 group-hover:text-[#FF4D00] transition-all" />
            </div>
            <div className="relative z-10 mt-auto flex flex-col h-full">
              {/* Metadata Image */}
              <div className="relative w-full aspect-video mb-6 rounded-lg overflow-hidden border border-gray-200 shadow-sm group-hover:shadow-md transition-all transform md:translate-x-4 md:translate-y-12 translate-y-0 translate-x-0 mt-6 md:mt-0">
                <Image
                  src="/metadata.jpg"
                  alt="Auto-Fetch Metadata Preview"
                  fill
                  className="object-contain bg-white"
                />
              </div>

              <div className="mt-auto">
                <h3 className="font-display text-4xl font-bold mb-4 uppercase">Auto-Fetch <br />Metadata</h3>
                <p className="font-sans text-gray-600 leading-relaxed max-w-md">
                  Stop manually typing. Paste a URL and the system automatically extracts the title, description, and cover image.
                </p>
              </div>
            </div>
            {/* Decorative Graphic */}
            <div className="absolute top-[10%] left-[10%] w-full h-full border-l border-t border-gray-200 opacity-50 pointer-events-none"></div>
          </div>

          {/* Feature 2: Search */}
          <div className="col-span-1 bg-black text-white p-8 flex flex-col relative group overflow-hidden">
            <div className="font-mono text-xs text-gray-500 mb-4">02 // RETRIEVAL</div>
            <h3 className="font-display text-2xl font-bold mb-4">Semantic Search</h3>
            <p className="font-sans text-gray-400 text-sm mb-8">Find content by title, tag, or description context.</p>

            {/* Search UI Graphic */}
            <div className="mt-auto border border-gray-800 rounded bg-gray-900 p-3">
              <div className="flex items-center gap-2 border-b border-gray-700 pb-2 mb-2">
                <Search className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-500 animate-pulse">query: "design resources"</span>
              </div>
              <div className="space-y-2">
                <div className="h-2 w-3/4 bg-gray-800 rounded"></div>
                <div className="h-2 w-1/2 bg-gray-800 rounded"></div>
              </div>
            </div>
          </div>

          {/* Feature 3: Folders */}
          <div className="col-span-1 border border-gray-200 hover:border-black transition-colors p-8 flex flex-col group">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h3 className="font-display text-2xl font-bold">Private Vault</h3>
                <Share2 className="w-6 h-6 text-[#FF4D00]" />
              </div>

              {/* Private Vault Image */}
              <div className="relative w-full aspect-[4/3] mb-2 rounded overflow-hidden border border-gray-100">
                <Image
                  src="/Private.jpg"
                  alt="Private Vault Illustration"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            <p className="text-sm text-gray-600 -mt-1">
              Your personal corner of the internet. Encrypted, secure, and yours alone.
            </p>
          </div>

          {/* Feature 4: Sharing */}
          <div className="col-span-1 md:col-span-2 border border-black p-8 bg-[#FF4D00] text-white flex flex-col md:flex-row items-center justify-between relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="font-display text-3xl font-bold mb-2 uppercase">Nested Folders</h3>
              <p className="font-sans text-white/90 max-w-sm">Organize your links in a hierarchical tree structure. Create a taxonomy that fits your mental model.</p>

              {/* Tree Visualization */}
              <div className="mt-6 font-mono text-xs text-white/80 space-y-1">
                <div className="flex items-center gap-2"><FolderInput className="w-3 h-3" /> /design-resources</div>
                <div className="flex items-center gap-2 pl-4">├─ /typography</div>
                <div className="flex items-center gap-2 pl-4">└─ /inspiration</div>
              </div>
            </div>
            <div className="relative z-10 mt-6 md:mt-0">
              <button className="bg-white text-[#FF4D00] px-6 py-3 font-mono text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors">
                Start Organizing
              </button>
            </div>
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 2px, transparent 2px)', backgroundSize: '20px 20px' }}></div>
          </div>

        </div>
      </section>

      {/* Minimal Statistic/Divider */}
      <section className="border-y border-gray-200">
        <div className="max-w-[1600px] mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-200">
          <div className="p-8 text-center hover:bg-gray-50 transition">
            <div className="font-display text-4xl font-bold">0.0s</div>
            <div className="font-mono text-xs text-gray-500 uppercase mt-2">Sync Latency</div>
          </div>
          <div className="p-8 text-center hover:bg-gray-50 transition">
            <div className="font-display text-4xl font-bold">Folder Sharing</div>
            <div className="font-mono text-xs text-gray-500 uppercase mt-2">256-bit Encryption</div>
          </div>
          <div className="p-8 text-center hover:bg-gray-50 transition">
            <div className="font-display text-4xl font-bold">∞</div>
            <div className="font-mono text-xs text-gray-500 uppercase mt-2">Login and access links anywhere</div>
          </div>
          <div className="p-8 text-center hover:bg-gray-50 transition">
            <div className="font-display text-4xl font-bold">Cloud</div>
            <div className="font-mono text-xs text-gray-500 uppercase mt-2">Sync</div>
          </div>
        </div>
      </section>

      {/* Big CTA Block (Orange) */}
      <section id="cta" className="py-32 px-6">
        <div className="max-w-5xl mx-auto bg-black text-white relative overflow-hidden">
          {/* Orange Accent Block */}
          <div className="absolute top-0 right-0 w-full md:w-1/3 h-full bg-[#FF4D00] z-0 block md:hidden lg:block"></div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 min-h-[400px]">

            {/* Text Side */}
            <div className="col-span-2 p-12 md:p-20 flex flex-col justify-center bg-black">
              <h2 className="font-display text-5xl md:text-6xl font-bold uppercase leading-tight mb-6">
                Systematic.<br />
                Parametric.<br />
                <span className="text-gray-500">Adaptive.</span>
              </h2>
              <div className="flex flex-col md:flex-row gap-4 mt-8">
                <Link href="/login?tab=signup" className="bg-white text-black px-8 py-4 font-mono text-sm font-bold uppercase tracking-widest hover:bg-[#FF4D00] hover:text-white transition-colors text-center">
                  Sign Up / Access
                </Link>
              </div>
            </div>

            {/* Graphic Side (The Orange Box) */}
            <div className="col-span-1 bg-[#FF4D00] p-12 flex flex-col justify-between text-black">
              <div className="w-12 h-12 border-2 border-black rounded-full flex items-center justify-center animate-spin-slow">
                <Asterisk className="w-6 h-6" />
              </div>

              <div>
                <h4 className="font-bold text-xl mb-2">Optimized structures, at every node.</h4>
                <p className="font-mono text-xs leading-relaxed opacity-80">
                  // Where every constraint is met with calculation and every blueprint is a revolution.
                </p>

                <div className="mt-8 flex items-center gap-2">
                  <span className="w-2 h-2 bg-black rounded-full"></span>
                  <span className="font-mono text-[10px] uppercase font-bold">Status: Operational</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white pt-20 pb-10 px-6 border-t border-black">
        <div className="max-w-[1600px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-20">
            <div className="md:col-span-5">
              <div className="font-display text-3xl font-bold uppercase mb-6">LinkVault.</div>
              <p className="font-sans text-gray-500 max-w-xs">
                Designed for the architects of the internet. Organizing the digital void into usable matter.
              </p>
            </div>

            <div className="md:col-span-3">
              <h4 className="font-mono text-xs font-bold uppercase mb-6 text-gray-400">Connect</h4>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 border border-gray-200 flex items-center justify-center hover:bg-black hover:text-white transition-colors rounded-full">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 border border-gray-200 flex items-center justify-center hover:bg-black hover:text-white transition-colors rounded-full">
                  <Github className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 border border-gray-200 flex items-center justify-center hover:bg-black hover:text-white transition-colors rounded-full">
                  <Disc className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center border-t border-gray-200 pt-8 font-mono text-[10px] uppercase text-gray-400">
            <span>© 2023 LinkVault Systems Inc.</span>
            <span className="mt-2 md:mt-0">Designed by Request</span>
          </div>
        </div>
      </footer>
    </div>
  );
}