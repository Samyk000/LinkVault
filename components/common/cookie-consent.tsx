"use client";

/**
 * @file components/common/cookie-consent.tsx
 * @description Cookie consent banner component
 * @created 2025-12-06
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Cookie, X } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'linkvault_cookie_consent';

export function CookieConsent() {
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        // Check if user has already consented
        const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
        if (!consent) {
            // Small delay to avoid layout shift on initial load
            const timer = setTimeout(() => setShowBanner(true), 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
        setShowBanner(false);
    };

    const handleDecline = () => {
        localStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
        setShowBanner(false);
    };

    if (!showBanner) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur-sm border-t shadow-lg animate-in slide-in-from-bottom-4 duration-300">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                    <Cookie className="size-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="text-foreground">
                            We use essential cookies to keep you logged in and provide a better experience.
                        </p>
                        <p className="text-muted-foreground mt-1">
                            By continuing to use LinkVault, you agree to our{' '}
                            <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
                            {' '}and{' '}
                            <a href="/terms" className="text-primary hover:underline">Terms of Service</a>.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={handleDecline}>
                        Decline
                    </Button>
                    <Button size="sm" onClick={handleAccept}>
                        Accept
                    </Button>
                </div>
            </div>
        </div>
    );
}
