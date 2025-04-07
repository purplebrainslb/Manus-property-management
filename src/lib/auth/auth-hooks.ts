import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from './auth-context';

export function useLogin() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        setError(error.message);
        return false;
      }
      
      router.push('/dashboard');
      router.refresh();
      return true;
    } catch (err) {
      setError('An unexpected error occurred');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { login, isLoading, error };
}

export function useGoogleLogin() {
  const { signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginWithGoogle = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await signInWithGoogle();
      return true;
    } catch (err) {
      setError('An unexpected error occurred');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { loginWithGoogle, isLoading, error };
}

export function useSignup() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signup = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await signUp(email, password);
      
      if (error) {
        setError(error.message);
        return false;
      }
      
      router.push('/auth/check-email');
      return true;
    } catch (err) {
      setError('An unexpected error occurred');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { signup, isLoading, error };
}

export function useLogout() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await signOut();
      router.push('/auth/login');
      router.refresh();
      return true;
    } catch (err) {
      setError('An unexpected error occurred');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { logout, isLoading, error };
}

export function useResetPassword() {
  const { resetPassword } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const sendResetPasswordEmail = async (email: string) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error } = await resetPassword(email);
      
      if (error) {
        setError(error.message);
        return false;
      }
      
      setSuccess(true);
      return true;
    } catch (err) {
      setError('An unexpected error occurred');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { sendResetPasswordEmail, isLoading, error, success };
}
