'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SDRError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('SDR route error:', error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
                <AlertCircle className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                {process.env.NODE_ENV === 'development' ? error.message : 'An error occurred loading this page.'}
            </p>
            <Button onClick={() => reset()} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try again
            </Button>
        </div>
    );
}
