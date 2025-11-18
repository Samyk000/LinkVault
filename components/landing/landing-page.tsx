/**
 * @file components/landing/landing-page.tsx
 * @description Modern dark charcoal themed landing page component for unauthenticated users
 * @created 2025-01-01
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowRight,
  Bookmark,
  CheckCircle,
  FolderOpen,
  Globe,
  Link, 
  Search,
  Shield,
  Star, 
  Tag,
  Users,
  Zap
} from 'lucide-react';
import Image from 'next/image';

/**
 * Landing page component for unauthenticated users
 * @returns {JSX.Element} Landing page component
 */
export function LandingPage(): React.JSX.Element {
  const router = useRouter();

  const features = [
    {
      icon: FolderOpen,
      title: 'Smart Organization',
      description: 'Organize your links into folders with custom colors and icons for easy navigation.'
    },
    {
      icon: Search,
      title: 'Powerful Search',
      description: 'Find any link instantly with our advanced search that looks through titles, descriptions, and URLs.'
    },
    {
      icon: Star,
      title: 'Favorites & Tags',
      description: 'Mark important links as favorites and use tags for even better organization.'
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your data is encrypted and secure. Only you have access to your personal link vault.'
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Built for speed with modern technology. Access your links instantly, anywhere.'
    },
    {
      icon: Globe,
      title: 'Cross-Platform',
      description: 'Access your links from any device - desktop, tablet, or mobile. Always in sync.'
    }
  ];

  const benefits = [
    'Unlimited link storage',
    'Advanced folder organization',
    'Powerful search capabilities',
    'Favorites and tagging system',
    'Cross-device synchronization',
    'Secure data encryption',
    'Account-based security',
    'No ads or tracking'
  ];

  return (
    <div className="min-h-screen bg-black">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10" />
      
      <div className="relative">
        {/* Header */}
        <header className="bg-black sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500 rounded-lg">
                  <Link className="size-6 text-black" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">
                    LinkVault
                  </h1>
                  <p className="text-xs text-gray-400">
                    Your personal link organizer
                  </p>
                </div>
              </div>

              {/* Auth Buttons */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => router.push('/login')}
                  className="border-2 border-orange-500 text-orange-400 hover:text-white hover:bg-orange-500"
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => router.push('/login?tab=signup')}
                  className="bg-orange-500 hover:bg-orange-600 text-black font-semibold"
                >
                  Get Started
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-20 lg:py-32">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
              {/* Left Content */}
              <div className="text-center lg:text-left">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                  Organize your digital world
                  <span className="block text-orange-400">
                    with elegance
                  </span>
                </h1>
                
                <p className="text-lg md:text-xl text-gray-300 mb-8 leading-relaxed">
                  Transform the chaos of scattered bookmarks into a beautifully organized, 
                  searchable collection that works across all your devices.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center mb-12">
                  <Button
                    size="lg"
                    onClick={() => router.push('/login?tab=signup')}
                    className="bg-orange-500 hover:bg-orange-600 text-black font-semibold text-lg px-8 py-3"
                  >
                    Start Organizing
                    <ArrowRight className="ml-2 size-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => router.push('/login')}
                    className="border-2 border-orange-500 text-orange-400 hover:text-white hover:bg-orange-500 text-lg px-8 py-3"
                  >
                    Sign In
                  </Button>
                </div>

                {/* Feature Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
                  <div className="flex items-start gap-3">
                    <Shield className="size-6 text-orange-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-white mb-1">Secure & Private</h3>
                      <p className="text-sm text-gray-400">Your links are protected with enterprise-grade security</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Zap className="size-6 text-orange-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-white mb-1">Lightning Fast</h3>
                      <p className="text-sm text-gray-400">Find any link instantly with powerful search and filters</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Globe className="size-6 text-orange-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-white mb-1">Access Anywhere</h3>
                      <p className="text-sm text-gray-400">Sync seamlessly across all your devices and browsers</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Content - Illustration */}
              <div className="flex justify-center lg:justify-end">
                <div className="relative max-w-lg w-full">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500/30 to-orange-600/30 rounded-3xl blur-3xl"></div>
                  <div className="relative bg-zinc-900/80 backdrop-blur-sm rounded-3xl p-8">
                    <Image
                      src="/illustration.png"
                      alt="LinkVault Organization Illustration"
                      width={500}
                      height={400}
                      className="w-full h-auto rounded-2xl"
                      priority
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-black">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Everything you need to organize your links
              </h2>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                Powerful features designed to make link management effortless and enjoyable
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {features.map((feature, index) => (
                <div key={index} className="bg-zinc-900/60 backdrop-blur-sm rounded-2xl p-6 hover:bg-zinc-900/80 transition-all duration-300 group">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-orange-500/20 rounded-xl group-hover:bg-orange-500/30 transition-colors">
                      <feature.icon className="size-6 text-orange-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
                  </div>
                  <p className="text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-12">
                Why choose LinkVault?
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="size-4 text-green-400 flex-shrink-0" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-orange-500/10 to-orange-600/10">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-3xl mx-auto bg-zinc-900/40 backdrop-blur-sm rounded-3xl p-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Ready to transform your digital organization?
              </h2>
              <p className="text-xl text-gray-300 mb-8">
                Join thousands of users who have already streamlined their digital lives with LinkVault.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  onClick={() => router.push('/login?tab=signup')}
                  className="bg-orange-500 hover:bg-orange-600 text-black font-semibold text-lg px-8 py-4 rounded-xl"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 size-5" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => router.push('/login')}
                  className="border-2 border-orange-500 text-orange-400 hover:text-white hover:bg-orange-500 text-lg px-8 py-4 rounded-xl"
                >
                  Sign In
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 bg-black">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center gap-2 mb-4 md:mb-0">
                <div className="size-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Link className="size-5 text-black" />
                </div>
                <span className="text-xl font-bold text-white">LinkVault</span>
              </div>
              <p className="text-gray-400 text-sm">
                © 2024 LinkVault. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}