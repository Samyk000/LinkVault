import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { StoreInitializer } from "@/components/providers/store-initializer";
import { ResourceHints } from "@/components/providers/resource-hints";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/error-boundary";
import { AuthProvider } from "@/lib/contexts/auth-context";
import { OfflineIndicator } from "@/components/common/offline-indicator";
import { PerformanceDashboard } from "@/components/debug/performance-dashboard";

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
        <ErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <QueryProvider>
              <ResourceHints />
              <AuthProvider>
                <StoreInitializer />
                <OfflineIndicator />
                {children}
                <Toaster />
              </AuthProvider>
              <PerformanceDashboard />
            </QueryProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
