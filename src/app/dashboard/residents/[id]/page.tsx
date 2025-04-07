import { requireAuth } from '@/lib/auth/server-auth';
import { ResidentDetails } from '@/components/residents/resident-details';

export default async function ResidentDetailsPage({ params }: { params: { id: string } }) {
  // Make sure the user is authenticated
  await requireAuth();
  
  return (
    <div className="container py-8">
      <ResidentDetails />
    </div>
  );
}
