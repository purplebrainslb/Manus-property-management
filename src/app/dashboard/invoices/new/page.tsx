import { requireAuth } from '@/lib/auth/server-auth';
import { InvoiceForm } from '@/components/invoices/invoice-form';

export default async function NewInvoicePage() {
  // Make sure the user is authenticated
  await requireAuth();
  
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Create Invoice</h1>
      <InvoiceForm />
    </div>
  );
}
