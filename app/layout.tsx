import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { LayoutClient } from "./layout-client";
import { createClient } from "@/lib/supabase/server";

// OPTIMIZED: Font with display swap to prevent blocking LCP
const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-space-grotesk',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.linksvault.online'),
  title: {
    default: "LinksVault - Your Personal Link Manager",
    template: "%s | LinksVault",
  },
  description: "Save, organize, and rediscover your digital content with LinksVault. The smart way to manage your bookmarks and links.",
  keywords: ["link manager", "bookmark manager", "save links", "organize bookmarks", "digital content", "link organizer"],
  authors: [{ name: "LinksVault" }],
  creator: "LinksVault",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.linksvault.online",
    siteName: "LinksVault",
    title: "LinksVault - Your Personal Link Manager",
    description: "Save, organize, and rediscover your digital content with LinksVault. The smart way to manage your bookmarks and links.",
  },
  twitter: {
    card: "summary_large_image",
    title: "LinksVault - Your Personal Link Manager",
    description: "Save, organize, and rediscover your digital content with LinksVault.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add your Google Search Console verification code here when you have it
    // google: 'your-verification-code',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // PERFORMANCE: Only fetch basic user info on server
  // Profile and settings are loaded client-side to reduce TTFB
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // OPTIMIZED: Pass minimal user data to client
  // Full profile/settings loaded by StoreInitializer client-side
  const authUser = user ? {
    id: user.id,
    email: user.email,
    app_metadata: user.app_metadata,
    user_metadata: user.user_metadata,
    aud: user.aud,
    created_at: user.created_at,
  } : null;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* PERFORMANCE: Preconnect to critical third-party origins */}
        <link rel="preconnect" href="https://fwqzmuogcziicixologi.supabase.co" />
        <link rel="dns-prefetch" href="https://fwqzmuogcziicixologi.supabase.co" />
        {/* Preconnect to common image CDNs */}
        <link rel="preconnect" href="https://opengraph.githubassets.com" />
        <link rel="dns-prefetch" href="https://opengraph.githubassets.com" />
      </head>
      <body className={`${inter.className} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
        <LayoutClient initialUser={authUser}>
          {children}
        </LayoutClient>
      </body>
    </html>
  );
}
