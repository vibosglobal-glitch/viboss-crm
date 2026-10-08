/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    compress: true,
    poweredByHeader: false,

    // Tree-shake large packages — stops the entire library bundling when only a few exports are used.
    // Biggest win: lucide-react ships 1000+ icons; without this every icon is included.
    experimental: {
        optimizePackageImports: [
            'lucide-react',
            'recharts',
            'framer-motion',
            'date-fns',
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-popover',
            '@radix-ui/react-progress',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
            'sonner',
        ],
    },

    webpack: (config) => {
        config.resolve.extensionAlias = {
            '.js': ['.ts', '.tsx', '.js'],
            '.mjs': ['.mts', '.mjs'],
        };
        return config;
    },

    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'Content-Security-Policy',
                        value: [
                            "default-src 'self'",
                            "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-eval needed by Next.js dev & recharts
                            "style-src 'self' 'unsafe-inline'",
                            "img-src 'self' data: blob: https://api.dicebear.com",
                            "font-src 'self' data:",
                            "connect-src 'self' ws: wss:",
                            "frame-ancestors 'none'",
                            "base-uri 'self'",
                            "form-action 'self'",
                        ].join('; '),
                    },
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
                ],
            },
        ];
    },
    async rewrites() {
        if (process.env.NODE_ENV === 'production') {
            return [];
        }
        return [
            {
                source: '/api/:path*',
                destination: 'http://localhost:3001/api/:path*',
            },
        ];
    },
};

export default nextConfig;
