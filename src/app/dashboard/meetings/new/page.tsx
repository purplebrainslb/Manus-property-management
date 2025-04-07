import { requireAuth } from '@/lib/auth/server-auth';
import { MeetingForm } from '@/components/meetings/meeting-form';

export default async function NewMeetingPage() {
  // Make sure the user is authenticated
  await requireAuth();
  
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Schedule Meeting</h1>
      <MeetingForm />
    </div>
  );
}
