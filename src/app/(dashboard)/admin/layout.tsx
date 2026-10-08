import AdminLayout from '@/features/admin/layout/AdminLayout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
