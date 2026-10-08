import type { Metadata } from 'next';
import { Providers } from './providers';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Outfit, Bricolage_Grotesque } from 'next/font/google';
import '@/index.css';

const outfit = Outfit({ 
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
    title: 'V!BOS — Sales CRM',
    description: 'Vibos Global Sales CRM Platform',
    icons: {
        icon: '/vibos-favicon.png',
        apple: '/vibos-favicon.png',
    },
    manifest: '/manifest.json',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${outfit.variable} ${bricolage.variable} font-sans antialiased min-h-screen text-foreground`}>
                <Providers>
                    {children}
                    <Sonner />
                </Providers>
            </body>
        </html>
    );
}
