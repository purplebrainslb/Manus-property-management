import { requireAuth } from '@/lib/auth/server-auth';
import { PropertyEditForm } from '@/components/properties/property-edit-form';

export default async function EditPropertyPage({ params }: { params: { id: string } }) {
  // Make sure the user is authenticated
  await requireAuth();
  
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Edit Property</h1>
      <PropertyEditForm />
    </div>
  );
}
