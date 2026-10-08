'use client';
import { Bell, Shield, Users, Key, Database, Mail, Save, Eye, EyeOff, Lock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { api } from '@/services/api';

export default function AdminSettings() {
  const [companyName, setCompanyName] = useState('Vibos Global');
  const [notifyOverdue, setNotifyOverdue] = useState(true);
  const [notifyNewLead, setNotifyNewLead] = useState(true);
  const [autoAssign, setAutoAssign] = useState(true);
  const [saved, setSaved] = useState(false);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleChangePassword = async () => {
    setPwError('');
    setPwSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwError('All fields are required');
      return;
    }
    if (newPassword.length < 8) {
      setPwError('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match');
      return;
    }

    setPwLoading(true);
    try {
      await api.auth.changePassword(currentPassword, newPassword);
      setPwSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwSuccess(''), 4000);
    } catch (err: any) {
      setPwError(err.message || 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your workspace and preferences</p>
      </div>

      {/* General */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Database className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">General</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-foreground">Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              className="mt-1 w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Timezone</label>
            <select className="mt-1 w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground">
              <option>America/New_York (EST)</option>
              <option>America/Chicago (CST)</option>
              <option>America/Denver (MST)</option>
              <option>America/Los_Angeles (PST)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Overdue follow-up alerts', checked: notifyOverdue, onChange: setNotifyOverdue },
            { label: 'New lead assignment alerts', checked: notifyNewLead, onChange: setNotifyNewLead },
          ].map(item => (
            <label key={item.label} className="flex items-center justify-between py-2">
              <span className="text-sm text-foreground">{item.label}</span>
              <button
                type="button"
                onClick={() => item.onChange(!item.checked)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${item.checked ? 'bg-primary' : 'bg-muted'}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${item.checked ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </label>
          ))}
        </div>
      </div>

      {/* Lead Assignment */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Lead Assignment</h2>
        </div>
        <label className="flex items-center justify-between py-2">
          <div>
            <span className="text-sm text-foreground">Auto-assign new leads</span>
            <p className="text-xs text-muted-foreground">Distribute new CSV imports automatically using round-robin</p>
          </div>
          <button
            type="button"
            onClick={() => setAutoAssign(!autoAssign)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoAssign ? 'bg-primary' : 'bg-muted'}`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${autoAssign ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </label>
      </div>

      {/* Change Password */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Change Password</h2>
        </div>

        {pwError && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {pwError}
          </div>
        )}
        {pwSuccess && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50 px-4 py-2.5 text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle className="h-4 w-4 shrink-0" />
            {pwSuccess}
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
        <Button
          onClick={handleChangePassword}
          disabled={pwLoading}
          className="gradient-primary border-0 gap-2"
        >
          {pwLoading ? (
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

      {/* Security */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Security</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div>
              <span className="text-sm text-foreground">Two-factor authentication</span>
              <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
            </div>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <span className="text-sm text-foreground">Session timeout</span>
              <p className="text-xs text-muted-foreground">Auto-logout after inactivity</p>
            </div>
            <select className="h-8 rounded-md border border-input bg-background px-2 text-sm">
              <option>30 minutes</option>
              <option>1 hour</option>
              <option>4 hours</option>
              <option>Never</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button className="gradient-primary border-0 gap-2" onClick={handleSave}>
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
        {saved && <span className="text-sm text-success font-medium">Settings saved!</span>}
      </div>
    </div>
  );
}

