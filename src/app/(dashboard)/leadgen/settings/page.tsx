import ChangePasswordCard from '@/components/common/ChangePasswordCard';

export default function LeadGenSettingsPage() {
    return (
        <div className="space-y-6 max-w-3xl">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Settings</h1>
                <p className="text-sm text-muted-foreground mt-1">Manage your account preferences</p>
            </div>
            <ChangePasswordCard />
        </div>
    );
}
