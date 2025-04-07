import { requireAuth } from '@/lib/auth/server-auth';
import { PropertyForm } from '@/components/properties/property-form';

export default async function NewPropertyPage() {
  // Make sure the user is authenticated
  await requireAuth();
  
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Add New Property</h1>
      <PropertyForm />
    </div>
  );
}
