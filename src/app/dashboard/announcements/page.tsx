import { requireAuth } from '@/lib/auth/server-auth';
import { AnnouncementList } from '@/components/announcements/announcement-list';

export default async function AnnouncementsPage() {
  // Make sure the user is authenticated
  await requireAuth();
  
  return (
    <div className="container py-8">
      <AnnouncementList />
    </div>
  );
}
