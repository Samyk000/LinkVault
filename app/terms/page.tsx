/**
 * @file app/terms/page.tsx
 * @description Terms of Service page
 * @created 2025-12-06
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BackButton } from '@/components/ui/back-button';

export const metadata: Metadata = {
    title: 'Terms of Service | Linksvault',
    description: 'Terms and conditions for using Linksvault.',
};

export default function TermsOfServicePage() {
    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-3xl mx-auto px-4 py-12">
                <BackButton />

                <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>

                <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
                    <p className="text-muted-foreground">
                        Last updated: December 6, 2025
                    </p>

                    <section>
                        <h2 className="text-xl font-semibold mt-8 mb-4">1. Acceptance of Terms</h2>
                        <p>
                            By accessing or using Linksvault, you agree to be bound by these Terms of Service.
                            If you do not agree to these terms, please do not use our service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mt-8 mb-4">2. Description of Service</h2>
                        <p>
                            Linksvault is a link bookmarking and organization service that allows you to:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li>Save and organize links</li>
                            <li>Create folders to categorize your links</li>
                            <li>Access your links across multiple devices</li>
                            <li>Share folders with others</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mt-8 mb-4">3. User Accounts</h2>
                        <p>
                            To use certain features, you must create an account. You are responsible for:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li>Maintaining the confidentiality of your password</li>
                            <li>All activities that occur under your account</li>
                            <li>Notifying us of any unauthorized use</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mt-8 mb-4">4. Acceptable Use</h2>
                        <p>You agree not to:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li>Use the service for any illegal purpose</li>
                            <li>Store or share links to illegal, harmful, or offensive content</li>
                            <li>Attempt to gain unauthorized access to our systems</li>
                            <li>Interfere with other users' use of the service</li>
                            <li>Use automated means to access the service without permission</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mt-8 mb-4">5. Content Ownership</h2>
                        <p>
                            You retain all rights to the content you store in Linksvault.
                            We do not claim ownership of your links, folders, or other data.
                            We only access your data to provide the service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mt-8 mb-4">6. Service Availability</h2>
                        <p>
                            We strive to provide a reliable service, but we cannot guarantee uninterrupted access.
                            We may occasionally need to perform maintenance or updates that temporarily affect availability.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mt-8 mb-4">7. Termination</h2>
                        <p>
                            We reserve the right to terminate or suspend your account if you violate these terms.
                            You may also delete your account at any time through your account settings.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mt-8 mb-4">8. Limitation of Liability</h2>
                        <p>
                            Linksvault is provided "as is" without warranties of any kind.
                            We are not liable for any damages arising from your use of the service,
                            including data loss or service interruptions.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mt-8 mb-4">9. Changes to Terms</h2>
                        <p>
                            We may update these terms from time to time.
                            Continued use of the service after changes constitutes acceptance of the new terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mt-8 mb-4">10. Contact</h2>
                        <p>
                            For questions about these Terms of Service, please reach out through our website.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
