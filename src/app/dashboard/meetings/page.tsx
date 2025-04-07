import { requireAuth } from '@/lib/auth/server-auth';
import { MeetingList } from '@/components/meetings/meeting-list';

export default async function MeetingsPage() {
  // Make sure the user is authenticated
  await requireAuth();
  
  return (
    <div className="container py-8">
      <MeetingList />
    </div>
  );
}
