'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import Link from 'next/link';
import { Building, Users, DollarSign, Ticket } from 'lucide-react';

export function DashboardOverview() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProperties: 0,
    activeResidents: 0,
    pendingPayments: 0,
    openTickets: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      
      setLoading(true);
      
      try {
        // Get user profile ID
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();
          
        if (!userProfile) return;
        
        // Get properties count
        const { count: propertiesCount } = await supabase
          .from('properties')
          .select('*', { count: 'exact', head: true })
          .eq('property_manager_id', userProfile.id);
          
        // Get residents count
        const { data: properties } = await supabase
          .from('properties')
          .select('id')
          .eq('property_manager_id', userProfile.id);
          
        let residentsCount = 0;
        let pendingPaymentsTotal = 0;
        let openTicketsCount = 0;
        
        if (properties && properties.length > 0) {
          const propertyIds = properties.map(p => p.id);
          
          // Get residents count
          const { count: resCount } = await supabase
            .from('residents')
            .select('*', { count: 'exact', head: true })
            .in('property_id', propertyIds)
            .eq('is_active', true);
            
          residentsCount = resCount || 0;
          
          // Get pending payments
          const { data: invoices } = await supabase
            .from('invoices')
            .select('amount')
            .in('property_id', propertyIds)
            .eq('is_paid', false);
            
          pendingPaymentsTotal = invoices ? invoices.reduce((sum, invoice) => sum + invoice.amount, 0) : 0;
          
          // Get open tickets
          const { count: ticketsCount } = await supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .in('property_id', propertyIds)
            .eq('status', 'open');
            
          openTicketsCount = ticketsCount || 0;
        }
        
        setStats({
          totalProperties: propertiesCount || 0,
          activeResidents: residentsCount,
          pendingPayments: pendingPaymentsTotal,
          openTickets: openTicketsCount
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.totalProperties}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Residents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.activeResidents}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : `$${stats.pendingPayments.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.openTickets}</div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/properties/new">
          <Button className="w-full">
            <Building className="mr-2 h-4 w-4" /> Add Property
          </Button>
        </Link>
        
        <Link href="/dashboard/residents/invite">
          <Button className="w-full" variant="outline">
            <Users className="mr-2 h-4 w-4" /> Invite Resident
          </Button>
        </Link>
        
        <Link href="/dashboard/invoices/new">
          <Button className="w-full" variant="outline">
            <DollarSign className="mr-2 h-4 w-4" /> Create Invoice
          </Button>
        </Link>
        
        <Link href="/dashboard/meetings/schedule">
          <Button className="w-full" variant="outline">
            <Ticket className="mr-2 h-4 w-4" /> Schedule Meeting
          </Button>
        </Link>
      </div>
    </div>
  );
}
