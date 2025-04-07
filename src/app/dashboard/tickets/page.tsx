import { requireAuth } from '@/lib/auth/server-auth';
import { TicketList } from '@/components/tickets/ticket-list';

export default async function TicketsPage() {
  // Make sure the user is authenticated
  await requireAuth();
  
  return (
    <div className="container py-8">
      <TicketList />
    </div>
  );
}
