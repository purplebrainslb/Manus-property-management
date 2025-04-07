import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function getSession() {
  const supabase = createServerComponentClient({ cookies });
  
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    
    return session;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

export async function getUserDetails() {
  const supabase = createServerComponentClient({ cookies });
  
  try {
    const { data: userDetails } = await supabase
      .from('user_profiles')
      .select('*')
      .single();
    
    return userDetails;
  } catch (error) {
    console.error('Error getting user details:', error);
    return null;
  }
}

export async function requireAuth() {
  const session = await getSession();
  
  if (!session) {
    redirect('/auth/login');
  }
  
  return session;
}

export async function requireNoAuth() {
  const session = await getSession();
  
  if (session) {
    redirect('/dashboard');
  }
  
  return session;
}
