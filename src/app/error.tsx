'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Global Error Boundary caught:', error);
    }, [error]);

    return (
        <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background p-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-6 ring-8 ring-destructive/5">
                <AlertCircle className="h-10 w-10" />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl mb-3">
                Something went wrong!
            </h1>

            <p className="max-w-[500px] text-muted-foreground mb-8">
                We apologize for the inconvenience. An unexpected error occurred.
                {process.env.NODE_ENV === 'development' && (
                    <span className="block mt-4 p-4 text-left text-xs bg-muted/50 rounded-lg text-foreground font-mono overflow-auto max-w-full">
                        {error.message}
                    </span>
                )}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 min-w-[200px]">
                <Button
                    onClick={() => reset()}
                    size="lg"
                    className="gap-2 w-full sm:w-auto"
                >
                    <RefreshCw className="h-4 w-4" />
                    Try again
                </Button>
                <Button
                    variant="outline"
                    size="lg"
                    asChild
                    className="gap-2 w-full sm:w-auto"
                >
                    <Link href="/">
                        <Home className="h-4 w-4" />
                        Return Home
                    </Link>
                </Button>
            </div>
        </div>
    );
}
