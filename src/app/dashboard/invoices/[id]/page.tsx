import { requireAuth } from '@/lib/auth/server-auth';
import { InvoiceDetails } from '@/components/invoices/invoice-details';

export default async function InvoiceDetailsPage({ params }: { params: { id: string } }) {
  // Make sure the user is authenticated
  await requireAuth();
  
  return (
    <div className="container py-8">
      <InvoiceDetails />
    </div>
  );
}
