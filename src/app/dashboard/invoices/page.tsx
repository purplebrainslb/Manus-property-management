import { requireAuth } from '@/lib/auth/server-auth';
import { InvoiceList } from '@/components/invoices/invoice-list';

export default async function InvoicesPage() {
  // Make sure the user is authenticated
  await requireAuth();
  
  return (
    <div className="container py-8">
      <InvoiceList />
    </div>
  );
}
