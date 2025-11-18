import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LayoutClient } from "./layout-client";

// OPTIMIZED: Font with display swap to prevent blocking LCP
const inter = Inter({
  subsets: ["latin"],
  display: 'swap', // Prevents font from blocking render
  preload: true,
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "LinkVault - Your Personal Link Manager",
  description: "Save, organize, and rediscover your digital content with LinkVault",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <LayoutClient>
          {children}
        </LayoutClient>
      </body>
    </html>
  );
}
