/**
 * @file components/landing/landing-page.tsx
 * @description System 2.0 landing page with dark/light theme support
 * @created 2025-11-20
 * @updated 2025-12-26 - Performance: extracted CSS, deferred animations
 */

'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import {
    ArrowRight,
    Search,
    Twitter,
    Globe,
    Check,
    X,
    Sun,
    Moon,
    Image as ImageIcon,
    HardDrive,
    Cloud,
    Github,
    File
} from 'lucide-react';

// PERFORMANCE: Import CSS file instead of inline styles
import './landing-page.css';

/**
 * Reveal animation component
 */
const Reveal = ({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsVisible(true);
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.1 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            className={`transition-all duration-800 ease-out-expo transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'} ${className}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
};


/**
 * Hero SVG - Chaos to Order Animation
 */
const HeroSVG = () => (
    <svg viewBox="0 0 500 400" className="w-full h-full max-w-[550px] drop-shadow-md">
        {/* Left: Chaos */}
        <g transform="translate(50, 200)">
            <g className="hero-chaos hero-chaos-1">
                <rect x="-15" y="-15" width="30" height="30" rx="4"
                    className="fill-white stroke-gray-400 dark:fill-[#050505] dark:stroke-gray-600"
                    strokeWidth="2" />
            </g>
            <g className="hero-chaos hero-chaos-2">
                <circle r="12" className="fill-white stroke-gray-400 dark:fill-[#050505] dark:stroke-gray-600"
                    strokeWidth="2" />
            </g>
            <g className="hero-chaos hero-chaos-3">
                <path d="M-10 10 L0 -10 L10 10 Z"
                    className="fill-white stroke-gray-400 dark:fill-[#050505] dark:stroke-gray-600"
                    strokeWidth="2" />
            </g>
        </g>

        {/* Center: The Data Stabilizer */}
        <g transform="translate(250, 200)">
            <circle r="70" fill="none" className="stroke-gray-200 dark:stroke-white/10 hero-core-ring"
                strokeWidth="1" strokeDasharray="20 10" />
            <circle r="55" fill="none" className="stroke-gray-200 dark:stroke-white/10 hero-core-ring-reverse"
                strokeWidth="1" strokeDasharray="5 5" />

            <defs>
                <clipPath id="core-clip">
                    <rect x="-30" y="-30" width="60" height="60" rx="8" />
                </clipPath>
            </defs>

            <g>
                <rect x="-30" y="-30" width="60" height="60" rx="8"
                    className="fill-white stroke-black dark:fill-[#0A0A0A] dark:stroke-white"
                    strokeWidth="3" />
                <g clipPath="url(#core-clip)">
                    <g transform="translate(-20, -20)">
                        {/* Blocks */}
                        <rect x="0" y="0" width="10" height="10" rx="2" className="hero-process-block" />
                        <rect x="15" y="0" width="10" height="10" rx="2" className="hero-process-block" />
                        <rect x="30" y="0" width="10" height="10" rx="2" className="hero-process-block" />
                        <rect x="0" y="15" width="10" height="10" rx="2" className="hero-process-block" />
                        <rect x="15" y="15" width="10" height="10" rx="2" className="hero-process-block" />
                        <rect x="30" y="15" width="10" height="10" rx="2" className="hero-process-block" />
                        <rect x="0" y="30" width="10" height="10" rx="2" className="hero-process-block" />
                        <rect x="15" y="30" width="10" height="10" rx="2" className="hero-process-block" />
                        <rect x="30" y="30" width="10" height="10" rx="2" className="hero-process-block" />
                    </g>
                    <rect x="-40" y="-2" width="80" height="4" fill="#FF3E00" className="hero-scanner-line"
                        style={{ opacity: 0.5 }} />
                </g>
            </g>
        </g>

        {/* Right: Order */}
        <g transform="translate(330, 180)">
            <path d="M0 0 L140 0" fill="none" stroke="#FF3E00" strokeWidth="2" className="hero-stream" />
            <rect x="130" y="-8" width="16" height="16" rx="2" fill="#FF3E00" />

            <path d="M0 20 L140 20" fill="none" className="stroke-black dark:stroke-white hero-stream hero-stream-delay-1"
                strokeWidth="2" />
            <rect x="130" y="12" width="16" height="16" rx="2" className="fill-black dark:fill-white" />

            <path d="M0 40 L140 40" fill="none" className="stroke-gray-400 dark:stroke-gray-600 hero-stream hero-stream-delay-2"
                strokeWidth="2" />
            <rect x="130" y="32" width="16" height="16" rx="2"
                className="fill-gray-400 dark:fill-gray-600" />
        </g>

        {/* Labels */}
        <text x="50" y="280" textAnchor="middle" fontFamily="monospace" fontSize="10"
            className="fill-gray-400 dark:fill-gray-600">CHAOS</text>
        <text x="250" y="290" textAnchor="middle" fontFamily="monospace" fontSize="10"
            className="fill-black dark:fill-white" fontWeight="bold">LINKSVAULT</text>
        <text x="450" y="280" textAnchor="middle" fontFamily="monospace" fontSize="10"
            fill="#FF3E00">ORDER</text>
    </svg>
);




/**
 * Paste Presto Feature Component
 */
const PastePrestoFeature = () => (
    <div className="h-64 bg-gray-50 dark:bg-[#0A0A0A] rounded-2xl mb-6 border border-gray-100 dark:border-white/10 relative overflow-hidden flex items-center justify-center transition-colors">
        <div className="w-64 bg-white dark:bg-[#111] rounded-lg shadow-lg border border-gray-100 dark:border-white/10 p-4 relative z-10 transition-colors">
            <div className="h-8 bg-gray-100 dark:bg-white/5 rounded mb-4 w-full flex items-center px-2">
                <span className="text-[8px] text-gray-400">https://ugly-url.com/a8s7d9</span>
            </div>
            <div className="flex gap-3">
                <div className="w-12 h-12 bg-gray-100 dark:bg-white/5 rounded anim-pop-1 flex items-center justify-center">
                    <ImageIcon className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3 bg-gray-800 dark:bg-gray-600 rounded w-3/4 anim-pop-2"></div>
                    <div className="h-2 bg-gray-200 dark:bg-white/10 rounded w-full anim-pop-3"></div>
                </div>
            </div>
            <div className="absolute -top-2 -right-2 bg-[#FF3E00] text-white text-[8px] font-bold px-2 py-1 rounded anim-pop-3">
                BEAUTIFIED
            </div>
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:16px_16px]"></div>
    </div>
);

/**
 * Global Search Feature Component
 */
const GlobalSearchFeature = () => (
    <div className="h-64 bg-gray-50 dark:bg-[#0A0A0A] rounded-2xl mb-6 border border-gray-100 dark:border-white/10 relative overflow-hidden flex flex-col items-center justify-center transition-colors">
        <div className="w-72 bg-white dark:bg-[#111] rounded-full border border-gray-200 dark:border-white/10 shadow-sm px-4 py-3 flex items-center gap-3 mb-4 z-10 transition-colors">
            <Search className="w-4 h-4 text-gray-400" />
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200 anim-typing-bar">that one thing</div>
        </div>
        <div className="w-72 bg-white dark:bg-[#111] rounded-lg border border-gray-100 dark:border-white/10 shadow-sm p-2 space-y-1 z-10 relative overflow-hidden transition-colors">
            <div className="flex items-center gap-2 p-2 rounded">
                <div className="w-4 h-4 bg-gray-100 dark:bg-white/5 rounded"></div>
                <div className="w-20 h-2 bg-gray-100 dark:bg-white/5 rounded"></div>
            </div>
            <div className="flex items-center justify-between p-2 rounded anim-highlight-row transition-all duration-300 relative overflow-hidden">
                <div className="flex items-center gap-2 relative z-10">
                    <div className="w-4 h-4 bg-orange-100 dark:bg-orange-900/30 rounded flex items-center justify-center">
                        <File className="w-2 h-2 text-[#FF3E00]" />
                    </div>
                    <div className="w-32 h-2 bg-gray-800 dark:bg-gray-400 rounded"></div>
                </div>
                <span className="text-[8px] font-bold text-[#FF3E00] uppercase relative z-10">Here it is</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 dark:via-white/10 to-transparent search-shimmer"></div>
            </div>
        </div>
    </div>
);

/**
 * Share Anything Feature Component - SVG Animation
 */
const ShareAnythingFeature = () => (
    <div className="h-64 bg-gray-50 dark:bg-[#0A0A0A] rounded-2xl mb-6 border border-gray-100 dark:border-white/10 relative overflow-hidden flex items-center justify-center transition-colors">
        <svg width="300" height="250" viewBox="0 0 300 250">
            <defs>
                <radialGradient id="hub-grad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                    <stop offset="0%" style={{ stopColor: '#FF3E00', stopOpacity: 0.2 }} />
                    <stop offset="100%" style={{ stopColor: 'white', stopOpacity: 0 }} />
                </radialGradient>
            </defs>
            <circle cx="150" cy="125" r="60" fill="url(#hub-grad)" />

            <line x1="150" y1="125" x2="150" y2="50" className="stroke-gray-200 dark:stroke-white/10 share-path" strokeWidth="1.5" />
            <line x1="150" y1="125" x2="85" y2="175" className="stroke-gray-200 dark:stroke-white/10 share-path" strokeWidth="1.5" />
            <line x1="150" y1="125" x2="215" y2="175" className="stroke-gray-200 dark:stroke-white/10 share-path" strokeWidth="1.5" />

            {/* Animated packets */}
            <circle r="3" fill="#FF3E00">
                <animate attributeName="cy" values="125; 50" dur="2s" repeatCount="indefinite" />
                <animate attributeName="cx" values="150; 150" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0;1;1;0" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle r="3" fill="#FF3E00">
                <animate attributeName="cy" values="125; 175" dur="2s" repeatCount="indefinite" begin="0.3s" />
                <animate attributeName="cx" values="150; 85" dur="2s" repeatCount="indefinite" begin="0.3s" />
                <animate attributeName="opacity" values="0;1;1;0" dur="2s" repeatCount="indefinite" begin="0.3s" />
            </circle>
            <circle r="3" fill="#FF3E00">
                <animate attributeName="cy" values="125; 175" dur="2s" repeatCount="indefinite" begin="0.6s" />
                <animate attributeName="cx" values="150; 215" dur="2s" repeatCount="indefinite" begin="0.6s" />
                <animate attributeName="opacity" values="0;1;1;0" dur="2s" repeatCount="indefinite" begin="0.6s" />
            </circle>

            {/* User nodes */}
            <g transform="translate(150, 50)">
                <circle r="25" fill="none" stroke="#FF3E00" strokeWidth="1" className="share-ripple" />
                <circle r="12" className="fill-white stroke-gray-200 dark:fill-[#0A0A0A] dark:stroke-white/20" strokeWidth="2" />
                <text x="0" y="4" textAnchor="middle" fontSize="8" fontFamily="monospace" className="fill-black dark:fill-white">USER</text>
            </g>
            <g transform="translate(85, 175)">
                <circle r="25" fill="none" stroke="#FF3E00" strokeWidth="1" className="share-ripple share-ripple-delay-1" />
                <circle r="12" className="fill-white stroke-gray-200 dark:fill-[#0A0A0A] dark:stroke-white/20" strokeWidth="2" />
                <text x="0" y="4" textAnchor="middle" fontSize="8" fontFamily="monospace" className="fill-black dark:fill-white">USER</text>
            </g>
            <g transform="translate(215, 175)">
                <circle r="25" fill="none" stroke="#FF3E00" strokeWidth="1" className="share-ripple share-ripple-delay-2" />
                <circle r="12" className="fill-white stroke-gray-200 dark:fill-[#0A0A0A] dark:stroke-white/20" strokeWidth="2" />
                <text x="0" y="4" textAnchor="middle" fontSize="8" fontFamily="monospace" className="fill-black dark:fill-white">USER</text>
            </g>

            {/* Center hub */}
            <g transform="translate(150, 125)">
                <circle r="20" className="fill-white stroke-black dark:fill-[#0A0A0A] dark:stroke-white" strokeWidth="2" />
                <path d="M-8 -5 L8 5 M-8 5 L8 -5" stroke="#FF3E00" strokeWidth="2" />
            </g>
        </svg>
    </div>
);

/**
 * Sort Limitless Feature Component - SVG Animation
 */
const SortLimitlessFeature = () => (
    <div className="h-64 bg-gray-50 dark:bg-[#0A0A0A] rounded-2xl mb-6 border border-gray-100 dark:border-white/10 relative overflow-hidden flex items-center justify-center transition-colors">
        <svg width="240" height="180" viewBox="0 0 240 180">
            {/* Root */}
            <circle cx="120" cy="20" r="4" className="fill-black dark:fill-white" />
            <text x="130" y="23" fontSize="10" fontFamily="monospace" className="fill-black dark:fill-white">ROOT</text>

            {/* Main Trunk */}
            <line x1="120" y1="20" x2="120" y2="60" className="stroke-black dark:stroke-white tree-path" strokeWidth="2" />

            {/* Branch L */}
            <path d="M120 60 L80 100" className="stroke-gray-400 dark:stroke-gray-500 tree-path tree-path-delay-1" strokeWidth="1.5" fill="none" />
            <circle cx="80" cy="100" r="3" className="fill-gray-400 dark:fill-gray-500" />
            <text x="50" y="103" fontSize="8" fontFamily="monospace" className="fill-gray-400 dark:fill-gray-500">WORK</text>

            {/* Branch R */}
            <path d="M120 60 L160 100" stroke="#FF3E00" strokeWidth="1.5" fill="none" className="tree-path tree-path-delay-1" />
            <circle cx="160" cy="100" r="3" fill="#FF3E00" />
            <text x="170" y="103" fontSize="8" fontFamily="monospace" fill="#FF3E00">MEMES</text>

            {/* Sub Branch R */}
            <path d="M160 100 L140 140" stroke="#FF3E00" strokeWidth="1" fill="none" className="tree-path tree-path-delay-2" />
            <rect x="135" y="140" width="10" height="12" fill="#eee" stroke="#FF3E00" className="file-icon file-icon-delay-1" />

            <path d="M160 100 L180 140" stroke="#FF3E00" strokeWidth="1" fill="none" className="tree-path tree-path-delay-2" />
            <rect x="175" y="140" width="10" height="12" fill="#eee" stroke="#FF3E00" className="file-icon file-icon-delay-2" />
        </svg>
    </div>
);

/**
 * Main Landing Page Component
 */
const phrases = ["STORE.", "SHARE.", "SYNC."];

export function LandingPage(): React.JSX.Element {
    const router = useRouter();
    const { setTheme, resolvedTheme } = useTheme();

    // PERFORMANCE: Defer animations until after LCP
    const [animationsEnabled, setAnimationsEnabled] = useState(false);

    // Typewriter Loop - PERFORMANCE: Start with first phrase visible for LCP
    const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
    const [displayText, setDisplayText] = useState("STORE."); // Start with text visible for LCP
    const [isDeleting, setIsDeleting] = useState(false);
    const [typingSpeed, setTypingSpeed] = useState(150);

    // PERFORMANCE: Enable animations after initial paint
    useEffect(() => {
        // Use requestIdleCallback if available, otherwise setTimeout
        const enableAnimations = () => setAnimationsEnabled(true);
        
        if ('requestIdleCallback' in window) {
            (window as any).requestIdleCallback(enableAnimations, { timeout: 1000 });
        } else {
            setTimeout(enableAnimations, 100);
        }
    }, []);

    useEffect(() => {
        // Don't start typewriter until animations are enabled
        if (!animationsEnabled) return;
        
        const handleType = () => {
            const fullPhrase = phrases[currentPhraseIndex];
            if (isDeleting) {
                setDisplayText(fullPhrase.substring(0, displayText.length - 1));
                setTypingSpeed(80);
            } else {
                setDisplayText(fullPhrase.substring(0, displayText.length + 1));
                setTypingSpeed(150);
            }
            if (!isDeleting && displayText === fullPhrase) {
                setTimeout(() => setIsDeleting(true), 2000);
            } else if (isDeleting && displayText === "") {
                setIsDeleting(false);
                setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
                setTypingSpeed(500);
            }
        };
        const timer = setTimeout(handleType, typingSpeed);
        return () => clearTimeout(timer);
    }, [displayText, isDeleting, currentPhraseIndex, typingSpeed, animationsEnabled]);

    const toggleTheme = () => {
        setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    };

    return (
        <div className={`min-h-screen bg-white dark:bg-[#050505] text-black dark:text-white font-sans selection:bg-orange-100 selection:text-orange-900 dark:selection:bg-orange-900 dark:selection:text-white overflow-x-hidden transition-colors duration-300 ${animationsEnabled ? 'hero-animations-enabled' : ''}`}>
            {/* PERFORMANCE: CSS moved to landing-page.css */}

            {/* Grid Background */}
            <div className="fixed inset-0 bg-grid pointer-events-none z-0"></div>

            {/* Gradient Overlay */}
            <div className="fixed inset-0 bg-gradient-to-b from-white via-transparent to-white dark:from-[#050505] dark:via-transparent dark:to-[#050505] pointer-events-none z-0 transition-colors duration-300"></div>

            {/* Navigation */}
            <nav className="fixed w-full z-50 top-0 left-0 bg-white/80 dark:bg-[#050505]/80 backdrop-blur-md border-b border-gray-100 dark:border-white/10 transition-all duration-300">
                <div className="max-w-7xl mx-auto px-6 h-16 md:h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-[#FF3E00] rounded-sm rotate-45"></div>
                        <span className="font-bold text-xl tracking-tight">LINKSVAULT<span className="text-[#FF3E00]">.</span></span>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 text-gray-400 hover:text-black dark:text-gray-500 dark:hover:text-white transition-colors focus:outline-none"
                            aria-label="Toggle Theme"
                        >
                            <div className="theme-icon relative w-5 h-5">
                                <Sun className="w-5 h-5 absolute top-0 left-0 opacity-100 dark:opacity-0 transition-opacity duration-300" />
                                <Moon className="w-5 h-5 absolute top-0 left-0 opacity-0 dark:opacity-100 transition-opacity duration-300" />
                            </div>
                        </button>

                        <Link href="/login" className="hidden md:block text-xs font-medium hover:text-[#FF3E00] transition-colors uppercase tracking-wider">
                            Login
                        </Link>
                        <Link href="/login?tab=signup" className="btn-slide btn-black text-xs font-bold px-5 py-3 uppercase tracking-widest">
                            Get Access
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="relative pt-24 pb-8 lg:pt-32 lg:pb-8 overflow-hidden min-h-[75vh] flex items-center">
                <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
                    <div className="grid lg:grid-cols-2 gap-10 lg:gap-20 items-center">

                        {/* Content */}
                        <div className="flex flex-col items-start text-left">
                            <Reveal className="mb-6">
                                <div className="inline-flex items-center gap-2 px-3 py-1 border border-gray-200 dark:border-white/20 rounded-full bg-white dark:bg-white/5 shadow-sm">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                    <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 tracking-widest uppercase">System v2.0 // Active</span>
                                </div>
                            </Reveal>

                            {/* Typewriter */}
                            <Reveal delay={100} className="min-h-[70px] lg:min-h-[100px] flex items-center">
                                <h1 className="text-6xl lg:text-8xl font-bold tracking-tighter text-black dark:text-white leading-none">
                                    <span>{displayText}</span><span className="cursor-blink"></span>
                                </h1>
                            </Reveal>

                            {/* Copy */}
                            <Reveal delay={200}>
                                <p className="text-lg text-gray-500 dark:text-gray-400 leading-relaxed mt-4 mb-8 max-w-lg">
                                    Stop treating your browser tabs like a to-do list.
                                    <span className="text-black dark:text-white font-medium"> Capture securely, organize endlessly, and sync instantly</span>.
                                    Your digital hoard deserves better than &quot;Bookmark Bar &gt; Other &gt; Misc&quot;.
                                </p>
                            </Reveal>

                            {/* Buttons */}
                            <Reveal delay={300} className="flex flex-row gap-3 w-full sm:w-auto">
                                <button
                                    onClick={() => router.push('/login?tab=signup')}
                                    className="flex-1 sm:flex-none btn-slide btn-black px-4 sm:px-8 py-4 font-medium text-xs sm:text-sm flex items-center justify-center gap-2 group uppercase tracking-wide whitespace-nowrap"
                                >
                                    Start Archiving
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </button>
                                <button
                                    onClick={() => router.push('/login?guest=true')}
                                    className="flex-1 sm:flex-none btn-slide btn-outline px-4 sm:px-8 py-4 font-medium text-xs sm:text-sm flex items-center justify-center text-center uppercase tracking-wide whitespace-nowrap"
                                >
                                    Guest Mode
                                </button>
                            </Reveal>
                        </div>

                        {/* Hero SVG */}
                        <Reveal delay={500} className="flex justify-center lg:justify-end items-center relative h-[350px] lg:h-[450px]">
                            <div className="absolute top-1/2 right-1/2 lg:right-[150px] translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-orange-100/50 dark:bg-orange-900/20 rounded-full blur-3xl"></div>
                            <HeroSVG />
                        </Reveal>
                    </div>
                </div>
            </header>

            {/* Systems Output Section */}
            <section className="pt-0 pb-24 bg-white dark:bg-[#050505] relative transition-colors duration-300 z-10">
                <div className="max-w-7xl mx-auto px-6">
                    <Reveal className="mb-10">
                        <h2 className="text-4xl md:text-5xl font-bold mb-4 dark:text-white">SYSTEMS OUTPUT</h2>
                        <div className="w-24 h-1.5 bg-[#FF3E00]"></div>
                    </Reveal>

                    <div className="grid md:grid-cols-2 gap-x-12 gap-y-12">
                        {/* PASTE PRESTO */}
                        <Reveal className="group">
                            <PastePrestoFeature />
                            <h3 className="text-2xl font-bold mb-2 dark:text-white">PASTE. PRESTO.</h3>
                            <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm">
                                We do the boring meta-tag scraping so you look good. Paste a raw link, get a beautiful preview.
                                It&apos;s like magic, but just JSON-LD parsing.
                            </p>
                        </Reveal>

                        {/* GLOBAL SEARCH */}
                        <Reveal delay={100} className="group">
                            <GlobalSearchFeature />
                            <h3 className="text-2xl font-bold mb-2 dark:text-white">GLOBAL SEARCH.</h3>
                            <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm">
                                Because you definitely forgot where you saved that one article. Keyword-powered search that
                                finds things even when your brain can&apos;t.
                            </p>
                        </Reveal>

                        {/* SHARE ANYTHING */}
                        <Reveal className="group">
                            <ShareAnythingFeature />
                            <h3 className="text-2xl font-bold mb-2 dark:text-white">SHARE. ANYTHING.</h3>
                            <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm">
                                Share your chaos (organized) with the world. One link gives anyone read-only access. Perfect for
                                bragging about your reading list.
                            </p>
                        </Reveal>

                        {/* SORT LIMITLESS */}
                        <Reveal delay={100} className="group">
                            <SortLimitlessFeature />
                            <h3 className="text-2xl font-bold mb-2 dark:text-white">SORT. LIMITLESS.</h3>
                            <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm">
                                Folder inception. Go as deep as your procrastination allows. Create sub-folders inside
                                sub-folders until you lose track of reality.
                            </p>
                        </Reveal>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section className="py-24 bg-black dark:bg-[#030303] text-white relative overflow-hidden transition-colors duration-300 z-10">
                <div className="absolute inset-0 bg-grid opacity-10"></div>

                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <Reveal className="flex flex-col md:flex-row justify-between items-end mb-16">
                        <div>
                            <h2 className="text-5xl md:text-6xl font-bold mb-4">PAY TO <span className="text-[#FF3E00]">SYNC.</span></h2>
                            <p className="text-gray-400">Honest pricing for honest utility. No jargon.</p>
                        </div>
                        <div className="mt-6 md:mt-0 text-[10px] uppercase tracking-widest text-gray-600 border border-gray-800 px-3 py-1 rounded-full">
                            No Hidden Fees
                        </div>
                    </Reveal>

                    <div className="grid lg:grid-cols-2 gap-8">
                        {/* Guest Plan */}
                        <Reveal className="rounded-3xl border border-gray-800 bg-[#111] dark:bg-[#080808] p-10 flex flex-col justify-between hover:border-gray-600 transition-colors">
                            <div>
                                <div className="flex items-center gap-2 mb-6">
                                    <span className="p-2 bg-gray-800 rounded text-gray-300"><HardDrive className="w-4 h-4" /></span>
                                    <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">For Commitment Issues</span>
                                </div>
                                <h3 className="text-4xl font-bold mb-2">GUEST</h3>
                                <div className="text-[#FF3E00] font-mono text-xl mb-8">$0 <span className="text-gray-500 text-sm">/ forever</span></div>

                                <ul className="space-y-4 text-sm text-gray-400 mb-8">
                                    <li className="flex items-center gap-3 text-white">
                                        <Check className="w-4 h-4 text-[#FF3E00]" /> Open Source & Free Forever
                                    </li>
                                    <li className="flex items-center gap-3 text-white">
                                        <Check className="w-4 h-4 text-[#FF3E00]" /> Your data stays in your browser
                                    </li>
                                    <li className="flex items-center gap-3 text-white">
                                        <Check className="w-4 h-4 text-[#FF3E00]" /> No expensive subscriptions
                                    </li>
                                    <li className="flex items-center gap-3 text-gray-600">
                                        <X className="w-4 h-4" /> You can&apos;t access your links anywhere else
                                    </li>
                                    <li className="flex items-center gap-3 text-gray-600">
                                        <X className="w-4 h-4" /> You can&apos;t share folders (Sad.)
                                    </li>
                                </ul>
                            </div>
                            <button
                                onClick={() => router.push('/login?guest=true')}
                                className="btn-slide btn-guest-slide w-full py-4 flex items-center justify-center text-xs font-bold uppercase tracking-widest"
                            >
                                Start Local Session
                            </button>
                        </Reveal>

                        {/* Sync Plan */}
                        <Reveal delay={100} className="rounded-3xl bg-gradient-to-br from-[#FF3E00] to-orange-600 p-10 flex flex-col justify-between shadow-[0_20px_60px_-15px_rgba(255,62,0,0.4)] relative overflow-hidden">
                            <div className="absolute -right-12 -top-12 opacity-20"><Globe className="w-64 h-64 text-black" /></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-6">
                                    <span className="p-2 bg-black/20 rounded text-white backdrop-blur-sm"><Cloud className="w-4 h-4" /></span>
                                    <span className="text-xs font-mono text-orange-100 uppercase tracking-widest">For Power Users</span>
                                </div>
                                <h3 className="text-4xl font-bold mb-2 text-black">SYNC</h3>
                                <div className="text-black font-mono text-xl mb-8">Free <span className="text-orange-200 text-sm">/ until Beta ends</span></div>

                                <ul className="space-y-4 text-sm text-black font-medium mb-8">
                                    <li className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-full bg-black text-[#FF3E00] flex items-center justify-center">
                                            <Check className="w-3 h-3" />
                                        </div>
                                        Access your links anywhere anytime
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-full bg-black text-[#FF3E00] flex items-center justify-center">
                                            <Check className="w-3 h-3" />
                                        </div>
                                        Share collections with anyone
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-full bg-black text-[#FF3E00] flex items-center justify-center">
                                            <Check className="w-3 h-3" />
                                        </div>
                                        Unlimited sub-folders
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-full bg-black text-[#FF3E00] flex items-center justify-center">
                                            <Check className="w-3 h-3" />
                                        </div>
                                        Private Encrypted Vault
                                    </li>
                                </ul>
                            </div>
                            <button
                                onClick={() => router.push('/login?tab=signup')}
                                className="btn-slide btn-sync-slide w-full py-4 flex items-center justify-center text-xs font-bold uppercase tracking-widest relative z-10"
                            >
                                Create Account
                            </button>
                        </Reveal>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white dark:bg-[#050505] pt-20 pb-10 border-t border-gray-100 dark:border-white/10 transition-colors duration-300 relative z-10">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-gray-100 dark:border-white/10 pb-12 mb-12">
                        <div>
                            <span className="font-bold text-2xl tracking-tight block dark:text-white">LINKSVAULT<span className="text-[#FF3E00]">.</span></span>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Designed for the organized mind (and the chaotic ones).</p>
                        </div>
                        <div className="flex gap-6">
                            <a href="#" className="text-gray-400 hover:text-[#FF3E00] transition-colors">
                                <Twitter className="w-5 h-5" />
                            </a>
                            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#FF3E00] transition-colors">
                                <Github className="w-5 h-5" />
                            </a>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between text-[10px] font-mono text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                        <div>&copy; 2025 Linksvault Inc.</div>
                        <div className="flex gap-6 mt-4 md:mt-0">
                            <Link href="/privacy?source=landing" className="hover:text-black dark:hover:text-white">Privacy</Link>
                            <Link href="/terms?source=landing" className="hover:text-black dark:hover:text-white">Terms</Link>
                            <span className="text-green-600">● All Systems Normal</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}