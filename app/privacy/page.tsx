/**
 * @file app/privacy/page.tsx
 * @description Privacy Policy page
 * @created 2025-12-06
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
    title: 'Privacy Policy | Linksvault',
    description: 'Learn how Linksvault protects your privacy and handles your data.',
};

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-3xl mx-auto px-4 py-12">
                <Button variant="ghost" asChild className="mb-8">
                    <Link href="/login" className="flex items-center gap-2">
                        <ArrowLeft className="size-4" />
                        Back to Login
                    </Link>
                </Button>

                <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>

                <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
                    <p className="text-muted-foreground">
                        Last updated: December 6, 2025
                    </p>

                    <section>
                        <h2 className="text-xl font-semibold mt-8 mb-4">1. Information We Collect</h2>
                        <p>
                            When you use Linksvault, we collect only the information necessary to provide our service:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li><strong>Account Information:</strong> Your email address and encrypted password when you create an account.</li>
                            <li><strong>Usage Data:</strong> Links, folders, and settings you create within the app.</li>
                            <li><strong>Authentication Cookies:</strong> Essential cookies to keep you logged in securely.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mt-8 mb-4">2. How We Use Your Information</h2>
                        <p>We use your information solely to:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li>Provide and maintain the Linksvault service</li>
                            <li>Authenticate your identity and protect your account</li>
                            <li>Sync your links and folders across devices</li>
                            <li>Improve our service based on usage patterns (anonymized)</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mt-8 mb-4">3. Data Storage and Security</h2>
                        <p>
                            Your data is stored securely using Supabase, which provides enterprise-grade security including:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li>Encryption at rest and in transit</li>
                            <li>Regular security audits</li>
                            <li>SOC 2 Type II compliance</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mt-8 mb-4">4. Data Sharing</h2>
                        <p>
                            We do <strong>not</strong> sell, trade, or share your personal information with third parties,
                            except as required by law or to protect our rights.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mt-8 mb-4">5. Guest Mode</h2>
                        <p>
                            Guest mode stores data locally in your browser. This data is not synced to our servers
                            and will be lost if you clear your browser data.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mt-8 mb-4">6. Your Rights</h2>
                        <p>You have the right to:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li>Access your data at any time through your account</li>
                            <li>Export your data in a standard format</li>
                            <li>Delete your account and all associated data</li>
                            <li>Opt out of non-essential cookies</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mt-8 mb-4">7. Cookies</h2>
                        <p>
                            We use only essential cookies required for authentication.
                            These cookies do not track you across websites and are necessary for the service to function.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mt-8 mb-4">8. Contact</h2>
                        <p>
                            If you have questions about this Privacy Policy, please reach out through our website.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
