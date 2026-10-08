'use client';
import { useState } from 'react';
import { Key, Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';

export default function ChangePasswordCard() {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async () => {
        setError('');
        setSuccess('');

        if (!currentPassword || !newPassword || !confirmPassword) {
            setError('All fields are required');
            return;
        }
        if (newPassword.length < 8) {
            setError('New password must be at least 8 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('New passwords do not match');
            return;
        }

        setLoading(true);
        try {
            await api.auth.changePassword(currentPassword, newPassword);
            setSuccess('Password changed successfully!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => setSuccess(''), 4000);
        } catch (err: any) {
            setError(err.message || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <Lock className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Change Password</h2>
            </div>

            {error && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                </div>
            )}
            {success && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50 px-4 py-2.5 text-sm text-emerald-700 dark:text-emerald-400">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    {success}
                </div>
            )}

            <div className="space-y-3">
                <div>
                    <label className="text-sm font-medium text-foreground">Current Password</label>
                    <div className="relative mt-1">
                        <input
                            type={showCurrent ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={e => setCurrentPassword(e.target.value)}
                            placeholder="Enter current password"
                            className="w-full h-10 rounded-lg border border-input bg-background px-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </div>
                <div>
                    <label className="text-sm font-medium text-foreground">New Password</label>
                    <div className="relative mt-1">
                        <input
                            type={showNew ? 'text' : 'password'}
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="At least 8 characters"
                            className="w-full h-10 rounded-lg border border-input bg-background px-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </div>
                <div>
                    <label className="text-sm font-medium text-foreground">Confirm New Password</label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="mt-1 w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                </div>
            </div>
            <Button onClick={handleSubmit} disabled={loading} className="gradient-primary border-0 gap-2">
                {loading ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Changing...
                    </>
                ) : (
                    <>
                        <Key className="h-4 w-4" />
                        Change Password
                    </>
                )}
            </Button>
        </div>
    );
}
