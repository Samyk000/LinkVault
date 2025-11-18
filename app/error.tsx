'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { logger } from '@/lib/utils/logger';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to our logging service
    logger.error('Global error caught:', {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl font-bold text-destructive">
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  We apologize for the inconvenience. An unexpected error has occurred.
                </p>
                
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-6 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-left">
                    <h3 className="mb-2 font-semibold text-destructive">Error Details</h3>
                    <p className="mb-2 font-mono text-sm">
                      <strong>Error:</strong> {error.message}
                    </p>
                    {error.digest && (
                      <p className="mb-2 font-mono text-sm">
                        <strong>Digest:</strong> {error.digest}
                      </p>
                    )}
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-muted-foreground">
                        View stack trace
                      </summary>
                      <pre className="mt-2 overflow-x-auto rounded bg-muted p-3 font-mono text-xs">
                        {error.stack}
                      </pre>
                    </details>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button
                  onClick={reset}
                  variant="outline"
                  className="flex-1 sm:flex-none"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="flex-1 sm:flex-none"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Page
                </Button>
                
                <Button
                  onClick={() => window.location.href = '/app'}
                  className="flex-1 sm:flex-none"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Go to Home
                </Button>
              </div>

              <div className="mt-6 border-t pt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  If this problem persists, please contact support.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  );
}