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
  title: "LinksVault - Your Personal Link Manager",
  description: "Save, organize, and rediscover your digital content with LinkVault",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let authUser = null;
  if (user) {
    const [profileResult, settingsResult] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('id', user.id).single(),
      supabase.from('user_settings').select('*').eq('user_id', user.id).single()
    ]);

    authUser = {
      ...user,
      profile: profileResult.data || undefined,
      settings: settingsResult.data || undefined
    };
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
        <LayoutClient initialUser={authUser}>
          {children}
        </LayoutClient>
      </body>
    </html>
  );
}
