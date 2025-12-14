'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

function BackButtonContent() {
    const searchParams = useSearchParams();
    const source = searchParams.get('source');

    const href = source === 'landing' ? '/' : '/login';
    const label = source === 'landing' ? 'Back to Home' : 'Back to Login';

    return (
        <Button variant="ghost" asChild className="mb-8">
            <Link href={href} className="flex items-center gap-2">
                <ArrowLeft className="size-4" />
                {label}
            </Link>
        </Button>
    );
}

export function BackButton() {
    return (
        <Suspense fallback={
            <Button variant="ghost" className="mb-8" disabled>
                <div className="flex items-center gap-2">
                    <ArrowLeft className="size-4" />
                    <span>Loading...</span>
                </div>
            </Button>
        }>
            <BackButtonContent />
        </Suspense>
    );
}
