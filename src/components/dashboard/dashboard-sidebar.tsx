'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Building, 
  Users, 
  FileText, 
  Calendar, 
  Bell, 
  Ticket, 
  FileUp, 
  LogOut,
  Home
} from 'lucide-react';
import { useLogout } from '@/lib/auth/auth-hooks';
import { Button } from '@/components/ui/button';

interface SidebarLinkProps {
  href: string;
  icon: ReactNode;
  children: ReactNode;
  active?: boolean;
}

function SidebarLink({ href, icon, children, active }: SidebarLinkProps) {
  return (
    <Link href={href} className="w-full">
      <Button 
        variant={active ? "default" : "ghost"} 
        className="w-full justify-start"
      >
        {icon}
        <span className="ml-2">{children}</span>
      </Button>
    </Link>
  );
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const { logout } = useLogout();

  return (
    <div className="h-screen w-64 border-r bg-background p-4 flex flex-col">
      <div className="flex items-center mb-8">
        <Building className="h-6 w-6 text-primary mr-2" />
        <h1 className="text-xl font-bold">Property Manager</h1>
      </div>
      
      <nav className="space-y-1 flex-1">
        <SidebarLink 
          href="/dashboard" 
          icon={<Home className="h-4 w-4" />}
          active={pathname === '/dashboard'}
        >
          Dashboard
        </SidebarLink>
        
        <SidebarLink 
          href="/dashboard/properties" 
          icon={<Building className="h-4 w-4" />}
          active={pathname.startsWith('/dashboard/properties')}
        >
          Properties
        </SidebarLink>
        
        <SidebarLink 
          href="/dashboard/residents" 
          icon={<Users className="h-4 w-4" />}
          active={pathname.startsWith('/dashboard/residents')}
        >
          Residents
        </SidebarLink>
        
        <SidebarLink 
          href="/dashboard/invoices" 
          icon={<FileText className="h-4 w-4" />}
          active={pathname.startsWith('/dashboard/invoices')}
        >
          Invoices
        </SidebarLink>
        
        <SidebarLink 
          href="/dashboard/meetings" 
          icon={<Calendar className="h-4 w-4" />}
          active={pathname.startsWith('/dashboard/meetings')}
        >
          Meetings
        </SidebarLink>
        
        <SidebarLink 
          href="/dashboard/announcements" 
          icon={<Bell className="h-4 w-4" />}
          active={pathname.startsWith('/dashboard/announcements')}
        >
          Announcements
        </SidebarLink>
        
        <SidebarLink 
          href="/dashboard/tickets" 
          icon={<Ticket className="h-4 w-4" />}
          active={pathname.startsWith('/dashboard/tickets')}
        >
          Tickets
        </SidebarLink>
        
        <SidebarLink 
          href="/dashboard/documents" 
          icon={<FileUp className="h-4 w-4" />}
          active={pathname.startsWith('/dashboard/documents')}
        >
          Documents
        </SidebarLink>
      </nav>
      
      <div className="pt-4 border-t">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={() => logout()}
        >
          <LogOut className="h-4 w-4" />
          <span className="ml-2">Logout</span>
        </Button>
      </div>
    </div>
  );
}
