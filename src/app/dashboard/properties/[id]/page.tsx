import { requireAuth } from '@/lib/auth/server-auth';
import { PropertyDetails } from '@/components/properties/property-details';

export default async function PropertyDetailsPage({ params }: { params: { id: string } }) {
  // Make sure the user is authenticated
  await requireAuth();
  
  return (
    <div className="container py-8">
      <PropertyDetails />
    </div>
  );
}
