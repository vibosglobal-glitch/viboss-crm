'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className="h-9 w-9" />;
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="rounded-full text-muted-foreground hover:bg-secondary w-9 h-9 transition-transform duration-300 hover:rotate-12"
            title="Toggle theme"
        >
            {theme === 'dark' ? (
                <Sun className="h-5 w-5 transition-transform duration-300 rotate-0 scale-100" />
            ) : (
                <Moon className="h-5 w-5 transition-transform duration-300 rotate-0 scale-100" />
            )}
        </Button>
    );
}
