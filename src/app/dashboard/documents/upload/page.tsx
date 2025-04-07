import { requireAuth } from '@/lib/auth/server-auth';
import { DocumentUploadForm } from '@/components/documents/document-upload-form';

export default async function UploadDocumentPage() {
  // Make sure the user is authenticated
  await requireAuth();
  
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Upload Document</h1>
      <DocumentUploadForm />
    </div>
  );
}
