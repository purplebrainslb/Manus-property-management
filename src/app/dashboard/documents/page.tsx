import { requireAuth } from '@/lib/auth/server-auth';
import { DocumentList } from '@/components/documents/document-list';

export default async function DocumentsPage() {
  // Make sure the user is authenticated
  await requireAuth();
  
  return (
    <div className="container py-8">
      <DocumentList />
    </div>
  );
}
