export default function AdminLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="h-8 w-48 rounded-lg bg-muted" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-28 rounded-xl bg-muted" />
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="h-64 rounded-xl bg-muted" />
                <div className="h-64 rounded-xl bg-muted" />
            </div>
        </div>
    );
}
