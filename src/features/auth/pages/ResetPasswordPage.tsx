'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Zap, Lock, Eye, EyeOff, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const resetPasswordSchema = z.object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
    const searchParams = useSearchParams();
    const token = searchParams?.get('token') ?? '';
    const router = useRouter();

    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const form = useForm<ResetPasswordValues>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: { password: '', confirmPassword: '' },
    });

    const onSubmit = async (data: ResetPasswordValues) => {
        setError('');

        setLoading(true);

        try {
            await api.auth.resetPassword(token, data.password);
            setSuccess(true);
            setTimeout(() => router.replace('/login'), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to reset password. The link may be expired.');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-6">
                <motion.div
                    className="w-full max-w-md text-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6">
                        <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
                        <h2 className="text-lg font-semibold text-foreground mb-2">Invalid Reset Link</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            This password reset link is invalid or missing. Please request a new one.
                        </p>
                        <Link
                            href="/forgot-password"
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Request new reset link
                        </Link>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex">
            {/* Left - Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                <div className="absolute inset-0 gradient-primary opacity-90" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.1),transparent_70%)]" />
                <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h40v40H0z\' fill=\'none\' stroke=\'%23fff\' stroke-width=\'0.5\'/%3E%3C/svg%3E")' }} />
                <div className="absolute top-1/4 right-1/4 w-72 h-72 rounded-full bg-white/[0.06] animate-float" />
                <div className="relative z-10 flex flex-col justify-between p-12 text-white">
                    <div>
                        <Link href="/" className="inline-flex items-center gap-3">
                            <div className="flex items-center justify-center rounded-2xl bg-white/10 p-2.5 backdrop-blur-xl border border-white/20 shadow-lg">
                                <img src="/vibos-logo.png" alt="V!BOS" width={160} height={32} className="h-8 w-auto drop-shadow-md" />
                            </div>
                        </Link>
                    </div>
                    <div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <h2 className="text-4xl xl:text-5xl font-bold leading-tight mb-4">
                                Set your new<br />
                                password.
                            </h2>
                            <p className="text-lg text-white/70 max-w-md leading-relaxed">
                                Choose a strong password to keep your account secure.
                            </p>
                        </motion.div>
                    </div>
                    <div className="text-sm text-white/40">
                        © 2026 Vibos Global. All rights reserved.
                    </div>
                </div>
            </div>

            {/* Right - Form */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
                <motion.div
                    className="w-full max-w-md"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {/* Mobile brand */}
                    <div className="lg:hidden flex items-center gap-3 mb-8">
                        <div className="flex items-center justify-center rounded-xl bg-foreground/5 px-2 py-1.5 backdrop-blur-md border border-foreground/10">
                            <img src="/vibos-logo.png" alt="V!BOS" width={120} height={24} className="h-6 w-auto" />
                        </div>
                    </div>

                    <h1 className="text-3xl font-bold text-foreground mb-2">Reset password</h1>
                    <p className="text-muted-foreground mb-8">
                        Enter your new password below.
                    </p>

                    {success ? (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50 p-6"
                        >
                            <div className="flex items-start gap-3">
                                <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-semibold text-emerald-800 dark:text-emerald-300 mb-1">Password reset!</p>
                                    <p className="text-sm text-emerald-700 dark:text-emerald-400">
                                        Your password has been successfully updated. Redirecting you to login...
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                                    >
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                        {error}
                                    </motion.div>
                                )}

                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>New Password</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <input
                                                        type={showPassword ? 'text' : 'password'}
                                                        placeholder="At least 8 characters"
                                                        className="w-full h-11 rounded-lg border border-input bg-background pl-10 pr-11 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                                                        {...field}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                    >
                                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="confirmPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Confirm Password</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <input
                                                        type={showPassword ? 'text' : 'password'}
                                                        placeholder="Re-enter your password"
                                                        className="w-full h-11 rounded-lg border border-input bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                                                        {...field}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-11 gradient-primary border-0 text-base font-medium"
                                >
                                    {loading ? (
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                            Resetting...
                                        </div>
                                    ) : (
                                        'Reset Password'
                                    )}
                                </Button>
                            </form>
                        </Form>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
