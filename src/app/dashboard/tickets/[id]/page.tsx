import { requireAuth } from '@/lib/auth/server-auth';
import { TicketDetails } from '@/components/tickets/ticket-details';

export default async function TicketDetailsPage() {
  // Make sure the user is authenticated
  await requireAuth();
  
  return (
    <div className="container py-8">
      <TicketDetails />
    </div>
  );
}
