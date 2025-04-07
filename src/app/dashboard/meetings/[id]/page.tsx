import { requireAuth } from '@/lib/auth/server-auth';
import { MeetingDetails } from '@/components/meetings/meeting-details';

export default async function MeetingDetailsPage({ params }: { params: { id: string } }) {
  // Make sure the user is authenticated
  await requireAuth();
  
  return (
    <div className="container py-8">
      <MeetingDetails />
    </div>
  );
}
