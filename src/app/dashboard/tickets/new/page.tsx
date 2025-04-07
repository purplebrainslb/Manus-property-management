import { requireAuth } from '@/lib/auth/server-auth';
import { TicketForm } from '@/components/tickets/ticket-form';

export default async function CreateTicketPage() {
  // Make sure the user is authenticated
  await requireAuth();
  
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Create Ticket</h1>
      <TicketForm />
    </div>
  );
}
