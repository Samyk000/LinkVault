/**
 * @file components/landing/landing-page.tsx
 * @description System 2.0 landing page component - Universal Responsiveness & Sub-folder Tree
 * @created 2025-11-20
 * @updated 2025-12-06
 */

'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowRight,
    Search,
    Share2,
    Twitter,
    Linkedin,
    Instagram,
    Zap,
    Globe,
    Link as LinkIcon,
    Check,
    FileText,
    Folder,
    Image as ImageIcon,
    User,
    Heart,
    Plus,
    FolderPlus,
    X
} from 'lucide-react';
import { AnimatedButton } from '@/components/ui/animated-button';

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
            { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            className={`transition-all duration-1000 ease-[cubic-bezier(0.25,0.1,0.25,1)] transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'} ${className}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
};

/* =========================================================================
   RICH ANIMATED COMPONENTS
   ========================================================================= */

const WindowChrome = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <div className={`w-full bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden flex flex-col ${className}`}>
        <div className="h-9 bg-gray-50 border-b border-gray-200 flex items-center px-4 gap-2 shrink-0 justify-between">
            <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] border border-[#E0443E]"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] border border-[#DEA123]"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F] border border-[#1AAB29]"></div>
            </div>
            <div className="flex-1 text-center">
                <div className="h-4 bg-white border border-gray-200 rounded-md w-1/2 mx-auto shadow-sm"></div>
            </div>
            <div className="w-8"></div>
        </div>
        <div className="flex-1 relative overflow-hidden bg-white">
            {children}
        </div>
    </div>
);

const HeroInterface = () => (
    // Responsive: Fixed height on mobile (520px) to prevent clipping, aspect-video on tablet/desktop
    <WindowChrome className="h-[520px] md:h-auto md:aspect-video w-full max-w-full md:max-w-2xl mx-auto shadow-2xl hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all duration-700">
        <div className="p-0 flex flex-col h-full bg-gray-50/30 overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50"></div>
            <div className="flex flex-col md:flex-row h-full p-6 gap-8 relative z-10">
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 hidden md:block" viewBox="0 0 600 400" preserveAspectRatio="none">
                    <path d="M 150 70 Q 150 120 150 140" fill="none" stroke="#FF4D00" strokeWidth="2" strokeDasharray="6 4" className="opacity-30" />
                    <circle cx="150" cy="145" r="3" fill="#FF4D00" className="opacity-30" />
                    <path d="M 230 180 Q 300 180 350 180" fill="none" stroke="#FF4D00" strokeWidth="2" strokeDasharray="6 4" className="opacity-30" />
                    <circle cx="355" cy="180" r="3" fill="#FF4D00" className="opacity-30" />
                    <path d="M 400 210 Q 400 240 400 260" fill="none" stroke="#FF4D00" strokeWidth="2" strokeDasharray="6 4" className="opacity-30" />
                    <circle cx="400" cy="265" r="3" fill="#FF4D00" className="opacity-30" />
                </svg>

                {/* Left Column */}
                <div className="flex-1 flex flex-col items-center gap-6 relative shrink-0">
                    {/* Step 1 */}
                    <div className="w-full bg-white rounded-lg shadow-md border border-gray-200 p-2 flex items-center gap-3 relative z-10 animate-step-1 transform transition-all">
                        <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center shrink-0">
                            <Search className="w-3 h-3 text-gray-500" />
                        </div>
                        <div className="flex-1 text-xs text-black font-mono overflow-hidden whitespace-nowrap animate-typing-hero w-0 border-r-2 border-[#FF4D00]">
                            https://cool-design.com/
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#FF4D00]"></div>
                    </div>

                    {/* Step 2 */}
                    <div className="w-full bg-white rounded-xl shadow-lg border border-gray-200 p-3 flex flex-col gap-3 relative z-10 opacity-0 animate-step-2 transform translate-y-4">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded bg-gray-100 border border-gray-100 shrink-0 flex items-center justify-center relative overflow-hidden">
                                <ImageIcon className="w-5 h-5 text-gray-300" />
                                <div className="absolute inset-0 bg-[#FF4D00]/10 animate-scan"></div>
                            </div>
                            <div className="flex-1 space-y-1.5 min-w-0">
                                <div className="h-3 bg-gray-800 rounded w-5/6"></div>
                                <div className="h-2 bg-gray-200 rounded w-full"></div>
                                <div className="h-2 bg-gray-200 rounded w-2/3"></div>
                            </div>
                        </div>
                        <div className="flex justify-end border-t border-gray-50 pt-2">
                            <div className="px-2 py-1 bg-black text-white rounded text-[8px] uppercase font-bold flex items-center gap-1">
                                <Plus className="w-2 h-2" /> Add
                            </div>
                        </div>
                    </div>
                    <div className="text-[10px] font-bold uppercase text-[#FF4D00] tracking-widest mt-auto opacity-50 hidden md:block">Paste & Fetch</div>
                    <div className="md:hidden flex justify-center w-full py-2 opacity-30"><ArrowRight className="w-4 h-4 rotate-90 text-[#FF4D00]" /></div>
                </div>

                {/* Right Column */}
                <div className="flex-1 flex flex-col items-center gap-8 relative mt-0 md:mt-12 shrink-0">
                    {/* Step 3 */}
                    <div className="relative group opacity-0 animate-step-3">
                        <div className="w-24 h-20 bg-[#FF4D00] rounded-lg shadow-xl shadow-[#FF4D00]/20 flex items-center justify-center relative z-10 transform -rotate-6 transition-transform group-hover:rotate-0">
                            <div className="absolute top-0 right-0 w-8 h-8 bg-white/20 rounded-bl-lg"></div>
                            <Folder className="w-10 h-10 text-white fill-white/20" />
                        </div>
                        <div className="absolute top-2 left-2 w-24 h-20 bg-gray-800 rounded-lg -z-10 rotate-6 opacity-20"></div>
                        <div className="absolute -top-4 -right-4 bg-white px-2 py-1 rounded shadow-sm border border-gray-100 text-[8px] font-mono text-gray-500 animate-bounce-slight">
                            My Collections
                        </div>
                    </div>
                    <div className="md:hidden flex justify-center w-full py-2 opacity-30"><ArrowRight className="w-4 h-4 rotate-90 text-[#FF4D00]" /></div>

                    {/* Step 4 */}
                    <div className="w-full bg-black text-white rounded-xl shadow-lg p-3 flex items-center gap-3 opacity-0 animate-step-4">
                        <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center shrink-0">
                            <LinkIcon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[10px] text-gray-400 uppercase font-mono mb-0.5">Public Link</div>
                            <div className="text-xs font-bold truncate">linksvault.com/shared/ds9...</div>
                        </div>
                        <div className="px-2 py-1 bg-[#FF4D00] text-white rounded text-[8px] uppercase font-bold">
                            Copy
                        </div>
                    </div>
                    <div className="text-[10px] font-bold uppercase text-[#FF4D00] tracking-widest mt-auto opacity-50 hidden md:block">Share Folders</div>
                </div>
            </div>
        </div>
    </WindowChrome>
);

const AutoFetchInterface = () => (
    // Universal Fix: min-h-[300px] on mobile to prevent clipping, aspect-video on MD+
    <WindowChrome className="min-h-[320px] md:min-h-0 md:aspect-video w-full shadow-md">
        <div className="p-6 flex flex-col justify-center h-full relative bg-dots overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#FF4D00] animate-scan shadow-[0_0_15px_#FF4D00] z-20"></div>
            <div className="flex gap-4 md:gap-5 items-start relative z-10">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl flex items-center justify-center shrink-0 image-pop shadow-sm relative overflow-hidden">
                    <div className="absolute inset-0 bg-grid-slate-100"></div>
                    <ImageIcon className="w-8 h-8 text-[#FF4D00] relative z-10 animate-bounce-slight" />
                </div>
                <div className="flex-1 space-y-3 py-1 md:py-2 min-w-0">
                    <div className="h-5 bg-black rounded w-3/4 title-slide"></div>
                    <div className="space-y-2">
                        <div className="h-2.5 bg-gray-300 rounded w-full text-slide"></div>
                        <div className="h-2.5 bg-gray-200 rounded w-5/6 text-slide delay-75"></div>
                    </div>
                </div>
            </div>
        </div>
    </WindowChrome>
);

const SearchInterface = () => (
    <WindowChrome className="min-h-[320px] md:min-h-0 md:aspect-video w-full shadow-md">
        <div className="p-6 flex flex-col h-full bg-gray-50/50">
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg mb-4 border border-[#FF4D00]/30 shadow-sm ring-4 ring-[#FF4D00]/5 transition-all focus-within:ring-[#FF4D00]/10">
                <Search className="w-4 h-4 text-[#FF4D00]" />
                <div className="text-xs md:text-sm text-black font-semibold animate-typing-search w-0 overflow-hidden whitespace-nowrap border-r-2 border-[#FF4D00]">quick pasta...</div>
            </div>
            <div className="space-y-2">
                <div className="h-12 w-full bg-white border border-gray-100 rounded-lg animate-pulse opacity-40"></div>
                <div className="h-16 w-full bg-white border border-[#FF4D00] rounded-lg flex items-center px-4 gap-4 search-result-pop shadow-md relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FF4D00]"></div>
                    <div className="w-10 h-10 bg-[#FF4D00]/10 rounded-lg flex items-center justify-center text-[#FF4D00] flex-shrink-0"><FileText className="w-5 h-5" /></div>
                    <div className="min-w-0 flex-1">
                        <div className="h-3 w-32 bg-gray-900 rounded mb-2 flex items-center gap-1">
                            <span className="bg-[#FF4D00]/20 text-transparent rounded px-1 text-[8px] h-full">pasta</span>
                        </div>
                        <div className="h-2 w-48 bg-gray-300 rounded flex gap-1">
                            <span className="w-8 ml-4 h-full bg-[#FF4D00]/20 block"></span>
                        </div>
                    </div>
                    <div className="px-2 py-1 bg-gray-100 rounded text-[8px] font-mono text-gray-400 absolute top-2 right-2">global_match</div>
                </div>
            </div>
        </div>
    </WindowChrome>
);

const ShareInterface = () => (
    <WindowChrome className="min-h-[320px] md:min-h-0 md:aspect-video w-full shadow-md">
        <div className="flex flex-col h-full relative bg-gray-50 overflow-hidden">
            <div className="absolute inset-0 bg-dotted-pattern opacity-10"></div>

            {/* Center Hub */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="w-16 h-16 bg-white rounded-full border-4 border-[#FF4D00] flex items-center justify-center shadow-lg animate-pulse-slow">
                    <Globe className="w-8 h-8 text-[#FF4D00]" />
                </div>
            </div>

            {/* Orbiting Users */}
            <div className="w-full h-full animate-spin-slow origin-center">
                <div className="absolute top-1/4 left-1/4 w-10 h-10 bg-white rounded-full p-1 shadow-md border border-gray-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-400" />
                    <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1 border-2 border-white scale-0 animate-pop-in-delay"><Check className="w-2 h-2 text-white" /></div>
                </div>
                <div className="absolute bottom-1/4 right-1/4 w-10 h-10 bg-black rounded-full p-1 shadow-md border border-gray-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                    <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1 border-2 border-white scale-0 animate-pop-in-delay-2"><Check className="w-2 h-2 text-white" /></div>
                </div>
                <div className="absolute top-1/2 right-12 w-8 h-8 bg-gray-100 rounded-full border border-gray-200 flex items-center justify-center opacity-60">
                    <User className="w-4 h-4 text-gray-400" />
                </div>
            </div>

            {/* Floating Links */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-[#FF4D00] rounded-full animate-orbit-1 opacity-0"></div>
                <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-[#FF4D00] rounded-full animate-orbit-2 opacity-0"></div>
            </div>

            <div className="absolute bottom-4 left-0 w-full text-center">
                <div className="inline-block px-3 py-1 bg-black text-white text-[10px] font-mono rounded-full opacity-0 animate-fade-in-up">Link sent to 3 users</div>
            </div>
        </div>
    </WindowChrome>
);

const FolderInterface = () => (
    <WindowChrome className="min-h-[320px] md:min-h-0 md:aspect-video w-full shadow-md">
        <div className="flex h-full bg-white relative overflow-hidden flex-col p-6">
            <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
                <span className="text-xs font-bold uppercase text-gray-400">Directory</span>
                <div className="ml-auto flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-gray-200"></div>
                    <div className="w-2 h-2 rounded-full bg-gray-200"></div>
                </div>
            </div>

            <div className="flex-1 relative font-mono text-sm pl-2">

                {/* Tree Line */}
                <div className="absolute left-[7px] top-6 bottom-4 w-px bg-gray-200 border-l border-dashed border-gray-300"></div>

                {/* Root Folder */}
                <div className="flex items-center gap-2 mb-3">
                    <Folder className="w-4 h-4 text-black fill-black/10" />
                    <span className="font-bold">My_Vault</span>
                </div>

                {/* Project Folder */}
                <div className="flex items-center gap-2 mb-3 ml-6 relative animate-fade-in" style={{ animationDelay: '0.5s' }}>
                    <div className="absolute -left-6 top-1/2 w-4 h-px bg-gray-300"></div>
                    <Folder className="w-4 h-4 text-[#FF4D00]" />
                    <span className="text-[#FF4D00]">Work_Projects</span>
                </div>

                {/* The Sub Folder Creation Animation */}
                <div className="ml-12 relative">
                    {/* The Line Connector */}
                    <div className="absolute -left-6 -top-3 h-8 w-px bg-gray-300 animate-grow-height origin-top"></div>
                    <div className="absolute -left-6 top-1/2 w-4 h-px bg-gray-300 animate-grow-width origin-left" style={{ animationDelay: '1.5s' }}></div>

                    {/* The New Folder */}
                    <div className="flex items-center gap-2 p-2 bg-gray-50 border border-dashed border-gray-200 rounded-md opacity-0 animate-pop-in-delay-2 relative overflow-hidden" style={{ animationDelay: '2s' }}>
                        <FolderPlus className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-600">Q4_Strategy</span>

                        {/* Shine effect for new item */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-50 animate-shimmer" style={{ animationDelay: '3s' }}></div>
                    </div>
                </div>

                <div className="absolute bottom-0 right-0">
                    <div className="px-2 py-1 bg-black text-white text-[9px] rounded uppercase font-bold opacity-0 animate-fade-in-up" style={{ animationDelay: '2.5s' }}>Sub-folder Created</div>
                </div>
            </div>
        </div>
    </WindowChrome>
);


export function LandingPage(): React.JSX.Element {
    const router = useRouter();
    const [scrolled, setScrolled] = useState(false);

    // Typewriter Loop
    const phrases = ["Store.", "Share.", "Sync."];
    const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
    const [displayText, setDisplayText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [typingSpeed, setTypingSpeed] = useState(150);

    useEffect(() => {
        const handleType = () => {
            const fullPhrase = phrases[currentPhraseIndex];
            if (isDeleting) {
                setDisplayText(fullPhrase.substring(0, displayText.length - 1));
                setTypingSpeed(50);
            } else {
                setDisplayText(fullPhrase.substring(0, displayText.length + 1));
                setTypingSpeed(150);
            }
            if (!isDeleting && displayText === fullPhrase) {
                setTimeout(() => setIsDeleting(true), 2000);
            } else if (isDeleting && displayText === "") {
                setIsDeleting(false);
                setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
            }
        };
        const timer = setTimeout(handleType, typingSpeed);
        return () => clearTimeout(timer);
    }, [displayText, isDeleting, phrases, currentPhraseIndex, typingSpeed]);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-[#FF4D00] selection:text-white overflow-x-hidden flex flex-col relative">
            <style jsx global>{`
          @keyframes typing { 0%, 100% { width: 0; } 50%, 90% { width: 100%; border-color: transparent; } }
          @keyframes typing-search { 0% { width: 0; } 100% { width: 100px; border-color: transparent; } }
          @keyframes typing-hero { 0% { width: 0; } 40% { width: 100%; border-color: transparent; } 100% { width: 100%; border-color: transparent; } }
          @keyframes cardAppear { 0%, 10% { opacity: 0; transform: translateY(10px); } 20%, 100% { opacity: 1; transform: translateY(0); } }
          @keyframes checkAppear { 0%, 80% { transform: scale(0); } 90% { transform: scale(1.2); } 100% { transform: scale(1); } }
          @keyframes savePulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(0.95); } }
          @keyframes scan { 0% { top: 0; opacity: 1; } 50% { top: 100%; opacity: 0; } 51% { top: 0; opacity: 0; } 100% { opacity: 1; } }
          @keyframes imagePop { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
          @keyframes titleSlide { 0% { width: 0; } 100% { width: 90%; } }
          @keyframes searchResultPop { 0% { opacity: 0; transform: translateY(-5px); } 100% { opacity: 1; transform: translateY(0); } }
          @keyframes connectLine { 0% { transform: translateY(-50%) scaleX(0); } 100% { transform: translateY(-50%) scaleX(1); } }
          @keyframes popIn { 0% { transform: scale(0); } 100% { transform: scale(1); } }
          @keyframes popIn2 { 0% { transform: scale(0); } 100% { transform: scale(1); } }
          @keyframes folderOpen { 0% { height: 0; opacity: 0; } 100% { height: auto; opacity: 1; } }
          @keyframes subfolderOpen { 0% { height: 0; opacity: 0; } 100% { height: auto; opacity: 1; } }
          @keyframes bounceSlight { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

          /* Hero Flow Animations - Sequenced */
          @keyframes step1 { 0% { transform: scale(0.95); opacity: 0; } 20%, 100% { transform: scale(1); opacity: 1; } }
          @keyframes step2 { 0%, 20% { transform: translateY(10px); opacity: 0; } 40%, 100% { transform: translateY(0); opacity: 1; } }
          @keyframes step3 { 0%, 40% { transform: scale(0); opacity: 0; } 60%, 100% { transform: scale(1); opacity: 1; } }
          @keyframes step4 { 0%, 60% { transform: translateY(10px); opacity: 0; } 80%, 100% { transform: translateY(0); opacity: 1; } }
          
          /* Share Animation */
          @keyframes spinSlow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes orbit1 { 0% { transform: translate(-50%, -50%) rotate(0deg) translateX(40px) rotate(0deg); opacity: 1; } 100% { transform: translate(-50%, -50%) rotate(360deg) translateX(40px) rotate(-360deg); opacity: 0; } }
          @keyframes orbit2 { 0% { transform: translate(-50%, -50%) rotate(180deg) translateX(50px) rotate(-180deg); opacity: 1; } 100% { transform: translate(-50%, -50%) rotate(540deg) translateX(50px) rotate(-540deg); opacity: 0; } }
          @keyframes pulseSlow { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
          @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

          /* Tree Animation */
          @keyframes growHeight { from { height: 0; } to { height: 32px; } }
          @keyframes growWidth { from { width: 0; } to { width: 16px; } }
          @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }

          .animate-typing { animation: typing 4s steps(30, end) infinite; }
          .animate-typing-search { animation: typing-search 2s steps(15, end) infinite alternate; }
          .animate-typing-hero { animation: typing-hero 6s steps(20, end) infinite; }
          .card-appear { animation: cardAppear 4s ease-out infinite; }
          .check-appear { animation: checkAppear 4s ease-out infinite; }
          .animate-save-pulse { animation: savePulse 4s ease-in-out infinite; }
          .animate-scan { animation: scan 3s ease-in-out infinite; }
          .image-pop { animation: imagePop 3s ease-out infinite; }
          .title-slide { animation: titleSlide 3s ease-out infinite; }
          .search-result-pop { animation: searchResultPop 2s ease-out infinite; }
          .animate-connect-line { animation: connectLine 1s ease-out forwards; animation-delay: 1s; }
          .animate-pop-in-delay { animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; animation-delay: 2s; }
          .animate-pop-in-delay-2 { animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; animation-delay: 2.5s; }
          .folder-open { animation: folderOpen 1s ease-out forwards; }
          .subfolder-open { animation: folderOpen 1s ease-out forwards; animation-delay: 0.5s; opacity: 0; }
          .animate-bounce-slight { animation: bounceSlight 2s ease-in-out infinite; }
          .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
          
          .animate-step-1 { animation: step1 6s ease-out infinite; }
          .animate-step-2 { animation: step2 6s ease-out infinite; }
          .animate-step-3 { animation: step3 6s cubic-bezier(0.175, 0.885, 0.32, 1.275) infinite; }
          .animate-step-4 { animation: step4 6s ease-out infinite; }

          .animate-spin-slow { animation: spinSlow 10s linear infinite; }
          .animate-orbit-1 { animation: orbit1 2s linear infinite; }
          .animate-orbit-2 { animation: orbit2 3s linear infinite; }
          .animate-pulse-slow { animation: pulseSlow 3s ease-in-out infinite; }
          .animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; animation-delay: 3s; }
          
          .animate-grow-height { animation: growHeight 0.5s ease-out forwards; animation-delay: 1s; }
          .animate-grow-width { animation: growWidth 0.5s ease-out forwards; animation-delay: 1.5s; }
          .animate-shimmer { animation: shimmer 2s infinite; }

          .bg-dots { background-image: radial-gradient(#E5E7EB 1px, transparent 1px); background-size: 16px 16px; }
      `}</style>

            {/* Grid Background */}
            <div className="absolute inset-0 pointer-events-none z-0" style={{
                backgroundImage: `linear-gradient(to right, rgba(0, 0, 0, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.03) 1px, transparent 1px)`,
                backgroundSize: '60px 60px'
            }}></div>

            {/* Navigation */}
            <nav className={`fixed w-full z-50 transition-all duration-500 ${scrolled ? 'bg-white/95 backdrop-blur-xl border-b border-black/5 py-3 shadow-sm' : 'bg-transparent py-6'}`}>
                <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-xl tracking-tight uppercase flex items-baseline gap-1">
                            LinksVault
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D00] animate-pulse"></span>
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/login" className="font-display font-bold text-xs uppercase tracking-wide hover:text-[#FF4D00] transition-colors hidden sm:block relative after:content-[''] after:absolute after:w-full after:h-0.5 after:bg-[#FF4D00] after:bottom-0 after:left-0 after:scale-x-0 hover:after:scale-x-100 after:transition-transform">Login</Link>
                        <Link href="/login?tab=signup" className="relative group">
                            <AnimatedButton variant="primary" className="py-2 px-5 !w-auto">Get Access</AnimatedButton>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="min-h-[85vh] flex flex-col justify-center relative pt-32 pb-16 overflow-hidden">
                <div className="max-w-7xl mx-auto w-full px-6 sm:px-8 lg:px-12 grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-8 items-center relative z-20">

                    {/* Text Section: Order 1 */}
                    <div className="col-span-1 md:col-span-6 flex flex-col items-start order-1 lg:order-1">
                        <Reveal>
                            <div className="font-mono text-[10px] uppercase font-bold text-[#FF4D00] tracking-widest mb-4 flex flex-wrap items-center gap-2 px-3 py-1 bg-[#FF4D00]/5 rounded-full border border-[#FF4D00]/10 w-fit">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D00] animate-pulse"></span> System v2.0 // Active
                                <span className="text-gray-400 font-normal px-2 border-l border-[#FF4D00]/20 ml-2">Fast. Secure. Local.</span>
                            </div>
                        </Reveal>
                        <Reveal delay={100}>
                            <h1 className="font-display text-7xl sm:text-7xl md:text-6xl lg:text-9xl font-bold leading-[0.85] tracking-tighter mb-8 uppercase text-gray-900">
                                <span className="text-black">{displayText}</span>
                                <span className="w-3 h-14 md:h-20 bg-[#FF4D00] inline-block ml-1 animate-blink align-text-bottom"></span>
                            </h1>
                        </Reveal>
                        <Reveal delay={200}>
                            <p className="font-sans text-xl text-gray-500 max-w-lg leading-relaxed mb-10 border-l-4 border-gray-100 pl-6">
                                The ultimate secure vault for your digital identity. <br />
                                <span className="text-gray-900 font-semibold">Store, organize, and sync</span> your personal archive anywhere.
                            </p>
                        </Reveal>
                        <Reveal delay={300}>
                            <div className="flex flex-wrap gap-4 w-full sm:w-auto">
                                <AnimatedButton onClick={() => router.push('/login?tab=signup')} className="!w-auto">Start Archiving</AnimatedButton>
                                <AnimatedButton variant="secondary" onClick={() => router.push('/login?guest=true')} hoverColor="bg-black" className="!w-auto">Guest Mode</AnimatedButton>
                            </div>
                        </Reveal>
                    </div>

                    {/* SVG Visual: Order 2 */}
                    <div className="col-span-1 md:col-span-6 w-full flex items-center justify-center order-2 lg:order-2 px-0 md:px-0">
                        <Reveal delay={200} className="w-full flex justify-center h-full"><HeroInterface /></Reveal>
                    </div>
                </div>
            </header>


            {/* Features Grid - Dense & Detailed */}
            <section className="py-20 bg-gray-50/50 border-t border-gray-100 relative z-10 transition-colors duration-1000">
                <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
                    <div className="mb-16">
                        <h2 className="font-display text-4xl font-bold uppercase mb-2">Systems Output</h2>
                        <div className="h-1 w-24 bg-[#FF4D00]"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">

                        {/* Auto Fetch */}
                        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 group">
                            <div className="flex flex-col gap-6">
                                <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-gray-50 group-hover:border-[#FF4D00]/20 transition-colors">
                                    <AutoFetchInterface />
                                </div>
                                <div>
                                    <h3 className="font-display text-3xl font-bold uppercase mb-3 group-hover:text-[#FF4D00] transition-colors">Paste. Presto.</h3>
                                    <p className="text-gray-600 leading-relaxed max-w-sm text-sm">
                                        Instant metadata extraction. We parse standard meta tags, OpenGraph, and JSON-LD to regenerate rich previews automatically.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Global Search */}
                        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 group">
                            <div className="flex flex-col gap-6">
                                <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-gray-50 group-hover:border-[#FF4D00]/20 transition-colors">
                                    <SearchInterface />
                                </div>
                                <div>
                                    <h3 className="font-display text-3xl font-bold uppercase mb-3 group-hover:text-[#FF4D00] transition-colors">Global Search.</h3>
                                    <p className="text-gray-600 leading-relaxed max-w-sm text-sm">
                                        Keyword-powered global search. Find links instantly by title or description. We highlight the exact matches for you.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Share Collection */}
                        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 group">
                            <div className="flex flex-col gap-6">
                                <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-gray-50 group-hover:border-[#FF4D00]/20 transition-colors">
                                    <ShareInterface />
                                </div>
                                <div>
                                    <h3 className="font-display text-3xl font-bold uppercase mb-3 group-hover:text-[#FF4D00] transition-colors">Share. Anything.</h3>
                                    <p className="text-gray-600 leading-relaxed max-w-sm text-sm">
                                        Share folder collections with anyone, even non-users. One link gives them read-only access to your curated resources.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Organization - Sort Limitless */}
                        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 group">
                            <div className="flex flex-col gap-6">
                                <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-gray-50 group-hover:border-[#FF4D00]/20 transition-colors">
                                    <FolderInterface />
                                </div>
                                <div>
                                    <h3 className="font-display text-3xl font-bold uppercase mb-3 group-hover:text-[#FF4D00] transition-colors">Sort. Limitless.</h3>
                                    <p className="text-gray-600 leading-relaxed max-w-sm text-sm">
                                        Recursive folder structures. Create sub-folders within sub-folders. Build a taxonomy that fits your mental model.
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* Pricing - Compact Height (py-16) */}
            <section className="py-16 bg-black text-white relative overflow-hidden z-10">
                <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 relative z-10">
                    <Reveal>
                        <div className="flex items-end justify-between mb-12 border-b border-gray-800 pb-6">
                            <div>
                                <h2 className="font-display text-5xl font-bold uppercase mb-2">Pay to <span className="text-[#FF4D00]">Sync.</span></h2>
                                <p className="text-gray-400">Honest pricing for honest utility.</p>
                            </div>
                            <div className="hidden md:block">
                                <div className="px-4 py-1 border border-gray-800 rounded-full text-xs font-mono uppercase bg-gray-900 text-gray-500">No Hidden Fees</div>
                            </div>
                        </div>
                    </Reveal>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16">

                        {/* Guest */}
                        <Reveal delay={100} className="h-full">
                            <div className="bg-white/5 border border-white/10 p-8 rounded-2xl h-full flex flex-col hover:bg-white/10 transition-colors group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-50"><Zap className="w-24 h-24 text-white/5 -rotate-12 transform translate-x-8 -translate-y-8" /></div>
                                <div className="mb-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-white/10 rounded-lg"><Zap className="w-6 h-6 text-white" /></div>
                                        <span className="text-xs font-mono uppercase text-gray-400 tracking-widest border border-white/10 px-2 py-1 rounded">Local Storage</span>
                                    </div>
                                    <h3 className="font-display text-4xl uppercase mb-2">Guest</h3>
                                    <div className="text-[#FF4D00] font-mono text-2xl mb-4">$0 <span className="text-sm text-gray-500">/ forever</span></div>

                                    <div className="space-y-4 font-mono text-sm border-t border-white/10 pt-6">
                                        <div className="flex gap-3 text-gray-300"><Check className="w-5 h-5 text-[#FF4D00] shrink-0" /> Open Source & Free Forever</div>
                                        <div className="flex gap-3 text-gray-300"><Check className="w-5 h-5 text-[#FF4D00] shrink-0" /> Your data stays in your browser</div>
                                        <div className="flex gap-3 text-gray-300"><Check className="w-5 h-5 text-[#FF4D00] shrink-0" /> No expensive subscriptions</div>
                                    </div>

                                    <div className="space-y-3 font-mono text-xs border-t border-white/10 pt-6 mt-6 opacity-60">
                                        <div className="flex gap-3 text-gray-500"><X className="w-4 h-4 text-red-500 shrink-0" /> You can't access your links anywhere else</div>
                                        <div className="flex gap-3 text-gray-500"><X className="w-4 h-4 text-red-500 shrink-0" /> You can't share folders</div>
                                        <div className="flex gap-3 text-gray-500"><X className="w-4 h-4 text-red-500 shrink-0" /> No sub-folders support</div>
                                    </div>
                                </div>
                                <AnimatedButton variant="outline" onClick={() => router.push('/login?guest=true')} className="mt-auto w-full">Start Local Session</AnimatedButton>
                            </div>
                        </Reveal>

                        {/* Sync */}
                        <Reveal delay={200} className="h-full">
                            <div className="bg-[#FF4D00] text-black p-8 rounded-2xl h-full flex flex-col hover:scale-[1.01] transition-transform relative overflow-hidden shadow-2xl">
                                <div className="absolute top-0 right-0 p-4 opacity-10"><Globe className="w-32 h-32 text-black -rotate-12 transform translate-x-8 -translate-y-8" /></div>
                                <div className="mb-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-black/10 rounded-lg"><Globe className="w-6 h-6 text-black" /></div>
                                        <span className="text-xs font-mono uppercase text-black/60 tracking-widest border border-black/10 px-2 py-1 rounded">Cloud Sync</span>
                                    </div>
                                    <h3 className="font-display text-4xl uppercase mb-2">Sync</h3>
                                    <div className="text-black font-mono text-xl mb-4">Free <span className="text-sm opacity-60">/ until Beta ends</span></div>

                                    <div className="space-y-4 font-mono text-sm border-t border-black/10 pt-6">
                                        <div className="flex gap-3 text-black font-semibold"><Check className="w-5 h-5 text-white bg-black rounded-full p-1 shrink-0" /> Access your links anywhere anytime</div>
                                        <div className="flex gap-3 text-black font-semibold"><Check className="w-5 h-5 text-white bg-black rounded-full p-1 shrink-0" /> Share collections with anyone</div>
                                        <div className="flex gap-3 text-black font-semibold"><Check className="w-5 h-5 text-white bg-black rounded-full p-1 shrink-0" /> Unlimited sub-folders</div>
                                        <div className="flex gap-3 text-black font-semibold"><Check className="w-5 h-5 text-white bg-black rounded-full p-1 shrink-0" /> Private Encrypted Vault</div>
                                    </div>
                                </div>
                                <AnimatedButton variant="primary" hoverColor="bg-black" onClick={() => router.push('/login?tab=signup')} className="mt-auto w-full">Create Account</AnimatedButton>
                            </div>
                        </Reveal>

                    </div>
                </div>
            </section>

            {/* Footer - Detailed */}
            <footer className="bg-white py-16 border-t border-gray-100 z-10 relative">
                <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 flex flex-col md:flex-row justify-between items-start gap-12">

                    <div className="space-y-4">
                        <div className="text-xs font-mono text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#FF4D00]"></span> All rights reserved (2025)
                        </div>
                        <div className="text-sm font-bold text-gray-900">Linksvault.online</div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-12">
                        <div className="flex flex-col gap-4">
                            <span className="text-xs font-mono uppercase text-gray-400 tracking-wider">Connect</span>
                            <div className="flex gap-6">
                                <a href="#" className="hover:text-[#FF4D00] transition-colors hover:scale-110 transform duration-200"><Twitter className="w-5 h-5" /></a>
                                <a href="#" className="hover:text-[#FF4D00] transition-colors hover:scale-110 transform duration-200"><Instagram className="w-5 h-5" /></a>
                                <a href="#" className="hover:text-[#FF4D00] transition-colors hover:scale-110 transform duration-200"><Linkedin className="w-5 h-5" /></a>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <span className="text-xs font-mono uppercase text-gray-400 tracking-wider">Legal</span>
                            <div className="flex flex-col gap-2 text-sm font-bold text-gray-900">
                                <Link href="/privacy" className="hover:text-[#FF4D00] transition">Privacy Policy</Link>
                                <Link href="/terms" className="hover:text-[#FF4D00] transition">Terms of Service</Link>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <span className="text-xs font-mono uppercase text-gray-400 tracking-wider">Support</span>
                            <button className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-[#FF4D00] hover:text-white hover:border-[#FF4D00] transition-all group">
                                <Heart className="w-4 h-4 text-[#FF4D00] group-hover:text-white fill-current" />
                                <span className="text-xs font-bold uppercase tracking-wide">Support the dev</span>
                            </button>
                        </div>
                    </div>

                </div>
            </footer>
        </div>
    );
}
