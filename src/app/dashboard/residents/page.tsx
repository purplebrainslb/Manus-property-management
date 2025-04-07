import { requireAuth } from '@/lib/auth/server-auth';
import { ResidentList } from '@/components/residents/resident-list';

export default async function ResidentsPage() {
  // Make sure the user is authenticated
  await requireAuth();
  
  return (
    <div className="container py-8">
      <ResidentList />
    </div>
  );
}
