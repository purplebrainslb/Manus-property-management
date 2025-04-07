import { requireAuth } from '@/lib/auth/server-auth';
import { DashboardOverview } from '@/components/dashboard/dashboard-overview';

export default async function DashboardPage() {
  // Make sure the user is authenticated
  await requireAuth();
  
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <DashboardOverview />
    </div>
  );
}
