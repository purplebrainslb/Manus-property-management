// This file is used to fix the middleware implementation
// The issue was with Response.next() which is not a function

import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req: NextRequest) {
  // Create a response object
  const res = NextResponse.next();
  
  // Create the Supabase middleware client
  const supabase = createMiddlewareClient({ req, res });
  
  // Refresh session if expired
  await supabase.auth.getSession();
  
  return res;
}
