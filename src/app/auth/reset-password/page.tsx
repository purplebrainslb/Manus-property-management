import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { requireNoAuth } from '@/lib/auth/server-auth';

export default async function ResetPasswordPage() {
  // Make sure the user is not already logged in
  await requireNoAuth();
  
  return (
    <div className="container flex items-center justify-center min-h-screen py-12">
      <ResetPasswordForm />
    </div>
  );
}
