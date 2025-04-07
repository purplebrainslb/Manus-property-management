'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useResetPassword } from '@/lib/auth/auth-hooks';

const resetPasswordSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export function ForgotPasswordForm() {
  const { sendResetPasswordEmail, isLoading, error, success } = useResetPassword();
  const [serverError, setServerError] = useState<string | null>(error);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setServerError(null);
    await sendResetPasswordEmail(data.email);
    if (error) {
      setServerError(error);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Reset Password</CardTitle>
        <CardDescription>
          Enter your email address and we'll send you a link to reset your password
        </CardDescription>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="p-4 rounded-md bg-green-50 text-green-700 mb-4">
            Check your email for a link to reset your password. If it doesn't appear within a few minutes, check your spam folder.
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>
            {serverError && (
              <div className="p-3 rounded-md bg-red-50 text-red-500 text-sm">
                {serverError}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>
        )}
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Remember your password?{' '}
          <Link href="/auth/login" className="text-primary hover:underline">
            Back to login
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
