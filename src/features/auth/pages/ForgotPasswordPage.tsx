'use client';
import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Zap, Mail, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const forgotPasswordSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const form = useForm<ForgotPasswordValues>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: { email: '' },
    });

    const onSubmit = async (data: ForgotPasswordValues) => {
        setError('');
        setLoading(true);

        try {
            await api.auth.forgotPassword(data.email);
            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex">
            {/* Left - Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                <div className="absolute inset-0 gradient-primary opacity-90" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.1),transparent_70%)]" />
                <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h40v40H0z\' fill=\'none\' stroke=\'%23fff\' stroke-width=\'0.5\'/%3E%3C/svg%3E")' }} />
                <div className="absolute top-1/4 right-1/4 w-72 h-72 rounded-full bg-white/[0.06] animate-float" />
                <div className="absolute bottom-1/3 left-1/4 w-48 h-48 rounded-full bg-white/[0.04] animate-float" style={{ animationDelay: '1.5s' }} />
                <div className="relative z-10 flex flex-col justify-between p-12 text-white">
                    <div>
                        <Link href="/" className="flex items-center gap-2.5">
                            <img src="/vibos-logo.png" alt="V!BOS" width={180} height={36} className="h-9 w-auto" />
                        </Link>
                    </div>
                    <div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <h2 className="text-4xl xl:text-5xl font-bold leading-tight mb-4">
                                Reset your password.<br />
                                Get back on track.
                            </h2>
                            <p className="text-lg text-white/70 max-w-md leading-relaxed">
                                We'll send you a secure link to reset your password and get you back to closing deals.
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
                    <div className="lg:hidden flex items-center gap-2 mb-8">
                        <img src="/vibos-logo.png" alt="V!BOS" width={140} height={28} className="h-7 w-auto" />
                    </div>

                    <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back to login
                    </Link>

                    <h1 className="text-3xl font-bold text-foreground mb-2">Forgot password?</h1>
                    <p className="text-muted-foreground mb-8">
                        Enter your email and we'll send you a link to reset your password.
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
                                    <p className="font-semibold text-emerald-800 dark:text-emerald-300 mb-1">Check your email</p>
                                    <p className="text-sm text-emerald-700 dark:text-emerald-400">
                                        If an account with that email exists, we've sent a password reset link. Please check your inbox and spam folder.
                                    </p>
                                </div>
                            </div>
                            <Link
                                href="/login"
                                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                Return to login
                            </Link>
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
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <input
                                                        type="email"
                                                        placeholder="you@company.com"
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
                                            Sending...
                                        </div>
                                    ) : (
                                        'Send Reset Link'
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
