import { requireAuth } from '@/lib/auth/server-auth';
import { ResidentInviteForm } from '@/components/residents/resident-invite-form';

export default async function InviteResidentPage() {
  // Make sure the user is authenticated
  await requireAuth();
  
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Invite Resident</h1>
      <ResidentInviteForm />
    </div>
  );
}
