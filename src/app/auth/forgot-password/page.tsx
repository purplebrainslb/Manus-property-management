import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { requireNoAuth } from '@/lib/auth/server-auth';

export default async function ForgotPasswordPage() {
  // Make sure the user is not already logged in
  await requireNoAuth();
  
  return (
    <div className="container flex items-center justify-center min-h-screen py-12">
      <ForgotPasswordForm />
    </div>
  );
}
