import { requireAuth } from '@/lib/auth/server-auth';
import { PropertyList } from '@/components/properties/property-list';

export default async function PropertiesPage() {
  // Make sure the user is authenticated
  await requireAuth();
  
  return (
    <div className="container py-8">
      <PropertyList />
    </div>
  );
}
