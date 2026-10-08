import { Loader2 } from 'lucide-react';

export default function Loading() {
    return (
        <div className="flex relative min-h-screen items-center justify-center bg-background/50 backdrop-blur-sm z-50">
            <div className="flex flex-col items-center gap-4">
                <div className="relative flex items-center justify-center">
                    <div className="absolute h-16 w-16 animate-ping rounded-full bg-primary/20" />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-xl gradient-primary shadow-[0_0_16px_hsl(var(--primary)/0.35)] animate-pulse">
                        <Loader2 className="h-8 w-8 text-primary-foreground animate-spin" />
                    </div>
                </div>
                <p className="text-sm font-semibold text-muted-foreground animate-pulse">Loading V!BOS...</p>
            </div>
        </div>
    );
}
