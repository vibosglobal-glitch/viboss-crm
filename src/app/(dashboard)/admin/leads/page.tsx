import { Suspense } from 'react';
import LeadsPage from '@/features/leads/pages/LeadsPage';

export default function Page() {
  return (
    <Suspense>
      <LeadsPage />
    </Suspense>
  );
}
