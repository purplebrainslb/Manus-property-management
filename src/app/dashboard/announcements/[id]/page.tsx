import { requireAuth } from '@/lib/auth/server-auth';
import { AnnouncementDetails } from '@/components/announcements/announcement-details';

export default async function AnnouncementDetailsPage() {
  // Make sure the user is authenticated
  await requireAuth();
  
  return (
    <div className="container py-8">
      <AnnouncementDetails />
    </div>
  );
}
