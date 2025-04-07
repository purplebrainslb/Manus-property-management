import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to the dashboard page
  redirect('/dashboard');
  
  // This return statement is only for TypeScript, it will never be rendered
  return null;
}
