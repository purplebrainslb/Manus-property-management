import { requireAuth } from '@/lib/auth/server-auth';
import { AnnouncementForm } from '@/components/announcements/announcement-form';

export default async function CreateAnnouncementPage() {
  // Make sure the user is authenticated
  await requireAuth();
  
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Create Announcement</h1>
      <AnnouncementForm />
    </div>
  );
}
