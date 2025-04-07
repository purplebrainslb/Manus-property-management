import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { requireNoAuth } from '@/lib/auth/server-auth';

export default async function CheckEmailPage() {
  // Make sure the user is not already logged in
  await requireNoAuth();
  
  return (
    <div className="container flex items-center justify-center min-h-screen py-12">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Check Your Email</CardTitle>
          <CardDescription>
            We've sent you a confirmation link to complete your registration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-md bg-blue-50 text-blue-700 mb-4">
            <p>Please check your email for a confirmation link to activate your account. If it doesn't appear within a few minutes, check your spam folder.</p>
          </div>
          <div className="flex justify-center">
            <Link href="/auth/login">
              <Button variant="outline">Back to Login</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
